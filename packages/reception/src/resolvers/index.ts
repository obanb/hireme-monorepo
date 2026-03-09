import { frontdeskResolvers } from "../frontdesk/res";
import { checkReservationResolvers } from "../reservation-check/res";

// Global resolvers — merge all feature resolvers here
export const resolvers = {
  Query: {
    ...frontdeskResolvers.Query,
    ...checkReservationResolvers.Query,
  },
  Mutation: {
    ...frontdeskResolvers.Mutation,
  },
};
