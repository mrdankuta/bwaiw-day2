const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { queryRecipes, normalizeIngredient } = require("../app.js");

const R = (id, title, ingredients, timeMinutes = 20, difficulty = "Easy", regions = ["Global"]) => ({
  id, title, ingredients, timeMinutes, difficulty, cuisine: "T", regions, steps: ["s"],
});

describe("normalize", () => {
  it("lowercases/trims + synonyms", () => {
    assert.equal(normalizeIngredient("  Tomatoes "), "tomato");
    assert.equal(normalizeIngredient("CAPSICUM"), "red bell pepper");
    assert.equal(normalizeIngredient("peas"), "green peas");
  });
});

describe("queryRecipes", () => {
  const cat = [
    R("a", "Omelette", ["eggs", "onion", "salt"], 15),
    R("b", "Rice", ["rice", "water", "salt"], 25),
    R("c", "Stew", ["chicken", "tomato", "onion"], 60, "Hard", ["Nigeria"]),
  ];

  it("ranks by score desc, time asc, title", () => {
    const res = queryRecipes({ ingredients: ["eggs", "onion", "rice"] }, cat);
    assert.equal(res[0].recipe.id, "a"); // 2/2 = 1
    assert.equal(res[0].score, 1);
    assert.equal(res[1].recipe.id, "b"); // 1/1 = 1, slower than a
    assert.deepEqual(res[1].missing, []);
  });

  it("staples never punish score", () => {
    const res = queryRecipes({ ingredients: [] }, [R("x", "X", ["salt", "water"], 5)]);
    assert.equal(res[0].score, 1);
  });

  it("hard filters time/difficulty/region", () => {
    assert.equal(queryRecipes({ maxTime: 30 }, cat).length, 2);
    assert.equal(queryRecipes({ difficulty: "Hard" }, cat).length, 1);
    assert.equal(queryRecipes({ region: "Nigeria" }, cat).length, 3); // Global passes
    assert.equal(queryRecipes({ region: "Ghana" }, cat).length, 2); // only Globals
  });

  it("fully-makeable toggle keeps score==1", () => {
    const res = queryRecipes({ ingredients: ["eggs"], fullyMakeableOnly: true }, cat);
    assert.ok(res.every((r) => r.score === 1));
  });

  it("empty catalogue returns empty", () => {
    assert.deepEqual(queryRecipes({ ingredients: ["x"] }, []), []);
  });

  it("tie-breaks by title", () => {
    const t = [R("1", "Bravo", ["eggs"], 10), R("2", "Alpha", ["eggs"], 10)];
    const res = queryRecipes({ ingredients: [] }, t);
    assert.equal(res[0].recipe.title, "Alpha");
  });
});
