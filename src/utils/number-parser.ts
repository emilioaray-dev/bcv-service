/**
 * Utilidad para parsear números en formato venezolano/europeo
 *
 * Formato venezolano:
 * - Punto (.) como separador de miles: 1.234.567
 * - Coma (,) como separador decimal: 36,50
 * - Ejemplos: "36,50", "1.234,56", "1.234.567,89"
 *
 * Este formato es común en Venezuela, España, y muchos países de América Latina y Europa.
 */

/**
 * Parsea un string con formato numérico venezolano a número
 *
 * @param value - String con formato venezolano (ej: "1.234,56" o "36,50")
 * @returns Número parseado o NaN si el formato es inválido
 *
 * @example
 * parseVenezuelanNumber("36,50")        // 36.50
 * parseVenezuelanNumber("1.234,56")     // 1234.56
 * parseVenezuelanNumber("1.234.567,89") // 1234567.89
 * parseVenezuelanNumber("1234")         // 1234
 * parseVenezuelanNumber("1234,00")      // 1234
 */
export function parseVenezuelanNumber(value: string): number {
  if (typeof value !== 'string') {
    return Number.NaN;
  }

  // Limpiar espacios en blanco
  let cleaned = value.trim();

  // Si está vacío, retornar NaN
  if (cleaned.length === 0) {
    return Number.NaN;
  }

  // Eliminar caracteres no numéricos excepto punto, coma y signo negativo
  cleaned = cleaned.replace(/[^\d.,-]/g, '');

  // Detectar si hay coma como separador decimal
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Formato completo: "1.234,56"
    // 1. Eliminar puntos (separadores de miles)
    // 2. Reemplazar coma por punto (separador decimal)
    const result = cleaned.replace(/\./g, '').replace(',', '.');
    return Number.parseFloat(result);
  }
  if (hasComma) {
    // Solo coma: "36,50"
    // Reemplazar coma por punto
    const result = cleaned.replace(',', '.');
    return Number.parseFloat(result);
  }
  if (hasDot) {
    // Solo punto - puede ser separador decimal (formato US) o de miles
    // Heurística: si tiene solo un punto y 2-3 dígitos después, probablemente es decimal
    // si tiene múltiples puntos o más de 3 dígitos antes del último punto, son miles
    const dotCount = (cleaned.match(/\./g) || []).length;

    if (dotCount === 1) {
      const parts = cleaned.split('.');
      const afterDot = parts[1].length;

      // Si tiene 1 o 2 dígitos después del punto, probablemente es decimal formato US
      // Si tiene 3 dígitos, podría ser miles (pero también podría ser decimal con 3 decimales)
      // Por defecto, asumimos formato venezolano (punto como miles)
      if (afterDot === 3 && parts[0].length <= 3) {
        // Caso ambiguo: "123.456" podría ser 123.456 o 123456
        // En contexto BCV, números grandes son más comunes, asumimos miles
        return Number.parseFloat(cleaned.replace(/\./g, ''));
      }
      if (afterDot <= 2) {
        // Probablemente formato US decimal: "36.50"
        return Number.parseFloat(cleaned);
      }
    }

    // Múltiples puntos o caso por defecto: son separadores de miles
    return Number.parseFloat(cleaned.replace(/\./g, ''));
  }
  // Solo dígitos: "1234"
  return Number.parseFloat(cleaned);
}

/**
 * Parsea un string con formato numérico venezolano a número con validación
 *
 * @param value - String con formato venezolano
 * @param defaultValue - Valor por defecto si el parsing falla (default: 0)
 * @returns Número parseado o valor por defecto
 *
 * @example
 * parseVenezuelanNumberSafe("36,50")           // 36.50
 * parseVenezuelanNumberSafe("invalid", 100)    // 100
 * parseVenezuelanNumberSafe("", 0)             // 0
 */
export function parseVenezuelanNumberSafe(value: string, defaultValue = 0): number {
  const parsed = parseVenezuelanNumber(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Formatea un número al formato venezolano (con punto como miles y coma como decimal)
 *
 * @param value - Número a formatear
 * @param decimals - Cantidad de decimales (default: 2)
 * @returns String con formato venezolano
 *
 * @example
 * formatToVenezuelanNumber(1234.56)      // "1.234,56"
 * formatToVenezuelanNumber(36.5)         // "36,50"
 * formatToVenezuelanNumber(1234567.89)   // "1.234.567,89"
 */
export function formatToVenezuelanNumber(value: number, decimals = 2): string {
  if (Number.isNaN(value)) {
    return '0,00';
  }

  // Separar parte entera y decimal
  const fixed = value.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split('.');

  // Agregar separadores de miles
  const withThousandsSeparator = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Combinar con separador decimal
  return decimalPart ? `${withThousandsSeparator},${decimalPart}` : withThousandsSeparator;
}
