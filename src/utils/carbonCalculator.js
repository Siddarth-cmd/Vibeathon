// CO2 savings in grams
export const CO2_RATES = {
  cycling: 21,     // 21g per km
  walking: 15,     // 15g per km
  hiking: 18,      // 18g per km
  bus: 105,        // 105g per km
  recycling: 500,  // 500g fixed
};

export function calculateCO2(type, distance = 0) {
  if (type === 'recycling') return CO2_RATES.recycling;
  return Math.round(CO2_RATES[type] * distance);
}

export function formatCO2(grams) {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${grams}g`;
}

export function getCO2Description(type, distance, co2) {
  if (type === 'recycling') return `Recycling → ${formatCO2(co2)} CO₂ saved`;
  return `${distance} km ${type} → ${formatCO2(co2)} CO₂ saved`;
}
