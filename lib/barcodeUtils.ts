/**
 * Utilitários para decodificação e preenchimento automático a partir de
 * códigos de barras, linhas digitáveis e QR Codes (Boletos bancários, concessionárias e PIX).
 */

export const BRAZILIAN_BANKS: Record<string, string> = {
  '001': 'Banco do Brasil',
  '003': 'Banco da Amazônia',
  '004': 'Banco do Nordeste',
  '033': 'Santander',
  '077': 'Banco Inter',
  '104': 'Caixa Econômica Federal',
  '208': 'BTG Pactual',
  '212': 'Banco Original',
  '237': 'Banco Bradesco',
  '260': 'Nubank',
  '290': 'PagBank',
  '336': 'C6 Bank',
  '341': 'Banco Itaú',
  '380': 'PicPay',
  '389': 'Banco Mercantil do Brasil',
  '422': 'Banco Safra',
  '655': 'Banco Neon',
  '748': 'Sicredi',
  '756': 'Sicoob',
  '041': 'Banrisul',
  '070': 'BRB',
  '136': 'Unicred',
  '085': 'Ailos',
  '637': 'Banco Sofisa',
  '707': 'Banco Daycoval',
  '069': 'Crefisa',
  '623': 'Banco Pan',
  '121': 'Banco Agibank',
  '318': 'Banco BMG',
};

export const CONCESSIONARIA_SEGMENTS: Record<string, { name: string; title: string; categoryKeyword: string }> = {
  '1': { name: 'Prefeitura / IPTU', title: 'Tributo Municipal / IPTU', categoryKeyword: 'imposto' },
  '2': { name: 'Saneamento / Água', title: 'Conta de Água', categoryKeyword: 'servico' },
  '3': { name: 'Energia Elétrica / Gás', title: 'Conta de Luz / Energia', categoryKeyword: 'servico' },
  '4': { name: 'Telecomunicações', title: 'Conta de Telefone / Internet', categoryKeyword: 'servico' },
  '5': { name: 'Órgãos Governamentais', title: 'Guia Governamental / Taxa', categoryKeyword: 'imposto' },
  '6': { name: 'Carnês e Assemelhados', title: 'Carnê / Boleto', categoryKeyword: 'servico' },
  '7': { name: 'Multas de Trânsito', title: 'Multa de Trânsito', categoryKeyword: 'transporte' },
  '9': { name: 'Outros Serviços', title: 'Fatura de Serviço', categoryKeyword: 'servico' },
};

export interface ParsedBarcodeResult {
  raw: string;
  barcode: string;
  amount?: number; // Em centavos (ex: 15000 = R$ 150,00)
  dueDate?: string; // YYYY-MM-DD
  recipient?: string;
  titleSuggestion?: string;
  categoryKeyword?: string;
  type: 'boleto_bancario' | 'concessionaria' | 'pix' | 'generic';
}

function modulo10(block: string): number {
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
 * Converte código de barras bancário de 44 dígitos para Linha Digitável formatada (47 dígitos)
 */
export function barcode44ToLinha47(b44: string): string {
  if (b44.length !== 44) return b44;
  const banco = b44.slice(0, 3);
  const moeda = b44.slice(3, 4);
  const dvGeral = b44.slice(4, 5);
  const fator = b44.slice(5, 9);
  const valor = b44.slice(9, 19);
  const campoLivre1 = b44.slice(19, 24);
  const campoLivre2 = b44.slice(24, 34);
  const campoLivre3 = b44.slice(34, 44);

  const b1 = banco + moeda + campoLivre1;
  const dv1 = modulo10(b1);
  const part1 = `${b1.slice(0, 5)}.${b1.slice(5)}${dv1}`;

  const b2 = campoLivre2;
  const dv2 = modulo10(b2);
  const part2 = `${b2.slice(0, 5)}.${b2.slice(5)}${dv2}`;

  const b3 = campoLivre3;
  const dv3 = modulo10(b3);
  const part3 = `${b3.slice(0, 5)}.${b3.slice(5)}${dv3}`;

  const part4 = dvGeral;
  const part5 = fator + valor;

  return `${part1} ${part2} ${part3} ${part4} ${part5}`;
}

/**
 * Formata linha digitável bancária com pontos e espaços
 */
export function formatLinha47(raw47: string): string {
  const c = raw47.replace(/\D/g, '');
  if (c.length !== 47) return raw47;
  return `${c.slice(0, 5)}.${c.slice(5, 10)} ${c.slice(10, 15)}.${c.slice(15, 21)} ${c.slice(21, 26)}.${c.slice(26, 32)} ${c.slice(32, 33)} ${c.slice(33, 47)}`;
}

/**
 * Formata linha digitável de concessionária (48 dígitos)
 */
export function formatLinha48(raw48: string): string {
  const c = raw48.replace(/\D/g, '');
  if (c.length !== 48) return raw48;
  return `${c.slice(0, 11)}-${c.slice(11, 12)} ${c.slice(12, 23)}-${c.slice(23, 24)} ${c.slice(24, 35)}-${c.slice(35, 36)} ${c.slice(36, 47)}-${c.slice(47, 48)}`;
}

/**
 * Calcula a data de vencimento a partir do fator de vencimento (FEBRABAN)
 * Trata o rollover de 22/02/2025 usando uma janela deslizante contínua.
 */
export function parseBoletoDueDate(factorStr: string): string | null {
  const factor = parseInt(factorStr, 10);
  if (!factor || factor <= 0) return null;

  // Data base Febraban: 07/10/1997
  const baseEpoch = Date.UTC(1997, 9, 7);
  const cycle1 = new Date(baseEpoch + factor * 86400000);
  const cycle2 = new Date(baseEpoch + (factor + 9000) * 86400000);

  const now = Date.now();
  // Escolhe o ciclo mais plausível próximo à data atual
  const diff1 = Math.abs(cycle1.getTime() - now);
  const diff2 = Math.abs(cycle2.getTime() - now);
  const chosen = diff2 < diff1 ? cycle2 : cycle1;

  return chosen.toISOString().split('T')[0];
}

/**
 * Decodifica QR Code do tipo PIX (EMVCo)
 */
function parsePixQrCode(payload: string): ParsedBarcodeResult | null {
  if (!payload.startsWith('000201')) return null;

  let i = 0;
  const tags: Record<string, string> = {};

  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (isNaN(len) || len < 0 || i + 4 + len > payload.length) break;
    const val = payload.slice(i + 4, i + 4 + len);
    tags[tag] = val;
    i += 4 + len;
  }

  let amount: number | undefined;
  if (tags['54']) {
    const parsedAmount = parseFloat(tags['54']);
    if (!isNaN(parsedAmount) && parsedAmount > 0) {
      amount = Math.round(parsedAmount * 100);
    }
  }

  const recipient = tags['59']?.trim() || undefined;
  const titleSuggestion = recipient ? `Pix - ${recipient}` : 'Pagamento Pix';

  return {
    raw: payload,
    barcode: payload,
    amount,
    recipient,
    titleSuggestion,
    categoryKeyword: 'servico',
    type: 'pix',
  };
}

