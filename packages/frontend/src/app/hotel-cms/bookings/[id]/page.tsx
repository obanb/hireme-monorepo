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
  status: string;
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

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

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ListRooms {
              rooms {
                id
                name
                roomNumber
                type
                color
                status
              }
            }
          `,
        }),
      });

      const result = await response.json();
      if (!result.errors) {
        setRooms(result.data?.rooms ?? []);
      }
    } catch {
      // Silently fail rooms fetch
    }
  }, []);

  useEffect(() => {
    fetchReservation();
    fetchRooms();
  }, [fetchReservation, fetchRooms]);

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

  const handleAssignRoom = async () => {
    if (!selectedRoomId) {
      setError('Please select a room');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation AssignRoom($input: AssignRoomInput!) {
              assignRoom(input: $input) {
                reservation {
                  id
                  roomId
                }
              }
            }
          `,
          variables: {
            input: {
              reservationId,
              roomId: selectedRoomId,
            },
          },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to assign room');
      }

      setShowRoomDialog(false);
      setSelectedRoomId('');
      await fetchReservation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign room');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-lime-100 text-lime-700 border-lime-200';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ReservationCreated':
        return { icon: '+', color: 'bg-violet-500' };
      case 'ReservationConfirmed':
        return { icon: '\u2713', color: 'bg-lime-500' };
      case 'ReservationCancelled':
        return { icon: '\u2717', color: 'bg-red-500' };
      default:
        return { icon: '?', color: 'bg-stone-500' };
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
      <div className="flex min-h-screen bg-stone-100">
        <HotelSidebar />
        <main className="flex-1 ml-72 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse text-center text-stone-500 py-12">
              Loading reservation...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="flex min-h-screen bg-stone-100">
        <HotelSidebar />
        <main className="flex-1 ml-72 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">▣</div>
              <p className="text-lg font-bold text-stone-700">Reservation not found</p>
              <Link
                href="/hotel-cms/bookings"
                className="mt-4 inline-block px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-bold"
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
    <div className="flex min-h-screen bg-stone-100">
      <HotelSidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <div className="mb-6">
            <Link
              href="/hotel-cms/calendar"
              className="text-lime-600 hover:text-lime-700 flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Calendar
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700">
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
          <div className="bg-white rounded-3xl border-2 border-stone-200 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black text-stone-900">{reservation.guestName}</h1>
                  <span className={`px-3 py-1 text-sm font-bold rounded-xl border-2 ${getStatusColor(reservation.status)}`}>
                    {reservation.status}
                  </span>
                </div>
                <p className="text-stone-500 font-mono text-sm">ID: {reservation.id}</p>
                {reservation.originId && (
                  <p className="text-stone-500 text-sm mt-1">Origin: {reservation.originId}</p>
                )}
              </div>
              <div className="flex gap-3">
                {reservation.status === 'PENDING' && (
                  <button
                    onClick={handleConfirm}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-lime-500 text-white font-bold rounded-xl hover:bg-lime-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Confirm'}
                  </button>
                )}
                {reservation.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setShowCancelDialog(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
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
            <div className="bg-white rounded-3xl border-2 border-stone-200 p-6">
              <h2 className="text-lg font-black text-stone-900 mb-4">Stay Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-stone-500">Check-in</label>
                  <p className="text-stone-900 font-bold">{reservation.checkInDate}</p>
                </div>
                <div>
                  <label className="text-sm text-stone-500">Check-out</label>
                  <p className="text-stone-900 font-bold">{reservation.checkOutDate}</p>
                </div>
                <div>
                  <label className="text-sm text-stone-500">Total Amount</label>
                  <p className="text-stone-900 font-black text-lg">
                    {reservation.totalAmount?.toLocaleString('en-US', {
                      style: 'currency',
                      currency: reservation.currency || 'USD',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Room Details */}
            <div className="bg-white rounded-3xl border-2 border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-stone-900">Room</h2>
                {reservation.status !== 'CANCELLED' && (
                  <button
                    onClick={() => {
                      setSelectedRoomId(reservation.roomId || '');
                      setShowRoomDialog(true);
                    }}
                    className="px-3 py-1 text-sm text-lime-600 hover:bg-lime-50 rounded-lg transition-colors font-bold"
                  >
                    {reservation.room ? 'Change' : 'Assign'}
                  </button>
                )}
              </div>
              {reservation.room ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-lg"
                      style={{ backgroundColor: reservation.room.color }}
                    />
                    <div>
                      <p className="text-stone-900 font-bold">{reservation.room.name}</p>
                      <p className="text-sm text-stone-500">#{reservation.room.roomNumber}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-stone-500">Room Type</label>
                    <p className="text-stone-900">{reservation.room.type}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-stone-500 mb-3">No room assigned</p>
                  {reservation.status !== 'CANCELLED' && (
                    <button
                      onClick={() => setShowRoomDialog(true)}
                      className="px-4 py-2 bg-stone-900 text-white text-sm rounded-xl hover:bg-stone-800 transition-colors font-bold"
                    >
                      Assign Room
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 p-6 mb-6">
            <h2 className="text-lg font-black text-stone-900 mb-4">Metadata</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-stone-500">Version</label>
                <p className="text-stone-900 font-mono">{reservation.version}</p>
              </div>
              <div>
                <label className="text-stone-500">Created</label>
                <p className="text-stone-900">{new Date(reservation.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-stone-500">Updated</label>
                <p className="text-stone-900">{new Date(reservation.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Event History (Audit Trail) */}
          <div className="bg-white rounded-3xl border-2 border-stone-200 p-6">
            <h2 className="text-lg font-black text-stone-900 mb-4">
              Event History
              <span className="ml-2 text-sm font-normal text-stone-500">
                (Audit Trail)
              </span>
            </h2>
            {events.length === 0 ? (
              <p className="text-stone-500">No events recorded</p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-stone-200" />

                {/* Events */}
                <div className="space-y-6">
                  {events.map((event) => {
                    const { icon, color } = getEventIcon(event.type);
                    return (
                      <div key={event.id} className="relative pl-12">
                        {/* Timeline dot */}
                        <div className={`absolute left-2 w-5 h-5 rounded-lg ${color} flex items-center justify-center text-white text-xs font-bold`}>
                          {icon}
                        </div>

                        {/* Event content */}
                        <div className="bg-stone-50 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-stone-900">{event.type}</span>
                            <span className="text-sm text-stone-500">
                              v{event.version}
                            </span>
                          </div>
                          <p className="text-sm text-stone-600 mb-2">
                            {new Date(event.occurredAt).toLocaleString()}
                          </p>
                          <details className="text-sm">
                            <summary className="cursor-pointer text-lime-600 hover:text-lime-700 font-medium">
                              View event data
                            </summary>
                            <pre className="mt-2 p-3 bg-stone-100 rounded-xl text-xs overflow-x-auto text-stone-700">
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
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-black text-stone-900 mb-4">Cancel Reservation</h3>
            <p className="text-stone-600 mb-4">
              Please provide a reason for cancelling this reservation.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cancellation reason..."
              className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors font-bold"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading || !cancelReason.trim()}
                className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Cancel Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Assignment Dialog */}
      {showRoomDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-black text-stone-900 mb-4">
              {reservation?.room ? 'Change Room' : 'Assign Room'}
            </h3>
            <p className="text-stone-600 mb-4">
              Select a room for this reservation.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {rooms.length === 0 ? (
                <p className="text-stone-500 text-center py-4">No rooms available</p>
              ) : (
                rooms.map((room) => (
                  <label
                    key={room.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      selectedRoomId === room.id
                        ? 'border-lime-400 bg-lime-50'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="room"
                      value={room.id}
                      checked={selectedRoomId === room.id}
                      onChange={() => setSelectedRoomId(room.id)}
                      className="text-lime-600 focus:ring-lime-400"
                    />
                    <div
                      className="w-4 h-4 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: room.color }}
                    />
                    <div className="flex-1">
                      <p className="font-bold text-stone-900">{room.name}</p>
                      <p className="text-sm text-stone-500">
                        #{room.roomNumber} - {room.type}
                      </p>
                    </div>
                    {room.status !== 'AVAILABLE' && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                        room.status === 'OCCUPIED'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {room.status}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRoomDialog(false);
                  setSelectedRoomId('');
                }}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRoom}
                disabled={actionLoading || !selectedRoomId}
                className="px-4 py-2 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Assigning...' : 'Assign Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
