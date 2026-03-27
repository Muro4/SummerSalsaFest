// --- DYNAMIC YEAR GENERATOR ---
export const generateYearOptions = () => {
  const startYear = 2024; 
  // We don't add +1 because we only sell tickets up to the current year
  const maxYear = new Date().getFullYear(); 
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