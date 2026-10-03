'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  ZapOff,
  Upload,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  Keyboard,
  Info,
} from 'lucide-react';
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library';
import { parseBarcodeData, playScanSuccessSound, ParsedBarcodeResult } from '@/lib/barcodeUtils';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: ParsedBarcodeResult) => void;
}

// Configuração otimizada do leitor ZXing com Try Harder para boletos (ITF)
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

export function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
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
  const [detectedSuccess, setDetectedSuccess] = useState<string | null>(null);

  // Controles de hardware da câmera
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [minZoom, setMinZoom] = useState<number>(1);

  // Entrada manual de Linha Digitável
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Notificação de processamento
  const [isProcessingStill, setIsProcessingStill] = useState(false);

  // Inicializa o leitor ZXing uma única vez
  if (!zxingReaderRef.current) {
    zxingReaderRef.current = createZxingReader();
  }

  // Desativa e libera câmera e loops de animação
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

  // Processamento quando um código válido é detectado
  const handleDetectedCode = useCallback(
    (codeText: string) => {
      const clean = codeText.trim();
      if (!clean) return;

      playScanSuccessSound();
      const parsed = parseBarcodeData(clean);
      setDetectedSuccess(parsed.barcode || clean);

      stopCamera();

      setTimeout(() => {
        onScan(parsed);
        onClose();
      }, 500);
    },
    [onScan, onClose, stopCamera]
  );

  // Decodifica um frame com múltiplos passes (Native MLKit -> ZXing Padrão -> ZXing Alto Contraste)
  const decodeFrame = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (source: CanvasImageSource, width: number, height: number): Promise<string | null> => {
      if (!width || !height) return null;

      // 1. Tenta BarcodeDetector nativo com aceleração por hardware (Google MLKit no Chrome/Android)
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

      // Passo 2.1: Leitura padrão ZXing
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

      // Passo 2.2: Binarização e estiramento de contraste para boletos com sombra ou baixa nitidez
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
        // Código não encontrado neste frame
      }

      return null;
    },
    []
  );

  // Inicializa o Native BarcodeDetector se disponível no navegador
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
        console.warn('BarcodeDetector nativo não pôde ser instanciado:', err);
      }
    }
  }, []);

  // Inicia a câmera com alta resolução e foco contínuo
  const startCamera = useCallback(
    async (deviceId?: string) => {
      setIsInitializing(true);
      setErrorMsg(null);
      setDetectedSuccess(null);
      stopCamera();

      try {
        // Solicita resolução Full HD (1080p) ou pelo menos 720p para nitidez máxima nas barras do boleto
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const videoConstraints: any = {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: deviceId ? undefined : { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
          ],
        };

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: videoConstraints,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Detecta capacidades da câmera (Lanterna e Zoom)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const caps = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;

          // Suporte à Lanterna (Torch)
          setHasTorch(!!caps.torch);
          setTorchOn(false);

          // Suporte a Zoom por hardware
          if (caps.zoom && typeof caps.zoom.max === 'number' && caps.zoom.max > 1) {
            setHasZoom(true);
            setMinZoom(caps.zoom.min || 1);
            setMaxZoom(caps.zoom.max || 3);
            const initialZoom = Math.min(1.5, caps.zoom.max || 1.5);
            setZoomLevel(initialZoom);
            try {
              // Aplica leve zoom inicial (1.5x) para afastar a câmera do papel e garantir foco perfeito
              // @ts-expect-error zoom is supported in ImageCapture spec
              await videoTrack.applyConstraints({ advanced: [{ zoom: initialZoom }] });
            } catch {
              // Ignore se não suportar aplicar zoom de início
            }
          } else {
            setHasZoom(false);
          }
        }

        // Enumera dispositivos de câmera
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevs = devices.filter((d) => d.kind === 'videoinput');
          setCameras(videoDevs);
        } catch {
          // Ignore
        }

        setIsInitializing(false);

        // Loop contínuo de escaneamento a cada 100ms
        let isDecodingBusy = false;
        scanIntervalRef.current = setInterval(async () => {
          if (isDecodingBusy || !videoRef.current) return;
          const video = videoRef.current;
          if (video.readyState < 2) return;

          isDecodingBusy = true;
          try {
            const detected = await decodeFrame(video, video.videoWidth, video.videoHeight);
            if (detected) {
              handleDetectedCode(detected);
            }
          } catch {
            // Continua tentando
          } finally {
            isDecodingBusy = false;
          }
        }, 110);
      } catch (err: unknown) {
        console.error('Erro ao acessar a câmera:', err);
        setIsInitializing(false);

        const errorStr = String(err).toLowerCase();
        if (errorStr.includes('notallowed') || errorStr.includes('permission')) {
          setErrorMsg('Acesso à câmera negado. Permita a câmera no navegador ou envie uma foto do boleto.');
        } else if (errorStr.includes('notfound') || errorStr.includes('device')) {
          setErrorMsg('Nenhuma câmera encontrada. Use a opção de enviar foto ou digite a linha digitável.');
        } else {
          setErrorMsg('Não foi possível iniciar a câmera com alta resolução. Tente enviar uma foto ou digitar o código.');
        }
      }
    },
    [decodeFrame, handleDetectedCode, stopCamera]
  );

  // Alterna lanterna
  const handleToggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      // @ts-expect-error torch is valid
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (e) {
      console.warn('Erro ao alternar lanterna:', e);
    }
  };

  // Ajusta zoom
  const handleSetZoom = async (level: number) => {
    if (!streamRef.current || !hasZoom) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const clamped = Math.max(minZoom, Math.min(level, maxZoom));
      // @ts-expect-error zoom is valid
      await track.applyConstraints({ advanced: [{ zoom: clamped }] });
      setZoomLevel(clamped);
    } catch (e) {
      console.warn('Erro ao aplicar zoom:', e);
    }
  };

  // Alterna entre câmeras disponíveis
  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextDev = cameras[nextIndex];
    setSelectedCameraId(nextDev.deviceId);
    startCamera(nextDev.deviceId);
  };

  // Botão de Snapshot / Focar: captura quadro estático de alta resolução e decodifica
  const handleSnapAndDecode = async () => {
    if (!videoRef.current || isProcessingStill) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    setIsProcessingStill(true);
    try {
      const detected = await decodeFrame(video, video.videoWidth, video.videoHeight);
      if (detected) {
        handleDetectedCode(detected);
      } else {
        // Alerta suave se não encontrou no quadro
        alert('Código não identificado neste ângulo. Mantenha o boleto reto e tente usar o zoom ou lanterna.');
      }
    } finally {
      setIsProcessingStill(false);
    }
  };

  // Leitura a partir de imagem/foto enviada (ou tirada com app nativo da câmera)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingStill(true);
    try {
      const img = new Image();
      img.onload = async () => {
        try {
          const detected = await decodeFrame(img, img.naturalWidth, img.naturalHeight);
          if (detected) {
            handleDetectedCode(detected);
          } else {
            alert('Não foi possível ler o código nesta imagem. Tente uma foto mais nítida ou digite a linha digitável.');
          }
        } finally {
          setIsProcessingStill(false);
          URL.revokeObjectURL(img.src);
        }
      };
      img.src = URL.createObjectURL(file);
    } catch {
      alert('Erro ao carregar imagem.');
      setIsProcessingStill(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Aplica código digitado manualmente
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;

    const parsed = parseBarcodeData(clean);
    if (parsed.amount || parsed.dueDate || parsed.recipient || parsed.barcode) {
      playScanSuccessSound();
      stopCamera();
      onScan(parsed);
      onClose();
    } else {
      alert('Código digitado inválido. Verifique os números digitados.');
    }
  };

  // Inicializa a câmera ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={() => {
          stopCamera();
          onClose();
        }}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Leitor de Boleto & Código de Barras</h3>
              <p className="text-[11px] text-zinc-400">Enquadre as barras do boleto na horizontal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Video Area */}
        <div className="relative bg-black flex items-center justify-center min-h-[320px] max-h-[420px] overflow-hidden">
          {/* Elemento de vídeo conectado ao stream da câmera */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Mira retangular com formato ideal para boletos horizontais (ITF) */}
          {!errorMsg && !detectedSuccess && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
              <div className="relative w-[92%] max-w-[420px] h-[120px] border-2 border-dashed border-amber-400/50 rounded-xl flex items-center justify-center bg-black/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.50)]">
                {/* 4 cantoneiras de mira */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-amber-400 rounded-tl" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-amber-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-amber-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-amber-400 rounded-br" />

                {/* Linha vermelha/âmbar de laser */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
              </div>

              <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-zinc-950/80 backdrop-blur-md rounded-full border border-zinc-700/60 text-zinc-300 text-[11px]">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Mantenha o boleto reto a cerca de 20cm ou use o zoom</span>
              </div>
            </div>
          )}

          {/* Indicador de carregamento */}
          {isInitializing && !errorMsg && !detectedSuccess && (
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-zinc-200 font-medium">Iniciando câmera em alta resolução...</p>
            </div>
          )}

          {/* Feedback de processamento de foto estática */}
          {isProcessingStill && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-amber-300 font-semibold">Analisando imagem em alta resolução...</p>
            </div>
          )}

          {/* Feedback de sucesso */}
          {detectedSuccess && (
            <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-2 animate-bounce" />
              <h4 className="text-sm font-bold text-emerald-100">Boleto Identificado com Sucesso!</h4>
              <p className="text-xs text-emerald-300/90 mt-1 font-mono break-all max-w-sm px-3 py-1.5 bg-emerald-900/40 rounded-lg border border-emerald-700/50">
                {detectedSuccess}
              </p>
              <p className="text-[11px] text-emerald-400 mt-2 font-medium">Preenchendo valor, vencimento e favorecido...</p>
            </div>
          )}

          {/* Visão de erro de câmera */}
          {errorMsg && (
            <div className="p-6 text-center max-w-sm flex flex-col items-center">
              <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-xs text-zinc-200 mb-4">{errorMsg}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startCamera(selectedCameraId)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Enviar Foto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Controles Rápidos da Câmera (Zoom, Lanterna, Troca de Câmera, Captura) */}
        <div className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            {/* Controles de Zoom se suportado pelo hardware */}
            {hasZoom && (
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <ZoomIn className="w-3.5 h-3.5 text-zinc-400 ml-1" />
                <button
                  type="button"
                  onClick={() => handleSetZoom(1)}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                    zoomLevel <= 1.1 ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  1x
                </button>
                <button
                  type="button"
                  onClick={() => handleSetZoom(1.5)}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                    zoomLevel > 1.1 && zoomLevel < 1.9 ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  1.5x
                </button>
                <button
                  type="button"
                  onClick={() => handleSetZoom(2)}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                    zoomLevel >= 1.9 ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  2x
                </button>
              </div>
            )}

            {/* Lanterna / Torch */}
            {hasTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`p-2 rounded-xl text-xs border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  torchOn
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                }`}
                title={torchOn ? 'Desligar Lanterna' : 'Ligar Lanterna'}
              >
                {torchOn ? <Zap className="w-4 h-4 text-amber-400" /> : <ZapOff className="w-4 h-4" />}
                <span className="hidden sm:inline text-[11px]">{torchOn ? 'Lanterna On' : 'Lanterna'}</span>
              </button>
            )}

            {/* Alternar Câmera */}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Alternar Câmera"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Câmera</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Focar / Capturar Quadro */}
            <button
              type="button"
              onClick={handleSnapAndDecode}
              disabled={isInitializing || !!errorMsg || isProcessingStill}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Focar e capturar quadro de alta resolução"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Focar / Capturar</span>
            </button>

            {/* Upload / Tirar Foto Nativa com a Câmera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Tirar foto com câmera nativa ou carregar foto do boleto"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Foto / Galeria</span>
            </button>
          </div>
        </div>

        {/* Opção para digitar ou colar linha digitável caso o papel esteja rasgado ou manchado */}
        <div className="p-3.5 bg-zinc-950 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-xs text-amber-400/90 hover:text-amber-300 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{showManualInput ? 'Ocultar digitação manual' : 'Código ilegível? Digite a Linha Digitável'}</span>
            </button>
          </div>

          {showManualInput && (
            <form onSubmit={handleManualSubmit} className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                placeholder="Cole ou digite os números do boleto (47 ou 48 dígitos)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs font-mono"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Aplicar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
