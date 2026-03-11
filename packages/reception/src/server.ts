import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { readFileSync } from "fs";
import { join } from "path";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";

import { connectMongo } from "./db";
import { mountSwagger } from "./swagger";
import { resolvers } from "./resolvers";
import { frontdeskRouter } from "./frontdesk/routes";
import { startFrontdeskWorker } from "./frontdesk/mq";
import { pdfRouter } from "./pdf/routes";
import { actionsRouter } from "./actions/routes";

const schemaStr = readFileSync(join(__dirname, "schema.graphql"), "utf-8");
const typeDefs = gql(schemaStr);
const schema = buildSubgraphSchema({ typeDefs, resolvers });

export async function startServer(): Promise<void> {
  await connectMongo();

  startFrontdeskWorker();

  const app = express();
  app.use(cookieParser());
  app.use(bodyParser.json());

  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map(o => o.trim());
  app.use(cors({ origin: corsOrigins, credentials: true }));

  // REST routes under /api
  app.use("/api/frontdesk", frontdeskRouter);
  app.use("/api/pdf", pdfRouter);
  app.use("/api/actions", actionsRouter);

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // Swagger UI at /docs
  mountSwagger(app);

  // GraphQL
  const apollo = new ApolloServer({ schema });
  await apollo.start();

  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async ({ req, res }) => ({ req, res }),
    })
  );

  const port = process.env.PORT ?? 4002;
  app.listen(port, () => {
    console.log(`🚀 Reception service ready at http://localhost:${port}`);
    console.log(`   GraphQL:  http://localhost:${port}/graphql`);
    console.log(`   REST API: http://localhost:${port}/api/frontdesk`);
    console.log(`   Swagger:  http://localhost:${port}/docs`);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down...");
    await apollo.stop();
    process.exit(0);
  });
}
