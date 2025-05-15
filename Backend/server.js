const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['https://receipe-finder-dun.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

// Cache logic 
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../Frontend')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend', 'index.html'));
  });
}

// Export for Vercel
let serverless;
try {
  serverless = require('serverless-http');
  module.exports = serverless(app);
} catch (error) {
  console.log('serverless-http not available, running in standard mode');
}

// Listen directly when not on Vercel
if (process.env.NODE_ENV !== 'vercel') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}