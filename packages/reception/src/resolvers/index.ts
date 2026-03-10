import { frontdeskResolvers } from "../frontdesk/res";
import { checkReservationResolvers } from "../reservation-check/res";
import { arrivingGuestsResolvers } from "../arriving-guests/res";
import { registrationCardsResolvers } from "../registration-cards/res";

// Global resolvers — merge all feature resolvers here
export const resolvers = {
  Query: {
    ...frontdeskResolvers.Query,
    ...checkReservationResolvers.Query,
    ...arrivingGuestsResolvers.Query,
    ...registrationCardsResolvers.Query,
  },
  Mutation: {
    ...frontdeskResolvers.Mutation,
  },
};
