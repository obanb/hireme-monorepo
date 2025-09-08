// import express from 'express';
// import ollama from 'ollama';
// import StdioTransport from "./mcp/stdio";
// import WeatherMcpServer from "./mcp/weatherServer";
// import MCPClient from "./mcp/client";
// import { PassThrough } from 'stream';
// import {atlasVectorSearch} from "./rag/atlas-connector";
// import { ClosedQA } from "autoevals";
//
// function createDuplexPair() {
//     const aToB = new PassThrough();
//     const bToA = new PassThrough();
//
//     return {
//         a: {
//             input: bToA,
//             output: aToB,
//         },
//         b: {
//             input: aToB,
//             output: bToA,
//         },
//     };
// }
//
// const port = process.env.PORT || 8080;
//
// let client: MCPClient;
//
// const app = express();
//
// app.use(express.json({ limit: '1mb' }));
//
// app.post('/query', async (req, res) => {
//     const { query } = req.body;
//     let ctx = query
//     try {
//         const mcpTools = await client.listTools();
//
//         console.log("MCP server tools: ", mcpTools);
//
//         const atlas = await atlasVectorSearch(query)
//
//         if(atlas.length > 0){
//             ctx += `\n\nHere are some relevant documents:\n\n${atlas.map((doc) => doc.text).join("\n\n")}`;
//         }
//
//         const response = await ollama.chat({
//             model: 'angryweathermodel:latest',
//             messages: [{ role: 'user', content: ctx }],
//             // format: {
//             //     type: "object",
//             //     properties: {
//             //         city: { type: "string" },
//             //         weather: { type: "string" },
//             //         population: { type: "number" },
//             //     },
//             //     required: ["city", "weather","population"],
//             // },
//             tools: mcpTools.map((tool) => ({
//                 type: 'function',
//                 function: {
//                     name: tool.name,
//                     description: tool.description,
//                     parameters: {
//                         type: 'object',
//                         properties: tool.parameters.properties,
//                     },
//                     required: tool.parameters.required,
//                 }
//             } as any)),
//         });
//
//         if(response.message.tool_calls){
//             const toolFn =  response.message.tool_calls[0].function;
//             const toolResponse = await client.callTool(toolFn.name, toolFn.arguments);
//             console.log("toolResponse: ", toolResponse);
//             res.json({ reply: toolResponse });
//             return
//         }
//
//         const closedQA = await ClosedQA({
//             input: query,
//             criteria: `Is this corect answer for 3 years old kids?`,
//             output: response.message.content
//         })
//
//         console.log(`closedQA: `, closedQA);
//
//         res.json({ reply: response.message });
//     } catch (error) {
//         res.status(500).send({ error: 'Error interacting with MCP client' });
//     }
// });
//
// export const startServer = async () => {
//     await new Promise<any>((resolve) => {
//         const server = app.listen(port, () => {
//             console.log(`[server]: Server is running at http://localhost:${port}`);
//             resolve(server);
//         });
//     });
//
//     const serverInput = new PassThrough();
//     const serverOutput = new PassThrough();
//     const clientInput = new PassThrough();
//     const clientOutput = new PassThrough();
//
// // Cross-pipe streams
//     serverInput.pipe(clientOutput);
//     clientInput.pipe(serverOutput);
//
//     const { a: clientStreams, b: serverStreams } = createDuplexPair();
//
//
//     const serverTransport = new StdioTransport();
//     serverTransport.setStreams(serverStreams.input, serverStreams.output);
//
//     const clientTransport = new StdioTransport();
//     clientTransport.setStreams(clientStreams.input, clientStreams.output);
//
//     const server = new WeatherMcpServer({ transport: serverTransport });
//     client = new MCPClient({ transport: clientTransport }); // assign to global
//
//     await server.start();
//     await client.connect();
//
//     console.log("MCP server and client initialized.");
// };
//
// startServer().catch(console.error);