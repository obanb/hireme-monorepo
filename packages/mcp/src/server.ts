import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { tavily } from '@tavily/core';
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
  GET_GUESTS,
  GET_GUEST_BY_ID,
  GET_GUEST_BY_EMAIL,
  CREATE_GUEST,
} from './queries';

const tavilyClient = process.env.TAVILY_API_KEY
  ? tavily({ apiKey: process.env.TAVILY_API_KEY })
  : null;

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
      guestEmail: z.string().optional().describe('Guest email address'),
      checkInDate: z.string().describe('Check-in date (ISO date string)'),
      checkOutDate: z.string().describe('Check-out date (ISO date string)'),
      roomId: z.string().optional().describe('Room ID to assign'),
      totalAmount: z.number().optional().describe('Total reservation amount'),
      currency: z.string().optional().describe('Currency code (e.g. EUR, USD)'),
    },
    async ({ guestFirstName, guestLastName, guestEmail, checkInDate, checkOutDate, roomId, totalAmount, currency }) => {
      try {
        const input: Record<string, any> = {
          guestFirstName,
          guestLastName,
          checkInDate,
          checkOutDate,
        };
        if (guestEmail) input.guestEmail = guestEmail;
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

  server.tool(
    'get_guests',
    'List/search guest profiles with optional filters for email, name, nationality, passport number',
    {
      email: z.string().optional().describe('Filter by email (partial match)'),
      name: z.string().optional().describe('Filter by first or last name (partial match)'),
      nationality: z.string().optional().describe('Filter by nationality'),
      passportNumber: z.string().optional().describe('Filter by passport number'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination'),
    },
    async ({ email, name, nationality, passportNumber, limit, offset }) => {
      try {
        const filter: Record<string, any> = {};
        if (email) filter.email = email;
        if (name) filter.name = name;
        if (nationality) filter.nationality = nationality;
        if (passportNumber) filter.passportNumber = passportNumber;

        const data = await graphqlQuery<any>(GET_GUESTS, {
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          limit,
          offset,
        });

        return { content: [{ type: 'text' as const, text: JSON.stringify(data.guests, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error fetching guests: ${error}` }], isError: true };
      }
    }
  );

  server.tool(
    'get_guest_by_email',
    'Look up a guest profile by their email address, including their reservation history',
    {
      email: z.string().describe('The guest email address'),
    },
    async ({ email }) => {
      try {
        const data = await graphqlQuery<any>(GET_GUEST_BY_EMAIL, { email });
        if (!data.guestByEmail) {
          return { content: [{ type: 'text' as const, text: `No guest found with email: ${email}` }], isError: true };
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.guestByEmail, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error fetching guest: ${error}` }], isError: true };
      }
    }
  );

  server.tool(
    'create_guest',
    'Create a new guest profile',
    {
      email: z.string().describe('Guest email address (unique identifier)'),
      firstName: z.string().optional().describe('Guest first name'),
      lastName: z.string().optional().describe('Guest last name'),
      phone: z.string().optional().describe('Phone number'),
      nationality: z.string().optional().describe('Nationality'),
      passportNumber: z.string().optional().describe('Passport number'),
    },
    async ({ email, firstName, lastName, phone, nationality, passportNumber }) => {
      try {
        const input: Record<string, any> = { email };
        if (firstName) input.firstName = firstName;
        if (lastName) input.lastName = lastName;
        if (phone) input.phone = phone;
        if (nationality) input.nationality = nationality;
        if (passportNumber) input.passportNumber = passportNumber;

        const data = await graphqlQuery<any>(CREATE_GUEST, { input });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data.createGuest.guest, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error creating guest: ${error}` }], isError: true };
      }
    }
  );

  server.tool(
    'web_search',
    'Search the internet for real-time information: local events, cultural programs, tourist attractions, restaurants, weather, news, or anything not stored in the hotel system. Use this when the question requires live external data.',
    {
      query: z.string().describe('Search query in natural language'),
      maxResults: z.number().optional().describe('Number of results to return (default 5, max 10)'),
    },
    // @ts-expect-error TS2589 - MCP SDK zod type inference depth limit
    async ({ query, maxResults = 5 }: { query: string; maxResults?: number }) => {
      if (!tavilyClient) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Web search is not configured. Set TAVILY_API_KEY in packages/mcp/.env to enable it.' }) }],
          isError: true,
        };
      }
      try {
        const response = await tavilyClient.search(query, {
          maxResults: Math.min(maxResults, 10),
          searchDepth: 'basic',
        });
        const results = response.results.map((r: { title: string; url: string; content: string; score?: number }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          relevance: r.score,
        }));
        return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Web search error: ${error}` }], isError: true };
      }
    }
  );

  server.tool(
    'navigate_to',
    'Navigate the frontend application to a specific page. Use this after fetching data when the user wants to see/view/show a specific entity.',
    {
      page: z.enum([
        'dashboard', 'bookings', 'booking_detail', 'calendar',
        'rooms', 'room_types', 'rate_codes', 'reception',
        'wellness', 'vouchers', 'guests', 'guest_detail', 'statistics',
      ]).describe('The page to navigate to'),
      entityId: z.string().optional().describe('Entity ID for detail pages (e.g. reservation ID for booking_detail)'),
    },
    // @ts-expect-error TS2589 - MCP SDK zod type inference depth limit
    async ({ page, entityId }: { page: string; entityId?: string }) => {
      const routes: Record<string, string> = {
        dashboard: '/hotel-cms',
        bookings: '/hotel-cms/bookings',
        booking_detail: `/hotel-cms/bookings/${entityId}`,
        calendar: '/hotel-cms/calendar',
        rooms: '/hotel-cms/rooms',
        room_types: '/hotel-cms/room-types',
        rate_codes: '/hotel-cms/rate-codes',
        reception: '/hotel-cms/reception',
        wellness: '/hotel-cms/wellness',
        vouchers: '/hotel-cms/vouchers',
        guests: '/hotel-cms/guests',
        guest_detail: `/hotel-cms/guests/${entityId}`,
        statistics: '/hotel-cms/statistics',
      };

      const path = routes[page];
      if (!path) {
        return { content: [{ type: 'text' as const, text: `Unknown page: ${page}` }], isError: true };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ __action: 'navigate', path }),
        }],
      };
    }
  );

  return server;
}
