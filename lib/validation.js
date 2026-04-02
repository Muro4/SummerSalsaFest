// lib/validation.js
export function isValidTicketName(name) {
  if (!name || name.trim() === '') return false;
  
  const isValidChars = /^[a-zA-Z\u00C0-\u024F\s\-']+$/.test(name);
  const isWithinWordLimit = name.trim().split(/\s+/).length <= 5;
  
  return isValidChars && isWithinWordLimit;
}