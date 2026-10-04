'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  ZapOff,
  Upload,
  Keyboard,
  Info,
  ScanLine,
  Image as ImageIcon,
} from 'lucide-react';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';
import { parseBoleto, BoletoData } from '@/lib/boleto/parser';
import { playScanSuccessSound } from '@/lib/boleto/barcode';
import { BoletoPreview } from './boleto-preview';
import { BoletoInput } from './boleto-input';

export interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: BoletoData) => void;
}

// Configuração do leitor ZXing com Try Harder para boletos (ITF / Code 128 / QR Code)
function createZxingReader(): MultiFormatReader {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.ITF, // Boletos bancários e concessionárias (Interleaved 2 of 5)
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.QR_CODE, // Boletos com PIX
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual' | 'file'>('camera');
  const [detectedData, setDetectedData] = useState<BoletoData | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zxingReaderRef = useRef<MultiFormatReader | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nativeDetectorRef = useRef<any>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hardware controls
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  if (!zxingReaderRef.current) {
    zxingReaderRef.current = createZxingReader();
  }

  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDetectedCode = useCallback(
    (codeText: string) => {
      const clean = codeText.trim();
      if (!clean) return;

      playScanSuccessSound();
      const parsed = parseBoleto(clean);
      stopCamera();
      setDetectedData(parsed);
    },
    [stopCamera]
  );

  // Decodifica frame com Native MLKit + ZXing padrão + ZXing alto contraste
  const decodeFrame = useCallback(
    async (source: CanvasImageSource, width: number, height: number): Promise<string | null> => {
      if (!width || !height) return null;

      // 1. Tenta BarcodeDetector nativo (Google MLKit)
      if (nativeDetectorRef.current) {
        try {
          const barcodes = await nativeDetectorRef.current.detect(source);
          if (barcodes && barcodes.length > 0) {
            for (const b of barcodes) {
              if (b.rawValue && b.rawValue.trim()) {
                return b.rawValue.trim();
              }
            }
          }
        } catch {
          // Fallback para ZXing
        }
      }

      // 2. Prepara canvas para análise pelo ZXing
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      ctx.drawImage(source, 0, 0, width, height);
      const imgData = ctx.getImageData(0, 0, width, height);

      const reader = zxingReaderRef.current;
      if (!reader) return null;

      // 2.1 Leitura normal ZXing
      try {
        const lum = new RGBLuminanceSource(imgData.data, width, height);
        const bitmap = new BinaryBitmap(new HybridBinarizer(lum));
        const result = reader.decode(bitmap);
        if (result && result.getText()) {
          return result.getText();
        }
      } catch {
        // Continua para o passo de alto contraste
      }

      // 2.2 Binarização com estiramento de contraste para boletos com sombra
      const d = imgData.data;
      let min = 255;
      let max = 0;
      for (let i = 0; i < d.length; i += 4) {
        const gray = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
        if (gray < min) min = gray;
        if (gray > max) max = gray;
      }

      const range = max - min || 1;
      const threshold = min + range * 0.46;

      for (let i = 0; i < d.length; i += 4) {
        const gray = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
        const val = gray > threshold ? 255 : 0;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }

      try {
        const lumContrast = new RGBLuminanceSource(d, width, height);
        const bitmapContrast = new BinaryBitmap(new HybridBinarizer(lumContrast));
        const resultContrast = reader.decode(bitmapContrast);
        if (resultContrast && resultContrast.getText()) {
          return resultContrast.getText();
        }
      } catch {
        // Não detectado
      }

      return null;
    },
    []
  );

  // Inicializa BarcodeDetector nativo se suportado
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (typeof win !== 'undefined' && 'BarcodeDetector' in win) {
      try {
        win.BarcodeDetector.getSupportedFormats().then((formats: string[]) => {
          const supported = ['itf', 'code_128', 'code_39', 'ean_13', 'qr_code'].filter((f) =>
            formats.includes(f)
          );
          if (supported.length > 0) {
            nativeDetectorRef.current = new win.BarcodeDetector({ formats: supported });
          }
        });
      } catch (err) {
        console.warn('BarcodeDetector nativo indisponível:', err);
      }
    }
  }, []);

  // Inicia a câmera
  const startCamera = useCallback(
    async (deviceId?: string) => {
      setIsInitializing(true);
      setErrorMsg(null);
      stopCamera();

      try {
        const videoConstraints: MediaTrackConstraints & { focusMode?: string } = {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          focusMode: 'continuous',
        };

        if (deviceId) {
          videoConstraints.deviceId = { exact: deviceId };
        } else {
          videoConstraints.facingMode = { ideal: 'environment' };
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        streamRef.current = stream;

        // Enumera câmeras
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevs = devices.filter((d) => d.kind === 'videoinput');
          setCameras(videoDevs);
          if (!selectedCameraId && videoDevs.length > 0) {
            const activeTrack = stream.getVideoTracks()[0];
            const settings = activeTrack.getSettings();
            if (settings.deviceId) {
              setSelectedCameraId(settings.deviceId);
            }
          }
        } catch {
          // ignore
        }

        // Verifica capacidade de lanterna (torch)
        const track = stream.getVideoTracks()[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        setHasTorch(Boolean(capabilities && 'torch' in capabilities));
        setTorchOn(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        setIsInitializing(false);

        // Loop de escaneamento (a cada 140ms para máxima responsividade sem travar CPU)
        let isProcessing = false;
        scanIntervalRef.current = setInterval(async () => {
          if (isProcessing) return;
          if (!videoRef.current || videoRef.current.readyState < 2) return;

          isProcessing = true;
          try {
            const video = videoRef.current;
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (w && h) {
              const code = await decodeFrame(video, w, h);
              if (code) {
                handleDetectedCode(code);
              }
            }
          } catch {
            // Continua escaneando
          } finally {
            isProcessing = false;
          }
        }, 140);
      } catch (err: unknown) {
        console.error('Erro ao iniciar câmera:', err);
        setIsInitializing(false);
        const name = (err as Error)?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMsg('Acesso à câmera negado. Habilite a permissão no seu navegador ou use a aba Digitar / Colar.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMsg('Nenhuma câmera encontrada no dispositivo. Você pode digitar ou colar o código.');
        } else {
          setErrorMsg('Não foi possível iniciar a câmera. Tente alternar de câmera ou colar o código.');
        }
      }
    },
    [decodeFrame, handleDetectedCode, selectedCameraId, stopCamera]
  );

  // Alterna lanterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Erro ao alternar lanterna:', err);
    }
  };

  // Alterna entre câmeras (frontal / traseira / externa)
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    setSelectedCameraId(nextCam.deviceId);
    startCamera(nextCam.deviceId);
  };

  // Processa arquivo de imagem carregado
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMsg(null);

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = reject;
      });

      const code = await decodeFrame(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(objectUrl);

      if (code) {
        handleDetectedCode(code);
      } else {
        setErrorMsg('Não foi possível encontrar um código de barras legível nesta imagem. Tente uma foto mais nítida ou digite o código.');
      }
    } catch (err) {
      console.error('Erro ao ler imagem:', err);
      setErrorMsg('Falha ao processar a imagem.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Gerencia ciclo de vida quando modal abre/fecha ou muda de modo
  useEffect(() => {
    if (isOpen && mode === 'camera' && !detectedData) {
      startCamera(selectedCameraId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, detectedData, startCamera, stopCamera, selectedCameraId]);

  if (!isOpen) return null;

  const handleConfirmBoleto = (data: BoletoData) => {
    onScan(data);
    onClose();
  };

  const handleRescan = () => {
    setDetectedData(null);
    setMode('camera');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Leitor de Boletos & Códigos</h2>
              <p className="text-xs text-zinc-400">Escaneie ou digite para preencher automaticamente</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar leitor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (only shown when not showing detected preview) */}
        {!detectedData && (
          <div className="flex items-center border-b border-zinc-800 px-4 shrink-0 bg-zinc-950/60">
            <button
              type="button"
              onClick={() => {
                setMode('camera');
                setErrorMsg(null);
              }}
              className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                mode === 'camera'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Câmera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('manual');
                setErrorMsg(null);
                stopCamera();
              }}
              className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                mode === 'manual'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Digitar / Colar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('file');
                setErrorMsg(null);
                stopCamera();
              }}
              className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                mode === 'file'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Carregar Imagem</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {/* 1. SE DETECTOU DADOS -> EXIBE PREVIEW E CONFIRMAÇÃO */}
          {detectedData ? (
            <BoletoPreview
              data={detectedData}
              onConfirm={handleConfirmBoleto}
              onRescan={handleRescan}
              onCancel={onClose}
            />
          ) : mode === 'camera' ? (
            /* 2. MODO CÂMERA AO VIVO COM OVERLAY */
            <div className="space-y-3">
              <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center">
                {/* Vídeo */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Overlay visual: Mira para código de barras */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  {/* Máscara escura ao redor */}
                  <div className="relative w-full max-w-sm h-36 sm:h-44 rounded-2xl border-2 border-amber-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden">
                    {/* Cantos estilizados da mira */}
                    <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-amber-300" />
                    <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-amber-300" />
                    <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-amber-300" />
                    <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-amber-300" />

                    {/* Linha laser vermelha/âmbar animada escaneando */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce" />

                    <div className="text-[11px] font-medium text-amber-200/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm border border-amber-400/20">
                      Posicione o código de barras aqui
                    </div>
                  </div>
                </div>

                {/* Loading indicator durante inicialização */}
                {isInitializing && (
                  <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center gap-2.5 text-zinc-300 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                    <span>Iniciando câmera...</span>
                  </div>
                )}

                {/* Floating camera hardware controls */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                        torchOn
                          ? 'bg-amber-400 text-zinc-950 border-amber-400'
                          : 'bg-black/60 text-zinc-200 border-white/10 hover:bg-black/80'
                      }`}
                      title={torchOn ? 'Desligar lanterna' : 'Ligar lanterna'}
                    >
                      {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                    </button>
                  )}

                  {cameras.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-zinc-200 backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                      title="Alternar câmera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dica de orientação */}
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4 text-amber-400 shrink-0" />
                  Aponte para o código de barras ou QR Code Pix
                </span>

                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Digitar manualmente
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-xl text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}
            </div>
          ) : mode === 'manual' ? (
            /* 3. MODO ENTRADA MANUAL */
            <BoletoInput onBoletoReady={(data) => setDetectedData(data)} />
          ) : (
            /* 4. MODO CARREGAR IMAGEM / ARQUIVO */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-zinc-800 hover:border-amber-500/60 rounded-2xl bg-zinc-950/60 text-center cursor-pointer transition-all hover:bg-zinc-950"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-400/20">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  Clique para selecionar uma foto ou print do boleto
                </h4>
                <p className="text-xs text-zinc-500 mt-1">Formatos suportados: PNG, JPG, JPEG, WEBP</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {isProcessingFile && (
                <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analisando código de barras na imagem...</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-xl text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
