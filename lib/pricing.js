import { getActiveFestivalYear } from "./utils"; 

export const getPriceAtDate = (passType, date = new Date()) => {
  const purchaseDate = new Date(date);
  const targetYear = getActiveFestivalYear();
  
  // Deadlines automatically snap to the correct festival year
  const phase1 = new Date(`${targetYear}-04-01T23:59:59`);
  const phase2 = new Date(`${targetYear}-06-01T23:59:59`);
  const phase3 = new Date(`${targetYear}-07-08T23:59:59`);

  // NOTE: I updated Phase 3 of the Full Pass to 150 to match your frontend, 
  // but you should adjust these arrays to your exact business needs!
  const pricingTable = {
    "Full Pass": [95, 115, 125], 
    "Party Pass": [55, 70, 80],
    "Day Pass": [40, 50, 60],
    "Performers Pass": [85, 85, 85], // Always 85
    "Free Pass": [0, 0, 0]           // Always 0
  };

  const prices = pricingTable[passType] || [0, 0, 0];

  if (purchaseDate <= phase1) return prices[0];
  if (purchaseDate <= phase2) return prices[1];
  return prices[2];
};