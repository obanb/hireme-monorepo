// Manual TypeScript types that complement the generated types
// Use this for types that aren't part of the GraphQL schema

export interface HotelInput {
  name: string;
  city: string;
  rating: number;
  roomCount: number;
}

export interface PaginationArgs {
  limit?: number;
  offset?: number;
}

