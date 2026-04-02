import { describe, it, expect } from 'vitest';
import { isValidTicketName } from '../lib/validation';

describe('Ticket Name Validation', () => {
  it('should accept a standard valid name', () => {
    expect(isValidTicketName('John Doe')).toBe(true);
  });

  it('should accept names with accents and hyphens', () => {
    expect(isValidTicketName('Jean-Luc Picard')).toBe(true);
    expect(isValidTicketName('José María')).toBe(true);
  });

  it('should reject names that are too long (over 5 words)', () => {
    expect(isValidTicketName('This is way too many words for a name')).toBe(false);
  });

  it('should reject names with numbers or special characters', () => {
    expect(isValidTicketName('John Doe 123')).toBe(false);
    expect(isValidTicketName('Jane@Doe')).toBe(false);
  });

  it('should reject empty or blank names', () => {
    expect(isValidTicketName('')).toBe(false);
    expect(isValidTicketName('   ')).toBe(false);
  });
});