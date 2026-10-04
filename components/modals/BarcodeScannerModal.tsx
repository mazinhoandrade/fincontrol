'use client';

import React from 'react';
import { BarcodeScanner } from '@/components/boleto/barcode-scanner';
import { BoletoData } from '@/lib/boleto/parser';

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: BoletoData) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  return (
    <BarcodeScanner
      isOpen={isOpen}
      onClose={onClose}
      onScan={onScan}
    />
  );
}
