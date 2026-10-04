/**
 * Utilitários legados de código de barras - Redireciona para o novo módulo lib/boleto/
 */

import { parseBoleto, BoletoData } from './boleto/parser';

export * from './boleto/validators';
export * from './boleto/parser';
export * from './boleto/barcode';

export type ParsedBarcodeResult = BoletoData;

/**
 * Função legado para retrocompatibilidade
 */
export function parseBarcodeData(text: string): ParsedBarcodeResult {
  return parseBoleto(text);
}
