/**
 * Validadores para Boletos Bancários e Faturas de Concessionárias/Convênios
 * em conformidade com as normas FEBRABAN e BACEN.
 */

/**
 * Remove qualquer caractere não numérico
 */
export function cleanDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Algoritmo Módulo 10 (usado nos blocos da linha digitável bancária e concessionária)
 */
export function modulo10(block: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = block.length - 1; i >= 0; i--) {
    let mul = parseInt(block[i], 10) * weight;
    if (mul > 9) mul = Math.floor(mul / 10) + (mul % 10);
    sum += mul;
    weight = weight === 2 ? 1 : 2;
  }
  const rem = sum % 10;
  return rem === 0 ? 0 : 10 - rem;
}

/**
 * Algoritmo Módulo 11 para Código de Barras Bancário (FEBRABAN)
 * Pesos de 2 a 9 da direita para a esquerda.
 * Se resto = 0, 10 ou 11 -> DV = 1
 */
export function modulo11Boleto(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const dv = 11 - rest;
  if (dv === 0 || dv === 10 || dv === 11) return 1;
  return dv;
}

/**
 * Algoritmo Módulo 11 para Concessionárias / Arrecadação
 */
export function modulo11Concessionaria(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  if (rest === 0 || rest === 1) return 0;
  if (rest === 10) return 1;
  return 11 - rest;
}

/**
 * Validação da Linha Digitável de Boleto Bancário (47 dígitos)
 */
export function validateBoletoBancarioLinha(digits: string): { isValid: boolean; message?: string } {
  const clean = cleanDigits(digits);
  if (clean.length !== 47) {
    return { isValid: false, message: 'Linha digitável bancária deve ter 47 dígitos' };
  }

  // Bloco 1: 9 dígitos + 1 DV
  const b1 = clean.slice(0, 9);
  const dv1 = parseInt(clean[9], 10);
  if (modulo10(b1) !== dv1) {
    return { isValid: false, message: 'Dígito verificador do Bloco 1 inválido' };
  }

  // Bloco 2: 10 dígitos + 1 DV
  const b2 = clean.slice(10, 20);
  const dv2 = parseInt(clean[20], 10);
  if (modulo10(b2) !== dv2) {
    return { isValid: false, message: 'Dígito verificador do Bloco 2 inválido' };
  }

  // Bloco 3: 10 dígitos + 1 DV
  const b3 = clean.slice(21, 31);
  const dv3 = parseInt(clean[31], 10);
  if (modulo10(b3) !== dv3) {
    return { isValid: false, message: 'Dígito verificador do Bloco 3 inválido' };
  }

  return { isValid: true };
}

/**
 * Validação da Linha Digitável de Concessionária / Arrecadação (48 dígitos)
 */
export function validateBoletoConcessionariaLinha(digits: string): { isValid: boolean; message?: string } {
  const clean = cleanDigits(digits);
  if (clean.length !== 48) {
    return { isValid: false, message: 'Linha de concessionária deve ter 48 dígitos' };
  }

  const moeda = clean[2];
  // Moeda 6 e 7 usam Módulo 10; Moeda 8 e 9 usam Módulo 11
  const calcDV = (bloco: string) => {
    if (moeda === '8' || moeda === '9') {
      return modulo11Concessionaria(bloco);
    }
    return modulo10(bloco);
  };

  for (let i = 0; i < 4; i++) {
    const bloco = clean.slice(i * 12, i * 12 + 11);
    const dv = parseInt(clean[i * 12 + 11], 10);
    if (calcDV(bloco) !== dv) {
      return { isValid: false, message: `Dígito verificador do Bloco ${i + 1} inválido` };
    }
  }

  return { isValid: true };
}

/**
 * Validação geral de qualquer código digitado ou escaneado
 */
export function validateBoletoCode(text: string): {
  isValid: boolean;
  type: 'boleto_bancario' | 'concessionaria' | 'pix' | 'barcode_44' | 'unknown';
  message?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isValid: false, type: 'unknown', message: 'Código vazio' };
  }

  // Verifica se é QR Code PIX
  if (trimmed.startsWith('000201')) {
    return { isValid: true, type: 'pix' };
  }

  const digits = cleanDigits(trimmed);

  // Boleto Bancário Linha Digitável (47 dígitos)
  if (digits.length === 47 && digits[0] !== '8') {
    const res = validateBoletoBancarioLinha(digits);
    return { isValid: res.isValid, type: 'boleto_bancario', message: res.message };
  }

  // Concessionária Linha Digitável (48 dígitos)
  if (digits.length === 48 && digits[0] === '8') {
    const res = validateBoletoConcessionariaLinha(digits);
    return { isValid: res.isValid, type: 'concessionaria', message: res.message };
  }

  // Código de barras direto (44 dígitos)
  if (digits.length === 44) {
    if (digits[0] === '8') {
      return { isValid: true, type: 'concessionaria' };
    }
    // Verifica DV geral para bancário (posição 5)
    const semDV = digits.slice(0, 4) + digits.slice(5);
    const dvGeral = parseInt(digits[4], 10);
    const dvCalculado = modulo11Boleto(semDV);
    return {
      isValid: dvGeral === dvCalculado,
      type: 'boleto_bancario',
      message: dvGeral !== dvCalculado ? 'Dígito verificador geral do código de barras é inválido' : undefined,
    };
  }

  return { isValid: false, type: 'unknown', message: 'Tamanho de código incompatível com boleto (esperado 44, 47 ou 48 dígitos)' };
}
