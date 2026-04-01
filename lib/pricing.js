import { getActiveFestivalYear, getNow } from "./utils"; // <-- IMPORT getNow

// UPDATE: Default the date parameter to getNow() instead of new Date()
export const getPriceAtDate = (passType, date = getNow()) => { 
  const purchaseDate = new Date(date);
  const targetYear = getActiveFestivalYear();
  
  const phase1 = new Date(`${targetYear}-04-01T23:59:59`);
  const phase2 = new Date(`${targetYear}-06-01T23:59:59`);
  
  const pricingTable = {
    "Full Pass": [95, 115, 125], 
    "Party Pass": [55, 70, 80],
    "Day Pass": [40, 50, 60],
    "Performers Pass": [85, 85, 85],
    "Free Pass": [0, 0, 0]           
  };

  const prices = pricingTable[passType] || [0, 0, 0];

  if (purchaseDate <= phase1) return prices[0];
  if (purchaseDate <= phase2) return prices[1];
  return prices[2];
};