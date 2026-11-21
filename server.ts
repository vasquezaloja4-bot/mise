import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = "gemini-4-hydrogen";

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatApiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes("api_key_invalid") || lower.includes("permission_denied") || lower.includes("api key")) {
    return {
      status: 403,
      message:
        "Gemini API key was rejected or is missing. Please check your key in the Settings > Secrets panel.",
    };
  }
  if (lower.includes("resource_exhausted") || lower.includes("429") || lower.includes("quota")) {
    return {
      status: 429,
      message:
        "API rate limit or quota reached. Please wait a moment and try again.",
    };
  }
  if (lower.includes("not_found") || lower.includes("404")) {
    return {
      status: 404,
      message: "Requested Gemini model could not be found.",
    };
  }
  return {
    status: 500,
    message: rawMessage || "Unexpected error while processing your request.",
  };
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularize(word: string): string {
  if (word.endsWith("ies") && word.length > 4) {
    return word.slice(0, -3) + "y";
  }
  if (word.endsWith("es") && word.length > 3 && !word.endsWith("ses")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && word.length > 3 && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function tokenize(value: string): string[] {
  const stopWords = new Set([
    "fresh",
    "dried",
    "chopped",
    "sliced",
    "diced",
    "minced",
    "grated",
    "shredded",
    "large",
    "small",
    "medium",
    "ripe",
    "whole",
    "raw",
    "cooked",
    "cold",
    "warm",
    "hot",
    "optional",
    "to",
    "taste",
    "of",
    "and",
    "or",
  ]);
  return normalizeToken(value)
    .split(" ")
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .map(singularize);
}

function matchesAnyAllowed(candidate: string, allowedList: string[]): boolean {
  const candTokens = tokenize(candidate);
  if (candTokens.length === 0) return false;
  const candNorm = candTokens.join(" ");

  for (const allowed of allowedList) {
    const allowedTokens = tokenize(allowed);
    if (allowedTokens.length === 0) continue;
    const allowedNorm = allowedTokens.join(" ");

    if (candNorm === allowedNorm) return true;
    if (candNorm.includes(allowedNorm) || allowedNorm.includes(candNorm)) return true;

    const overlap = candTokens.some((t) => allowedTokens.includes(t));
    if (overlap) return true;
  }
  return false;
}

interface RawMealIngredient {
  item: string;
  amount: string;
  source: string;
}

interface RawMeal {
  id?: string;
  name: string;
  course: string;
  summary: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: string;
  ingredientsUsed: RawMealIngredient[];
  unusedIngredients: string[];
  steps: string[];
  chefTip: string;
}

function getAllowedBasics(strictMode: string): string[] {
  if (strictMode === "salt-water") {
    return ["water", "tap water", "boiling water", "salt", "sea salt", "kosher salt", "black pepper", "pepper"];
  }
  if (strictMode === "pantry-oil") {
    return [
      "water",
      "tap water",
      "boiling water",
      "salt",
      "sea salt",
      "kosher salt",
      "black pepper",
      "pepper",
      "oil",
      "cooking oil",
      "olive oil",
      "vegetable oil",
      "neutral oil",
    ];
  }
  return ["water", "tap water", "boiling water"];
}

function verifyMealsAgainstIngredients(
  meals: RawMeal[],
  userIngredients: string[],
  strictMode: string
): RawMeal[] {
  const allowedBasics = getAllowedBasics(strictMode);

  return meals
    .filter((meal) => {
      if (!meal || !Array.isArray(meal.ingredientsUsed) || meal.ingredientsUsed.length === 0) {
        return false;
      }

      const everyIngredientValid = meal.ingredientsUsed.every((ing) => {
        const matchesUser = matchesAnyAllowed(ing.item, userIngredients);
        if (matchesUser) return true;
        const matchesBasic = matchesAnyAllowed(ing.item, allowedBasics);
        return matchesBasic;
      });

      const usesAtLeastOneUserIngredient = meal.ingredientsUsed.some((ing) =>
        matchesAnyAllowed(ing.item, userIngredients)
      );

      return everyIngredientValid && usesAtLeastOneUserIngredient;
    })
    .map((meal, index) => {
      const normalizedIngredients = meal.ingredientsUsed.map((ing) => {
        const isUser = matchesAnyAllowed(ing.item, userIngredients);
        return {
          item: ing.item,
          amount: ing.amount,
          source: isUser ? "captured" : "basic",
        };
      });

      const usedUserTokens = normalizedIngredients
        .filter((i) => i.source === "captured")
        .map((i) => i.item);

      const computedUnused = userIngredients.filter(
        (userIng) => !matchesAnyAllowed(userIng, usedUserTokens)
      );

      return {
        ...meal,
        id: meal.id || `meal-${index + 1}-${Date.now()}`,
        ingredientsUsed: normalizedIngredients,
        unusedIngredients: computedUnused,
      };
    });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post("/api/ingredients/capture", async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== "string") {
        res.status(400).json({ error: "An image is required to capture ingredients." });
        return;
      }

      const cleanedBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;

      const resolvedMime =
        typeof mimeType === "string" && mimeType.startsWith("image/")
          ? mimeType
          : "image/jpeg";

      const ai = getAiClient();
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: resolvedMime,
                data: cleanedBase64,
              },
            },
            {
              text:
                "Inspect this image carefully and list every distinct edible food ingredient or cooking item you can clearly observe (including bottles like olive oil if clearly visible). Do NOT invent hidden ingredients or assume pantry staples that are not visible in the image. For each item, return a concise normalized ingredient name (e.g., 'brown eggs', 'baby spinach', 'sourdough bread', 'cheddar cheese', 'garlic', 'vine tomatoes'), a brief observed note (e.g., '4 whole eggs in bowl'), and a simple category (e.g., 'Produce', 'Dairy & Eggs', 'Pantry', 'Bakery', 'Protein'). Also provide a 1-sentence sceneSummary describing what was captured.",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sceneSummary: {
                type: Type.STRING,
                description: "A concise 1-sentence summary of the ingredients visible in the image.",
              },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Normalized ingredient name, lowercase or title case, concise.",
                    },
                    observedNote: {
                      type: Type.STRING,
                      description: "Brief note on quantity or state seen in the photo.",
                    },
                    category: {
                      type: Type.STRING,
                      description: "Category such as Produce, Dairy & Eggs, Protein, Pantry, Bakery, Herbs.",
                    },
                  },
                  required: ["name", "observedNote", "category"],
                },
              },
            },
            required: ["sceneSummary", "ingredients"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText) as {
        sceneSummary?: string;
        ingredients?: Array<{ name: string; observedNote: string; category: string }>;
      };

      res.json({
        sceneSummary: parsed.sceneSummary || "Ingredients captured from image.",
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/meals/match", async (req: Request, res: Response) => {
    try {
      const { ingredients, strictMode = "exact" } = req.body as {
        ingredients?: string[];
        strictMode?: string;
      };

      const cleanIngredients = Array.isArray(ingredients)
        ? ingredients.map((i) => String(i).trim()).filter(Boolean)
        : [];

      if (cleanIngredients.length === 0) {
        res.status(400).json({ error: "Please provide at least one ingredient." });
        return;
      }

      const mode =
        strictMode === "salt-water" || strictMode === "pantry-oil" ? strictMode : "exact";

      const strictRuleDescription =
        mode === "exact"
          ? "STRICT EXACT-ONLY RULE: Every meal MUST be made ONLY with ingredients from the user's provided list. Do NOT add oil, butter, salt, pepper, garlic, onions, spices, sugar, flour, or sauces unless they are explicitly in the user's list! The ONLY external item allowed if physically required for boiling or steaming (such as boiling dry pasta, eggs, or potatoes) is plain 'water', marked with source: 'basic'. For pan-frying without oil, use dry-toasting, baking, or non-stick skillet techniques, or utilize fatty ingredients from the list (like cheese or avocado) rather than inventing oil or butter."
          : mode === "salt-water"
          ? "STRICT + SALT/PEPPER/WATER RULE: Every meal MUST use ONLY ingredients from the user's provided list, plus at most plain water, salt, and black pepper (marked with source: 'basic'). Do NOT introduce oil, butter, herbs, garlic, or any other unlisted food items."
          : "STRICT + OIL/SEASONING RULE: Every meal MUST use ONLY ingredients from the user's provided list, plus at most plain water, salt, black pepper, and neutral cooking oil (marked with source: 'basic'). Do NOT introduce butter, herbs, garlic, onions, sauces, or any other unlisted food items.";

      const ai = getAiClient();
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Available specific ingredients: ${cleanIngredients.join(", ")}.

${strictRuleDescription}

List every practical, genuinely tasty meal that can actually be cooked or assembled right now using ONLY these specific ingredients (all of them or a meaningful subset).
- Aim for 5 to 8 distinct meals across different formats (e.g. Breakfast, Lunch, Dinner, Snack, Side) when the ingredients support variety, or fewer realistic meals if only 1-2 ingredients are available.
- Prioritize recipes that use a high proportion of the listed ingredients first, followed by smart simpler combinations.
- Never include a dish if it is missing a key structural ingredient (e.g., do not suggest an omelet if eggs are not listed; do not suggest pasta sauce without pasta if calling it a pasta dish).
- Keep step-by-step instructions concrete, clear, and honest to the exact allowed ingredients.`,
        config: {
          systemInstruction:
            "You are a disciplined culinary test-kitchen chef. Your defining constraint is absolute ingredient honesty: never sneak unstated ingredients into any recipe. Every ingredient used in a dish must either come strictly from the user's captured list (source: 'captured') or fall within the explicitly allowed basic rule (source: 'basic').",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              constraintSummary: {
                type: Type.STRING,
                description:
                  "A short 1-sentence confirmation explaining how the meals adhere strictly to the available ingredients.",
              },
              meals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    course: {
                      type: Type.STRING,
                      description: "One of: Breakfast, Lunch, Dinner, Snack, Side",
                    },
                    summary: {
                      type: Type.STRING,
                      description: "1-2 sentence culinary description of the finished dish.",
                    },
                    prepMinutes: { type: Type.INTEGER },
                    cookMinutes: { type: Type.INTEGER },
                    servings: { type: Type.INTEGER },
                    difficulty: {
                      type: Type.STRING,
                      description: "Easy or Moderate",
                    },
                    ingredientsUsed: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          item: {
                            type: Type.STRING,
                            description: "Exact ingredient name matching the user's list (or allowed basic).",
                          },
                          amount: {
                            type: Type.STRING,
                            description: "Practical kitchen measurement for this recipe.",
                          },
                          source: {
                            type: Type.STRING,
                            description: "Either 'captured' or 'basic'.",
                          },
                        },
                        required: ["item", "amount", "source"],
                      },
                    },
                    unusedIngredients: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    steps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    chefTip: {
                      type: Type.STRING,
                      description: "A concise technique tip using only the allowed ingredients.",
                    },
                  },
                  required: [
                    "id",
                    "name",
                    "course",
                    "summary",
                    "prepMinutes",
                    "cookMinutes",
                    "servings",
                    "difficulty",
                    "ingredientsUsed",
                    "unusedIngredients",
                    "steps",
                    "chefTip",
                  ],
                },
              },
            },
            required: ["constraintSummary", "meals"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText) as {
        constraintSummary?: string;
        meals?: RawMeal[];
      };

      const rawMeals = Array.isArray(parsed.meals) ? parsed.meals : [];
      const verifiedMeals = verifyMealsAgainstIngredients(rawMeals, cleanIngredients, mode);

      res.json({
        meals: verifiedMeals,
        strictMode: mode,
        constraintSummary:
          parsed.constraintSummary ||
          `Matched ${verifiedMeals.length} meals made strictly from your ${cleanIngredients.length} captured ingredients.`,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Application build not found.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Mise server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
