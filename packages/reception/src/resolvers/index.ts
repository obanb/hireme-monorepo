import { frontdeskResolvers } from "../frontdesk/res";
import { checkReservationResolvers } from "../reservation-check/res";
import { arrivingGuestsResolvers } from "../arriving-guests/res";

// Global resolvers — merge all feature resolvers here
export const resolvers = {
  Query: {
    ...frontdeskResolvers.Query,
    ...checkReservationResolvers.Query,
    ...arrivingGuestsResolvers.Query,
  },
  Mutation: {
    ...frontdeskResolvers.Mutation,
  },
};
