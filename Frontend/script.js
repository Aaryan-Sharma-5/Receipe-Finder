const API_BASE_URL = 'http://localhost:5000';
const MEAL_DB_API = 'https://www.themealdb.com/api/json/v1/1';

let elements = {};

document.addEventListener('DOMContentLoaded', () => {
  elements = {
    ingredientInput: document.getElementById("ingredientInput"),
    resultsDiv: document.getElementById("results"),
    backButtonPlaceholder: document.getElementById("backButtonPlaceholder")
  };

  elements.ingredientInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      searchRecipes();
    }
  });
});

/**
 * Shows a loading indicator in the results area
 * @param {string} message - The message to display during loading
 */
function showLoading(message) {
  elements.resultsDiv.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Shows an error message in the results area
 * @param {string} message - The error message to display
 * @param {string} emoji - The emoji to show with the error
 */
function showError(message, emoji = "😕") {
  elements.resultsDiv.innerHTML = `
    <div class="no-results">
      <span class="emoji">${emoji}</span>
      <p>${message}</p>
    </div>
  `;
}

function searchRecipes() {
  const ingredient = elements.ingredientInput.value.trim();

  showLoading(`Searching for recipes with ${ingredient}...`);

  if (!ingredient) {
    showError("Please enter an ingredient to find recipes", "👨‍🍳");
    return;
  }

  fetch(`${API_BASE_URL}/recipes?ingredient=${ingredient}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      displayResults(data);
    })
    .catch(error => {
      console.error("Error fetching recipes:", error);
      showError(`Error fetching recipes: ${error.message}\nMake sure your server is running on port 5000`);
    });
}

/**
 * Displays recipe results in the results area
 * @param {Array} meals - The array of meal data to display
 */
function displayResults(meals) {
  elements.resultsDiv.innerHTML = "";

  if (meals && meals.length > 0) {
    meals.forEach(meal => {
      const mealDiv = document.createElement("div");
      mealDiv.className = "recipe";

      const badge = meal.strCategory ?
        `<div class="recipe-badge">${meal.strCategory}</div>` : '';

      mealDiv.innerHTML = `
        ${badge}
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" />
        <div class="recipe-content">
          <h3>${meal.strMeal}</h3>
          <button class="view-recipe-btn" onclick="event.stopPropagation(); getMealDetails('${meal.idMeal}')">
            View Recipe
          </button>
        </div>
      `;

      elements.resultsDiv.appendChild(mealDiv);
    });
  } else {
    showError("No recipes found with that ingredient.", "🍽️");
  }
}

/**
 * Generates HTML for ingredients list
 * @param {Object} meal - The meal data object
 * @returns {string} HTML for the ingredients list
 */
function generateIngredientsHTML(meal) {
  let ingredients = '';

  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingredient && ingredient.trim() !== "") {
      ingredients += `
        <li class="ingredient-item">
          <span>${ingredient}</span>
          <span>${measure}</span>
        </li>
      `;
    } else {
      break;
    }
  }

  return ingredients;
}

/**
 * Formats recipe instructions into HTML steps
 * @param {string} instructions - The raw instructions text
 * @returns {string} HTML for the instructions list
 */
function formatInstructions(instructions) {
  return instructions
    .split(/\r\n|\n|\r/)
    .filter(step => step.trim() !== "")
    .map(step => `<li class="instruction-step">${step}</li>`)
    .join("");
}

/**
 * Gets and displays detailed information about a meal
 * @param {string} mealId - The ID of the meal to get details for
 */
function getMealDetails(mealId) {
  elements.backButtonPlaceholder.innerHTML = `
    <div class="back-button-container">
      <button class="back-button" onclick="goBack()">
        Back to Results
      </button>
    </div>
  `;

  showLoading("Loading recipe details...");

  fetch(`${MEAL_DB_API}/lookup.php?i=${mealId}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (data.meals && data.meals.length > 0) {
        const meal = data.meals[0];

        let tagsHTML = '';
        if (meal.strTags) {
          tagsHTML = meal.strTags.split(',')
            .map(tag => `<span class="recipe-tag">${tag.trim()}</span>`)
            .join(' ');
        }

        elements.resultsDiv.innerHTML = `
          <div class="recipe-details">
            <div class="recipe-details-image">
              <img src="${meal.strMealThumb}" alt="${meal.strMeal}" />
            </div>
            <div class="recipe-details-content">
              <h2 class="recipe-title">${meal.strMeal}</h2>
              <div class="recipe-tags">${tagsHTML}</div>
              <div class="recipe-meta">
                <div class="recipe-meta-item">${meal.strCategory}</div>
                <div class="recipe-meta-item">${meal.strArea}</div>
              </div>
              <div class="ingredients-section">
                <h3 class="section-title">Ingredients</h3>
                <ul class="ingredients-list">${generateIngredientsHTML(meal)}</ul>
              </div>
              <div class="instructions-section">
                <h3 class="section-title">Instructions</h3>
                <ol class="instructions-list">${formatInstructions(meal.strInstructions)}</ol>
              </div>
            </div>
          </div>
        `;
      } else {
        showError("Recipe not found.");
      }
    })
    .catch(err => {
      console.error("Error getting meal details:", err);
      showError("Error loading recipe details. Please try again.");
    });
}

function goBack() {
  const ingredient = elements.ingredientInput.value.trim();
  elements.backButtonPlaceholder.innerHTML = "";

  if (ingredient) {
    searchRecipes();
  } else {
    elements.resultsDiv.innerHTML = "";
  }
}