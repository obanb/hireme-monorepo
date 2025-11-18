import { Server } from "node:http";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloGateway, IntrospectAndCompose } from "@apollo/gateway";
import { exportTest } from "common";
import { createLogger, initTracing, withSpan } from "telemetry";

const serviceName = process.env.SERVICE_NAME ?? "api-gateway";
const port = Number(process.env.PORT ?? 8080);
const hotelSubgraphUrl = process.env.HOTEL_SUBGRAPH_URL ?? "http://localhost:4001/graphql";

const logger = createLogger({ serviceName });
initTracing({ serviceName });

const addOnePlusOne = () => 1 + 1;

export const startServer = async () => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json({ limit: "1mb" }));

  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, "Incoming request");
    next();
  });

  console.log(exportTest());

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        {
          name: "hotels",
          url: hotelSubgraphUrl
        }
      ]
    })
  });

  const server = new ApolloServer({
    gateway
  });

  await server.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        requestId: req.headers["x-request-id"] ?? `api_${Date.now()}`
      })
    })
  );

  app.get("/health", async (_req, res) => {
    const payload = await withSpan("health-check", async () => ({
      status: "ok",
      federation: true,
      subgraphs: ["hotels"],
      timestamp: new Date().toISOString()
    }));

    logger.info({ payload }, "Health check served");
    res.json(payload);
  });

  app.get("/hello", (_req, res) => {
    logger.debug("hello endpoint called");
    res.json({ hello: "from helm deploy", result: addOnePlusOne() });
  });

  await new Promise<Server>((resolve) => {
    const httpServer = app.listen(port, () => {
      logger.info({ port }, "Gateway running");
      logger.info({ subgraph: hotelSubgraphUrl }, "Federated /graphql ready");
      resolve(httpServer);
    });
  });
};

startServer().catch((error) => {
  console.error("Gateway failed to start", error);
  process.exit(1);
});
