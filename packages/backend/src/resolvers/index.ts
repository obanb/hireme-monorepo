import { hotelResolvers } from "./hotel.resolvers";
import { reservationResolvers } from "./reservation.resolvers";
import { roomResolvers } from "./room.resolvers";
import { roomTypeResolvers } from "./room-type.resolvers";
import { rateCodeResolvers } from "./rate-code.resolvers";
import { wellnessResolvers } from "./wellness.resolvers";
import { voucherResolvers } from "./voucher.resolvers";
import { guestResolvers } from "./guest.resolvers";
import { statisticsResolvers } from "./statistics.resolvers";
import { authResolvers } from "./auth.resolvers";
import { campaignResolvers } from "./campaign.resolvers";
import { systemResolvers } from "./system.resolvers";

const allResolverModules = [
  hotelResolvers,
  reservationResolvers,
  roomResolvers,
  roomTypeResolvers,
  rateCodeResolvers,
  wellnessResolvers,
  voucherResolvers,
  guestResolvers,
  statisticsResolvers,
  authResolvers,
  campaignResolvers,
  systemResolvers,
];

function mergeResolvers(modules: Record<string, any>[]): any {
  const merged: Record<string, any> = {};

  for (const mod of modules) {
    for (const [key, value] of Object.entries(mod)) {
      if (!merged[key]) {
        merged[key] = {};
      }
      Object.assign(merged[key], value);
    }
  }

  return merged;
}

export const resolvers = mergeResolvers(allResolverModules);
