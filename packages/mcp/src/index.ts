import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server';

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  console.error('[mcp] Hotel CMS MCP server starting on stdio...');
  await server.connect(transport);
  console.error('[mcp] Hotel CMS MCP server connected');
}

main().catch((error) => {
  console.error('[mcp] Fatal error:', error);
  process.exit(1);
});
