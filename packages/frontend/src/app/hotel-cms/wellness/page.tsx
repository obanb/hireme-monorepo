'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import HotelSidebar from '@/components/HotelSidebar';

// Types
interface WellnessTherapist {
  id: string;
  code: string;
  name: string;
  serviceTypesBitMask: number;
  isVirtual: boolean;
  isActive: boolean;
}

interface WellnessRoomType {
  id: string;
  name: string;
  bit: number;
  maskValue: number;
  isActive: boolean;
}

interface WellnessService {
  id: string;
  name: string;
  priceNormal: number;
  priceOBE: number | null;
  priceOVE: number | null;
  vatCharge: number;
  serviceTypeBitMask: number;
  duration: number;
  pauseBefore: number;
  pauseAfter: number;
  needsTherapist: boolean;
  needsRoom: boolean;
  isActive: boolean;
}

interface WellnessBooking {
  id: string;
  reservationId: string | null;
  guestName: string;
  serviceId: string;
  service?: WellnessService;
  therapistId: string | null;
  therapist?: WellnessTherapist;
  roomTypeId: string | null;
  roomType?: WellnessRoomType;
  scheduledDate: string;
  scheduledTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  price: number;
}

interface Reservation {
  id: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
}

type TabType = 'services' | 'therapists' | 'rooms' | 'calendar';

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getToday(): string {
  return formatDate(new Date());
}

