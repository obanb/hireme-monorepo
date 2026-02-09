import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { graphqlQuery } from './graphql-client';
import {
  GET_RESERVATIONS,
  GET_RESERVATION_BY_ID,
  GET_ROOMS,
  GET_ROOM_TYPES,
  GET_RATE_CODES,
  CREATE_RESERVATION,
  CONFIRM_RESERVATION,
  CANCEL_RESERVATION,
} from './queries';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'hotel-cms-mcp',
    version: '1.0.0',
  });

  // @ts-expect-error TS2589 - MCP SDK zod type inference depth limit
  server.tool(
    'get_reservations',
    'List reservations with optional filters for status, guest name, date ranges, and pagination',
    {
      status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional().describe('Filter by reservation status'),
      guestName: z.string().optional().describe('Filter by guest name (partial match)'),
      checkInFrom: z.string().optional().describe('Filter check-in date from (ISO date string)'),
      checkInTo: z.string().optional().describe('Filter check-in date to (ISO date string)'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    async ({ status, guestName, checkInFrom, checkInTo, limit, offset }) => {
      try {
        const filter: Record<string, any> = {};
        if (status) filter.status = status;
        if (guestName) filter.guestName = guestName;
        if (checkInFrom) filter.checkInFrom = checkInFrom;
        if (checkInTo) filter.checkInTo = checkInTo;

        const data = await graphqlQuery<any>(GET_RESERVATIONS, {
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          limit,
          offset,
        });

        return { content: [{ type: 'text' as const, text: JSON.stringify(data.reservations, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error fetching reservations: ${error}` }], isError: true };
      }
    }
  );

  // @ts-expect-error TS2589 - MCP SDK zod type inference depth limit
  server.tool(
    'get_reservation_by_id',
    'Get a single reservation by its ID, including room details',
    {
      id: z.string().describe('The reservation ID'),
    },
    async ({ id }) => {
      try {
        const data = await graphqlQuery<any>(GET_RESERVATION_BY_ID, { id });
        if (!data.reservation) {
          return { content: [{ type: 'text' as const, text: `Reservation with ID ${id} not found` }], isError: true };
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.reservation, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error fetching reservation: ${error}` }], isError: true };
      }
    }
  );

  // @ts-expect-error TS2589 - MCP SDK zod type inference depth limit
  server.tool(
    'get_rooms',
    'List rooms with optional filters for room type and status',
    {
      type: z.enum(['SINGLE', 'DOUBLE', 'SUITE', 'DELUXE', 'PENTHOUSE']).optional().describe('Filter by room type'),
      status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).optional().describe('Filter by room status'),
    },
    async ({ type, status }) => {
      try {
        const variables: Record<string, any> = {};
        if (type) variables.type = type;
        if (status) variables.status = status;

        const data = await graphqlQuery<any>(GET_ROOMS, variables);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.rooms, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error fetching rooms: ${error}` }], isError: true };
      }
    }
  );

  // @ts-expect-error TS2589 - MCP SDK zod type inference depth limit
  server.tool(
    'get_room_types',
    'List all room types (categories like Standard, Deluxe, Suite, etc.)',
    {
      includeInactive: z.boolean().optional().describe('Include inactive room types'),
    },
    async ({ includeInactive }) => {
      try {
        const data = await graphqlQuery<any>(GET_ROOM_TYPES, { includeInactive });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.roomTypes, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error fetching room types: ${error}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_rate_codes',
    'List all rate codes (pricing categories)',
    {
      includeInactive: z.boolean().optional().describe('Include inactive rate codes'),
    },
    async ({ includeInactive }) => {
      try {
        const data = await graphqlQuery<any>(GET_RATE_CODES, { includeInactive });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.rateCodes, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error fetching rate codes: ${error}` }], isError: true };
      }
    }
  );

  server.tool(
    'create_reservation',
    'Create a new hotel reservation',
    {
      guestFirstName: z.string().describe('Guest first name'),
      guestLastName: z.string().describe('Guest last name'),
      checkInDate: z.string().describe('Check-in date (ISO date string)'),
      checkOutDate: z.string().describe('Check-out date (ISO date string)'),
      roomId: z.string().optional().describe('Room ID to assign'),
      totalAmount: z.number().optional().describe('Total reservation amount'),
      currency: z.string().optional().describe('Currency code (e.g. EUR, USD)'),
    },
    async ({ guestFirstName, guestLastName, checkInDate, checkOutDate, roomId, totalAmount, currency }) => {
      try {
        const input: Record<string, any> = {
          guestFirstName,
          guestLastName,
          checkInDate,
          checkOutDate,
        };
        if (roomId) input.roomId = roomId;
        if (totalAmount !== undefined) input.totalAmount = totalAmount;
        if (currency) input.currency = currency;

        const data = await graphqlQuery<any>(CREATE_RESERVATION, { input });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.createReservation.reservation, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error creating reservation: ${error}` }], isError: true };
      }
    }
  );

  server.tool(
    'confirm_reservation',
    'Confirm a pending reservation',
    {
      reservationId: z.string().describe('The reservation ID to confirm'),
    },
    async ({ reservationId }) => {
      try {
        const data = await graphqlQuery<any>(CONFIRM_RESERVATION, {
          input: { reservationId },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.confirmReservation.reservation, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error confirming reservation: ${error}` }], isError: true };
      }
    }
  );

  server.tool(
    'cancel_reservation',
    'Cancel a reservation with a reason',
    {
      reservationId: z.string().describe('The reservation ID to cancel'),
      reason: z.string().describe('Reason for cancellation'),
    },
    async ({ reservationId, reason }) => {
      try {
        const data = await graphqlQuery<any>(CANCEL_RESERVATION, {
          input: { reservationId, reason },
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.cancelReservation.reservation, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error cancelling reservation: ${error}` }], isError: true };
      }
    }
  );

  return server;
}
