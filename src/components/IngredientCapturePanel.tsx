import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Plus,
  X,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Check,
  AlertCircle,
} from 'lucide-react';
import { SafeImage } from './SafeImage';
import type { CapturedIngredient, StrictMode } from '../types/kitchen';

export const SAMPLE_SPREADS = [
  {
    id: 'countertop-morning',
    title: 'Morning Countertop',
    subtitle: 'Eggs, tomatoes, spinach, cheddar, garlic, sourdough',
    imageUrl: '/src/assets/images/kitchen_counter_spread_1795247621327.jpg',
  },
  {
    id: 'pasta-pantry',
    title: 'Pasta Pantry',
    subtitle: 'Rigatoni, roma tomatoes, basil, garlic, parmesan, olive oil',
    imageUrl: '/src/assets/images/pantry_pasta_spread_1795247620907.jpg',
  },
  {
    id: 'skillet-harvest',
    title: 'Skillet Harvest',
    subtitle: 'Avocado, eggs, potatoes, red onion, black beans, cilantro',
    imageUrl: '/src/assets/images/morning_skillet_spread_1795247621671.jpg',
  },
];

const QUICK_STAPLES = [
  'Eggs',
  'Garlic',
  'Tomatoes',
  'Spinach',
  'Pasta',
  'Cheddar cheese',
  'Onion',
  'Chicken breast',
  'White rice',
  'Avocado',
  'Sourdough bread',
  'Black beans',
  'Potatoes',
  'Butter',
  'Olive oil',
  'Lemon',
];

type CaptureTab = 'camera' | 'type' | 'samples';

interface IngredientCapturePanelProps {
  activeTab: CaptureTab;
  onTabChange: (tab: CaptureTab) => void;
  ingredients: CapturedIngredient[];
  onAddIngredients: (items: Array<{ name: string; observedNote?: string; category?: string }>) => void;
  onRemoveIngredient: (id: string) => void;
  onClearIngredients: () => void;
  strictMode: StrictMode;
  onStrictModeChange: (mode: StrictMode) => void;
  onFindMeals: () => void;
  isMatchingMeals: boolean;
  onCaptureImage: (base64: string, mimeType: string, previewUrl: string, label: string) => Promise<void>;
  isCapturingImage: boolean;
  captureError: string | null;
  lastCaptureSummary: string | null;
  lastPreviewUrl: string | null;
}

