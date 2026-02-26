import { AccountRow } from '../event-sourcing/account-projections';

export function formatAccount(account: AccountRow) {
  return {
    id: account.id,
    streamId: account.stream_id,
    reservationId: account.reservation_id,
    totalPrice: Number(account.total_price),
    payedPrice: Number(account.payed_price),
    currency: account.currency,
    createdAt: account.created_at.toISOString(),
    updatedAt: account.updated_at.toISOString(),
  };
}
