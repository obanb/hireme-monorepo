'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import HotelSidebar from '@/components/HotelSidebar';

interface Room {
  id: string;
  name: string;
  roomNumber: string;
  type: string;
  color: string;
}

interface Reservation {
  id: string;
  originId: string | null;
  guestName: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  currency: string;
  roomId: string | null;
  room: Room | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface StoredEvent {
  id: number;
  streamId: string;
  version: number;
  type: string;
  data: string;
  metadata: string | null;
  occurredAt: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

export default function ReservationDetailPage() {
  const params = useParams();
  const reservationId = params.id as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchReservation = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch reservation and event history in parallel
      const [reservationResponse, eventsResponse] = await Promise.all([
        fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetReservation($id: ID!) {
                reservation(id: $id) {
                  id
                  originId
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
                    color
                  }
                  version
                  createdAt
                  updatedAt
                }
              }
            `,
            variables: { id: reservationId },
          }),
        }),
        fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetEventHistory($id: ID!) {
                reservationEventHistory(id: $id) {
                  id
                  streamId
                  version
                  type
                  data
                  metadata
                  occurredAt
                }
              }
            `,
            variables: { id: reservationId },
          }),
        }),
      ]);

      const [reservationResult, eventsResult] = await Promise.all([
        reservationResponse.json(),
        eventsResponse.json(),
      ]);

      if (reservationResult.errors) {
        throw new Error(reservationResult.errors[0]?.message ?? 'Failed to fetch reservation');
      }
      if (eventsResult.errors) {
        throw new Error(eventsResult.errors[0]?.message ?? 'Failed to fetch event history');
      }

      setReservation(reservationResult.data?.reservation ?? null);
      setEvents(eventsResult.data?.reservationEventHistory ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation ConfirmReservation($input: ConfirmReservationInput!) {
              confirmReservation(input: $input) {
                reservation {
                  id
                  status
                }
              }
            }
          `,
          variables: {
            input: {
              reservationId,
              confirmedBy: 'Hotel Staff',
            },
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to confirm reservation');
      }

      await fetchReservation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm reservation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation CancelReservation($input: CancelReservationInput!) {
              cancelReservation(input: $input) {
                reservation {
                  id
                  status
                }
              }
            }
          `,
          variables: {
            input: {
              reservationId,
              reason: cancelReason,
            },
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to cancel reservation');
      }

      setShowCancelDialog(false);
      setCancelReason('');
      await fetchReservation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel reservation');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ReservationCreated':
        return { icon: '+', color: 'bg-blue-500' };
      case 'ReservationConfirmed':
        return { icon: '\u2713', color: 'bg-green-500' };
      case 'ReservationCancelled':
        return { icon: '\u2717', color: 'bg-red-500' };
      default:
        return { icon: '?', color: 'bg-slate-500' };
    }
  };

  const formatEventData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <HotelSidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse text-center text-slate-500 py-12">
              Loading reservation...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <HotelSidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">&#x1F4CB;</div>
              <p className="text-lg font-medium text-slate-700">Reservation not found</p>
              <Link
                href="/hotel-cms/bookings"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Bookings
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <HotelSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <div className="mb-6">
            <Link
              href="/hotel-cms/calendar"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Calendar
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-500 hover:text-red-700"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Reservation Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-800">{reservation.guestName}</h1>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(reservation.status)}`}>
                    {reservation.status}
                  </span>
                </div>
                <p className="text-slate-500 font-mono text-sm">ID: {reservation.id}</p>
                {reservation.originId && (
                  <p className="text-slate-500 text-sm mt-1">Origin: {reservation.originId}</p>
                )}
              </div>
              <div className="flex gap-3">
                {reservation.status === 'PENDING' && (
                  <button
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Confirm'}
                  </button>
                )}
                {reservation.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Stay Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Stay Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500">Check-in</label>
                  <p className="text-slate-800 font-medium">{reservation.checkInDate}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Check-out</label>
                  <p className="text-slate-800 font-medium">{reservation.checkOutDate}</p>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Total Amount</label>
                  <p className="text-slate-800 font-medium text-lg">
                    {reservation.totalAmount?.toLocaleString('en-US', {
                      style: 'currency',
                      currency: reservation.currency || 'USD',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Room Details */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Room</h2>
              {reservation.room ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: reservation.room.color }}
                    />
                    <div>
                      <p className="text-slate-800 font-medium">{reservation.room.name}</p>
                      <p className="text-sm text-slate-500">#{reservation.room.roomNumber}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Room Type</label>
                    <p className="text-slate-800">{reservation.room.type}</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No room assigned</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Metadata</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-slate-500">Version</label>
                <p className="text-slate-800 font-mono">{reservation.version}</p>
              </div>
              <div>
                <label className="text-slate-500">Created</label>
                <p className="text-slate-800">{new Date(reservation.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-slate-500">Updated</label>
                <p className="text-slate-800">{new Date(reservation.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Event History (Audit Trail) */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Event History
              <span className="ml-2 text-sm font-normal text-slate-500">
                (Audit Trail)
              </span>
            </h2>
            {events.length === 0 ? (
              <p className="text-slate-500">No events recorded</p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                {/* Events */}
                <div className="space-y-6">
                  {events.map((event) => {
                    const { icon, color } = getEventIcon(event.type);
                    return (
                      <div key={event.id} className="relative pl-12">
                        {/* Timeline dot */}
                        <div className={`absolute left-2 w-5 h-5 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold`}>
                          {icon}
                        </div>

                        {/* Event content */}
                        <div className="bg-slate-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-800">{event.type}</span>
                            <span className="text-sm text-slate-500">
                              v{event.version}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            {new Date(event.occurredAt).toLocaleString()}
                          </p>
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              View event data
                            </summary>
                            <pre className="mt-2 p-3 bg-slate-100 rounded text-xs overflow-x-auto text-slate-700">
                              {formatEventData(event.data)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Cancel Reservation</h3>
            <p className="text-slate-600 mb-4">
              Please provide a reason for cancelling this reservation.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cancellation reason..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Cancel Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
