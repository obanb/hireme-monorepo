export interface EmbeddingDocument {
  entityType: string;
  entityId: string;
  content: string;
  metadata: Record<string, any>;
}

export function reservationToDocument(r: any): EmbeddingDocument {
  const parts = [`Reservation ${r.id}.`];
  if (r.guestName) parts.push(`Guest: ${r.guestName}.`);
  if (r.status) parts.push(`Status: ${r.status}.`);
  if (r.checkInDate) parts.push(`Check-in: ${r.checkInDate}.`);
  if (r.checkOutDate) parts.push(`Check-out: ${r.checkOutDate}.`);
  if (r.totalAmount != null) parts.push(`Total: ${r.totalAmount} ${r.currency || ''}.`);
  if (r.room?.roomNumber) parts.push(`Room: ${r.room.roomNumber}.`);

  return {
    entityType: 'reservation',
    entityId: r.id,
    content: parts.join(' '),
    metadata: {
      guestName: r.guestName,
      status: r.status,
      checkInDate: r.checkInDate,
      checkOutDate: r.checkOutDate,
    },
  };
}

export function roomToDocument(r: any): EmbeddingDocument {
  const parts = [`Room ${r.roomNumber}.`];
  if (r.name) parts.push(`Name: ${r.name}.`);
  if (r.type) parts.push(`Type: ${r.type}.`);
  if (r.roomTypeEntity?.name) parts.push(`Category: ${r.roomTypeEntity.name}.`);
  if (r.capacity) parts.push(`Capacity: ${r.capacity}.`);
  if (r.status) parts.push(`Status: ${r.status}.`);
  if (r.rateCode?.name) parts.push(`Rate: ${r.rateCode.name}.`);

  return {
    entityType: 'room',
    entityId: r.id,
    content: parts.join(' '),
    metadata: {
      roomNumber: r.roomNumber,
      type: r.type,
      status: r.status,
    },
  };
}

export function roomTypeToDocument(rt: any): EmbeddingDocument {
  const parts = [`Room type ${rt.code}.`];
  if (rt.name) parts.push(`Name: ${rt.name}.`);
  parts.push(`Active: ${rt.isActive ? 'yes' : 'no'}.`);

  return {
    entityType: 'room_type',
    entityId: rt.id,
    content: parts.join(' '),
    metadata: { code: rt.code, name: rt.name },
  };
}

export function rateCodeToDocument(rc: any): EmbeddingDocument {
  const parts = [`Rate code ${rc.code}.`];
  if (rc.name) parts.push(`Name: ${rc.name}.`);
  if (rc.description) parts.push(`Description: ${rc.description}.`);
  parts.push(`Active: ${rc.isActive ? 'yes' : 'no'}.`);

  return {
    entityType: 'rate_code',
    entityId: rc.id,
    content: parts.join(' '),
    metadata: { code: rc.code, name: rc.name },
  };
}
