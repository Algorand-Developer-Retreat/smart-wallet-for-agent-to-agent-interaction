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
- recordNegotiatedPrice: Record a negotiated price for a listing
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

    const finalText = [];
    let keepProcessing = true;

    while (keepProcessing) {
      const response = await this.anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1000,
        messages: this.conversationHistory,
        tools: this.tools,
      });

      keepProcessing = false; // Will be set to true if we need another iteration

      for (const content of response.content) {
        if (content.type === "text") {
          finalText.push(chalk.green(`\n[Buyer Agent: ${content.text}]`));

          // Add assistant's response to conversation history
          this.conversationHistory.push({
            role: "assistant",
            content: content.text,
          });
        } else if (content.type === "tool_use") {
          const toolName = content.name;
          const toolArgs = content.input as { [x: string]: unknown } | undefined;

          finalText.push(chalk.cyan(`\n[Seller Agent: Calling ${toolName} with args ${JSON.stringify(toolArgs)}]`));

          try {
            const result = (await this.mcp.callTool({
              name: toolName,
              arguments: toolArgs,
            })) as { content: Array<{ type: string; text: string }> };

            finalText.push(chalk.cyan(`\n[Seller Agent: ${toolName} returned ${JSON.stringify(result.content)}]`));

            // Add tool result to conversation history
            this.conversationHistory.push({
              role: "assistant",
              content: `I called ${toolName} and got result: ${result.content[0].text}`,
            });

            // Continue processing if the tool call was successful
            keepProcessing = true;
          } catch (error: any) {
            const errorMessage = `Error calling ${toolName}: ${error.message}`;
            finalText.push(chalk.red(`\n[Error: ${errorMessage}]`));

            // Add error to conversation history
            this.conversationHistory.push({
              role: "assistant",
              content: errorMessage,
            });
          }
        }
      }
    }

    return finalText.join("\n");
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
