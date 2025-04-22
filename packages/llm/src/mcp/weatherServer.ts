import { JSONRPCRequest, Tool } from './types';
import MCPServer, {MCPServerOptions} from "./server";

export class WeatherMcpServer extends MCPServer {
    constructor(options: MCPServerOptions) {
        super(options);
    }

    protected async handleInitialize(params: any): Promise<any> {
        // Return server capabilities
        return {
            protocolVersion: '1.0',
            capabilities: {
                tools: ['weather'],
                resources: [],
                prompts: []
            }
        };
    }

    protected async handleRequest(request: JSONRPCRequest): Promise<void> {
        console.log('rerrrrr')

        this.validateRequest(request);

        switch (request.method) {
            case 'tools/list':
                if (request.id) {
                    const tools = await this.getTools();
                    console.log(tools)
                    await this.sendResponse(request.id, tools);
                }
                break;

            case 'tools/call':
                if (request.id && request.params) {
                    const { name, params: toolParams } = request.params;

                    if (name === 'weather') {
                        const result = await this.getWeather(toolParams);
                        await this.sendResponse(request.id, result);
                    } else {
                        throw new Error(`Unknown tool: ${name}`);
                    }
                }
                break;

            default:
                throw new Error(`Method not supported: ${request.method}`);
        }
    }

    protected async getTools(): Promise<Tool[]> {
        return [{
            name: 'weather',
            description: 'Get the weather for a specific city',
            parameters: {
                type: 'object',
                properties: {
                    city: {
                        type: 'string',
                        enum: ['Prague','Brno']
                    },
                },
                required: ['city']
            }
        }];
    }

    private async getWeather(params: any): Promise<string> {
        const { city } = params;

        switch (city) {
            case 'Prague':
                return "Bude svítit sluníčko";
            case 'Brno':
                return "Počasí bude na hovno.";
            default:
                throw new Error(`Unknown city: ${city}`);
        }
    }
}

export default WeatherMcpServer;