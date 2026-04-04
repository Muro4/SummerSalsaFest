// lib/utils.js

export const generateTicketID = (length = 6) => {
  // EXCLUDED: 0, O, 1, I, L (To prevent human error when reading/typing)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  
  // Use Crypto API for true mathematical randomness
  const randomValues = new Uint32Array(length);
  window.crypto.getRandomValues(randomValues);
  
  let result = '';
  for (let i = 0; i < randomValues.length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result; // Example output: X7K9M2
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