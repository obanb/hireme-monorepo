import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";

interface Hotel {
  id: string;
  name: string;
  city: string;
  rating: number;
  roomCount: number;
}

const hotels: Hotel[] = [
  { id: "hotel-1", name: "Aurora Grand", city: "Reykjavík", rating: 4.8, roomCount: 120 },
  { id: "hotel-2", name: "Marina Vista", city: "Lisbon", rating: 4.5, roomCount: 200 },
  { id: "hotel-3", name: "Summit Lodge", city: "Vancouver", rating: 4.2, roomCount: 95 }
];

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.6"
      import: ["@key", "@shareable"]
    )

  type Hotel @key(fields: "id") {
    id: ID!
    name: String!
    city: String!
    rating: Float!
    roomCount: Int! @shareable
  }

  type Query {
    hotels: [Hotel!]!
    hotel(id: ID!): Hotel
    featuredHotels(limit: Int = 2): [Hotel!]!
  }
`;

const resolvers = {
  Query: {
    hotels: () => hotels,
    hotel: (_: unknown, args: { id: string }) => hotels.find((hotel) => hotel.id === args.id),
    featuredHotels: (_: unknown, args: { limit: number }) => hotels.slice(0, args.limit)
  },
  Hotel: {
    __resolveReference(reference: { id: string }) {
      return hotels.find((hotel) => hotel.id === reference.id) ?? null;
    }
  }
};

const schema = buildSubgraphSchema({ typeDefs, resolvers });

async function startServer() {
  const app = express();
  const server = new ApolloServer({ schema });
  await server.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async () => ({
        requestId: `req_${Date.now()}`
      })
    })
  );

  const port = process.env.PORT ?? 4001;
  app.listen(port, () => {
    console.log(`🚀 Federated hotel subgraph ready at http://localhost:${port}/graphql`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend service", error);
  process.exit(1);
});

