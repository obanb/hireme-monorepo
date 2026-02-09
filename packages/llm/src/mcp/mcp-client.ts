import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { config } from '../config';

let client: Client | null = null;
let transport: StdioClientTransport | null = null;

export async function getMcpClient(): Promise<Client> {
  if (client) return client;

  transport = new StdioClientTransport({
    command: config.mcp.serverCommand,
    args: config.mcp.serverArgs,
    env: {
      ...process.env as Record<string, string>,
      GRAPHQL_ENDPOINT: config.graphql.endpoint,
    },
  });

  client = new Client({
    name: 'hotel-cms-llm',
    version: '1.0.0',
  });

  await client.connect(transport);
  console.log('[mcp-client] Connected to MCP server');

  return client;
}

export async function closeMcpClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    transport = null;
    console.log('[mcp-client] Disconnected from MCP server');
  }
}

export async function listMcpTools(): Promise<any[]> {
  const c = await getMcpClient();
  const result = await c.listTools();
  return result.tools;
}

export async function callMcpTool(name: string, args: Record<string, any>): Promise<any> {
  const c = await getMcpClient();
  return c.callTool({ name, arguments: args });
}