export const IngredientCapturePanel: React.FC<IngredientCapturePanelProps> = ({
  activeTab,
  onTabChange,
  ingredients,
  onAddIngredients,
  onRemoveIngredient,
  onClearIngredients,
  strictMode,
  onStrictModeChange,
  onFindMeals,
  isMatchingMeals,
  onCaptureImage,
  isCapturingImage,
  captureError,
  lastCaptureSummary,
  lastPreviewUrl,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [quickInlineInput, setQuickInlineInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Live Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'camera' && cameraActive) {
      stopCamera();
    }
  }, [activeTab, cameraActive]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. Try uploading a photo instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera.';
      setCameraError(
        msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
          ? 'Camera permission was declined. Enable camera access or upload a photo below.'
          : 'No camera detected or camera is unavailable. You can upload a photo directly.'
      );
    }
  };

  const snapCameraFrame = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    await onCaptureImage(dataUrl, 'image/jpeg', dataUrl, 'Camera Snap');
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        await onCaptureImage(dataUrl, file.type, dataUrl, file.name.replace(/\.[^.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSampleScan = async (sample: (typeof SAMPLE_SPREADS)[number]) => {
    const response = await fetch(sample.imageUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (dataUrl) {
        await onCaptureImage(dataUrl, blob.type || 'image/jpeg', sample.imageUrl, sample.title);
      }
    };
    reader.readAsDataURL(blob);
  };

  const parseAndAddText = (raw: string, clearFn: (v: string) => void) => {
    const items = raw
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, category: 'Manual' }));
    if (items.length > 0) {
      onAddIngredients(items);
      clearFn('');
    }
  };

  const hasIngredient = (name: string) =>
    ingredients.some((i) => i.name.toLowerCase() === name.toLowerCase());

  const toggleStaple = (staple: string) => {
    const existing = ingredients.find((i) => i.name.toLowerCase() === staple.toLowerCase());
    if (existing) {
      onRemoveIngredient(existing.id);
    } else {
      onAddIngredients([{ name: staple, category: 'Staple' }]);
    }
  };

  return (
    <aside
      id="capture"
      className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h2 className="font-editorial text-xl font-semibold text-zinc-900">
            1. Capture Ingredients
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Snap a photo, upload an image, or enter exact items on hand.
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div
        role="tablist"
        aria-label="Ingredient input method"
        className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'camera'}
          onClick={() => onTabChange('camera')}
          className={`min-h-[40px] rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'camera'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Photo & Camera
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'type'}
          onClick={() => onTabChange('type')}
          className={`min-h-[40px] rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'type'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Type List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'samples'}
          onClick={() => onTabChange('samples')}
          className={`min-h-[40px] rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'samples'
              ? 'bg-white text-zinc-900 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Sample Photos
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'camera' && (
          <div className="space-y-3">
            {cameraActive ? (
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-video w-full object-cover"
                />
                <div className="flex items-center justify-between gap-3 bg-zinc-900 px-4 py-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="min-h-[40px] rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={snapCameraFrame}
                    disabled={isCapturingImage}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" aria-hidden="true" />
                    <span>Snap & Detect</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFile(file);
                }}
                className={`rounded-lg border border-dashed p-5 text-center transition-colors ${
                  isDragging
                    ? 'border-emerald-600 bg-emerald-50/60'
                    : 'border-zinc-300 bg-zinc-50/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = '';
                  }}
                />

                {lastPreviewUrl && !isCapturingImage ? (
                  <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <SafeImage
                      src={lastPreviewUrl}
                      alt="Captured ingredient spread"
                      fallbackLabel="Captured ingredient photo"
                      className="h-36 w-full object-cover"
                    />
                    {lastCaptureSummary && (
                      <p className="px-3 py-2 text-left text-xs text-zinc-600 border-t border-zinc-100">
                        {lastCaptureSummary}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600">
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                )}

                {isCapturingImage ? (
                  <div className="flex flex-col items-center justify-center py-4 text-sm text-zinc-700">
                    <Loader2 className="mb-2 h-5 w-5 animate-spin text-emerald-700" aria-hidden="true" />
                    <span className="font-medium">Identifying visible ingredients...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-zinc-800">
                      Take a photo of your fridge, counter, or pantry
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Drop an image here, or choose camera / upload below.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Camera className="h-4 w-4" aria-hidden="true" />
                        <span>Use Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {(cameraError || captureError) && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                <span>{cameraError || captureError}</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'type' && (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                parseAndAddText(manualInput, setManualInput);
              }}
              className="flex gap-2"
            >
              <label htmlFor="manual-ingredients" className="sr-only">
                Enter ingredients separated by commas
              </label>
              <input
                id="manual-ingredients"
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g. eggs, spinach, tomato, cheddar"
                className="min-h-[42px] flex-1 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add</span>
              </button>
            </form>

            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2">
                Quick-toggle individual ingredients
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
                {QUICK_STAPLES.map((item) => {
                  const active = hasIngredient(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleStaple(item)}
                      className={`flex min-h-[36px] items-center justify-between rounded-md border px-3 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {active ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'samples' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600">
              Scan a test-kitchen photograph with vision detection to populate ingredients automatically.
            </p>
            <div className="space-y-2.5">
              {SAMPLE_SPREADS.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2.5"
                >
                  <SafeImage
                    src={sample.imageUrl}
                    alt={sample.title}
                    fallbackLabel={sample.title}
                    className="h-16 w-20 shrink-0 rounded-md object-cover bg-zinc-100"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-900 truncate">
                      {sample.title}
                    </div>
                    <div className="text-xs text-zinc-500 line-clamp-2">
                      {sample.subtitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isCapturingImage}
                    onClick={() => void handleSampleScan(sample)}
                    className="min-h-[36px] shrink-0 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isCapturingImage ? 'Scanning...' : 'Scan'}
                  </button>
                </div>
              ))}
            </div>
            {captureError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                <span>{captureError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Locked Ingredient Inventory */}
      <div className="mt-6 pt-5 border-t border-zinc-200">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">
            Locked Ingredients{' '}
            <span className="font-mono text-xs font-normal text-zinc-500 tabular-nums">
              ({ingredients.length})
            </span>
          </h3>
          {ingredients.length > 0 && (
            <button
              type="button"
              onClick={onClearIngredients}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-red-700 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {ingredients.length === 0 ? (
          <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 text-xs text-zinc-500">
            No ingredients captured yet. Scan a photo or add items above to lock your kitchen inventory.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white max-h-60 overflow-y-auto">
            {ingredients.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-zinc-900 capitalize truncate">
                    {item.name}
                  </div>
                  {(item.observedNote || item.category) && (
                    <div className="text-xs text-zinc-500 truncate">
                      {[item.category, item.observedNote].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveIngredient(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Quick inline append after scan */}
        {ingredients.length > 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              parseAndAddText(quickInlineInput, setQuickInlineInput);
            }}
            className="mt-2.5 flex gap-2"
          >
            <input
              type="text"
              value={quickInlineInput}
              onChange={(e) => setQuickInlineInput(e.target.value)}
              placeholder="Add another item..."
              aria-label="Add another ingredient"
              className="min-h-[36px] flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-700 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[36px] rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Add
            </button>
          </form>
        )}
      </div>

      {/* Strictness Rule Selector */}
      <div className="mt-5 pt-5 border-t border-zinc-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-800">Ingredient Strictness</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => onStrictModeChange('exact')}
            className={`min-h-[36px] rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              strictMode === 'exact'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Exact Only
          </button>
          <button
            type="button"
            onClick={() => onStrictModeChange('salt-water')}
            className={`min-h-[36px] rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              strictMode === 'salt-water'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            + Salt & Water
          </button>
          <button
            type="button"
            onClick={() => onStrictModeChange('pantry-oil')}
            className={`min-h-[36px] rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              strictMode === 'pantry-oil'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            + Oil & Salt
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {strictMode === 'exact' &&
            'Zero extras added. Meals use strictly your locked ingredients (plain boiling water only if required).'}
          {strictMode === 'salt-water' &&
            'Uses your locked ingredients plus tap water, salt, and black pepper only.'}
          {strictMode === 'pantry-oil' &&
            'Uses your locked ingredients plus water, salt, pepper, and neutral cooking oil.'}
        </p>

        <button
          type="button"
          onClick={onFindMeals}
          disabled={ingredients.length === 0 || isMatchingMeals}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
        >
          {isMatchingMeals ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Finding Exact Matches...</span>
            </>
          ) : (
            <span>List Possible Meals</span>
          )}
        </button>
      </div>
    </aside>
  );
};
