import { describe, it, expect } from 'vitest';
import { generateTicketID } from '../lib/utils';

describe('Utility Functions', () => {
  it('should generate a ticket ID in the correct format', () => {
    const id = generateTicketID();
    
    // Check that it's a string
    expect(typeof id).toBe('string');
    
    // Example: Check length (assuming your IDs are always exactly 6 characters)
    expect(id.length).toBe(6);
    
    // Check that it only contains uppercase letters and numbers
    expect(/^[A-Z0-9]+$/.test(id)).toBe(true);
  });

  it('should generate unique IDs (statistically)', () => {
    const id1 = generateTicketID();
    const id2 = generateTicketID();
    
    expect(id1).not.toBe(id2);
  });
});