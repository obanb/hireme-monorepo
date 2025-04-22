import StdioTransport from "./stdio";
import WeatherMcpServer from "./weatherServer";
import MCPClient from "./client";
import {fsLog} from "./fsLog";


export const mcpExample = async () => {
    fsLog(`MCP Example started`);
    const clientTransport = new StdioTransport();

    const serverTransport = new StdioTransport();

    const server = new WeatherMcpServer({ transport: serverTransport });
    const client = new MCPClient({ transport: clientTransport });

    console.log('pes')


    server.on('error', (error) => {
        console.error('Server error:', error);
    });

    client.on('error', (error) => {
        console.error('Client error:', error);
    });

    try {
        await server.start();
        fsLog(`tools 2`);

        await client.connect();

       console.log('TOOLs')


        console.log('NEVIDITELNEJ LOG');

        const tools = await client.listTools();

        fsLog(`tools ${JSON.stringify(tools)}`);

        const testToolPrague = await client.callTool('weather',{
            "city": "Prague"
        })

        console.log(testToolPrague)
        fsLog(`Test Tool Prague: ${testToolPrague}`);
        const testToolBrno = await client.callTool('Weather',{
            "city": "Brno"
        })
        fsLog(`Test Tool Brno: ${testToolBrno}`);
    }catch(error){
        fsLog(`Error: ${error}`);
    }finally{
        // server.stop();
        await client.close();
        console.log('done')
    }
}

mcpExample();