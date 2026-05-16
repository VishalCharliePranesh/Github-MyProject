/* ============================================================
   THE ARTISAN TABLE — app.js
   ============================================================ */

'use strict';

// ── State ────────────────────────────────────────────────────
const state = {
  recipes: [],
  categories: [],
  activeCategory: 'all',
  searchQuery: '',
  currentRecipe: null,
};

// ── DOM References ───────────────────────────────────────────
const $ = id => document.getElementById(id);
const DOM = {
  loader:           () => $('loader'),
  navbar:           () => $('navbar'),
  searchInput:      () => $('search-input'),
  searchDropdown:   () => $('search-dropdown'),
  categoryFilter:   () => $('category-filter'),
  recipeGrid:       () => $('recipe-grid'),
  modalOverlay:     () => $('modal-overlay'),
  modalContent:     () => $('modal-content'),
};

// ── Load Data ────────────────────────────────────────────────
async function loadRecipes() {
  try {
    const res = await fetch('recipes.json');
    if (!res.ok) throw new Error('Failed to load recipes.json');
    const data = await res.json();
    state.recipes = data.recipes;
    state.categories = data.categories;
    return true;
  } catch (err) {
    console.error('Recipe load error:', err);
    // Fallback: inline minimal data so the page still works
    state.recipes = [];
    state.categories = [];
    return false;
  }
}

// ── Initialise ───────────────────────────────────────────────
async function init() {
  await loadRecipes();

  // Hide loader
  setTimeout(() => {
    DOM.loader().classList.add('hidden');
  }, 1600);

  buildCategories();
  renderGrid();
  bindEvents();
  bindScrollEffects();
  animateStats();
}

// ── Build Category Filter ────────────────────────────────────
function buildCategories() {
  const container = DOM.categoryFilter();
  if (!container) return;

  const allBtn = createFilterBtn({ id: 'all', label: 'All', icon: '✦' }, true);
  container.appendChild(allBtn);

  state.categories.forEach(cat => {
    container.appendChild(createFilterBtn(cat, false));
  });
}

function createFilterBtn(cat, active) {
  const btn = document.createElement('button');
  btn.className = `filter-btn${active ? ' active' : ''}`;
  btn.dataset.category = cat.id;
  btn.innerHTML = `${cat.icon || ''} ${cat.label}`;
  btn.addEventListener('click', () => setCategory(cat.id, btn));
  return btn;
}

function setCategory(id, clickedBtn) {
  state.activeCategory = id;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  clickedBtn.classList.add('active');
  renderGrid();
}

// ── Render Recipe Grid ───────────────────────────────────────
function getFilteredRecipes() {
  return state.recipes.filter(r => {
    const matchCat = state.activeCategory === 'all' || r.category === state.activeCategory;
    const q = state.searchQuery.toLowerCase();
    const matchSearch = !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some(t => t.includes(q));
    return matchCat && matchSearch;
  });
}

function renderGrid() {
  const grid = DOM.recipeGrid();
  if (!grid) return;
  grid.innerHTML = '';

  const filtered = getFilteredRecipes();

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results">No recipes found — try a different search or filter 🍽️</div>`;
    return;
  }

  filtered.forEach((recipe, i) => {
    const card = buildCard(recipe, i);
    grid.appendChild(card);
  });
}

function buildCard(r, index) {
  const card = document.createElement('article');
  card.className = 'recipe-card';
  card.style.animationDelay = `${index * 60}ms`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `View recipe: ${r.title}`);

  const stars = '★'.repeat(Math.round(r.rating)) + '☆'.repeat(5 - Math.round(r.rating));
  const diffColor = { Easy: '#7A9E7E', Medium: '#B8902A', Hard: '#C4633A' }[r.difficulty] || '#999';

  card.innerHTML = `
    <div class="card-thumb" style="background:${r.color}">
      <span>${r.image}</span>
      <span class="card-badge" style="color:${diffColor}">${r.difficulty}</span>
    </div>
    <div class="card-body">
      <div class="card-category">${r.category}</div>
      <h3 class="card-title">${r.title}</h3>
      <p class="card-desc">${r.description}</p>
      <div class="card-meta">
        <span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${r.time}
        </span>
        <span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          ${r.servings} servings
        </span>
        <span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          ${r.calories} cal
        </span>
      </div>
    </div>
    <div class="card-footer">
      <div class="card-rating" title="${r.rating}/5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ${r.rating.toFixed(1)}
      </div>
      <div class="card-tags">
        ${r.tags.slice(0, 2).map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
    </div>
  `;

  card.addEventListener('click', () => openModal(r));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(r); });
  return card;
}

