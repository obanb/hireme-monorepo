import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
import { getCombinedSchema } from "shared-schema";
import {
  initializeDatabase,
  eventRelayer,
  closePool,
  seedDefaultRoomTypes,
} from "./event-sourcing";
import {
  initializeAuthTables,
  seedAdminUser,
  extractAuthContext,
} from "./auth";
import {
  initializeCampaignTables,
  seedDefaultTemplates,
  mountTrackingRoutes,
} from "./campaigns";
import { resolvers } from "./resolvers";
import { mountPoliceReportRoute } from "./routes/police-report.route";

const typeDefs = gql(getCombinedSchema());
const schema = buildSubgraphSchema({ typeDefs, resolvers });

export async function startServer() {
  // Initialize database schema
  console.log('Initializing database schema...');
  await initializeDatabase();
  console.log('Database schema ready');

  // Initialize auth tables and seed admin
  await initializeAuthTables();
  await seedAdminUser();

  // Seed default room types
  await seedDefaultRoomTypes();

  // Initialize campaign tables and seed templates
  await initializeCampaignTables();
  await seedDefaultTemplates();

  const app = express();
  app.use(cookieParser());

  // Mount campaign tracking routes (before GraphQL middleware)
  mountTrackingRoutes(app);

  // Mount REST routes
  mountPoliceReportRoute(app);

  const server = new ApolloServer({ schema });
  await server.start();

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  app.use(
    "/graphql",
    cors<cors.CorsRequest>({
      origin: corsOrigin,
      credentials: true,
    }),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const authContext = await extractAuthContext(req);
        return {
          ...authContext,
          req,
          res,
          requestId: `req_${Date.now()}`,
        };
      }
    })
  );

  const port = process.env.PORT ?? 4001;
  app.listen(port, () => {
    console.log(`🚀 Federated hotel subgraph ready at http://localhost:${port}/graphql`);
    console.log(`📦 Event sourcing endpoints available`);
    console.log(`   - Initialize DB: mutation { initializeEventSourcingDatabase }`);
    console.log(`   - Create reservation: mutation { createReservation(input: {...}) { ... } }`);
    console.log(`   - Cancel reservation: mutation { cancelReservation(input: {...}) { ... } }`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down...");
    await eventRelayer.stop();
    await closePool();
    process.exit(0);
  });
}
