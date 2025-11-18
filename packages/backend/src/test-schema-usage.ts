/**
 * Test file demonstrating usage of shared-schema types
 * This shows how to use the generated types in your resolvers
 */

import { Hotel, QueryHotelArgs, QueryFeaturedHotelsArgs } from "shared-schema";

// Example: Type-safe hotel data
const mockHotels: Hotel[] = [
  {
    id: "test-1",
    name: "Test Hotel",
    city: "Test City",
    rating: 4.5,
    roomCount: 50
  }
];

// Example: Type-safe resolver function
export function getHotelById(args: QueryHotelArgs): Hotel | undefined {
  return mockHotels.find((hotel) => hotel.id === args.id);
}

// Example: Type-safe resolver with optional args
export function getFeaturedHotels(args: QueryFeaturedHotelsArgs): Hotel[] {
  const limit = args.limit ?? 2;
  return mockHotels.slice(0, limit);
}

// Example: Type guard using generated types
export function isValidHotel(obj: unknown): obj is Hotel {
  if (typeof obj !== "object" || obj === null) return false;
  const hotel = obj as Partial<Hotel>;
  return (
    typeof hotel.id === "string" &&
    typeof hotel.name === "string" &&
    typeof hotel.city === "string" &&
    typeof hotel.rating === "number" &&
    typeof hotel.roomCount === "number"
  );
}

// Example: Using types in async operations
export async function fetchHotelData(id: string): Promise<Hotel | null> {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 100));
  const hotel = mockHotels.find((h) => h.id === id);
  return hotel ?? null;
}

