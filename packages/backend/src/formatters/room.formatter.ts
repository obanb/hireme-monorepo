import { RoomType, RoomStatus } from "../event-sourcing";

export function formatRoom(room: {
  id: string;
  name: string;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  color: string;
  roomTypeId?: string | null;
  rateCodeId?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: room.id,
    name: room.name,
    roomNumber: room.roomNumber,
    type: room.type,
    capacity: room.capacity,
    status: room.status,
    color: room.color,
    roomTypeId: room.roomTypeId || null,
    rateCodeId: room.rateCodeId || null,
    version: room.version,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export function formatRoomType(roomType: {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: roomType.id,
    code: roomType.code,
    name: roomType.name,
    isActive: roomType.isActive,
    version: roomType.version,
    createdAt: roomType.createdAt.toISOString(),
    updatedAt: roomType.updatedAt.toISOString(),
  };
}

export function formatRateCode(rateCode: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rateCode.id,
    code: rateCode.code,
    name: rateCode.name,
    description: rateCode.description,
    isActive: rateCode.isActive,
    version: rateCode.version,
    createdAt: rateCode.createdAt.toISOString(),
    updatedAt: rateCode.updatedAt.toISOString(),
  };
}
