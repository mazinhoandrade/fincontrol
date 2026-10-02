'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, X, RefreshCw, Zap, ZapOff, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseBarcodeData, playScanSuccessSound, ParsedBarcodeResult } from '@/lib/barcodeUtils';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: ParsedBarcodeResult) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detectedSuccess, setDetectedSuccess] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStoppingRef = useRef<boolean>(false);
  const elementId = 'barcode-scanner-viewport';

  // Stop camera scanner safely
  const stopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    try {
      const scanner = scannerRef.current;
      if (scanner) {
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING || scanner.getState() === Html5QrcodeScannerState.PAUSED) {
          await scanner.stop();
        }
        scanner.clear();
      }
    } catch (err) {
      console.warn('Erro ao finalizar scanner:', err);
    } finally {
      scannerRef.current = null;
      isStoppingRef.current = false;
    }
  }, []);

  // Handle successful detection
  const handleSuccess = useCallback(
    async (decodedText: string) => {
      // Avoid multiple detections in a row
      if (detectedSuccess) return;

      playScanSuccessSound();
      const parsed = parseBarcodeData(decodedText);
      setDetectedSuccess(parsed.barcode || decodedText);

      await stopScanner();

      // Short delay for visual feedback to user
      setTimeout(() => {
        onScan(parsed);
        onClose();
      }, 550);
    },
    [detectedSuccess, onScan, onClose, stopScanner]
  );

  // Start scanning with selected or default camera
  const startScanner = useCallback(
    async (cameraId?: string) => {
      setIsInitializing(true);
      setErrorMsg(null);
      setDetectedSuccess(null);
      setTorchOn(false);

      try {
        await stopScanner();

        // Check if DOM element exists
        const el = document.getElementById(elementId);
        if (!el) {
          setIsInitializing(false);
          return;
        }

        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });

        scannerRef.current = scanner;

        // Discover cameras if not yet loaded
        const availableCameras = await Html5Qrcode.getCameras();
        if (availableCameras && availableCameras.length > 0) {
          setCameras(availableCameras);
        }

        // Camera config: Prefer rear/environment camera
        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: 'environment' };

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // Wide aspect ratio optimal for Brazilian boleto barcodes
              const width = Math.min(Math.round(viewfinderWidth * 0.92), 420);
              const height = Math.min(Math.round(viewfinderHeight * 0.55), 180);
              return { width, height };
            },
            aspectRatio: 1.333333,
          },
          (decodedText) => {
            handleSuccess(decodedText);
          },
          () => {
            // Frame scan without match - ignore
          }
        );

        // Check if torch/flashlight is supported
        try {
          const trackCaps = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & { torch?: boolean };
          if (trackCaps && 'torch' in trackCaps) {
            setHasTorch(true);
          } else {
            setHasTorch(false);
          }
        } catch {
          setHasTorch(false);
        }

        setIsInitializing(false);
      } catch (err: unknown) {
        console.error('Falha ao iniciar câmera:', err);
        setIsInitializing(false);

        const errorStr = String(err).toLowerCase();
        if (errorStr.includes('notallowed') || errorStr.includes('permission')) {
          setErrorMsg('Permissão de acesso à câmera negada. Habilite a câmera nas configurações do navegador ou envie uma foto.');
        } else if (errorStr.includes('notfound') || errorStr.includes('device')) {
          setErrorMsg('Nenhuma câmera encontrada no dispositivo. Você pode carregar uma foto do boleto.');
        } else {
          setErrorMsg('Não foi possível iniciar a câmera. Tente recarregar ou selecione uma imagem.');
        }
      }
    },
    [handleSuccess, stopScanner]
  );

  // Toggle torch / lanterna
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        // @ts-expect-error torch is valid in modern browser video constraints
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Erro ao alternar lanterna:', e);
    }
  };

  // Switch between available cameras
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startScanner(nextCamera.id);
  };

  // Scan from uploaded file / image
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsInitializing(true);
    setErrorMsg(null);

    try {
      // Need a scanner instance to scan file
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = scanner;
      }

      // If active video is scanning, stop it before scanning file
      if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
        await scanner.stop();
      }

      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        handleSuccess(decodedText);
      } else {
        setErrorMsg('Nenhum código de barras ou QR Code foi detectado na imagem.');
        setIsInitializing(false);
      }
    } catch {
      setErrorMsg('Não foi possível ler código nesta imagem. Tente uma foto mais nítida.');
      setIsInitializing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Initialize on open and clean up on close
  useEffect(() => {
    if (isOpen) {
      // Wait for modal DOM element to mount
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={() => {
          stopScanner();
          onClose();
        }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Escanear Código de Barras</h3>
              <p className="text-[11px] text-zinc-400">Aponte para o boleto ou envie uma foto</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Camera Body */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
          {/* HTML5 QR Code Mount Target */}
          <div
            id={elementId}
            className="w-full max-h-[360px] overflow-hidden flex items-center justify-center [&_video]:w-full [&_video]:object-cover"
          />

          {/* Scanner Viewfinder Overlay */}
          {!errorMsg && !detectedSuccess && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
              {/* Target Bounding Frame */}
              <div className="relative w-[88%] max-w-[380px] h-[130px] border-2 border-dashed border-amber-400/40 rounded-xl flex items-center justify-center bg-black/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* 4 Corner Markers */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-amber-400 rounded-tl-sm" />
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-amber-400 rounded-tr-sm" />
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-amber-400 rounded-bl-sm" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-amber-400 rounded-br-sm" />

                {/* Laser Scanning Animation Bar */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-bounce opacity-85 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </div>

              <p className="mt-4 text-[11px] font-medium text-zinc-300 bg-zinc-950/70 px-3 py-1 rounded-full border border-zinc-700/50 backdrop-blur-sm">
                Enquadre o código de barras ou QR Code do boleto
              </p>
            </div>
          )}

          {/* Loading Indicator */}
          {isInitializing && !errorMsg && !detectedSuccess && (
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5">
              <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
              <p className="text-xs text-zinc-300 font-medium">Iniciando câmera...</p>
            </div>
          )}

          {/* Success Overlay */}
          {detectedSuccess && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
              <h4 className="text-sm font-semibold text-emerald-100">Código Lido com Sucesso!</h4>
              <p className="text-[11px] text-emerald-300/90 mt-1 font-mono break-all max-w-xs">
                {detectedSuccess}
              </p>
              <p className="text-[11px] text-emerald-400 mt-2 font-medium">Preenchendo campos da conta...</p>
            </div>
          )}

          {/* Error View */}
          {errorMsg && (
            <div className="p-6 text-center max-w-xs flex flex-col items-center">
              <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full mb-3">
                <AlertCircle className="w-7 h-7" />
              </div>
              <p className="text-xs text-zinc-200 mb-4">{errorMsg}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startScanner(selectedCameraId)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar Câmera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Enviar Foto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between p-4 bg-zinc-950 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            {/* Switch Camera */}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs transition-colors flex items-center gap-1.5"
                title="Alternar Câmera"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Trocar Câmera</span>
              </button>
            )}

            {/* Flashlight / Torch */}
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl text-xs border transition-colors flex items-center gap-1.5 ${
                  torchOn
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                }`}
                title={torchOn ? 'Desligar Lanterna' : 'Ligar Lanterna'}
              >
                {torchOn ? <Zap className="w-4 h-4 text-amber-400" /> : <ZapOff className="w-4 h-4" />}
                <span className="hidden sm:inline text-[11px]">{torchOn ? 'Lanterna Ligada' : 'Lanterna'}</span>
              </button>
            )}

            {/* Upload File */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs transition-colors flex items-center gap-1.5"
              title="Carregar imagem do código de barras"
            >
              <Upload className="w-4 h-4" />
              <span className="text-[11px]">Enviar Foto</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
