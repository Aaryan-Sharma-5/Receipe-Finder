const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Cache storage with 30-minute expiration
const cache = {
  recipes: new Map(),
  mealDetails: new Map()
};
const CACHE_EXPIRATION = 30 * 60 * 1000;

// Helper function for cached API requests
async function cachedFetch(url, cacheMap, cacheKey) {
  const cachedData = cacheMap.get(cacheKey);
  if (cachedData && (Date.now() - cachedData.timestamp < CACHE_EXPIRATION)) {
    return cachedData.data;
  }

  // Fetch from API if not in cache or expired
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API responded with status ${response.status}`);
  }

  const data = await response.json();

  // Store in cache
  cacheMap.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
}

// Get recipes by ingredient
app.get('/api/recipes', async (req, res) => {
  const ingredient = req.query.ingredient;

  if (!ingredient) {
    return res.status(400).json({ error: 'Ingredient parameter is required' });
  }

  try {
    // Use cachedFetch helper instead of direct fetch
    const data = await cachedFetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`,
      cache.recipes,
      ingredient.toLowerCase()
    );
    
    // Return the meals array
    return res.json(data.meals || []);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch recipes',
      details: error.message 
    });
  }
});

// Get meal details by ID
app.get('/api/meal/:id', async (req, res) => {
  const mealId = req.params.id;

  try {
    const data = await cachedFetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`,
      cache.mealDetails,
      mealId
    );
    res.json(data);
  } catch (error) {
    console.error('Error fetching meal details:', error);
    res.status(500).json({ error: 'Failed to fetch meal details' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;