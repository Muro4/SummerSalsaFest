import { describe, it, expect } from 'vitest';
import { getPriceAtDate } from '../lib/pricing';

describe('Pricing Engine', () => {
  it('should return Early Bird pricing for Full Pass before March 1st', () => {
    const mockDate = new Date('2026-02-15T12:00:00Z');
    const price = getPriceAtDate('Full Pass', mockDate);
    
    // Updated to match your real early bird price!
    expect(price).toBe(95); 
  });

  it('should return Regular pricing for Full Pass after March 1st', () => {
    const mockDate = new Date('2026-04-10T12:00:00Z');
    const price = getPriceAtDate('Full Pass', mockDate);
    
    // Updated to match your real regular price!
    expect(price).toBe(115);
  });

  it('should return 0 for an invalid pass type', () => {
    const mockDate = new Date('2026-02-15T12:00:00Z');
    const price = getPriceAtDate('Fake VIP Pass', mockDate);
    
    // Updated to match your app's safe fallback logic!
    expect(price).toBe(0); 
  });
});n