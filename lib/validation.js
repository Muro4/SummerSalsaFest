// lib/validation.js
export function isOptionalEmail(value) {
  return value == null || (typeof value === "string" && (!value.trim() || (value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))));
}

export function isValidTicketName(name) {
  if (!name || name.trim() === '') return false;
  
  const isValidChars = /^[a-zA-Z\u00C0-\u024F\s\-']+$/.test(name);
  const isWithinWordLimit = name.trim().split(/\s+/).length <= 5;
  
  return isValidChars && isWithinWordLimit;
}
