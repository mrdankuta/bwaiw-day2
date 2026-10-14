/* What Can I Cook? — shared engine (pure logic, no DOM).
 * Used by index.html UI and by node tests. */

async function loadCatalogue(url = "recipes.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Catalogue fetch failed: ${res.status}`);
  const data = await res.json();
  validateCatalogue(data);
  return data;
}

function validateCatalogue(data) {
  if (!Array.isArray(data)) throw new Error("Catalogue must be an array");
  const required = ["id", "title", "ingredients", "timeMinutes", "difficulty", "cuisine", "regions", "steps"];
  for (const r of data) {
    for (const k of required) {
      if (r[k] === undefined || r[k] === null) throw new Error(`Recipe ${r.id || "?"} missing ${k}`);
    }
    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) throw new Error(`Recipe ${r.id} needs ingredients`);
    if (!Array.isArray(r.regions) || !Array.isArray(r.steps)) throw new Error(`Recipe ${r.id} needs regions[] + steps[]`);
    if (!["Easy", "Medium", "Hard"].includes(r.difficulty)) throw new Error(`Recipe ${r.id} bad difficulty`);
  }
}

const STAPLES = new Set(["salt", "water", "vegetable oil", "oil"]);

const SYNONYMS = {
  "tomatoes": "tomato",
  "bell pepper": "red bell pepper",
  "capsicum": "red bell pepper",
  "peas": "green peas",
  "corn": "sweet corn",
  "stock": "chicken stock",
  "stock fish": "stockfish",
  "scent leaf": "scent leaves",
};

const SUBSTITUTIONS = {
  "butter": "vegetable oil",
  "milk": "water",
  "mayonnaise": "plain yogurt",
  "scent leaves": "basil",
  "stockfish": "extra beef",
  "green peas": "green beans",
  "sweet corn": "skip it",
  "shawarma bread": "any flatbread",
  "soy sauce": "salt",
  "ketchup": "tomato paste with a pinch of sugar",
};

function normalizeIngredient(name) {
  const n = String(name).toLowerCase().trim().replace(/\s+/g, " ");
  return SYNONYMS[n] || n;
}

function ingredientName(ing) {
  return typeof ing === "string" ? ing : ing.name;
}

function subHint(missing) {
  const hit = missing.find((m) => SUBSTITUTIONS[m]);
  return hit ? `No ${hit}? try ${SUBSTITUTIONS[hit]}.` : "";
}

function queryRecipes(filters = {}, catalogue = []) {
  const available = new Set((filters.ingredients || []).map(normalizeIngredient));
  const maxTime = filters.maxTime ?? null;
  const difficulty = filters.difficulty || "Any";
  const region = filters.region || "Any";
  const fullyMakeableOnly = !!filters.fullyMakeableOnly;

  const out = [];
  for (const recipe of catalogue) {
    if (maxTime !== null && recipe.timeMinutes > maxTime) continue;
    if (difficulty !== "Any" && recipe.difficulty !== difficulty) continue;
    if (region !== "Any" && !(recipe.regions.includes(region) || recipe.regions.includes("Global"))) continue;

    const names = recipe.ingredients.map((i) => normalizeIngredient(ingredientName(i)));
    const required = names.filter((n) => !STAPLES.has(n));
    const matched = required.filter((n) => available.has(n));
    const missing = required.filter((n) => !available.has(n));
    const score = required.length === 0 ? 1 : matched.length / required.length;
    if (fullyMakeableOnly && score !== 1) continue;
    out.push({ recipe, score, matched, missing });
  }
  out.sort((a, b) =>
    b.score - a.score ||
    a.recipe.timeMinutes - b.recipe.timeMinutes ||
    a.recipe.title.localeCompare(b.recipe.title)
  );
  return out;
}

/* ─── user recipes (localStorage overlay, same key as before) ───────── */
const LS_KEY = "rba:user-recipes:v1";

function getUserRecipes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error("overlay not an array");
    return arr;
  } catch {
    try { localStorage.removeItem(LS_KEY); } catch { /* private mode */ }
    return [];
  }
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `u-${crypto.randomUUID()}`;
  return `u-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function saveUserRecipe(input) {
  const title = String(input.title || "").trim();
  const ingredients = (Array.isArray(input.ingredients) ? input.ingredients : String(input.ingredients || "").split(",")).map((s) => String(s).trim()).filter(Boolean);
  const timeMinutes = Number(input.timeMinutes);
  const steps = (Array.isArray(input.steps) ? input.steps : String(input.steps || "").split("\n")).map((s) => String(s).trim()).filter(Boolean);
  if (!title) throw new Error("Title is required");
  if (ingredients.length === 0) throw new Error("At least one ingredient is required");
  if (!Number.isFinite(timeMinutes) || timeMinutes < 1) throw new Error("Valid timeMinutes is required");
  if (!["Easy", "Medium", "Hard"].includes(input.difficulty)) throw new Error("Difficulty must be Easy/Medium/Hard");
  if (steps.length === 0) throw new Error("At least one step is required");
  const regions = (input.regions || []).filter(Boolean);
  const now = new Date().toISOString();
  return {
    id: makeId(),
    title,
    ingredients,
    timeMinutes,
    difficulty: input.difficulty,
    cuisine: String(input.cuisine || "Homemade"),
    regions: regions.length ? regions : ["Global"],
    steps,
    servings: Number(input.servings) || 2,
    imageUrl: String(input.imageUrl || ""),
    createdAt: now,
    updatedAt: now,
    source: "user",
  };
}

function persistUserRecipe(recipe) {
  const all = getUserRecipes().concat(recipe);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    throw new Error("Could not save (storage full?)");
  }
  return recipe;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

if (typeof module !== "undefined") {
  module.exports = {
    loadCatalogue, validateCatalogue, queryRecipes, normalizeIngredient,
    ingredientName, subHint, STAPLES, SYNONYMS, SUBSTITUTIONS,
    LS_KEY, getUserRecipes, makeId, saveUserRecipe, persistUserRecipe, escapeHtml,
  };
}
