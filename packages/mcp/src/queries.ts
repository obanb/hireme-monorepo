export const GET_RESERVATIONS = `
  query GetReservations($filter: ReservationFilterInput, $limit: Int, $offset: Int) {
    reservations(filter: $filter, limit: $limit, offset: $offset) {
      id
      guestName
      status
      checkInDate
      checkOutDate
      totalAmount
      currency
      roomId
      version
      createdAt
    }
  }
`;

export const GET_RESERVATION_BY_ID = `
  query GetReservation($id: ID!) {
    reservation(id: $id) {
      id
      guestName
      status
      checkInDate
      checkOutDate
      totalAmount
      currency
      roomId
      room {
        id
        name
        roomNumber
        type
        capacity
        status
      }
      version
      createdAt
      updatedAt
    }
  }
`;

export const GET_ROOMS = `
  query GetRooms($type: RoomType, $status: RoomStatus) {
    rooms(type: $type, status: $status) {
      id
      name
      roomNumber
      type
      capacity
      status
      color
      roomTypeId
      rateCodeId
    }
  }
`;

export const GET_ROOM_TYPES = `
  query GetRoomTypes($includeInactive: Boolean) {
    roomTypes(includeInactive: $includeInactive) {
      id
      code
      name
      isActive
    }
  }
`;

export const GET_RATE_CODES = `
  query GetRateCodes($includeInactive: Boolean) {
    rateCodes(includeInactive: $includeInactive) {
      id
      code
      name
      description
      isActive
    }
  }
`;

export const CREATE_RESERVATION = `
  mutation CreateReservation($input: CreateReservationInput!) {
    createReservation(input: $input) {
      reservation {
        id
        guestName
        status
        checkInDate
        checkOutDate
        totalAmount
        currency
        roomId
        version
        createdAt
      }
    }
  }
`;

export const CONFIRM_RESERVATION = `
  mutation ConfirmReservation($input: ConfirmReservationInput!) {
    confirmReservation(input: $input) {
      reservation {
        id
        guestName
        status
        version
      }
    }
  }
`;

export const CANCEL_RESERVATION = `
  mutation CancelReservation($input: CancelReservationInput!) {
    cancelReservation(input: $input) {
      reservation {
        id
        guestName
        status
        version
      }
    }
  }
`;
