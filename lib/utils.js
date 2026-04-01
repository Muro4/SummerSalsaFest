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
export const getActiveFestivalYear = () => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = Jan, 9 = Oct
  const currentYear = now.getFullYear();

  // If we are in Oct, Nov, or Dec, we are selling for the upcoming summer
  if (currentMonth >= 9) {
    return currentYear + 1;
  }

  // Otherwise (Jan through Sept), we are in the current festival's year
  return currentYear;
};