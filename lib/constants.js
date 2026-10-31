import { getActiveFestivalYear } from "./utils";

// --- DYNAMIC YEAR GENERATOR ---
export const generateYearOptions = (date) => {
  const startYear = 2024; 
  // Preserve the archive and expose the next festival when its sales open.
  const maxYear = getActiveFestivalYear(date);
  const options = [];
  
  for (let y = maxYear; y >= startYear; y--) {
    options.push({ 
      label: `SSF ${y}`, 
      value: y.toString(),
      isPill: true, 
      colorClass: 'bg-slate-100 text-slate-600'
    });
  }
  
  return options;
};

// Export the array so we can import it anywhere!
export const EVENT_YEARS = generateYearOptions();

// Stable hotel IDs must also match existing room documents.
export const FESTIVAL_HOTELS = ["ВСУ", "Detelina", "Toro Negro", "Kabakum"];
export const BOARD_OPTIONS = ["none", "breakfast", "halfBoard", "fullBoard", "allInclusive"];
// ECB fixed conversion rate: https://www.ecb.europa.eu/press/pr/date/2025/html/ecb.pr250708~b9676a9fa8.en.html
export const BGN_PER_EUR = 1.95583;
