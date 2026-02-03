'use client';

import { useState, useEffect, useCallback } from 'react';
import HotelSidebar from '@/components/HotelSidebar';

type RoomType = 'SINGLE' | 'DOUBLE' | 'SUITE' | 'DELUXE' | 'PENTHOUSE';
type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

interface RoomTypeEntity {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface RateCode {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface Room {
  id: string;
  name: string;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  color: string;
  roomTypeId?: string;
  rateCodeId?: string;
  roomTypeEntity?: RoomTypeEntity;
  rateCode?: RateCode;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

interface RoomFormData {
  name: string;
  roomNumber: string;
  type: RoomType;
  capacity: number;
  color: string;
  roomTypeId: string;
  rateCodeId: string;
}

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4001/graphql';

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'DOUBLE', label: 'Double' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'DELUXE', label: 'Deluxe' },
  { value: 'PENTHOUSE', label: 'Penthouse' },
];

const ROOM_STATUSES: { value: RoomStatus; label: string; color: string }[] = [
  { value: 'AVAILABLE', label: 'Available', color: 'bg-green-100 text-green-800' },
  { value: 'OCCUPIED', label: 'Occupied', color: 'bg-blue-100 text-blue-800' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: 'bg-orange-100 text-orange-800' },
];

const DEFAULT_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
  '#6366F1', '#EF4444', '#14B8A6', '#F97316', '#84CC16',
];

