export const getPriceAtDate = (passType, date = new Date()) => {
  const purchaseDate = new Date(date);
  
  // Deadlines
  const phase1 = new Date("2025-04-01T23:59:59");
  const phase2 = new Date("2025-06-01T23:59:59");
  const phase3 = new Date("2025-07-08T23:59:59");

  const pricingTable = {
    "Full Pass": [95, 115, 125],
    "Party Pass": [55, 70, 80],
    "Day Pass": [40, 50, 60],
    "Performers Pass": [85, 85, 85] // Always 85
  };

  const prices = pricingTable[passType] || [0, 0, 0];

  if (purchaseDate <= phase1) return prices[0];
  if (purchaseDate <= phase2) return prices[1];
  return prices[2];
};