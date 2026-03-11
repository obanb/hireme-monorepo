import { frontdeskResolvers } from "../frontdesk/res";
import { checkReservationResolvers } from "../reservation-check/res";
import { arrivingGuestsResolvers } from "../arriving-guests/res";
import { registrationCardsResolvers } from "../registration-cards/res";
import { pmsResolvers } from "../pms/res";
import { benefitsResolvers } from "../benefits/res";
import { actionsResolvers } from "../actions/res";

// Global resolvers — merge all feature resolvers here
export const resolvers = {
  Query: {
    ...frontdeskResolvers.Query,
    ...checkReservationResolvers.Query,
    ...arrivingGuestsResolvers.Query,
    ...registrationCardsResolvers.Query,
    ...pmsResolvers.Query,
    ...benefitsResolvers.Query,
    ...actionsResolvers.Query,
  },
  Mutation: {
    ...frontdeskResolvers.Mutation,
    ...actionsResolvers.Mutation,
    ...pmsResolvers.Mutation,
  },
  HotelAction: actionsResolvers.HotelAction,
};
