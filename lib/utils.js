// lib/utils.js

export function generateTicketID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Use the native Web Crypto API
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : window.crypto;
  
  // fetching a batch of random bytes
  const randomArray = new Uint8Array(6);
  
  while (result.length < 6) {
    cryptoObj.getRandomValues(randomArray);
    
    for (let i = 0; i < randomArray.length; i++) {
      
      if (randomArray[i] < 252 && result.length < 6) {
        result += chars[randomArray[i] % 36];
      }
    }
  }
  
  return result;
}

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