/**
 * Função principal para analisar qualquer código lido pela câmera ou digitado
 */
export function parseBarcodeData(text: string): ParsedBarcodeResult {
  const trimmed = text.trim();

  // Verifica se é QR Code PIX
  const pixResult = parsePixQrCode(trimmed);
  if (pixResult) return pixResult;

  // Limpa caracteres não numéricos para códigos de barras / linha digitável
  const digits = trimmed.replace(/\D/g, '');

  // 1. Boleto Bancário - Código de Barras (44 dígitos, não começa com 8)
  if (digits.length === 44 && digits[0] !== '8') {
    const bankCode = digits.slice(0, 3);
    const factor = digits.slice(5, 9);
    const amountStr = digits.slice(9, 19);
    const amount = parseInt(amountStr, 10);
    const dueDate = parseBoletoDueDate(factor) || undefined;
    const bankName = BRAZILIAN_BANKS[bankCode] || `Banco (${bankCode})`;
    const formattedLinha = barcode44ToLinha47(digits);

    return {
      raw: trimmed,
      barcode: formattedLinha,
      amount: amount > 0 ? amount : undefined,
      dueDate,
      recipient: bankName,
      titleSuggestion: `Boleto ${bankName}`,
      categoryKeyword: 'servico',
      type: 'boleto_bancario',
    };
  }

  // 2. Boleto Bancário - Linha Digitável (47 dígitos, não começa com 8)
  if (digits.length === 47 && digits[0] !== '8') {
    const bankCode = digits.slice(0, 3);
    const factor = digits.slice(33, 37);
    const amountStr = digits.slice(37, 47);
    const amount = parseInt(amountStr, 10);
    const dueDate = parseBoletoDueDate(factor) || undefined;
    const bankName = BRAZILIAN_BANKS[bankCode] || `Banco (${bankCode})`;

    return {
      raw: trimmed,
      barcode: formatLinha47(digits),
      amount: amount > 0 ? amount : undefined,
      dueDate,
      recipient: bankName,
      titleSuggestion: `Boleto ${bankName}`,
      categoryKeyword: 'servico',
      type: 'boleto_bancario',
    };
  }

  // 3. Concessionária / Arrecadação - Código de Barras (44 dígitos começando com 8)
  if (digits.length === 44 && digits[0] === '8') {
    const segment = digits[1];
    const amountStr = digits.slice(4, 15);
    const amount = parseInt(amountStr, 10);
    const segmentInfo = CONCESSIONARIA_SEGMENTS[segment] || {
      name: 'Concessionária',
      title: 'Fatura de Concessionária',
      categoryKeyword: 'servico',
    };

    return {
      raw: trimmed,
      barcode: digits,
      amount: amount > 0 ? amount : undefined,
      recipient: segmentInfo.name,
      titleSuggestion: segmentInfo.title,
      categoryKeyword: segmentInfo.categoryKeyword,
      type: 'concessionaria',
    };
  }

  // 4. Concessionária / Arrecadação - Linha Digitável (48 dígitos começando com 8)
  if (digits.length === 48 && digits[0] === '8') {
    const segment = digits[1];
    // Remove DVs das 4 partes de 12 dígitos
    const b44 =
      digits.slice(0, 11) +
      digits.slice(12, 23) +
      digits.slice(24, 35) +
      digits.slice(36, 47);
    const amountStr = b44.slice(4, 15);
    const amount = parseInt(amountStr, 10);
    const segmentInfo = CONCESSIONARIA_SEGMENTS[segment] || {
      name: 'Concessionária',
      title: 'Fatura de Concessionária',
      categoryKeyword: 'servico',
    };

    return {
      raw: trimmed,
      barcode: formatLinha48(digits),
      amount: amount > 0 ? amount : undefined,
      recipient: segmentInfo.name,
      titleSuggestion: segmentInfo.title,
      categoryKeyword: segmentInfo.categoryKeyword,
      type: 'concessionaria',
    };
  }

  // 5. Código Genérico (EAN-13, Code 128, etc.)
  return {
    raw: trimmed,
    barcode: trimmed,
    type: 'generic',
  };
}

/**
 * Toca um feedback sonoro amigável quando um código é lido com sucesso
 */
export function playScanSuccessSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.([60, 40, 80]);
    }
  } catch {
    // Ignora erros de áudio silenciosamente
  }
}
