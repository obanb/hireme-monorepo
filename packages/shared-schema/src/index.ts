// Helper to load schema as string
import { readFileSync } from "fs";
import { join, dirname } from "path";

// Find the package root by looking for the schema directory
// Works both in development (src/) and production (dist/src/)
function getSchemaDir(): string {
  // When compiled, __dirname is dist/src/, so we need to go up 2 levels
  // When running ts directly, __dirname is src/, so we need to go up 1 level
  const distPath = join(__dirname, "../../schema");
  const srcPath = join(__dirname, "../schema");

  try {
    readFileSync(join(distPath, "hotel.graphql"));
    return distPath;
  } catch {
    return srcPath;
  }
}

export function getHotelSchema(): string {
  return readFileSync(join(getSchemaDir(), "hotel.graphql"), "utf-8");
}

export function getReservationSchema(): string {
  return readFileSync(join(getSchemaDir(), "reservation.graphql"), "utf-8");
}

export function getRoomSchema(): string {
  return readFileSync(join(getSchemaDir(), "room.graphql"), "utf-8");
}

export function getCommonSchema(): string {
  return readFileSync(join(getSchemaDir(), "common.graphql"), "utf-8");
}

export function getRoomTypeSchema(): string {
  return readFileSync(join(getSchemaDir(), "room-type.graphql"), "utf-8");
}

export function getRateCodeSchema(): string {
  return readFileSync(join(getSchemaDir(), "rate-code.graphql"), "utf-8");
}

export function getWellnessSchema(): string {
  return readFileSync(join(getSchemaDir(), "wellness.graphql"), "utf-8");
}

export function getCombinedSchema(): string {
  return getCommonSchema() + "\n" + getHotelSchema() + "\n" + getRoomTypeSchema() + "\n" + getRateCodeSchema() + "\n" + getRoomSchema() + "\n" + getReservationSchema() + "\n" + getWellnessSchema();
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
