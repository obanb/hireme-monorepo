import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { z } from "zod";

const server = new McpServer({
    name: "Echo",
    version: "1.0.0"
});

server.resource(
    "echo",
    new ResourceTemplate("echo://{message}", { list: undefined }),
    async (uri, { message }) => ({
        contents: [{
            uri: uri.href,
            text: `Resource echo: ${message}`
        }]
    })
);

server.tool(
    "echo",
    { message: z.string() },
    async ({ message }) => ({
        content: [{ type: "text", text: `Tool echo: ${message}` }]
    })
);

server.prompt(
    "echo",
    { message: z.string() },
    ({ message }) => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `Please process this message: ${message} + MCP calling`
            }
        }]
    })
);

const runServer = async () => {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP server started");
}

runServer().catch((error) => {
    console.error("Fatal error running MCP server:", error);
    process.exit(1);
});