const emptyFormData: RoomFormData = {
  name: '',
  roomNumber: '',
  type: 'DOUBLE',
  capacity: 2,
  color: DEFAULT_COLORS[0],
  roomTypeId: '',
  rateCodeId: '',
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypeEntities, setRoomTypeEntities] = useState<RoomTypeEntity[]>([]);
  const [rateCodes, setRateCodes] = useState<RateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(emptyFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Status change modal
  const [statusModalRoom, setStatusModalRoom] = useState<Room | null>(null);
  const [newStatus, setNewStatus] = useState<RoomStatus>('AVAILABLE');
  const [statusReason, setStatusReason] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<RoomType | ''>('');
  const [filterStatus, setFilterStatus] = useState<RoomStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ListRooms($type: RoomType, $status: RoomStatus) {
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
                roomTypeEntity {
                  id
                  code
                  name
                }
                rateCode {
                  id
                  code
                  name
                }
                version
                createdAt
                updatedAt
              }
              roomTypes {
                id
                code
                name
                isActive
              }
              rateCodes {
                id
                code
                name
                isActive
              }
            }
          `,
          variables: {
            type: filterType || null,
            status: filterStatus || null,
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to fetch rooms');
      }

      setRooms(result.data?.rooms ?? []);
      setRoomTypeEntities(result.data?.roomTypes ?? []);
      setRateCodes(result.data?.rateCodes ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const filteredRooms = rooms.filter((room) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        room.name.toLowerCase().includes(query) ||
        room.roomNumber.toLowerCase().includes(query) ||
        room.type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const openCreateModal = () => {
    setEditingRoom(null);
    setFormData({
      ...emptyFormData,
      color: DEFAULT_COLORS[rooms.length % DEFAULT_COLORS.length],
      roomTypeId: roomTypeEntities[0]?.id ?? '',
      rateCodeId: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      roomNumber: room.roomNumber,
      type: room.type,
      capacity: room.capacity,
      color: room.color,
      roomTypeId: room.roomTypeId ?? '',
      rateCodeId: room.rateCodeId ?? '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    setFormData(emptyFormData);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      if (editingRoom) {
        // Update existing room
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation UpdateRoom($id: ID!, $input: UpdateRoomInput!) {
                updateRoom(id: $id, input: $input) {
                  room {
                    id
                    name
                    roomNumber
                    type
                    capacity
                    status
                    color
                    roomTypeId
                    rateCodeId
                    version
                  }
                }
              }
            `,
            variables: {
              id: editingRoom.id,
              input: {
                name: formData.name,
                roomNumber: formData.roomNumber,
                type: formData.type,
                capacity: formData.capacity,
                color: formData.color,
                roomTypeId: formData.roomTypeId || null,
                rateCodeId: formData.rateCodeId || null,
              },
            },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message ?? 'Failed to update room');
        }

        setSuccessMessage(`Room "${formData.name}" updated successfully`);
      } else {
        // Create new room
        const response = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation CreateRoom($input: CreateRoomInput!) {
                createRoom(input: $input) {
                  room {
                    id
                    name
                    roomNumber
                    type
                    capacity
                    status
                    color
                    roomTypeId
                    rateCodeId
                    version
                  }
                }
              }
            `,
            variables: {
              input: {
                name: formData.name,
                roomNumber: formData.roomNumber,
                type: formData.type,
                capacity: formData.capacity,
                color: formData.color,
                roomTypeId: formData.roomTypeId || null,
                rateCodeId: formData.rateCodeId || null,
              },
            },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message ?? 'Failed to create room');
        }

        setSuccessMessage(`Room "${formData.name}" created successfully`);
      }

      closeModal();
      fetchRooms();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const openStatusModal = (room: Room) => {
    setStatusModalRoom(room);
    setNewStatus(room.status);
    setStatusReason('');
  };

  const closeStatusModal = () => {
    setStatusModalRoom(null);
    setStatusReason('');
  };

  const handleStatusChange = async () => {
    if (!statusModalRoom) return;

    setSaving(true);
    try {
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation ChangeRoomStatus($input: ChangeRoomStatusInput!) {
              changeRoomStatus(input: $input) {
                room {
                  id
                  status
                  version
                }
              }
            }
          `,
          variables: {
            input: {
              roomId: statusModalRoom.id,
              status: newStatus,
              reason: statusReason || null,
            },
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message ?? 'Failed to change status');
      }

      setSuccessMessage(`Room status changed to ${newStatus}`);
      closeStatusModal();
      fetchRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change status');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: RoomStatus) => {
    const statusConfig = ROOM_STATUSES.find((s) => s.value === status);
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig?.color ?? 'bg-gray-100 text-gray-800'}`}>
        {statusConfig?.label ?? status}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <HotelSidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">Rooms</h1>
              <p className="text-slate-600">
                Manage hotel rooms and their availability
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Add Room
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
                &times;
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                &times;
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as RoomType | '')}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {ROOM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as RoomStatus | '')}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {ROOM_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              {/* Refresh */}
              <button
                onClick={fetchRooms}
                disabled={loading}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <span className={loading ? 'animate-spin' : ''}>&#x21bb;</span>
                Refresh
              </button>
            </div>
          </div>

          {/* Rooms Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="animate-pulse">Loading rooms...</div>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="text-4xl mb-4">&#x1F6CF;</div>
                <p className="text-lg font-medium">No rooms found</p>
                <p className="text-sm mt-1">
                  {rooms.length === 0
                    ? 'Create your first room to get started'
                    : 'Try adjusting your filters'}
                </p>
                {rooms.length === 0 && (
                  <button
                    onClick={openCreateModal}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add First Room
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Rate Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: room.color }}
                          />
                          <div>
                            <div className="font-medium text-slate-800">{room.name}</div>
                            <div className="text-sm text-slate-500">#{room.roomNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">
                          {room.roomTypeEntity?.name ?? ROOM_TYPES.find((t) => t.value === room.type)?.label ?? room.type}
                        </div>
                        {room.roomTypeEntity && (
                          <div className="text-xs text-slate-500">{room.roomTypeEntity.code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {room.rateCode ? (
                          <div>
                            <div className="text-slate-700">{room.rateCode.name}</div>
                            <div className="text-xs text-slate-500">{room.rateCode.code}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-700">{room.capacity} guests</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openStatusModal(room)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          {getStatusBadge(room.status)}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditModal(room)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Room Count */}
          {!loading && filteredRooms.length > 0 && (
            <div className="mt-4 text-sm text-slate-500 text-center">
              Showing {filteredRooms.length} of {rooms.length} rooms
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800">
                  {editingRoom ? 'Edit Room' : 'Add New Room'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {formError}
                  </div>
                )}

                {/* Room Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Ocean View Suite"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Room Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    placeholder="e.g., 101"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Room Type (Legacy) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Room Type (Legacy)
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as RoomType })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ROOM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room Type Entity */}
                {roomTypeEntities.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Room Type
                    </label>
                    <select
                      value={formData.roomTypeId}
                      onChange={(e) => setFormData({ ...formData, roomTypeId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select room type...</option>
                      {roomTypeEntities.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name} ({rt.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rate Code */}
                {rateCodes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Rate Code
                    </label>
                    <select
                      value={formData.rateCodeId}
                      onChange={(e) => setFormData({ ...formData, rateCodeId: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select rate code (optional)...</option>
                      {rateCodes.map((rc) => (
                        <option key={rc.id} value={rc.id}>
                          {rc.name} ({rc.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Capacity (guests)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Calendar Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 border border-slate-200 rounded cursor-pointer"
                    />
                    <div className="flex gap-1">
                      {DEFAULT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Status Change Modal */}
        {statusModalRoom && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800">
                  Change Room Status
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {statusModalRoom.name} (#{statusModalRoom.roomNumber})
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Status Options */}
                <div className="space-y-2">
                  {ROOM_STATUSES.map((status) => (
                    <label
                      key={status.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        newStatus === status.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={status.value}
                        checked={newStatus === status.value}
                        onChange={() => setNewStatus(status.value)}
                        className="text-blue-600"
                      />
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Reason (optional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="e.g., Plumbing repairs"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeStatusModal}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStatusChange}
                    disabled={saving || newStatus === statusModalRoom.status}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
