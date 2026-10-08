/**
 * Árképzési és kerekítési segédfüggvények
 * A PLAFON.MAT(összeg; 0,5) / CEILING.MATH(number, 0.5) logikájának megfelelően:
 * Ha a megjelenítendő összeg nem egész euró, akkor felfelé kerekítünk a legközelebbi
 * egészre vagy 0,5-re (pl. 81.37 -> 81.5, 78.6 -> 79).
 */

/**
 * Felfelé kerekítés egészre vagy 0,5-re (PLAFON.MAT / CEILING.MATH 0.5 lépésközzel).
 */
export const roundToHalfEuro = (value: number): number => {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.ceil(value * 2) / 2;
};

/**
 * Formázza a megjelenítendő összeget:
 * - Felfelé kerekít egészre vagy 0,5-re
 * - Egész szám esetén tizedesjegy nélkül jeleníti meg (pl. "79")
 * - 0,5 végződés esetén 1 tizedesjeggyel jeleníti meg (pl. "81.5")
 */
export const formatPrice = (value: number | string | undefined | null): string => {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return '0';
  const rounded = roundToHalfEuro(num);
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
};
