// photographer_capacity_test.js
// This script validates the front-end capacity logic for Photo Studio bookings.
// It mimics the getActivePhotographers function and the slot disabling logic.

function getActivePhotographers(selectedEventDate) {
  let status = { 'tetap-1': true, 'tetap-2': true, 'freelance-1': true, 'freelance-2': true, 'freelance-3': true };
  let dates = {};
  try {
    const storedStatus = localStorage.getItem('photographerStatus');
    if (storedStatus) status = JSON.parse(storedStatus);
    const storedDates = localStorage.getItem('freelanceDates');
    if (storedDates) dates = JSON.parse(storedDates);
  } catch (e) {}
  // For this test we assume freelancers are inactive (status false) unless dates include the selected date.
  let count = 0;
  if (status['tetap-1']) count++;
  if (status['tetap-2']) count++;
  const freelancers = ['freelance-1', 'freelance-2', 'freelance-3'];
  freelancers.forEach(fId => {
    if (status[fId]) {
      const activeDates = dates[fId] || [];
      if (activeDates.includes(selectedEventDate)) {
        count++;
      }
    }
  });
  return count;
}

function isSlotDisabled(dayBookings, selectedRoom, slotStart, selectedEventDate) {
  const bookingsAtSlot = dayBookings.filter(b => b.jam === slotStart);
  const isRoomBooked = bookingsAtSlot.some(b => b.room === selectedRoom);
  const activePhotographerCount = getActivePhotographers(selectedEventDate);
  const isCapacityReached = bookingsAtSlot.length >= activePhotographerCount;
  return isRoomBooked || isCapacityReached;
}

// Simulated bookings storage
let dayBookings = [];
const selectedDate = '2026-08-01'; // example date
const slot = { start: '09:00', end: '09:10' };

// Test scenario: no freelancers active, only 2 permanent photographers.
// Mock localStorage so freelancers are inactive.
global.localStorage = {
  getItem: (key) => {
    if (key === 'photographerStatus') {
      // Disable freelancers
      return JSON.stringify({ 'tetap-1': true, 'tetap-2': true, 'freelance-1': false, 'freelance-2': false, 'freelance-3': false });
    }
    if (key === 'freelanceDates') {
      return JSON.stringify({});
    }
    return null;
  }
};

function book(room) {
  const disabled = isSlotDisabled(dayBookings, room, slot.start, selectedDate);
  console.log(`Attempting to book ${room} at ${slot.start}-${slot.end} on ${selectedDate}: ${disabled ? 'DISABLED' : 'AVAILABLE'}`);
  if (!disabled) {
    dayBookings.push({ jam: slot.start, room });
    console.log('Booking succeeded.');
  } else {
    console.log('Booking blocked due to capacity or room conflict.');
  }
  console.log('Current bookings:', dayBookings);
  console.log('Active photographer count:', getActivePhotographers(selectedDate));
  console.log('---');
}

console.log('--- Starting Capacity Test ---');
book('Room B - Luxury'); // First booking should succeed
book('Room A - Studio White'); // Second booking should succeed (capacity = 2)
book('Room C - Colorful'); // Third booking should be blocked (capacity reached)

console.log('--- Test Completed ---');
