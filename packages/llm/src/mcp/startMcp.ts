import WeatherMcpServer from "./weatherServer";
import StdioTransport from "./stdio";

const serverTransport = new StdioTransport();
const server = new WeatherMcpServer({ transport: serverTransport });
server.start();
