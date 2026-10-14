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

function showError(msg) {
  const el = document.getElementById("error");
  el.textContent = msg;
  el.hidden = false;
  document.getElementById("catalogue-status").textContent = "Catalogue failed to load.";
}

const QUICK_STAPLES = ["salt", "oil", "water", "rice", "eggs", "onion", "garlic"];

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

function subHint(missing) {
  const hit = missing.find((m) => SUBSTITUTIONS[m]);
  return hit ? `No ${hit}? try ${SUBSTITUTIONS[hit]}.` : "";
}

function getUserRecipes() {
  try {
    const raw = localStorage.getItem("rba:user-recipes:v1");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error("overlay not an array");
    return arr;
  } catch {
    try { localStorage.removeItem("rba:user-recipes:v1"); } catch { /* private mode */ }
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
  const recipe = {
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
  const all = getUserRecipes().concat(recipe);
  try {
    localStorage.setItem("rba:user-recipes:v1", JSON.stringify(all));
  } catch (e) {
    throw new Error(`Could not save (storage full?): ${e.message}`);
  }
  return recipe;
}

let CATALOGUE = [];

function readFilters() {
  const raw = document.getElementById("ingredients").value;
  const ingredients = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const maxTime = document.getElementById("maxTime").value;
  return {
    ingredients,
    maxTime: maxTime === "" ? null : Number(maxTime),
    difficulty: document.getElementById("difficulty").value,
    region: document.getElementById("region").value,
    fullyMakeableOnly: document.getElementById("makeableOnly")?.checked || false,
  };
}

function renderGrid(results) {
  const grid = document.getElementById("grid");
  if (results.length === 0) {
    const f = readFilters();
    const loosen = [];
    if (f.fullyMakeableOnly) loosen.push(`<button type="button" data-fix="toggle">Show near-misses</button>`);
    if (f.maxTime !== null) loosen.push(`<button type="button" data-fix="time">Clear time limit</button>`);
    if (f.difficulty !== "Any") loosen.push(`<button type="button" data-fix="difficulty">Clear difficulty</button>`);
    loosen.push(`<button type="button" data-fix="ingredients">Clear ingredients</button>`);
    grid.innerHTML = `<div class="empty"><p>No recipes match. Try loosening a filter — your time, difficulty, toggle, or ingredient list is too tight.</p><p>${loosen.join(" ")}</p></div>`;
    grid.querySelectorAll("button[data-fix]").forEach((b) => b.addEventListener("click", () => {
      const fix = b.dataset.fix;
      if (fix === "toggle") document.getElementById("makeableOnly").checked = false;
      if (fix === "time") document.getElementById("maxTime").value = "";
      if (fix === "difficulty") document.getElementById("difficulty").value = "Any";
      if (fix === "ingredients") document.getElementById("ingredients").value = "";
      refresh();
    }));
    return;
  }
  grid.innerHTML = results.slice(0, 24).map(({ recipe, score, missing }) => {
    const hint = missing.length ? subHint(missing) : "";
    return `<article class="card" data-id="${recipe.id}" tabindex="0"><h3>${escapeHtml(recipe.title)}</h3><p>${Math.round(score * 100)}% · ${recipe.timeMinutes} min · ${recipe.difficulty} · ${escapeHtml(recipe.cuisine)}</p>${missing.length ? `<p class="missing">Missing: ${missing.slice(0, 3).map(escapeHtml).join(", ")}${missing.length > 3 ? ` +${missing.length - 3} more` : ""}</p>${hint ? `<p class="sub">${escapeHtml(hint)}</p>` : ""}` : `<p class="makeable">All ingredients on hand</p>`}</article>`;
  }).join("");
  grid.querySelectorAll(".card").forEach((c) => {
    c.addEventListener("click", () => openDetail(c.dataset.id));
    c.addEventListener("keydown", (e) => { if (e.key === "Enter") openDetail(c.dataset.id); });
  });
}

function openDetail(id) {
  const all = CATALOGUE.concat(getUserRecipes());
  const r = all.find((x) => x.id === id);
  if (!r) return;
  const d = document.getElementById("detail");
  const ings = r.ingredients.map((i) => `<li>${escapeHtml(typeof i === "string" ? i : i.name)}</li>`).join("");
  d.innerHTML = `<button id="back">← Back to results</button><h2>${escapeHtml(r.title)}</h2><p>${r.timeMinutes} min · ${r.difficulty} · ${escapeHtml(r.cuisine)} · serves ${r.servings || "—"}</p><h4>Ingredients</h4><ul>${ings}</ul><h4>Steps</h4><ol>${r.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
  d.hidden = false;
  document.getElementById("back").addEventListener("click", () => { d.hidden = true; });
}

function refresh() {
  const filters = readFilters();
  const all = CATALOGUE.concat(getUserRecipes());
  const results = queryRecipes(filters, all);
  renderGrid(results);
  const note = document.getElementById("filter-note");
  if (note) {
    if (filters.fullyMakeableOnly) {
      const base = queryRecipes({ ...filters, fullyMakeableOnly: false }, all);
      const hidden = base.length - results.length;
      note.textContent = hidden > 0 ? `${hidden} near-miss${hidden === 1 ? "" : "es"} hidden by fully-makeable filter.` : "Showing only fully-makeable recipes.";
    } else {
      note.textContent = "";
    }
  }
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function boot() {
  const staples = document.getElementById("staples");
  staples.innerHTML = QUICK_STAPLES.map((s) => `<button type="button" data-s="${s}">+ ${s}</button>`).join(" ");
  staples.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-s]");
    if (!b) return;
    const input = document.getElementById("ingredients");
    const cur = input.value.split(",").map((s) => s.trim()).filter(Boolean);
    if (!cur.map((x) => x.toLowerCase()).includes(b.dataset.s)) {
      input.value = cur.concat(b.dataset.s).join(", ");
      refresh();
    }
  });
  try {
    CATALOGUE = await loadCatalogue();
    document.getElementById("catalogue-status").textContent = `${CATALOGUE.length} recipes loaded.`;
    ["ingredients", "maxTime", "difficulty", "region", "makeableOnly"].forEach((id) =>
      document.getElementById(id).addEventListener("input", debounce(refresh, 200)));
    document.getElementById("addForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const note = document.getElementById("add-note");
      try {
        const saved = saveUserRecipe({
          title: document.getElementById("f-title").value,
          ingredients: document.getElementById("f-ingredients").value,
          timeMinutes: document.getElementById("f-time").value,
          difficulty: document.getElementById("f-difficulty").value,
          cuisine: document.getElementById("f-cuisine").value,
          regions: [...document.querySelectorAll(".f-region:checked")].map((c) => c.value),
          steps: document.getElementById("f-steps").value,
          servings: document.getElementById("f-servings").value,
          imageUrl: document.getElementById("f-image").value,
        });
        note.textContent = `Saved “${saved.title}” — it now ranks with the catalogue.`;
        e.target.reset();
        refresh();
      } catch (err) {
        note.textContent = `Could not save: ${err.message}`;
      }
    });
    refresh();
  } catch (e) {
    showError(`Could not load recipes: ${e.message}`);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

function normalizeIngredient(name) {
  const n = String(name).toLowerCase().trim().replace(/\s+/g, " ");
  return SYNONYMS[n] || n;
}

function ingredientName(ing) {
  return typeof ing === "string" ? ing : ing.name;
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

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", boot);
if (typeof module !== "undefined") module.exports = { loadCatalogue, validateCatalogue, queryRecipes, normalizeIngredient, STAPLES, getUserRecipes, saveUserRecipe, subHint, SUBSTITUTIONS };
