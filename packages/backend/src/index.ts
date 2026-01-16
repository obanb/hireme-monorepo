import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
import { v4 as uuidv4 } from "uuid";
import { getCombinedSchema, Hotel, QueryHotelArgs, QueryFeaturedHotelsArgs } from "shared-schema";
import {
  initializeDatabase,
  reservationRepository,
  eventRelayer,
  closePool,
  StoredEvent,
} from "./event-sourcing";

// Use types from shared-schema
const hotels: Hotel[] = [
  { id: "hotel-1", name: "Aurora Grand", city: "Reykjavík", rating: 4.8, roomCount: 120 },
  { id: "hotel-2", name: "Marina Vista", city: "Lisbon", rating: 4.5, roomCount: 200 },
  { id: "hotel-3", name: "Summit Lodge", city: "Vancouver", rating: 4.2, roomCount: 95 }
];

// Load combined schema from shared-schema package
const typeDefs = gql(getCombinedSchema());

// Helper to format stored events for GraphQL response
function formatStoredEvent(event: StoredEvent) {
  return {
    id: event.id,
    streamId: event.streamId,
    version: event.version,
    type: event.type,
    data: JSON.stringify(event.data),
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    occurredAt: event.occurredAt.toISOString(),
  };
}

// Helper to format reservation for GraphQL response
function formatReservation(reservation: {
  id: string;
  originId: string | null;
  guestName: string | null;
  status: string;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  totalAmount: number | null;
  currency: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: reservation.id,
    originId: reservation.originId,
    guestName: reservation.guestName,
    status: reservation.status,
    checkInDate: reservation.checkInDate?.toISOString().split('T')[0] || null,
    checkOutDate: reservation.checkOutDate?.toISOString().split('T')[0] || null,
    totalAmount: reservation.totalAmount,
    currency: reservation.currency,
    version: reservation.version,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

// Use generated resolver types from shared-schema
const resolvers = {
  Query: {
    // Hotel queries
    hotels: () => hotels,
    hotel: (_: unknown, args: QueryHotelArgs) => hotels.find((hotel) => hotel.id === args.id),
    featuredHotels: (_: unknown, args: QueryFeaturedHotelsArgs) => hotels.slice(0, args.limit ?? 2),

    // Reservation queries (Event Sourcing)
    reservation: async (_: unknown, args: { id: string }) => {
      const reservation = await reservationRepository.getReadModel(args.id);
      if (!reservation) return null;
      return formatReservation(reservation);
    },

    reservations: async (
      _: unknown,
      args: { status?: string; limit?: number; offset?: number }
    ) => {
      const reservations = await reservationRepository.listReadModels({
        status: args.status,
        limit: args.limit,
        offset: args.offset,
      });
      return reservations.map(formatReservation);
    },

    reservationEventHistory: async (_: unknown, args: { id: string }) => {
      const events = await reservationRepository.getEventHistory(args.id);
      return events.map(formatStoredEvent);
    },
  },

  Mutation: {
    // Create a new reservation
    createReservation: async (
      _: unknown,
      args: {
        input: {
          originId?: string;
          guestFirstName?: string;
          guestLastName?: string;
          checkInDate?: string;
          checkOutDate?: string;
          totalAmount?: number;
          currency?: string;
        };
      }
    ) => {
      const reservationId = uuidv4();
      const { aggregate, events } = await reservationRepository.create(reservationId, {
        originId: args.input.originId,
        totalAmount: args.input.totalAmount,
        currency: args.input.currency,
        arrivalTime: args.input.checkInDate,
        departureTime: args.input.checkOutDate,
        customer: {
          firstName: args.input.guestFirstName,
          lastName: args.input.guestLastName,
        },
      });

      const reservation = await reservationRepository.getReadModel(reservationId);

      return {
        reservation: reservation ? formatReservation(reservation) : {
          id: reservationId,
          status: aggregate.state.status,
          version: aggregate.version,
        },
        events: events.map(formatStoredEvent),
      };
    },

    // Cancel an existing reservation
    cancelReservation: async (
      _: unknown,
      args: { input: { reservationId: string; reason: string } }
    ) => {
      const { aggregate, events } = await reservationRepository.cancel(
        args.input.reservationId,
        args.input.reason
      );

      const reservation = await reservationRepository.getReadModel(args.input.reservationId);

      return {
        reservation: reservation ? formatReservation(reservation) : {
          id: args.input.reservationId,
          status: aggregate.state.status,
          version: aggregate.version,
        },
        events: events.map(formatStoredEvent),
      };
    },

    // Initialize the database schema
    initializeEventSourcingDatabase: async () => {
      try {
        await initializeDatabase();
        return true;
      } catch (error) {
        console.error("Failed to initialize database:", error);
        return false;
      }
    },

    // Start the event relayer
    startEventRelayer: async () => {
      try {
        await eventRelayer.start();
        return true;
      } catch (error) {
        console.error("Failed to start event relayer:", error);
        return false;
      }
    },

    // Stop the event relayer
    stopEventRelayer: async () => {
      try {
        await eventRelayer.stop();
        return true;
      } catch (error) {
        console.error("Failed to stop event relayer:", error);
        return false;
      }
    },
  },

  Hotel: {
    __resolveReference(reference: { id: string }) {
      return hotels.find((hotel) => hotel.id === reference.id) ?? null;
    }
  },
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

startServer().catch((error) => {
  console.error("Failed to start backend service", error);
  process.exit(1);
});

