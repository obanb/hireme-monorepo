// Helper to load schema as string
import { readFileSync } from "fs";
import { join } from "path";

export function getHotelSchema(): string {
  return readFileSync(join(__dirname, "../schema/hotel.graphql"), "utf-8");
}

// Re-export generated types (will be available after codegen runs)
// Using dynamic import to handle case where generated files don't exist yet
export type {
  Hotel,
  Query,
  QueryHotelArgs,
  QueryFeaturedHotelsArgs,
  Resolvers,
  HotelResolvers
} from "../generated/types";

// Export manual types
export * from "./types";

// Export domain schemas
export * from "./domain/base";
export * from "./domain/reservation/reservation"; // Existing reservation schemas
export * from "./domain/reservation/events";
