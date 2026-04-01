// lib/utils.js

export const generateTicketID = (prefix = "SLS") => {
  // EXCLUDED: 0, O, 1, I, L 
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  
  // Use Crypto API for true mathematical randomness
  const randomValues = new Uint32Array(6);
  window.crypto.getRandomValues(randomValues);
  
  let result = prefix + '-';
  for (let i = 0; i < randomValues.length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result; // Example output: SLS-X7K9M2
  
};
export const getNow = () => {
  if (typeof window !== 'undefined') {
    const mockDate = localStorage.getItem('dev_mock_date');
    if (mockDate) return new Date(mockDate);
  }
  return new Date();
};

export const getActiveFestivalYear = () => {
  const now = getNow(); // <-- UPDATE: Use getNow() instead of new Date()
  const currentMonth = now.getMonth(); 
  const currentYear = now.getFullYear();

  if (currentMonth >= 9) {
    return currentYear + 1;
  }
  return currentYear;
};