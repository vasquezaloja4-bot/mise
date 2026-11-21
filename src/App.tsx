import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import {
  IngredientCapturePanel,
  SAMPLE_SPREADS,
} from './components/IngredientCapturePanel';
import { MealResultsPane } from './components/MealResultsPane';
import { RecipeModal } from './components/RecipeModal';
import { SavedAndHistorySection } from './components/SavedAndHistorySection';
import type {
  CaptureResponse,
  CapturedIngredient,
  MatchMealsResponse,
  Meal,
  RecentCapture,
  StrictMode,
} from './types/kitchen';

const SAVED_MEALS_KEY = 'mise_saved_meals_v1';
const RECENT_CAPTURES_KEY = 'mise_recent_captures_v1';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'camera' | 'type' | 'samples'>('camera');
  const [ingredients, setIngredients] = useState<CapturedIngredient[]>([]);
  const [strictMode, setStrictMode] = useState<StrictMode>('exact');

  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [lastCaptureSummary, setLastCaptureSummary] = useState<string | null>(null);
  const [lastPreviewUrl, setLastPreviewUrl] = useState<string | null>(null);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isMatchingMeals, setIsMatchingMeals] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [constraintSummary, setConstraintSummary] = useState<string | null>(null);

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  const [savedMeals, setSavedMeals] = useState<Meal[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_MEALS_KEY);
      return raw ? (JSON.parse(raw) as Meal[]) : [];
    } catch {
      return [];
    }
  });

  const [recentCaptures, setRecentCaptures] = useState<RecentCapture[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_CAPTURES_KEY);
      return raw ? (JSON.parse(raw) as RecentCapture[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(savedMeals));
    } catch {
      // Ignore storage quota issues
    }
  }, [savedMeals]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_CAPTURES_KEY, JSON.stringify(recentCaptures));
    } catch {
      // Ignore storage quota issues
    }
  }, [recentCaptures]);

  const savedMealIds = useMemo(
    () => new Set(savedMeals.map((m) => m.id)),
    [savedMeals]
  );

  const recordRecentCapture = useCallback(
    (label: string, items: CapturedIngredient[]) => {
      if (items.length === 0) return;
      setRecentCaptures((prev) => {
        const entry: RecentCapture = {
          id: makeId('cap'),
          createdAt: new Date().toISOString(),
          label,
          ingredients: items,
        };
        return [entry, ...prev].slice(0, 6);
      });
    },
    []
  );

  const runMatchMeals = useCallback(
    async (targetIngredients: CapturedIngredient[], mode: StrictMode) => {
      const names = targetIngredients.map((i) => i.name.trim()).filter(Boolean);
      if (names.length === 0) return;

      setIsMatchingMeals(true);
      setMatchError(null);
      setHasSearched(true);

      try {
        const res = await fetch('/api/meals/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: names,
            strictMode: mode,
          }),
        });

        const data = (await res.json()) as Partial<MatchMealsResponse> & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || 'Failed to match meals.');
        }

        setMeals(Array.isArray(data.meals) ? data.meals : []);
        setConstraintSummary(data.constraintSummary || null);
      } catch (err) {
        setMatchError(
          err instanceof Error ? err.message : 'Unable to generate meal list.'
        );
      } finally {
        setIsMatchingMeals(false);
      }
    },
    []
  );

  const handleAddIngredients = useCallback(
    (items: Array<{ name: string; observedNote?: string; category?: string }>) => {
      setIngredients((prev) => {
        const existingLower = new Set(prev.map((i) => i.name.toLowerCase()));
        const additions: CapturedIngredient[] = [];
        for (const item of items) {
          const trimmed = item.name.trim();
          if (!trimmed || existingLower.has(trimmed.toLowerCase())) continue;
          existingLower.add(trimmed.toLowerCase());
          additions.push({
            id: makeId('ing'),
            name: trimmed,
            observedNote: item.observedNote,
            category: item.category,
          });
        }
        return [...prev, ...additions];
      });
    },
    []
  );

  const handleRemoveIngredient = useCallback((id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearIngredients = useCallback(() => {
    setIngredients([]);
    setLastCaptureSummary(null);
    setLastPreviewUrl(null);
  }, []);

  const handleCaptureImage = useCallback(
    async (
      imageBase64: string,
      mimeType: string,
      previewUrl: string,
      label: string
    ) => {
      setIsCapturingImage(true);
      setCaptureError(null);
      setLastPreviewUrl(previewUrl);

      try {
        const res = await fetch('/api/ingredients/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, mimeType }),
        });

        const data = (await res.json()) as Partial<CaptureResponse> & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || 'Could not inspect photo for ingredients.');
        }

        const detected = Array.isArray(data.ingredients) ? data.ingredients : [];
        if (detected.length === 0) {
          setCaptureError(
            'No edible ingredients were clearly visible in that photo. Try a closer shot or add items manually.'
          );
          setLastCaptureSummary(data.sceneSummary || null);
          return;
        }

        const mapped: CapturedIngredient[] = detected.map((item) => ({
          id: makeId('ing'),
          name: item.name.trim(),
          observedNote: item.observedNote,
          category: item.category,
        }));

        setIngredients(mapped);
        setLastCaptureSummary(data.sceneSummary || null);
        recordRecentCapture(label, mapped);

        // Immediately match meals for the captured ingredients
        await runMatchMeals(mapped, strictMode);
      } catch (err) {
        setCaptureError(
          err instanceof Error ? err.message : 'Photo capture failed.'
        );
      } finally {
        setIsCapturingImage(false);
      }
    },
    [recordRecentCapture, runMatchMeals, strictMode]
  );

  const handleFindMeals = useCallback(() => {
    if (ingredients.length === 0) return;
    recordRecentCapture(
      ingredients
        .slice(0, 3)
        .map((i) => i.name)
        .join(', '),
      ingredients
    );
    void runMatchMeals(ingredients, strictMode);
  }, [ingredients, recordRecentCapture, runMatchMeals, strictMode]);

  const handleTrySample = useCallback(async () => {
    const sample = SAMPLE_SPREADS[0];
    setActiveTab('camera');
    try {
      const response = await fetch(sample.imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (dataUrl) {
          await handleCaptureImage(
            dataUrl,
            blob.type || 'image/jpeg',
            sample.imageUrl,
            sample.title
          );
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setCaptureError('Unable to load sample countertop photo.');
    }
  }, [handleCaptureImage]);

  const handleToggleSaveMeal = useCallback((meal: Meal) => {
    setSavedMeals((prev) => {
      const exists = prev.some((m) => m.id === meal.id);
      if (exists) {
        return prev.filter((m) => m.id !== meal.id);
      }
      return [meal, ...prev];
    });
  }, []);

  const handleRestoreCapture = useCallback(
    (capture: RecentCapture) => {
      setIngredients(capture.ingredients);
      setLastCaptureSummary(`Restored "${capture.label}"`);
      void runMatchMeals(capture.ingredients, strictMode);
      document.getElementById('meals')?.scrollIntoView({ behavior: 'smooth' });
    },
    [runMatchMeals, strictMode]
  );

  const handleFocusCamera = useCallback(() => {
    setActiveTab('camera');
    document.getElementById('capture')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div id="top" className="min-h-screen bg-zinc-50 text-zinc-900">
      <Header savedCount={savedMeals.length} onStartScan={handleFocusCamera} />

      <main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10 lg:py-10">
        {/* Hero Intro */}
        <section className="mb-8 border-b border-zinc-200 pb-6">
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-zinc-900 leading-[1.12] max-w-3xl text-balance">
            Capture what you have. Cook only what it makes.
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-zinc-600 max-w-2xl">
            Snap a photo or list your exact ingredients to generate a verified list of meals requiring zero extra groceries.
          </p>
        </section>

        {/* Primary 2-Column Workspace */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
            <IngredientCapturePanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              ingredients={ingredients}
              onAddIngredients={handleAddIngredients}
              onRemoveIngredient={handleRemoveIngredient}
              onClearIngredients={handleClearIngredients}
              strictMode={strictMode}
              onStrictModeChange={setStrictMode}
              onFindMeals={handleFindMeals}
              isMatchingMeals={isMatchingMeals}
              onCaptureImage={handleCaptureImage}
              isCapturingImage={isCapturingImage}
              captureError={captureError}
              lastCaptureSummary={lastCaptureSummary}
              lastPreviewUrl={lastPreviewUrl}
            />
          </div>

          <div className="lg:col-span-7 xl:col-span-8">
            <MealResultsPane
              meals={meals}
              hasSearched={hasSearched}
              isLoading={isMatchingMeals}
              error={matchError}
              constraintSummary={constraintSummary}
              strictMode={strictMode}
              totalCapturedCount={ingredients.length}
              savedMealIds={savedMealIds}
              onToggleSaveMeal={handleToggleSaveMeal}
              onSelectMeal={setSelectedMeal}
              onRetry={handleFindMeals}
              onTrySample={() => void handleTrySample()}
              onFocusCamera={handleFocusCamera}
            />
          </div>
        </div>

        {/* Saved Meals, Recent Captures & Method */}
        <SavedAndHistorySection
          savedMeals={savedMeals}
          recentCaptures={recentCaptures}
          onSelectMeal={setSelectedMeal}
          onRemoveSavedMeal={(id) =>
            setSavedMeals((prev) => prev.filter((m) => m.id !== id))
          }
          onRestoreCapture={handleRestoreCapture}
        />
      </main>

      <footer className="mt-16 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-zinc-500 lg:px-10">
          <span>Mise — Strict Ingredient Meal Matcher</span>
          <span>Meals verified strictly against your locked ingredient list.</span>
        </div>
      </footer>

      <RecipeModal
        meal={selectedMeal}
        isSaved={selectedMeal ? savedMealIds.has(selectedMeal.id) : false}
        onToggleSave={handleToggleSaveMeal}
        onClose={() => setSelectedMeal(null)}
      />
    </div>
  );
}
