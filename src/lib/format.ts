/**
 * Formátuje číslo na miliardy/trilióny s príslušným suffixom
 * Príklady: 3500 → "3.5 T", 2500 → "2.5 T", 1500 → "1.5 T", 500 → "500 B", 0.5 → "500 M"
 */
export const formatBillions = (num: number) => {
  if (num >= 1000) {
    // Pre hodnoty >= 1000 B zobraz ako trilióny
    return (num / 1000).toFixed(2) + " T";
  } else if (num >= 1) {
    // Pre hodnoty >= 1 B zobraz ako miliardy
    return num.toFixed(2) + " B";
  } else {
    // Pre hodnoty < 1 B zobraz ako milióny
    return (num * 1000).toFixed(0) + " M";
  }
}; 