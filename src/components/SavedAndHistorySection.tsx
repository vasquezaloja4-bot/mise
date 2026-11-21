import React from 'react';
import { ArrowRight, Trash2, RotateCcw } from 'lucide-react';
import type { Meal, RecentCapture } from '../types/kitchen';

interface SavedAndHistorySectionProps {
  savedMeals: Meal[];
  recentCaptures: RecentCapture[];
  onSelectMeal: (meal: Meal) => void;
  onRemoveSavedMeal: (mealId: string) => void;
  onRestoreCapture: (capture: RecentCapture) => void;
}

export const SavedAndHistorySection: React.FC<SavedAndHistorySectionProps> = ({
  savedMeals,
  recentCaptures,
  onSelectMeal,
  onRemoveSavedMeal,
  onRestoreCapture,
}) => {
  return (
    <div className="mt-16 space-y-14 border-t border-zinc-200 pt-12">
      {/* Saved Meals & Recent Captures */}
      <section id="saved" className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex items-baseline justify-between pb-3 border-b border-zinc-200">
            <h2 className="font-editorial text-2xl font-semibold text-zinc-900">
              Saved Meals
            </h2>
            <span className="font-mono text-xs text-zinc-500 tabular-nums">
              {savedMeals.length} saved
            </span>
          </div>

          {savedMeals.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Bookmark any matched dish to keep its recipe handy for later.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
              {savedMeals.map((meal) => (
                <li
                  key={meal.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectMeal(meal)}
                      className="font-editorial text-base font-semibold text-zinc-900 hover:text-emerald-800 transition-colors text-left truncate block cursor-pointer"
                    >
                      {meal.name}
                    </button>
                    <div className="mt-0.5 text-xs text-zinc-500 tabular-nums">
                      <span>{meal.course}</span>
                      <span aria-hidden="true" className="mx-1.5">
                        ·
                      </span>
                      <span>{meal.prepMinutes + meal.cookMinutes} min</span>
                      <span aria-hidden="true" className="mx-1.5">
                        ·
                      </span>
                      <span>{meal.ingredientsUsed.length} ingredients</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectMeal(meal)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSavedMeal(meal.id)}
                      aria-label={`Remove ${meal.name} from saved`}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className="flex items-baseline justify-between pb-3 border-b border-zinc-200">
            <h2 className="font-editorial text-2xl font-semibold text-zinc-900">
              Recent Captures
            </h2>
            <span className="font-mono text-xs text-zinc-500 tabular-nums">
              {recentCaptures.length} sets
            </span>
          </div>

          {recentCaptures.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Your recent photo scans and ingredient sets appear here for quick recall.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
              {recentCaptures.map((capture) => (
                <li
                  key={capture.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900 truncate">
                      {capture.label}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500 truncate capitalize">
                      {capture.ingredients.map((i) => i.name).join(', ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestoreCapture(capture)}
                    className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Load</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Method Overview */}
      <section id="method" className="border-t border-zinc-200 pt-10 pb-8">
        <h2 className="font-editorial text-2xl font-semibold text-zinc-900">
          How Strict Matching Works
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <p className="font-mono text-xs text-zinc-400">01</p>
            <h3 className="mt-2 text-base font-semibold text-zinc-900">
              Visual Ingredient Extraction
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Camera captures and uploaded kitchen photos are analyzed strictly for visible items without guessing hidden pantry staples.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <p className="font-mono text-xs text-zinc-400">02</p>
            <h3 className="mt-2 text-base font-semibold text-zinc-900">
              Verified Inventory Lock
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Every returned recipe is checked against your locked ingredient list so unrequested groceries never slip into the meal list.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <p className="font-mono text-xs text-zinc-400">03</p>
            <h3 className="mt-2 text-base font-semibold text-zinc-900">
              Transparent Leftovers
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Each meal clearly separates the exact items used from anything left unused on your counter, sorted by highest ingredient coverage.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