// ── Modal ────────────────────────────────────────────────────
function openModal(recipe) {
  state.currentRecipe = recipe;
  const overlay = DOM.modalOverlay();
  const content = DOM.modalContent();
  if (!overlay || !content) return;

  content.innerHTML = `
    <div class="modal-header" style="background:${recipe.color}">
      <span>${recipe.image}</span>
      <button class="modal-close" id="modal-close-btn" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body">
      <div class="modal-category">${recipe.category}</div>
      <h2 class="modal-title">${recipe.title}</h2>
      <p class="modal-desc">${recipe.description}</p>

      <div class="modal-stats">
        <div class="modal-stat">
          <div class="modal-stat-num">${recipe.time}</div>
          <div class="modal-stat-label">Time</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-num">${recipe.servings}</div>
          <div class="modal-stat-label">Servings</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-num">${recipe.calories}</div>
          <div class="modal-stat-label">Calories</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-num">${recipe.rating}</div>
          <div class="modal-stat-label">Rating</div>
        </div>
      </div>

      <h3 class="modal-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6l-1 7H10L9 2zM12 19c-3.5 0-6-2.5-6-6 0-2.5 1.5-4.5 3-5.5M12 19c3.5 0 6-2.5 6-6 0-2.5-1.5-4.5-3-5.5M12 19v3m-3-1h6"/></svg>
        Ingredients
      </h3>
      <ul class="ingredients-list">
        ${recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
      </ul>

      <h3 class="modal-section-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14.5c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.83 8 21v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H15.5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8H3.5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11H8.5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/></svg>
        Method
      </h3>
      <ol class="steps-list">
        ${recipe.steps.map((step, i) => `
          <li>
            <span class="step-num">${i + 1}</span>
            <span>${step}</span>
          </li>
        `).join('')}
      </ol>
    </div>
  `;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  $('modal-close-btn').addEventListener('click', closeModal);
}

function closeModal() {
  DOM.modalOverlay().classList.remove('open');
  document.body.style.overflow = '';
  state.currentRecipe = null;
}

// ── Search ───────────────────────────────────────────────────
function buildSearchDropdown(query) {
  const dropdown = DOM.searchDropdown();
  dropdown.innerHTML = '';

  if (!query.trim()) {
    dropdown.classList.remove('visible');
    return;
  }

  const q = query.toLowerCase();
  const results = state.recipes.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.tags.some(t => t.includes(q)) ||
    r.category.includes(q)
  ).slice(0, 5);

  if (results.length === 0) {
    dropdown.innerHTML = `<div class="search-result"><span class="search-result-emoji">🔍</span><div><div class="search-result-title">No results</div></div></div>`;
  } else {
    results.forEach(r => {
      const el = document.createElement('div');
      el.className = 'search-result';
      el.innerHTML = `
        <span class="search-result-emoji">${r.image}</span>
        <div>
          <div class="search-result-title">${highlight(r.title, q)}</div>
          <div class="search-result-meta">${r.category} · ${r.time}</div>
        </div>
      `;
      el.addEventListener('click', () => {
        dropdown.classList.remove('visible');
        DOM.searchInput().value = '';
        state.searchQuery = '';
        openModal(r);
      });
      dropdown.appendChild(el);
    });
  }

  dropdown.classList.add('visible');
}

function highlight(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark style="background:rgba(196,99,58,.2);border-radius:2px;">$1</mark>');
}

// ── Animate Stats Counter ────────────────────────────────────
function animateStats() {
  const counters = document.querySelectorAll('[data-count]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      let current = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current + (el.dataset.suffix || '');
        if (current >= target) clearInterval(timer);
      }, 20);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

// ── Scroll Effects ───────────────────────────────────────────
function bindScrollEffects() {
  const navbar = DOM.navbar();
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Reveal on scroll
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity .7s ease, transform .7s ease';
    revealObserver.observe(el);
  });
}

// ── Event Bindings ───────────────────────────────────────────
function bindEvents() {
  // Overlay close on outside click
  DOM.modalOverlay().addEventListener('click', e => {
    if (e.target === DOM.modalOverlay()) closeModal();
  });

  // Escape key to close modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.currentRecipe) closeModal();
  });

  // Search input
  const searchInput = DOM.searchInput();
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = e.target.value;
        buildSearchDropdown(e.target.value);
        renderGrid();
      }, 220);
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.nav-search')) {
        DOM.searchDropdown().classList.remove('visible');
      }
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
