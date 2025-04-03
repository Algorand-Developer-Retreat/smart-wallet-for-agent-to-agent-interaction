import { Anthropic } from "@anthropic-ai/sdk";
import { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const log = (message: string) => {
  process.stderr.write(message + "\n");
};

if (!ANTHROPIC_API_KEY) {
  log("ANTHROPIC_API_KEY is not set");
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

interface ToolUse {
  name: string;
  input: any;
}

class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];
  private conversationHistory: MessageParam[] = [];
  private currentText: string = "";
  private currentToolUse: ToolUse | null = null;
  private accumulatedJson: string = "";

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
    this.conversationHistory = [{ role: "assistant", content: SYSTEM_PROMPT }];
  }

  async connectToServer(serverScriptPath: string) {
    try {
      this.transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverScriptPath],
      });

      this.mcp.connect(this.transport);
      await this.initializeTools();
    } catch (e) {
      log(`Failed to connect to MCP server: ${e}`);
      throw e;
    }
  }

  private async initializeTools() {
    const toolsResult = await this.mcp.listTools();
    this.tools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    log(`Connected to server with tools: ${this.tools.map(({ name }) => name).join(", ")}`);
  }

  async processQuery(query: string) {
    this.conversationHistory.push({ role: "user", content: query });
    let keepProcessing = true;
    this.currentText = "";

    while (keepProcessing) {
      const stream = await this.getAnthropicStream();
      keepProcessing = false; // Will be set to true if we need another iteration

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          if (event.content_block?.type === "tool_use") {
            // If we have accumulated text, output it before starting tool use
            if (this.currentText) {
              process.stderr.write(chalk.green("]\n"));
              this.conversationHistory.push({
                role: "assistant",
                content: this.currentText,
              });
              this.currentText = "";
            }
            this.currentToolUse = {
              name: event.content_block.name || "",
              input: {},
            };
          } else if (event.content_block?.type === "text") {
            // If we're starting a new text block and have existing text, add a newline
            if (this.currentText) {
              process.stderr.write(chalk.green("\n"));
            }
            this.currentText = "";
            process.stderr.write(chalk.green("\n[Buyer Agent: "));
          }
        } else if (event.type === "content_block_delta") {
          if (event.delta?.type === "text_delta" && event.delta.text) {
            this.currentText += event.delta.text;
            process.stderr.write(chalk.green(event.delta.text));
          } else if (event.delta?.type === "input_json_delta" && this.currentToolUse) {
            this.accumulatedJson += event.delta.partial_json || "";
            try {
              if (this.accumulatedJson.trim().startsWith("{") && this.accumulatedJson.trim().endsWith("}")) {
                const jsonObj = JSON.parse(this.accumulatedJson);
                this.currentToolUse.input = jsonObj;
              }
            } catch (e) {
              // Ignore JSON parse errors for partial JSON
            }
          }
        } else if (event.type === "content_block_stop") {
          if (this.currentText) {
            process.stderr.write(chalk.green("]\n"));
            this.conversationHistory.push({
              role: "assistant",
              content: this.currentText,
            });
            this.currentText = "";
          }

          if (this.currentToolUse) {
            const toolOutput = chalk.cyan(
              `\n[Seller Agent: Calling ${this.currentToolUse.name} with args ${JSON.stringify(this.currentToolUse.input)}]\n`
            );
            process.stderr.write(toolOutput);

            try {
              const result = (await this.mcp.callTool({
                name: this.currentToolUse.name,
                arguments: this.currentToolUse.input,
              })) as { content: Array<{ type: string; text: string }> };

              const resultOutput = chalk.cyan(`[Seller Agent: ${this.currentToolUse.name} returned ${JSON.stringify(result.content)}]\n`);
              process.stderr.write(resultOutput);

              // Add tool result to conversation history
              this.conversationHistory.push({
                role: "assistant",
                content: `I called ${this.currentToolUse.name} and got result: ${result.content[0].text}`,
              });

              // Continue processing if the tool call was successful
              keepProcessing = true;
            } catch (error: any) {
              const errorMessage = `Error calling ${this.currentToolUse.name}: ${error.message}`;
              process.stderr.write(chalk.red(`\n[Error: ${errorMessage}]\n`));

              // Add error to conversation history
              this.conversationHistory.push({
                role: "assistant",
                content: errorMessage,
              });
            }

            this.currentToolUse = null;
            this.accumulatedJson = "";
          }
        }
      }
    }

    return "";
  }

  private async getAnthropicStream() {
    return this.anthropic.messages.stream({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      messages: this.conversationHistory,
      tools: this.tools,
    });
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    try {
      log("\nMCP Client Started!");
      log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nBuyer Agent: ");

        if (message.toLowerCase() === "quit") {
          break;
        }

        const response = await this.processQuery(message);
        if (response) {
          log("\n" + response);
        }
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
