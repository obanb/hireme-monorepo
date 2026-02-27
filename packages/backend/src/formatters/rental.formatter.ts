import { RentalItemRow, RentalBookingRow } from '../rentals/rental.repository';

export function formatRentalItem(row: RentalItemRow & { available_quantity?: number }) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    category: row.category,
    imageUrl: row.image_url ?? null,
    totalQuantity: row.total_quantity,
    availableQuantity: row.available_quantity ?? 0,
    dailyRate: row.daily_rate != null ? parseFloat(row.daily_rate) : null,
    currency: row.currency ?? null,
    isActive: row.is_active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

export function formatRentalBooking(row: RentalBookingRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    guestName: row.guest_name,
    guestId: row.guest_id ?? null,
    quantity: row.quantity,
    status: row.status,
    borrowedAt: row.borrowed_at instanceof Date ? row.borrowed_at.toISOString() : row.borrowed_at,
    dueDate: row.due_date ?? null,
    returnedAt: row.returned_at instanceof Date ? row.returned_at.toISOString() : (row.returned_at ?? null),
    notes: row.notes ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
