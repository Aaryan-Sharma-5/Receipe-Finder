const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors());

// Cache logic as before
const cache = {
  recipes: new Map(),
  mealDetails: new Map()
};
const CACHE_EXPIRATION = 30 * 60 * 1000;

async function cachedFetch(url, cacheMap, cacheKey) {
  const cachedData = cacheMap.get(cacheKey);
  if (cachedData && (Date.now() - cachedData.timestamp < CACHE_EXPIRATION)) {
    return cachedData.data;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API responded with status ${response.status}`);
  const data = await response.json();

  cacheMap.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

// Routes
app.get('/api/recipes', async (req, res) => {
  const ingredient = req.query.ingredient;
  if (!ingredient) return res.status(400).json({ error: 'Ingredient is required' });

  try {
    const data = await cachedFetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`,
      cache.recipes,
      ingredient.toLowerCase()
    );
    res.json(data.meals || []);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.get('/api/meal/:id', async (req, res) => {
  const mealId = req.params.id;
  try {
    const data = await cachedFetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`,
      cache.mealDetails,
      mealId
    );
    res.json(data);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch meal details' });
  }
});

// 👇 This is what makes Express compatible with Vercel
const serverless = require('serverless-http');
module.exports = serverless(app);
