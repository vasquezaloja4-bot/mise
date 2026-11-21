import React, { useMemo, useState } from 'react';
import { Bookmark, Search, ArrowRight, AlertCircle, Camera } from 'lucide-react';
import { SafeImage } from './SafeImage';
import type { Meal, StrictMode } from '../types/kitchen';

interface MealResultsPaneProps {
  meals: Meal[];
  hasSearched: boolean;
  isLoading: boolean;
  error: string | null;
  constraintSummary: string | null;
  strictMode: StrictMode;
  totalCapturedCount: number;
  savedMealIds: Set<string>;
  onToggleSaveMeal: (meal: Meal) => void;
  onSelectMeal: (meal: Meal) => void;
  onRetry: () => void;
  onTrySample: () => void;
  onFocusCamera: () => void;
}

const COURSE_FILTERS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Side'] as const;

export const MealResultsPane: React.FC<MealResultsPaneProps> = ({
  meals,
  hasSearched,
  isLoading,
  error,
  constraintSummary,
  strictMode,
  totalCapturedCount,
  savedMealIds,
  onToggleSaveMeal,
  onSelectMeal,
  onRetry,
  onTrySample,
  onFocusCamera,
}) => {
  const [courseFilter, setCourseFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'coverage' | 'fastest'>('coverage');

  const availableCourses = useMemo(() => {
    const present = new Set(meals.map((m) => m.course));
    return COURSE_FILTERS.filter((c) => c === 'All' || present.has(c));
  }, [meals]);

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = meals.filter((meal) => {
      if (courseFilter !== 'All' && meal.course !== courseFilter) return false;
      if (!q) return true;
      return (
        meal.name.toLowerCase().includes(q) ||
        meal.summary.toLowerCase().includes(q) ||
        meal.ingredientsUsed.some((i) => i.item.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'fastest') {
        return a.prepMinutes + a.cookMinutes - (b.prepMinutes + b.cookMinutes);
      }
      const aCaptured = a.ingredientsUsed.filter((i) => i.source === 'captured').length;
      const bCaptured = b.ingredientsUsed.filter((i) => i.source === 'captured').length;
      return bCaptured - aCaptured;
    });
  }, [meals, courseFilter, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <section id="meals" aria-live="polite" className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div>
            <div className="h-7 w-56 rounded bg-zinc-200 animate-pulse" />
            <div className="mt-2 h-4 w-80 rounded bg-zinc-100 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((slot) => (
            <div
              key={slot}
              className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4"
            >
              <div className="h-6 w-3/4 rounded bg-zinc-200 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-zinc-100 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-zinc-100 animate-pulse" />
              </div>
              <div className="h-9 w-32 rounded bg-zinc-100 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="meals" className="rounded-xl border border-red-200 bg-white p-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
          <div>
            <h2 className="font-editorial text-xl font-semibold text-zinc-900">
              Could not match meals right now
            </h2>
            <p className="mt-2 text-sm text-zinc-600 max-w-xl">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 min-h-[40px] rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!hasSearched) {
    return (
      <section
        id="meals"
        className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-emerald-800">
                Strict Ingredient Kitchen
              </p>
              <h2 className="mt-2 font-editorial text-2xl sm:text-3xl font-semibold text-zinc-900 text-balance">
                Only what is on your counter. Nothing you have to shop for.
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-600 max-w-xl">
                Capture your fridge shelf or countertop with a photo, or type the exact ingredients you have. Mise lists every meal you can genuinely make without sneaking in missing pantry items.
              </p>

              <ol className="mt-6 space-y-3 border-t border-zinc-200 pt-5 text-sm text-zinc-700">
                <li className="flex items-baseline gap-3">
                  <span className="font-mono text-xs font-medium text-zinc-400 tabular-nums">
                    01.
                  </span>
                  <span>
                    <strong className="font-semibold text-zinc-900">Capture or type ingredients</strong> — camera vision extracts every visible food item.
                  </span>
                </li>
                <li className="flex items-baseline gap-3">
                  <span className="font-mono text-xs font-medium text-zinc-400 tabular-nums">
                    02.
                  </span>
                  <span>
                    <strong className="font-semibold text-zinc-900">Verify your locked list</strong> — add, remove, and set exact strictness.
                  </span>
                </li>
                <li className="flex items-baseline gap-3">
                  <span className="font-mono text-xs font-medium text-zinc-400 tabular-nums">
                    03.
                  </span>
                  <span>
                    <strong className="font-semibold text-zinc-900">Cook from the meal list</strong> — every recipe uses only your locked ingredients.
                  </span>
                </li>
              </ol>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onTrySample}
                className="min-h-[42px] rounded-lg bg-emerald-700 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Scan Sample Countertop
              </button>
              <button
                type="button"
                onClick={onFocusCamera}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                <span>Open Camera</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[260px] bg-zinc-100 border-t lg:border-t-0 lg:border-l border-zinc-200">
            <SafeImage
              src="/src/assets/images/kitchen_counter_spread_1795247621327.jpg"
              alt="Fresh eggs, tomatoes, spinach, cheddar cheese, garlic, and sourdough on a stone counter"
              fallbackLabel="Countertop ingredient spread"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="meals" className="space-y-5">
      {/* Results Header */}
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="font-editorial text-2xl font-semibold text-zinc-900 tabular-nums">
              {meals.length} {meals.length === 1 ? 'Meal' : 'Meals'} You Can Make
            </h2>
            {constraintSummary && (
              <p className="mt-1 text-sm text-zinc-600">{constraintSummary}</p>
            )}
          </div>
          <div className="text-xs font-medium text-zinc-500 tabular-nums">
            <span>{totalCapturedCount} locked ingredients</span>
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            <span>
              {strictMode === 'exact'
                ? 'Exact only'
                : strictMode === 'salt-water'
                ? '+ Salt, pepper & water'
                : '+ Oil, salt & water'}
            </span>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        {meals.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1">
              {availableCourses.map((course) => (
                <button
                  key={course}
                  type="button"
                  onClick={() => setCourseFilter(course)}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    courseFilter === course
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {course}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter meals..."
                  aria-label="Filter matched meals"
                  className="min-h-[36px] w-44 sm:w-52 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <label htmlFor="sort-meals" className="sr-only">
                Sort meals
              </label>
              <select
                id="sort-meals"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'coverage' | 'fastest')}
                className="min-h-[36px] rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-emerald-700 focus:outline-none cursor-pointer"
              >
                <option value="coverage">Sort: Most Ingredients Used</option>
                <option value="fastest">Sort: Fastest Total Time</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Empty Match State */}
      {filteredMeals.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <h3 className="font-editorial text-lg font-semibold text-zinc-900">
            No matching meals found for this filter
          </h3>
          <p className="mt-1.5 text-sm text-zinc-600 max-w-md mx-auto">
            {meals.length === 0
              ? 'Your current strictness and ingredient set did not yield a complete dish. Try adding one more staple or allowing salt & water.'
              : 'Clear your search query or switch back to All courses to view every available meal.'}
          </p>
          {meals.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCourseFilter('All');
                setSearchQuery('');
              }}
              className="mt-4 min-h-[40px] rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredMeals.map((meal) => {
            const totalMinutes = meal.prepMinutes + meal.cookMinutes;
            const capturedUsed = meal.ingredientsUsed.filter((i) => i.source === 'captured');
            const basicUsed = meal.ingredientsUsed.filter((i) => i.source === 'basic');
            const isSaved = savedMealIds.has(meal.id);

            return (
              <article
                key={meal.id}
                className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:border-zinc-300 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-editorial text-xl font-semibold text-zinc-900 leading-snug">
                      <button
                        type="button"
                        onClick={() => onSelectMeal(meal)}
                        className="text-left hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        {meal.name}
                      </button>
                    </h3>
                    <button
                      type="button"
                      onClick={() => onToggleSaveMeal(meal)}
                      aria-label={isSaved ? `Remove ${meal.name} from saved` : `Save ${meal.name}`}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                        isSaved
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-zinc-200 bg-white text-zinc-400 hover:text-zinc-800'
                      }`}
                    >
                      <Bookmark
                        className="h-4 w-4"
                        fill={isSaved ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 tabular-nums">
                    <span className="font-medium text-zinc-700">{meal.course}</span>
                    <span aria-hidden="true">·</span>
                    <span>{totalMinutes} min</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {capturedUsed.length} of {totalCapturedCount} captured
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{meal.difficulty}</span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">{meal.summary}</p>

                  {/* Exact Ingredient Breakdown */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1.5 text-xs">
                    <p className="text-zinc-800">
                      <span className="font-semibold text-zinc-900">Uses only: </span>
                      <span className="capitalize">
                        {capturedUsed.map((i) => i.item).join(', ')}
                      </span>
                    </p>
                    {basicUsed.length > 0 && (
                      <p className="text-zinc-500">
                        <span className="font-medium text-zinc-700">Allowed basics: </span>
                        <span className="capitalize">
                          {basicUsed.map((i) => i.item).join(', ')}
                        </span>
                      </p>
                    )}
                    {meal.unusedIngredients.length > 0 && (
                      <p className="text-zinc-400">
                        <span>Not needed: </span>
                        <span className="capitalize">{meal.unusedIngredients.join(', ')}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-500 tabular-nums">
                    {meal.servings} {meal.servings === 1 ? 'serving' : 'servings'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectMeal(meal)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
                  >
                    <span>View Recipe</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
