import { QueryHotelArgs, QueryFeaturedHotelsArgs } from "shared-schema";
import { hotels } from "../data/hotels";

export const hotelResolvers = {
  Query: {
    hotels: () => hotels,
    hotel: (_: unknown, args: QueryHotelArgs) => hotels.find((hotel) => hotel.id === args.id),
    featuredHotels: (_: unknown, args: QueryFeaturedHotelsArgs) => hotels.slice(0, args.limit ?? 2),
  },

  Hotel: {
    __resolveReference(reference: { id: string }) {
      return hotels.find((hotel) => hotel.id === reference.id) ?? null;
    },
  },
};
