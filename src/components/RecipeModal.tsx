import React, { useEffect, useState } from 'react';
import { X, Bookmark, Check } from 'lucide-react';
import type { Meal } from '../types/kitchen';

interface RecipeModalProps {
  meal: Meal | null;
  isSaved: boolean;
  onToggleSave: (meal: Meal) => void;
  onClose: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
  meal,
  isSaved,
  onToggleSave,
  onClose,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCompletedSteps(new Set());
  }, [meal?.id]);

  useEffect(() => {
    if (!meal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [meal, onClose]);

  if (!meal) return null;

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const capturedList = meal.ingredientsUsed.filter((i) => i.source === 'captured');
  const basicList = meal.ingredientsUsed.filter((i) => i.source === 'basic');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-end bg-zinc-950/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-2xl flex-col bg-white border-l border-zinc-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 tabular-nums">
              <span className="font-medium text-emerald-800">{meal.course}</span>
              <span aria-hidden="true">·</span>
              <span>Prep {meal.prepMinutes}m</span>
              <span aria-hidden="true">·</span>
              <span>Cook {meal.cookMinutes}m</span>
              <span aria-hidden="true">·</span>
              <span>
                {meal.servings} {meal.servings === 1 ? 'serving' : 'servings'}
              </span>
            </div>
            <h2
              id="recipe-modal-title"
              className="mt-1.5 font-editorial text-2xl sm:text-3xl font-semibold text-zinc-900"
            >
              {meal.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleSave(meal)}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                isSaved
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <Bookmark
                className="h-4 w-4"
                fill={isSaved ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close recipe"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable Recipe Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
          <p className="text-sm sm:text-base leading-relaxed text-zinc-700">{meal.summary}</p>

          {/* Ingredients */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 pb-2 border-b border-zinc-200">
              Ingredients Required
            </h3>
            <ul className="mt-3 divide-y divide-zinc-100">
              {capturedList.map((ing, i) => (
                <li
                  key={`${ing.item}-${i}`}
                  className="flex items-baseline justify-between gap-4 py-2.5 text-sm"
                >
                  <span className="font-medium text-zinc-900 capitalize">{ing.item}</span>
                  <span className="font-mono text-xs text-zinc-600 tabular-nums shrink-0">
                    {ing.amount}
                  </span>
                </li>
              ))}
              {basicList.map((ing, i) => (
                <li
                  key={`basic-${ing.item}-${i}`}
                  className="flex items-baseline justify-between gap-4 py-2.5 text-sm text-zinc-500"
                >
                  <span className="capitalize">
                    {ing.item} <span className="text-xs text-zinc-400">(basic)</span>
                  </span>
                  <span className="font-mono text-xs text-zinc-500 tabular-nums shrink-0">
                    {ing.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Preparation Steps */}
          <div>
            <div className="flex items-baseline justify-between pb-2 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">Method</h3>
              <span className="text-xs text-zinc-500 tabular-nums">
                {completedSteps.size} of {meal.steps.length} steps checked
              </span>
            </div>
            <ol className="mt-3 space-y-3">
              {meal.steps.map((step, idx) => {
                const done = completedSteps.has(idx);
                return (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => toggleStep(idx)}
                      className={`flex w-full items-start gap-3.5 rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                        done
                          ? 'border-emerald-200 bg-emerald-50/50 text-zinc-500'
                          : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-medium tabular-nums ${
                          done
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-zinc-300 bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : idx + 1}
                      </span>
                      <span className={`text-sm leading-relaxed ${done ? 'line-through' : ''}`}>
                        {step}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Chef Tip */}
          {meal.chefTip && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold text-zinc-900">Kitchen Note</p>
              <p className="mt-1 text-sm text-zinc-600 leading-relaxed">{meal.chefTip}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