export default function WellnessPage() {
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [services, setServices] = useState<WellnessService[]>([]);
  const [therapists, setTherapists] = useState<WellnessTherapist[]>([]);
  const [roomTypes, setRoomTypes] = useState<WellnessRoomType[]>([]);
  const [bookings, setBookings] = useState<WellnessBooking[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Filter states
  const [includeInactive, setIncludeInactive] = useState(false);
  const [calendarDate, setCalendarDate] = useState(getToday());

  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showTherapistModal, setShowTherapistModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const [editingService, setEditingService] = useState<WellnessService | null>(null);
  const [editingTherapist, setEditingTherapist] = useState<WellnessTherapist | null>(null);
  const [editingRoom, setEditingRoom] = useState<WellnessRoomType | null>(null);

  // Form states
  const [serviceForm, setServiceForm] = useState({
    name: '', priceNormal: 0, vatCharge: 21, duration: 60,
    pauseBefore: 0, pauseAfter: 0, needsTherapist: true, needsRoom: true,
  });
  const [therapistForm, setTherapistForm] = useState({ code: '', name: '', isVirtual: false });
  const [roomForm, setRoomForm] = useState({ name: '', bit: 0, maskValue: 1 });
  const [bookingForm, setBookingForm] = useState({
    reservationId: '', guestName: '', serviceId: '', therapistId: '', roomTypeId: '',
    scheduledDate: getToday(), scheduledTime: '09:00', notes: '',
  });

  // Clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch functions
  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { wellnessServices(includeInactive: ${includeInactive}) {
            id name priceNormal priceOBE priceOVE vatCharge serviceTypeBitMask
            duration pauseBefore pauseAfter needsTherapist needsRoom isActive
          }}`,
        }),
      });
      const result = await response.json();
      if (!result.errors) setServices(result.data?.wellnessServices ?? []);
    } catch {
      setError('Failed to fetch services');
    }
  }, [includeInactive]);

  const fetchTherapists = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { wellnessTherapists(includeInactive: ${includeInactive}) {
            id code name serviceTypesBitMask isVirtual isActive
          }}`,
        }),
      });
      const result = await response.json();
      if (!result.errors) setTherapists(result.data?.wellnessTherapists ?? []);
    } catch {
      setError('Failed to fetch therapists');
    }
  }, [includeInactive]);

  const fetchRoomTypes = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query { wellnessRoomTypes(includeInactive: ${includeInactive}) {
            id name bit maskValue isActive
          }}`,
        }),
      });
      const result = await response.json();
      if (!result.errors) setRoomTypes(result.data?.wellnessRoomTypes ?? []);
    } catch {
      setError('Failed to fetch room types');
    }
  }, [includeInactive]);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query($filter: WellnessBookingFilterInput) {
            wellnessBookings(filter: $filter) {
              id reservationId guestName serviceId therapistId roomTypeId
              scheduledDate scheduledTime endTime status notes price
              service { id name duration }
              therapist { id name }
              roomType { id name }
            }
          }`,
          variables: {
            filter: { scheduledDateFrom: calendarDate, scheduledDateTo: calendarDate },
          },
        }),
      });
      const result = await response.json();
      if (!result.errors) setBookings(result.data?.wellnessBookings ?? []);
    } catch {
      setError('Failed to fetch bookings');
    }
  }, [calendarDate]);

  const fetchReservations = useCallback(async () => {
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `query {
            reservations(filter: { status: "CONFIRMED" }) {
              id guestName checkInDate checkOutDate status
            }
          }`,
        }),
      });
      const result = await response.json();
      if (!result.errors) setReservations(result.data?.reservations ?? []);
    } catch {
      // Silently fail
    }
  }, []);

  // Initial fetch based on tab
  useEffect(() => {
    if (activeTab === 'services') fetchServices();
    else if (activeTab === 'therapists') fetchTherapists();
    else if (activeTab === 'rooms') fetchRoomTypes();
    else if (activeTab === 'calendar') {
      fetchBookings();
      fetchServices();
      fetchTherapists();
      fetchRoomTypes();
      fetchReservations();
    }
  }, [activeTab, fetchServices, fetchTherapists, fetchRoomTypes, fetchBookings, fetchReservations]);

  // CRUD handlers
  const handleCreateService = async () => {
    setLoading(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input: CreateWellnessServiceInput!) {
            createWellnessService(input: $input) { service { id name } }
          }`,
          variables: { input: serviceForm },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);
      setSuccessMessage('Service created successfully');
      setShowServiceModal(false);
      setServiceForm({ name: '', priceNormal: 0, vatCharge: 21, duration: 60, pauseBefore: 0, pauseAfter: 0, needsTherapist: true, needsRoom: true });
      fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    setLoading(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($id: ID!, $input: UpdateWellnessServiceInput!) {
            updateWellnessService(id: $id, input: $input) { service { id } }
          }`,
          variables: { id: editingService.id, input: serviceForm },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);
      setSuccessMessage('Service updated successfully');
      setShowServiceModal(false);
      setEditingService(null);
      fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Deactivate this service?')) return;
    try {
      await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation { deleteWellnessService(id: "${id}") { success } }`,
        }),
      });
      setSuccessMessage('Service deactivated');
      fetchServices();
    } catch {
      setError('Failed to delete service');
    }
  };

  const handleCreateTherapist = async () => {
    setLoading(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input: CreateWellnessTherapistInput!) {
            createWellnessTherapist(input: $input) { therapist { id } }
          }`,
          variables: { input: therapistForm },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);
      setSuccessMessage('Therapist created successfully');
      setShowTherapistModal(false);
      setTherapistForm({ code: '', name: '', isVirtual: false });
      fetchTherapists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create therapist');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTherapist = async () => {
    if (!editingTherapist) return;
    setLoading(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($id: ID!, $input: UpdateWellnessTherapistInput!) {
            updateWellnessTherapist(id: $id, input: $input) { therapist { id } }
          }`,
          variables: { id: editingTherapist.id, input: therapistForm },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);
      setSuccessMessage('Therapist updated successfully');
      setShowTherapistModal(false);
      setEditingTherapist(null);
      fetchTherapists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update therapist');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTherapist = async (id: string) => {
    if (!confirm('Deactivate this therapist?')) return;
    try {
      await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation { deleteWellnessTherapist(id: "${id}") { success } }`,
        }),
      });
      setSuccessMessage('Therapist deactivated');
      fetchTherapists();
    } catch {
      setError('Failed to delete therapist');
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input: CreateWellnessRoomTypeInput!) {
            createWellnessRoomType(input: $input) { roomType { id } }
          }`,
          variables: { input: roomForm },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);
      setSuccessMessage('Room created successfully');
      setShowRoomModal(false);
      setRoomForm({ name: '', bit: 0, maskValue: 1 });
      fetchRoomTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom) return;
    setLoading(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($id: ID!, $input: UpdateWellnessRoomTypeInput!) {
            updateWellnessRoomType(id: $id, input: $input) { roomType { id } }
          }`,
          variables: { id: editingRoom.id, input: roomForm },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);
      setSuccessMessage('Room updated successfully');
      setShowRoomModal(false);
      setEditingRoom(null);
      fetchRoomTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Deactivate this room?')) return;
    try {
      await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation { deleteWellnessRoomType(id: "${id}") { success } }`,
        }),
      });
      setSuccessMessage('Room deactivated');
      fetchRoomTypes();
    } catch {
      setError('Failed to delete room');
    }
  };

  const handleCreateBooking = async () => {
    setLoading(true);
    try {
      const input: Record<string, unknown> = {
        guestName: bookingForm.guestName,
        serviceId: bookingForm.serviceId,
        scheduledDate: bookingForm.scheduledDate,
        scheduledTime: bookingForm.scheduledTime,
      };
      if (bookingForm.reservationId) input.reservationId = bookingForm.reservationId;
      if (bookingForm.therapistId) input.therapistId = bookingForm.therapistId;
      if (bookingForm.roomTypeId) input.roomTypeId = bookingForm.roomTypeId;
      if (bookingForm.notes) input.notes = bookingForm.notes;

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation($input: CreateWellnessBookingInput!) {
            createWellnessBooking(input: $input) { booking { id } }
          }`,
          variables: { input },
        }),
      });
      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0]?.message);
      setSuccessMessage('Booking created successfully');
      setShowBookingModal(false);
      setBookingForm({
        reservationId: '', guestName: '', serviceId: '', therapistId: '', roomTypeId: '',
        scheduledDate: calendarDate, scheduledTime: '09:00', notes: '',
      });
      fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation { cancelWellnessBooking(id: "${id}") { booking { id } } }`,
        }),
      });
      setSuccessMessage('Booking cancelled');
      fetchBookings();
    } catch {
      setError('Failed to cancel booking');
    }
  };

  // Time slots for calendar
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 8; h <= 20; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Get bookings for a time slot
  const getBookingsForSlot = (time: string) => {
    return bookings.filter((b) => {
      const [bh] = b.scheduledTime.split(':').map(Number);
      const [sh] = time.split(':').map(Number);
      return bh === sh && b.status !== 'CANCELLED';
    });
  };

  const openEditService = (service: WellnessService) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      priceNormal: service.priceNormal,
      vatCharge: service.vatCharge,
      duration: service.duration,
      pauseBefore: service.pauseBefore,
      pauseAfter: service.pauseAfter,
      needsTherapist: service.needsTherapist,
      needsRoom: service.needsRoom,
    });
    setShowServiceModal(true);
  };

  const openEditTherapist = (therapist: WellnessTherapist) => {
    setEditingTherapist(therapist);
    setTherapistForm({ code: therapist.code, name: therapist.name, isVirtual: therapist.isVirtual });
    setShowTherapistModal(true);
  };

  const openEditRoom = (room: WellnessRoomType) => {
    setEditingRoom(room);
    setRoomForm({ name: room.name, bit: room.bit, maskValue: room.maskValue });
    setShowRoomModal(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <HotelSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">Wellness & Spa</h1>
            <p className="text-slate-600">Manage services, therapists, rooms, and appointments</p>
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">&times;</button>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">&times;</button>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="flex border-b border-slate-200">
              {(['services', 'therapists', 'rooms', 'calendar'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'services' && '&#128134; Services'}
                  {tab === 'therapists' && '&#129489; Therapists'}
                  {tab === 'rooms' && '&#127970; Rooms'}
                  {tab === 'calendar' && '&#128197; Calendar'}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Services Tab */}
              {activeTab === 'services' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} className="rounded" />
                      <span className="text-sm text-slate-600">Show inactive</span>
                    </label>
                    <button
                      onClick={() => { setEditingService(null); setServiceForm({ name: '', priceNormal: 0, vatCharge: 21, duration: 60, pauseBefore: 0, pauseAfter: 0, needsTherapist: true, needsRoom: true }); setShowServiceModal(true); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      + Add Service
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {services.map((service) => (
                      <div key={service.id} className={`p-4 border rounded-lg ${service.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-800">{service.name}</h3>
                            <div className="text-sm text-slate-500 mt-1">
                              {service.duration} min | {service.priceNormal.toLocaleString('cs-CZ')} CZK | VAT {service.vatCharge}%
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {service.needsTherapist && 'Needs therapist'} {service.needsRoom && '| Needs room'}
                              {service.pauseBefore > 0 && ` | ${service.pauseBefore}min before`}
                              {service.pauseAfter > 0 && ` | ${service.pauseAfter}min after`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditService(service)} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                            {service.isActive && (
                              <button onClick={() => handleDeleteService(service.id)} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">Deactivate</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {services.length === 0 && <div className="text-center text-slate-500 py-8">No services found</div>}
                  </div>
                </div>
              )}

              {/* Therapists Tab */}
              {activeTab === 'therapists' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} className="rounded" />
                      <span className="text-sm text-slate-600">Show inactive</span>
                    </label>
                    <button
                      onClick={() => { setEditingTherapist(null); setTherapistForm({ code: '', name: '', isVirtual: false }); setShowTherapistModal(true); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      + Add Therapist
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {therapists.map((therapist) => (
                      <div key={therapist.id} className={`p-4 border rounded-lg ${therapist.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-800">{therapist.name}</h3>
                            <div className="text-sm text-slate-500 mt-1">{therapist.code}</div>
                            {therapist.isVirtual && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded mt-2 inline-block">Virtual</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditTherapist(therapist)} className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                            {therapist.isActive && (
                              <button onClick={() => handleDeleteTherapist(therapist.id)} className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded">X</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {therapists.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">No therapists found</div>}
                  </div>
                </div>
              )}

              {/* Rooms Tab */}
              {activeTab === 'rooms' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} className="rounded" />
                      <span className="text-sm text-slate-600">Show inactive</span>
                    </label>
                    <button
                      onClick={() => { setEditingRoom(null); setRoomForm({ name: '', bit: 0, maskValue: 1 }); setShowRoomModal(true); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      + Add Room
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {roomTypes.map((room) => (
                      <div key={room.id} className={`p-4 border rounded-lg ${room.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-800">{room.name}</h3>
                            <div className="text-xs text-slate-400 mt-1">Bit: {room.bit} | Mask: {room.maskValue}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditRoom(room)} className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                            {room.isActive && (
                              <button onClick={() => handleDeleteRoom(room.id)} className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded">X</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {roomTypes.length === 0 && <div className="col-span-full text-center text-slate-500 py-8">No rooms found</div>}
                  </div>
                </div>
              )}

              {/* Calendar Tab */}
              {activeTab === 'calendar' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <input
                        type="date"
                        value={calendarDate}
                        onChange={(e) => setCalendarDate(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-lg"
                      />
                      <button onClick={fetchBookings} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Refresh</button>
                    </div>
                    <button
                      onClick={() => { setBookingForm({ ...bookingForm, scheduledDate: calendarDate }); setShowBookingModal(true); }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      + New Booking
                    </button>
                  </div>

                  {/* Timeline */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    {timeSlots.map((time) => {
                      const slotBookings = getBookingsForSlot(time);
                      return (
                        <div key={time} className="flex border-b border-slate-100 last:border-b-0">
                          <div className="w-20 p-3 bg-slate-50 text-sm font-medium text-slate-600 border-r border-slate-200">
                            {time}
                          </div>
                          <div className="flex-1 p-2 min-h-[60px]">
                            {slotBookings.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {slotBookings.map((booking) => (
                                  <div
                                    key={booking.id}
                                    className={`px-3 py-2 rounded-lg text-sm ${
                                      booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                      booking.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                      booking.status === 'NO_SHOW' ? 'bg-red-100 text-red-800' :
                                      'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    <div className="font-medium">{booking.guestName}</div>
                                    <div className="text-xs opacity-75">
                                      {booking.service?.name || 'Service'} | {booking.scheduledTime}-{booking.endTime}
                                      {booking.therapist && ` | ${booking.therapist.name}`}
                                    </div>
                                    {booking.status === 'SCHEDULED' && (
                                      <button
                                        onClick={() => handleCancelBooking(booking.id)}
                                        className="text-xs underline mt-1 opacity-75 hover:opacity-100"
                                      >
                                        Cancel
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-slate-300 text-sm">-</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold">{editingService ? 'Edit Service' : 'Add Service'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="Relaxing massage 60min" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price (Normal) *</label>
                  <input type="number" value={serviceForm.priceNormal} onChange={(e) => setServiceForm({ ...serviceForm, priceNormal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">VAT % *</label>
                  <input type="number" value={serviceForm.vatCharge} onChange={(e) => setServiceForm({ ...serviceForm, vatCharge: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min) *</label>
                  <input type="number" value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pause Before</label>
                  <input type="number" value={serviceForm.pauseBefore} onChange={(e) => setServiceForm({ ...serviceForm, pauseBefore: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pause After</label>
                  <input type="number" value={serviceForm.pauseAfter} onChange={(e) => setServiceForm({ ...serviceForm, pauseAfter: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={serviceForm.needsTherapist} onChange={(e) => setServiceForm({ ...serviceForm, needsTherapist: e.target.checked })} className="rounded" />
                  <span className="text-sm">Needs Therapist</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={serviceForm.needsRoom} onChange={(e) => setServiceForm({ ...serviceForm, needsRoom: e.target.checked })} className="rounded" />
                  <span className="text-sm">Needs Room</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowServiceModal(false); setEditingService(null); }} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg">Cancel</button>
                <button onClick={editingService ? handleUpdateService : handleCreateService} disabled={loading || !serviceForm.name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {loading ? 'Saving...' : editingService ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Therapist Modal */}
      {showTherapistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold">{editingTherapist ? 'Edit Therapist' : 'Add Therapist'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                <input type="text" value={therapistForm.code} onChange={(e) => setTherapistForm({ ...therapistForm, code: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="Marina - female" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={therapistForm.name} onChange={(e) => setTherapistForm({ ...therapistForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="Marina Kovalenko" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={therapistForm.isVirtual} onChange={(e) => setTherapistForm({ ...therapistForm, isVirtual: e.target.checked })} className="rounded" />
                <span className="text-sm">Virtual Therapist</span>
              </label>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowTherapistModal(false); setEditingTherapist(null); }} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg">Cancel</button>
                <button onClick={editingTherapist ? handleUpdateTherapist : handleCreateTherapist} disabled={loading || !therapistForm.code || !therapistForm.name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {loading ? 'Saving...' : editingTherapist ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold">{editingRoom ? 'Edit Room' : 'Add Room'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="Room A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bit</label>
                  <input type="number" value={roomForm.bit} onChange={(e) => setRoomForm({ ...roomForm, bit: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mask Value</label>
                  <input type="number" value={roomForm.maskValue} onChange={(e) => setRoomForm({ ...roomForm, maskValue: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowRoomModal(false); setEditingRoom(null); }} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg">Cancel</button>
                <button onClick={editingRoom ? handleUpdateRoom : handleCreateRoom} disabled={loading || !roomForm.name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {loading ? 'Saving...' : editingRoom ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold">New Wellness Booking</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link to Reservation (optional)</label>
                <select value={bookingForm.reservationId} onChange={(e) => {
                  const res = reservations.find(r => r.id === e.target.value);
                  setBookingForm({ ...bookingForm, reservationId: e.target.value, guestName: res?.guestName || bookingForm.guestName });
                }} className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option value="">-- Select guest from reservations --</option>
                  {reservations.map((r) => (
                    <option key={r.id} value={r.id}>{r.guestName} ({r.checkInDate} - {r.checkOutDate})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Guest Name *</label>
                <input type="text" value={bookingForm.guestName} onChange={(e) => setBookingForm({ ...bookingForm, guestName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" placeholder="Guest name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service *</label>
                <select value={bookingForm.serviceId} onChange={(e) => setBookingForm({ ...bookingForm, serviceId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option value="">-- Select service --</option>
                  {services.filter(s => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.duration}min - {s.priceNormal} CZK)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input type="date" value={bookingForm.scheduledDate} onChange={(e) => setBookingForm({ ...bookingForm, scheduledDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
                  <input type="time" value={bookingForm.scheduledTime} onChange={(e) => setBookingForm({ ...bookingForm, scheduledTime: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Therapist</label>
                <select value={bookingForm.therapistId} onChange={(e) => setBookingForm({ ...bookingForm, therapistId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option value="">-- Select therapist --</option>
                  {therapists.filter(t => t.isActive).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                <select value={bookingForm.roomTypeId} onChange={(e) => setBookingForm({ ...bookingForm, roomTypeId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg">
                  <option value="">-- Select room --</option>
                  {roomTypes.filter(r => r.isActive).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={bookingForm.notes} onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={2} placeholder="Additional notes..." />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowBookingModal(false)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg">Cancel</button>
                <button onClick={handleCreateBooking} disabled={loading || !bookingForm.guestName || !bookingForm.serviceId}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
