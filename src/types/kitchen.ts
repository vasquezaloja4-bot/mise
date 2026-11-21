export type StrictMode = 'exact' | 'salt-water' | 'pantry-oil';

export interface CapturedIngredient {
  id: string;
  name: string;
  observedNote?: string;
  category?: string;
}

export interface MealIngredient {
  item: string;
  amount: string;
  source: 'captured' | 'basic';
}

export interface Meal {
  id: string;
  name: string;
  course: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Side' | string;
  summary: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: 'Easy' | 'Moderate' | string;
  ingredientsUsed: MealIngredient[];
  unusedIngredients: string[];
  steps: string[];
  chefTip: string;
}

export interface CaptureResponse {
  ingredients: Array<{
    name: string;
    observedNote: string;
    category: string;
  }>;
  sceneSummary: string;
}

export interface MatchMealsResponse {
  meals: Meal[];
  strictMode: StrictMode;
  constraintSummary: string;
}

export interface RecentCapture {
  id: string;
  createdAt: string;
  label: string;
  ingredients: CapturedIngredient[];
}
