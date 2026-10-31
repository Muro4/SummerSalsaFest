import { getActiveFestivalYear, getNow } from "./utils";

export const pricingTable = {
  "Full Pass": [95, 115, 125], 
  "Party Pass": [55, 70, 80],
  "Day Pass": [40, 50, 60],
  "Performers Pass": [85, 85, 85],
  "Free Pass": [0, 0, 0]          
};

// NEW: Automatic blackout window
export const isSalesOpen = (date = getNow()) => {
  const currentDate = new Date(date);
  const month = currentDate.getMonth(); // 0 = Jan, 8 = Sept, 9 = Oct, 10 = Nov
  
  // Lock sales completely during September (8) and October (9)
  if (month === 8 || month === 9) {
    return false; 
  }
  return true;
};

export const getPriceAtDate = (passType, date) => { 
  const purchaseDate = date ? new Date(date) : new Date(getNow());
  let targetYear = getActiveFestivalYear();
  
  // If we are in the Fall (past August) but DB says current year, shift deadlines to next spring
  if (purchaseDate.getMonth() > 7 && targetYear === purchaseDate.getFullYear()) {
    targetYear += 1;
  }

  const phase1 = new Date(`${targetYear}/03/31 23:59:59`);
  const phase2 = new Date(`${targetYear}/05/30 23:59:59`);
  
  const prices = pricingTable[passType] || [0, 0, 0];

  if (purchaseDate <= phase1) return prices[0];
  if (purchaseDate <= phase2) return prices[1];
  return prices[2];
};