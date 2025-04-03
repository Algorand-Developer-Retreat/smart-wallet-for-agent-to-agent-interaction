import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "say-hello",
  "Say hello to the user with a name",
  {
    name: z.string().describe("Name of the user to greet"),
  },
  async ({ name }) => {
    return {
      content: [{ type: "text", text: `Hello ${name}!` }],
    };
  }
);

export default server;
