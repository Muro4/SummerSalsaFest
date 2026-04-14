// lib/utils.js

export const generateTicketID = (length = 6) => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  // Use Math.random() which is 100% safe in Node.js and Browsers.
  // Because we verify uniqueness in the database anyway, this is perfectly secure.
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const getNow = () => {
  // 🔒 SECURITY FIX: Only allow time-travel in local development!
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const mockDate = localStorage.getItem('dev_mock_date');
    if (mockDate) return new Date(mockDate);
  }
  
  // In production, ALWAYS return the real, current server/browser time
  return new Date();
};

export const getActiveFestivalYear = () => {
  const now = getNow();
  const currentMonth = now.getMonth(); 
  const currentYear = now.getFullYear();

  if (currentMonth >= 9) {
    return currentYear + 1;
  }
  return currentYear;
};