import { Anthropic } from "@anthropic-ai/sdk";
import { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const SYSTEM_PROMPT = `You are an autonomous buyer agent that helps users purchase assets on a marketplace.
You have access to several tools that let you interact with the marketplace:

- showAssets: Shows all available assets for sale
- listAsset: List an asset for sale with specified parameters
- negotiatePrice: Negotiate a price for a listing
- purchaseAsset: Purchase an asset from a listing
- delistAsset: Remove a listing from sale

When users give you high-level commands like "buy an asset" or "sell my asset", you should:
1. Break down the task into steps
2. Use the appropriate tools in sequence to accomplish the task
3. Keep the user informed of your progress
4. Handle any errors or unexpected situations gracefully

For example, to buy an asset you might:
1. Use showAssets to see what's available
2. Use negotiatePrice to negotiate a good price
3. Use recordNegotiatedPrice to record the agreed price
4. Use purchaseAsset to complete the purchase

Always maintain context between steps and use information from previous tool calls to inform your next actions.`;

class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];
  private conversationHistory: MessageParam[] = [];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });

    // Initialize conversation with system prompt
    this.conversationHistory = [
      {
        role: "assistant",
        content: SYSTEM_PROMPT,
      },
    ];
  }

  async connectToServer(serverScriptPath: string) {
    try {
      const isJs = serverScriptPath.endsWith(".js");
      const isPy = serverScriptPath.endsWith(".py");

      if (!isJs && !isPy) {
        throw new Error("Server script must be a .js or .py file");
      }

      const command = isPy ? (process.platform === "win32" ? "python" : "python3") : process.execPath;

      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });

      this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();

      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });

      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    // Add user query to conversation history
    this.conversationHistory.push({
      role: "user",
      content: query,
    });

    let keepProcessing = true;
    let currentText = "";

    while (keepProcessing) {
      const stream = await this.anthropic.messages.stream({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1000,
        messages: this.conversationHistory,
        tools: this.tools,
      });

      keepProcessing = false; // Will be set to true if we need another iteration
      let currentToolUse: { name: string; input: any } | null = null;
      let accumulatedJson = "";

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block.type === "tool_use") {
            currentToolUse = {
              name: event.content_block.name,
              input: {},
            };
          } else if (event.content_block.type === "text") {
            // Start a new text block
            currentText = "";
            process.stdout.write(chalk.green("\n[Buyer Agent: "));
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta") {
            const text = event.delta.text;
            currentText += text;
            // Immediately display the text
            process.stdout.write(chalk.green(text));
          } else if (event.delta.type === "input_json_delta" && currentToolUse) {
            // Accumulate JSON input
            accumulatedJson += event.delta.partial_json || "";
            try {
              if (accumulatedJson.trim().startsWith("{") && accumulatedJson.trim().endsWith("}")) {
                const jsonObj = JSON.parse(accumulatedJson);
                currentToolUse.input = jsonObj;
              }
            } catch (e) {
              // Ignore JSON parse errors for partial JSON
            }
          }
        } else if (event.type === "content_block_stop") {
          if (currentText) {
            process.stdout.write(chalk.green("]\n"));
            // Add assistant's response to conversation history
            this.conversationHistory.push({
              role: "assistant",
              content: currentText,
            });
          }

          if (currentToolUse) {
            const toolOutput = chalk.cyan(
              `\n[Seller Agent: Calling ${currentToolUse.name} with args ${JSON.stringify(currentToolUse.input)}]\n`
            );
            process.stdout.write(toolOutput);

            try {
              const result = (await this.mcp.callTool({
                name: currentToolUse.name,
                arguments: currentToolUse.input,
              })) as { content: Array<{ type: string; text: string }> };

              const resultOutput = chalk.cyan(`[Seller Agent: ${currentToolUse.name} returned ${JSON.stringify(result.content)}]\n`);
              process.stdout.write(resultOutput);

              // Add tool result to conversation history
              this.conversationHistory.push({
                role: "assistant",
                content: `I called ${currentToolUse.name} and got result: ${result.content[0].text}`,
              });

              // Continue processing if the tool call was successful
              keepProcessing = true;
            } catch (error: any) {
              const errorMessage = `Error calling ${currentToolUse.name}: ${error.message}`;
              process.stdout.write(chalk.red(`\n[Error: ${errorMessage}]\n`));

              // Add error to conversation history
              this.conversationHistory.push({
                role: "assistant",
                content: errorMessage,
              });
            }

            currentToolUse = null;
            accumulatedJson = "";
          }
        }
      }
    }

    return ""; // We've already written the output using process.stdout
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nBuyer Agent: ");

        if (message.toLowerCase() === "quit") {
          break;
        }

        const response = await this.processQuery(message);
        console.log("\n" + response);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

export default MCPClient;
