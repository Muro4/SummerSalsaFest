export function hotelSettings(hotelId, financials, deposits, rooms) {
  return {
    defaultRate: financials[hotelId]?.defaultRate ?? rooms.find(room => room.hotelId === hotelId)?.pricePerPersonPerNight ?? 0,
    deposit: deposits[hotelId] ?? 0,
    adjustments: financials[hotelId]?.adjustments ?? 0,
  };
}

export function roomCost(room) {
  return room.occupants.reduce((sum, occupant) => sum + (occupant.days || 3) * (room.pricePerPersonPerNight || 0), 0);
}

export function hotelSummary(rooms, settings) {
  const total = rooms.reduce((sum, room) => sum + roomCost(room), 0);
  return {
    guests: rooms.reduce((sum, room) => sum + room.occupants.length, 0),
    held: rooms.reduce((sum, room) => sum + room.locks.length, 0),
    total,
    remaining: total + settings.adjustments - settings.deposit,
  };
}
