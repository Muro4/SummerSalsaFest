"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { usePopup } from "@/components/PopupProvider";
import Button from "@/components/Button";
import CustomDropdown from "@/components/CustomDropdown";
import { 
  Building, Plus, Trash2, Edit2, Lock, Unlock, 
  Users, Calendar, Save, Loader2, AlertCircle
} from "lucide-react";

// MATCH EXACTLY WITH DraftTab.js VALUES
const HOTELS = [
  { id: "ВСУ", name: "ВСУ" },
  { id: "Detelina", name: "Detelina" },
  { id: "Toro Negro", name: "Toro Negro" },
  { id: "Kabakum", name: "Kabakum" }
];

export default function RoomsTab({ tickets = [] }) {
  const { showPopup } = usePopup();
  const [mounted, setMounted] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [deposits, setDeposits] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    hotelId: "ВСУ",
    roomNumber: "",
    capacity: 2,
    pricePerPersonPerNight: 15.5
  });

  useEffect(() => {
    setMounted(true);
    const unsubRooms = onSnapshot(collection(db, "rooms"), (snap) => {
      setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubDeposits = onSnapshot(doc(db, "settings", "hotel_deposits"), (docSnap) => {
      if (docSnap.exists()) {
        setDeposits(docSnap.data());
      } else {
        setDeposits({});
      }
      setLoading(false);
    });

    return () => {
      unsubRooms();
      unsubDeposits();
    };
  }, []);

  // --- CALCULATIONS ---
  const getOccupantName = (draftId) => {
    if (!draftId) return "Unknown Guest";
    const idStr = String(draftId);
    const ticket = tickets.find(t => t.id === idStr || t.ticketID === idStr);
    return ticket ? ticket.userName : `Guest (${idStr.substring(0, 6)})`;
  };

  const calculateRoomTotal = (room) => {
    if (!room.occupants || !Array.isArray(room.occupants) || room.occupants.length === 0) return 0;
    const totalDays = room.occupants.reduce((sum, occ) => {
      if (!occ) return sum; // Guard against null records
      const days = typeof occ === 'string' ? 3 : (occ.days || 3);
      return sum + days;
    }, 0);
    return totalDays * (room.pricePerPersonPerNight || 0);
  };

  const getHotelFinancials = (hotelId) => {
    const hotelRooms = rooms.filter(r => r.hotelId === hotelId);
    const totalCost = hotelRooms.reduce((sum, room) => sum + calculateRoomTotal(room), 0);
    const deposit = deposits[hotelId] || 0;
    const owed = totalCost - deposit;
    return { totalCost, deposit, owed, hotelRooms };
  };

  // --- ACTIONS ---
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!roomFormData.roomNumber.trim()) return;

    try {
      if (editingRoom) {
        // Enforce capacity constraint
        const currentOccupants = editingRoom.occupants?.length || 0;
        if (roomFormData.capacity < currentOccupants) {
          showPopup({ type: "error", title: "Error", message: `Cannot reduce capacity below current occupants (${currentOccupants}).` });
          return;
        }

        await updateDoc(doc(db, "rooms", editingRoom.id), {
          hotelId: roomFormData.hotelId,
          roomNumber: roomFormData.roomNumber.trim(),
          capacity: Number(roomFormData.capacity),
          pricePerPersonPerNight: Number(roomFormData.pricePerPersonPerNight)
        });
      } else {
        // Add new room
        const newRoomRef = doc(collection(db, "rooms"));
        await setDoc(newRoomRef, {
          hotelId: roomFormData.hotelId,
          roomNumber: roomFormData.roomNumber.trim(),
          capacity: Number(roomFormData.capacity),
          pricePerPersonPerNight: Number(roomFormData.pricePerPersonPerNight),
          isBlocked: false,
          occupants: [],
          lockExpirations: {},
          status: "available"
        });
      }
      setIsRoomModalOpen(false);
      setEditingRoom(null);
    } catch (err) {
      showPopup({ type: "error", title: "Error", message: err.message });
    }
  };

  const handleDeleteRoom = (room) => {
    if (room.occupants?.length > 0) return; // Prevent deletion if occupied

    showPopup({
      type: "danger",
      title: "Delete Room",
      message: `Are you sure you want to delete Room ${room.roomNumber}?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        await deleteDoc(doc(db, "rooms", room.id));
      }
    });
  };

  const handleToggleBlock = async (room) => {
    await updateDoc(doc(db, "rooms", room.id), {
      isBlocked: !room.isBlocked
    });
  };

  const handleEditDeposit = (hotelId, currentDeposit) => {
    const newDeposit = prompt(`Enter new deposit amount for ${HOTELS.find(h => h.id === hotelId).name}:`, currentDeposit);
    if (newDeposit !== null && !isNaN(newDeposit)) {
      setDoc(doc(db, "settings", "hotel_deposits"), {
        ...deposits,
        [hotelId]: Number(newDeposit)
      }, { merge: true });
    }
  };

  const handleUpdateOccupantDays = async (roomId, occupantId, newDays) => {
    if (!occupantId) return; // Safety guard
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const updatedOccupants = room.occupants.map(occ => {
      if (!occ) return null;
      // Convert legacy strings to objects on the fly
      if (typeof occ === 'string') {
        return occ === occupantId ? { id: occ, days: Number(newDays) } : { id: occ, days: 3 };
      }
      return occ.id === occupantId ? { ...occ, days: Number(newDays) } : occ;
    }).filter(Boolean); // Filter out any rogue nulls

    await updateDoc(doc(db, "rooms", roomId), {
      occupants: updatedOccupants
    });
  };

  const openAddModal = () => {
    setEditingRoom(null);
    setRoomFormData({ hotelId: "ВСУ", roomNumber: "", capacity: 2, pricePerPersonPerNight: 15.5 });
    setIsRoomModalOpen(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      hotelId: room.hotelId,
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      pricePerPersonPerNight: room.pricePerPersonPerNight
    });
    setIsRoomModalOpen(true);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 font-montserrat">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsRoomModalOpen(false)}></div>
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-gray-100">
        <h3 className="font-bebas text-4xl text-slate-900 mb-6 uppercase tracking-wide">
          {editingRoom ? "Edit Room" : "Add New Room"}
        </h3>

        <form onSubmit={handleSaveRoom} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Hotel</label>
            <div className="relative">
              <CustomDropdown
                value={roomFormData.hotelId}
                onChange={(val) => setRoomFormData({ ...roomFormData, hotelId: val })}
                options={HOTELS.map(h => ({ label: h.name, value: h.id }))}
                variant="filter"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Room Number / Name</label>
            <input 
              required
              type="text" 
              value={roomFormData.roomNumber}
              onChange={(e) => setRoomFormData({ ...roomFormData, roomNumber: e.target.value })}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Capacity</label>
              <input 
                required
                type="number" 
                min={editingRoom ? (editingRoom.occupants?.length || 1) : 1}
                value={roomFormData.capacity}
                onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Price/Night (€)</label>
              <input 
                required
                type="number" 
                step="0.01"
                min="0"
                value={roomFormData.pricePerPersonPerNight}
                onChange={(e) => setRoomFormData({ ...roomFormData, pricePerPersonPerNight: e.target.value })}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsRoomModalOpen(false)} className="flex-1 bg-gray-50 text-slate-600">Cancel</Button>
            <Button type="submit" variant="primary" icon={Save} className="flex-1">Save Room</Button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-salsa-pink" size={48} /></div>;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="font-bebas tracking-wide text-4xl text-slate-900 uppercase leading-none">Accommodation Manager</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Manage Hotels, Rooms, and Capacity</p>
        </div>
        <Button onClick={openAddModal} variant="primary" icon={Plus} className="w-full md:w-auto px-8">
          Add Room
        </Button>
      </div>

      {/* Hotel Groups */}
      <div className="space-y-10">
        {HOTELS.map(hotel => {
          const { totalCost, deposit, owed, hotelRooms } = getHotelFinancials(hotel.id);
          
          if (hotelRooms.length === 0) return null; // Hide empty hotels to keep UI clean

          return (
            <div key={hotel.id} className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-xl">
              
              {/* Hotel Header */}
              <div className="bg-slate-900 p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                    <Building size={28} />
                  </div>
                  <div>
                    <h3 className="font-bebas text-4xl text-white tracking-wide">{hotel.name}</h3>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{hotelRooms.length} Rooms Configured</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 lg:gap-8 bg-white/5 p-4 rounded-2xl border border-white/10 w-full lg:w-auto">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Cost</p>
                    <p className="text-xl font-black text-white">€{totalCost.toFixed(2)}</p>
                  </div>
                  <div className="w-px bg-white/10 hidden sm:block"></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                      Deposit <button onClick={() => handleEditDeposit(hotel.id, deposit)} className="text-salsa-pink hover:text-white transition-colors cursor-pointer"><Edit2 size={12} /></button>
                    </p>
                    <p className="text-xl font-black text-white">€{deposit.toFixed(2)}</p>
                  </div>
                  <div className="w-px bg-white/10 hidden sm:block"></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Owed to Hotel</p>
                    <p className={`text-xl font-black ${owed > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>€{owed.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Rooms Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-separate border-spacing-0 min-w-[800px] font-montserrat">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                    <tr>
                      <th className="p-5 pl-8 border-b border-gray-100">Room</th>
                      <th className="p-5 text-center border-b border-gray-100">Occupancy</th>
                      <th className="p-5 border-b border-gray-100">Price/Night</th>
                      <th className="p-5 border-b border-gray-100">Room Total</th>
                      <th className="p-5 text-center border-b border-gray-100">Visibility</th>
                      <th className="p-5 text-right pr-8 border-b border-gray-100">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="uppercase text-xs font-bold text-slate-700">
                    {hotelRooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber)).map(room => {
                      const occupantsCount = room.occupants?.length || 0;
                      const isFull = occupantsCount >= room.capacity;

                      return (
                        <React.Fragment key={room.id}>
                          {/* Main Row */}
                          <tr className="bg-white">
                            <td className="p-5 pl-8 border-b border-gray-50 flex items-center gap-3">
                              <span className="text-base text-slate-900 font-black">Room {room.roomNumber}</span>
                            </td>
                            
                            <td className="p-5 text-center border-b border-gray-50">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black tracking-widest ${isFull ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                <Users size={12} /> {occupantsCount} / {room.capacity}
                              </span>
                            </td>

                            <td className="p-5 border-b border-gray-50">€{room.pricePerPersonPerNight}</td>
                            <td className="p-5 border-b border-gray-50 text-slate-900 font-black">€{calculateRoomTotal(room).toFixed(2)}</td>
                            
                            <td className="p-5 text-center border-b border-gray-50">
                              <button onClick={() => handleToggleBlock(room)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-colors cursor-pointer ${room.isBlocked ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {room.isBlocked ? <><Lock size={12}/> Blocked</> : <><Unlock size={12}/> Public</>}
                              </button>
                            </td>

                            <td className="p-5 pr-8 border-b border-gray-50 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => openEditModal(room)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteRoom(room)} 
                                  disabled={occupantsCount > 0}
                                  title={occupantsCount > 0 ? "Cannot delete occupied room" : "Delete"}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Flat Occupants Sub-table (Always Visible) */}
                          <tr>
                            <td colSpan="6" className="p-0 border-b-2 border-gray-200 bg-slate-50/50">
                              <div className="px-6 py-4 lg:px-12 lg:py-6">
                                {occupantsCount > 0 ? (
                                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-left">
                                      <thead className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        <tr>
                                          <th className="px-6 py-3 border-b border-gray-100">Occupant Name / Ticket ID</th>
                                          <th className="px-6 py-3 border-b border-gray-100 w-32">Days Staying</th>
                                          <th className="px-6 py-3 border-b border-gray-100 w-32 text-right">Cost</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {room.occupants.map((occ, idx) => {
                                          if (!occ) return null;
                                          // Safely extract data whether it's an old string or a new object
                                          const occupantId = typeof occ === 'string' ? occ : occ.id;
                                          const days = typeof occ === 'string' ? 3 : (occ.days || 3);
                                          
                                          // Fallback key if completely undefined
                                          const rowKey = occupantId || `unknown-${idx}`;

                                          return (
                                            <tr key={rowKey} className="hover:bg-gray-50/50">
                                              <td className="px-6 py-4 border-b border-gray-50 text-xs font-bold text-slate-700">
                                                {getOccupantName(occupantId)}
                                              </td>
                                              <td className="px-6 py-4 border-b border-gray-50">
                                                <div className="flex items-center gap-2">
                                                  <Calendar size={14} className="text-slate-400" />
                                                  <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="14"
                                                    defaultValue={days}
                                                    onBlur={(e) => handleUpdateOccupantDays(room.id, occupantId, e.target.value)}
                                                    className="w-16 p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs font-bold text-slate-900 outline-none focus:border-slate-900"
                                                  />
                                                </div>
                                              </td>
                                              <td className="px-6 py-4 border-b border-gray-50 text-xs font-black text-slate-900 text-right">
                                                €{(days * room.pricePerPersonPerNight).toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-widest bg-white p-6 rounded-2xl border border-gray-200 border-dashed">
                                    <AlertCircle size={16} /> Room is currently empty.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Room Modal (Rendered via Portal to bypass Admin layout z-index) */}
      {isRoomModalOpen && mounted && createPortal(modalContent, document.body)}

    </div>
  );
}