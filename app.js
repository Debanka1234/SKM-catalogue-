/**
 * Manna Jewellery Works - Main Application Logic
 * Supports:
 * - 48-hour live metal pricing calculation (Thouko & Floating)
 * - Instagram/TikTok style double tap with heart animation
 * - Tree-based category navigation and direct photo gallery for Puja & Misc
 * - Manager Portal with PIN authentication (1958)
 * - GitHub Pages ready ZIP export with all persistent data
 */

// Global State
let storeConfig = null;
let categoryTree = null;
let products = [];
let userLikedIds = new Set();
let activeFilters = {
  metal: "GOLD", // Only 'GOLD' or 'SILVER'
  mainCategory: "ALL",
  subCategory: "ALL",
  subSubCategory: "ALL",
  searchQuery: "",
  sortBy: "trending" // 'trending', 'likes', 'views', 'newest', 'weight_asc', 'weight_desc'
};
let currentViewMode = "grid"; // Always default to clean, accessible catalogue grid
let activeReelIndex = 0;
let lastTapTime = 0;
let viewedProductIds = new Set();
let countdownInterval = null;

// IndexedDB / LocalStorage Helper
const STORAGE_KEYS = {
  CONFIG: "MJW_CONFIG_V1",
  TREE: "MJW_TREE_V1",
  PRODUCTS: "MJW_PRODUCTS_V1",
  LIKES: "MJW_USER_LIKES_V1"
};

function initStorage() {
  try {
    const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
    storeConfig = savedConfig ? JSON.parse(savedConfig) : JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIG));
    storeConfig.phone = "+91 98741 26698";
    storeConfig.whatsappNumber = "919874126698";
    storeConfig.address = "Bagnan station road north, near cosmo bazar, howrah, west Bengal, PIN- 711303";

    const savedTree = localStorage.getItem(STORAGE_KEYS.TREE);
    categoryTree = savedTree ? JSON.parse(savedTree) : JSON.parse(JSON.stringify(DEFAULT_CATEGORY_TREE));

    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    products = savedProducts ? JSON.parse(savedProducts) : JSON.parse(JSON.stringify(INITIAL_PRODUCTS));

    const savedLikes = localStorage.getItem(STORAGE_KEYS.LIKES);
    if (savedLikes) {
      userLikedIds = new Set(JSON.parse(savedLikes));
    }
  } catch (err) {
    console.error("Error reading localStorage, using defaults", err);
    storeConfig = JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIG));
    categoryTree = JSON.parse(JSON.stringify(DEFAULT_CATEGORY_TREE));
    products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
  }
}

function saveStoreConfig() {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(storeConfig));
  renderHeaderAndBranding();
  renderMetalTicker();
}

function saveCategoryTree() {
  localStorage.setItem(STORAGE_KEYS.TREE, JSON.stringify(categoryTree));
  renderCategoryNav();
  renderTreeDrawer();
  if (typeof renderWizardStep2 === "function" && activeFilters && activeFilters.metal) {
    renderWizardStep2();
    if (activeFilters.mainCategory) {
      renderWizardStep3();
    }
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

function saveUserLikes() {
  localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify(Array.from(userLikedIds)));
}

// 48-Hour Rate Checker
function isPriceRateActive() {
  if (!storeConfig || !storeConfig.metalRates || !storeConfig.metalRates.lastUpdated) {
    return false;
  }
  const lastUpdated = new Date(storeConfig.metalRates.lastUpdated).getTime();
  const now = Date.now();
  const elapsedHours = (now - lastUpdated) / (1000 * 60 * 60);
  return elapsedHours < 48;
}

function getRateRemainingTime() {
  if (!storeConfig || !storeConfig.metalRates || !storeConfig.metalRates.lastUpdated) {
    return { active: false, text: "Rates Expired" };
  }
  const lastUpdated = new Date(storeConfig.metalRates.lastUpdated).getTime();
  const expireTime = lastUpdated + 48 * 60 * 60 * 1000;
  const remainingMs = expireTime - Date.now();

  if (remainingMs <= 0) {
    return { active: false, text: "Expired (Prices Hidden)", remainingMs: 0 };
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return {
    active: true,
    text: `${hours}h ${minutes}m ${seconds}s left`,
    hours,
    minutes,
    remainingMs
  };
}

// Compute Finished Product Price
function calculateProductPrice(product) {
  // If rates expired (>48h), price cannot be shown
  if (!isPriceRateActive()) {
    return { displayable: false, price: 0, reason: "48h Rate Expired" };
  }

  // Fixed Pricing System ("Thouko")
  if (product.pricingSystem === "fixed") {
    return {
      displayable: true,
      price: Math.round(product.fixedPrice || 0),
      isFixed: true
    };
  }

  // Floating Pricing System
  const metalRates = storeConfig.metalRates;
  let ratePerGram = 0;

  if (product.metal === "GOLD") {
    ratePerGram = metalRates.gold22k || 7200;
  } else {
    // Silver
    if (product.metalPurity === "92.5") {
      ratePerGram = metalRates.silver925 || 95;
    } else {
      ratePerGram = metalRates.silver800 || 80;
    }
  }

  const weight = parseFloat(product.netWeight) || 0;
  const baseMetalValue = weight * ratePerGram;
  let makingCharges = 0;

  if (product.makingChargeType === "percent") {
    const pct = parseFloat(product.makingChargeValue) || 0;
    makingCharges = baseMetalValue * (pct / 100);
  } else {
    // Fixed per gram
    const perGram = parseFloat(product.makingChargeValue) || 0;
    makingCharges = weight * perGram;
  }

  const totalPrice = Math.round(baseMetalValue + makingCharges);
  return {
    displayable: true,
    price: totalPrice,
    isFixed: false
  };
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  initUI();
  renderHeaderAndBranding();
  renderMetalTicker();
  initWizardNeutralState();
  setupHorizontalScrollWatcher();
  startRateCountdown();
  setupEventListeners();
  setupIntersectionObserver();
});

function initUI() {
  // Check if logo is available
  const logoEl = document.getElementById("headerStoreLogo");
  if (logoEl && storeConfig.logoUrl) {
    logoEl.src = storeConfig.logoUrl;
  }
}

function renderHeaderAndBranding() {
  const storeNameEl = document.getElementById("headerStoreName");
  if (storeNameEl) storeNameEl.textContent = storeConfig.storeName;

  const logoEl = document.getElementById("headerStoreLogo");
  if (logoEl && storeConfig.logoUrl) {
    logoEl.src = storeConfig.logoUrl;
  }
}

// Live Ticker Bar
function renderMetalTicker() {
  const tickerBar = document.getElementById("rateTickerBar");
  if (!tickerBar) return;

  const rates = storeConfig.metalRates;
  const timeInfo = getRateRemainingTime();

  tickerBar.innerHTML = `
    <div class="ticker-item">
      <span class="ticker-label">Gold 22K:</span>
      <span class="ticker-val">₹${rates.gold22k.toLocaleString('en-IN')}/g</span>
    </div>
    <div class="ticker-item ticker-silver">
      <span class="ticker-label">Silver 92.5:</span>
      <span class="ticker-val">₹${rates.silver925.toLocaleString('en-IN')}/g</span>
    </div>
    <div class="ticker-item ticker-silver">
      <span class="ticker-label">Silver 80.0:</span>
      <span class="ticker-val">₹${rates.silver800.toLocaleString('en-IN')}/g</span>
    </div>
    <div class="ticker-item ticker-validity">
      <span class="rate-status-dot ${timeInfo.active ? 'active' : 'expired'}"></span>
      <span>${timeInfo.active ? timeInfo.text : 'Rates Expired (48h)'}</span>
    </div>
  `;
}

function startRateCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    renderMetalTicker();
    updatePortalCountdown();
  }, 1000);
}

// ==========================================================================
// ==========================================================================
// DYNAMIC CATEGORY-TREE-DRIVEN PROGRESSIVE WIZARD CONTROLLER
// Strictly follows categoryTree hierarchy: Metal -> Main Cat -> Sub Cat -> Style
// Fully synchronized with Categories Manager in the Manager Portal.
// ==========================================================================

function getMetalDesignCount(metal) {
  return products.filter(p => p.metal === metal).length;
}

function getCategoryDesignCount(metal, catId) {
  if (!catId || catId === "ALL") {
    return products.filter(p => p.metal === metal).length;
  }
  return products.filter(p => p.metal === metal && p.mainCategory === catId).length;
}

// Initial neutral state on Home Page: NOTHING is pre-selected
function initWizardNeutralState() {
  activeFilters.metal = null;
  activeFilters.mainCategory = null;
  activeFilters.subCategory = null;
  activeFilters.subSubCategory = null;

  const goldCard = document.getElementById("wizardCardGold");
  const silverCard = document.getElementById("wizardCardSilver");
  const goldCheck = document.getElementById("wizardCheckGold");
  const silverCheck = document.getElementById("wizardCheckSilver");
  const goldCountEl = document.getElementById("wizardCountGold");
  const silverCountEl = document.getElementById("wizardCountSilver");

  const goldCount = getMetalDesignCount("GOLD");
  const silverCount = getMetalDesignCount("SILVER");

  if (goldCountEl) goldCountEl.textContent = `${goldCount} Designs`;
  if (silverCountEl) silverCountEl.textContent = `${silverCount} Designs`;

  if (goldCard) goldCard.classList.remove("active");
  if (silverCard) silverCard.classList.remove("active");
  if (goldCheck) goldCheck.style.display = "none";
  if (silverCheck) silverCheck.style.display = "none";

  // Hide Step 2, Step 3, Step 4, and Collections initially
  const step2 = document.getElementById("wizardStep2Container");
  const step3 = document.getElementById("wizardStep3Container");
  const step4 = document.getElementById("wizardStep4Container");
  const results = document.getElementById("collectionResultsSection");

  if (step2) step2.style.display = "none";
  if (step3) step3.style.display = "none";
  if (step4) step4.style.display = "none";
  if (results) results.style.display = "none";
}

// STEP 1: User Chooses Metal (Gold or Silver)
function selectMetal(metal) {
  activeFilters.metal = (metal === "SILVER") ? "SILVER" : "GOLD";
  activeFilters.mainCategory = null;
  activeFilters.subCategory = null;
  activeFilters.subSubCategory = null;

  const isGold = activeFilters.metal === "GOLD";

  // 1. Update Step 1 Metal Cards (Active vs Inactive)
  const goldCard = document.getElementById("wizardCardGold");
  const silverCard = document.getElementById("wizardCardSilver");
  const goldCheck = document.getElementById("wizardCheckGold");
  const silverCheck = document.getElementById("wizardCheckSilver");

  if (goldCard) goldCard.classList.toggle("active", isGold);
  if (silverCard) silverCard.classList.toggle("active", !isGold);
  if (goldCheck) goldCheck.style.display = isGold ? "flex" : "none";
  if (silverCheck) silverCheck.style.display = !isGold ? "flex" : "none";

  // 2. Configure & Reveal Step 2 Container dynamically from categoryTree
  const step2Title = document.getElementById("wizardStep2Title");
  if (step2Title) {
    step2Title.textContent = isGold ? "Select Gold Category / সোনার বিভাগ বাছুন" : "Select Silver Category / রূপোর বিভাগ বাছুন";
  }

  const step2Container = document.getElementById("wizardStep2Container");
  const step3Container = document.getElementById("wizardStep3Container");
  const step4Container = document.getElementById("wizardStep4Container");
  const resultsSection = document.getElementById("collectionResultsSection");

  if (step2Container) {
    step2Container.style.display = "block";
    renderWizardStep2();
    scrollToWizardStep(step2Container);
  }
  if (step3Container) step3Container.style.display = "none";
  if (step4Container) step4Container.style.display = "none";
  if (resultsSection) resultsSection.style.display = "none";
}

// STEP 2: Dynamically Render Main Categories strictly from categoryTree[metal]
function renderWizardStep2() {
  const grid = document.getElementById("wizardCategoryGrid");
  if (!grid || !activeFilters.metal) return;

  const metal = activeFilters.metal;
  const tree = categoryTree[metal] || {};
  const treeKeys = Object.keys(tree);

  // Helper metadata for icons and Bengali subtitles
  const getCatMeta = (key) => {
    const k = key.toUpperCase();
    if (k.includes("WOMEN")) return { icon: "👑", title: "Women's", sub: "মেয়েদের গহনা" };
    if (k.includes("MEN")) return { icon: "💍", title: "For Men", sub: "ছেলেদের গহনা" };
    if (k.includes("PUJA")) return { icon: "🪔", title: "Puja Items", sub: "পূজোর সামগ্রী" };
    if (k.includes("UNISEX") || k.includes("COUPLE")) return { icon: "👫", title: "Couple / Unisex", sub: "যুগল কালেকশন" };
    if (k.includes("MISC")) return { icon: "✨", title: "Miscellaneous", sub: "উপহার সামগ্রী ও ফ্রেম" };
    return { icon: "💎", title: key, sub: "কালেকশন" };
  };

  // Build categories list strictly from categoryTree
  let categories = treeKeys.map(catKey => {
    const meta = getCatMeta(catKey);
    return {
      id: catKey,
      icon: meta.icon,
      title: meta.title,
      sub: meta.sub
    };
  });

  // Append 'ALL' option at the end
  categories.push({
    id: "ALL",
    icon: "💎",
    title: metal === "GOLD" ? "All Gold Designs" : "All Silver Designs",
    sub: "সব ডিজাইন দেখুন"
  });

  grid.innerHTML = categories.map(cat => {
    const count = getCategoryDesignCount(metal, cat.id);
    const isActive = activeFilters.mainCategory === cat.id;

    return `
      <div class="wizard-category-card ${isActive ? 'active' : ''}" onclick="selectWizardCategory('${cat.id}', event)">
        ${isActive ? '<span class="wizard-check-badge">✓</span>' : ''}
        <div class="wizard-squircle-icon">${cat.icon}</div>
        <h4 class="wizard-card-title">${cat.title}</h4>
        <p class="wizard-card-sub">${cat.sub}</p>
        <span class="wizard-count-pill">${count} ${count === 1 ? 'Design' : 'Designs'}</span>
      </div>
    `;
  }).join("");
}

// STEP 2 Action: User selects a Main Category
function selectWizardCategory(catId, event) {
  if (event) event.stopPropagation();

  activeFilters.mainCategory = catId;
  activeFilters.subCategory = null;
  activeFilters.subSubCategory = null;

  renderWizardStep2();

  // Configure & Reveal Step 3 Container
  const step3Container = document.getElementById("wizardStep3Container");
  const step4Container = document.getElementById("wizardStep4Container");
  const resultsSection = document.getElementById("collectionResultsSection");
  const step3Title = document.getElementById("wizardStep3Title");

  if (step3Title) {
    const prettyName = catId === "ALL" ? "All" : (catId === "FOR WOMEN" ? "Women's" : (catId === "FOR MEN" ? "Men's" : catId));
    step3Title.textContent = `Select ${prettyName} Design Type`;
  }

  if (step3Container) {
    step3Container.style.display = "block";
    renderWizardStep3();
    updateShowCollectionButton();
    scrollToWizardStep(step3Container);
  }

  if (step4Container) step4Container.style.display = "none";
  if (resultsSection) resultsSection.style.display = "none";
}

// STEP 3: Dynamically Render Sub-Categories strictly from categoryTree[metal][mainCategory]
function renderWizardStep3() {
  const container = document.getElementById("wizardChipsRow");
  if (!container || !activeFilters.metal) return;

  const metal = activeFilters.metal;
  const mainCat = activeFilters.mainCategory;
  const tree = categoryTree[metal] || {};

  let subCategories = [];

  if (mainCat === "ALL") {
    // Collect all unique sub-categories across the entire metal tree
    const allSubs = new Set();
    Object.keys(tree).forEach(k => {
      const node = tree[k];
      if (Array.isArray(node)) {
        node.forEach(s => allSubs.add(s));
      } else if (typeof node === "object" && node !== null) {
        Object.keys(node).forEach(s => allSubs.add(s));
      }
    });
    // Also include any subCategories on existing products
    products.filter(p => p.metal === metal).forEach(p => {
      if (p.subCategory) allSubs.add(p.subCategory);
    });

    subCategories = Array.from(allSubs);
  } else {
    // Fetch directly from categoryTree[metal][mainCat]
    const node = tree[mainCat];
    if (Array.isArray(node)) {
      subCategories = [...node];
    } else if (typeof node === "object" && node !== null) {
      subCategories = Object.keys(node);
    }

    // Fallback: if category is empty list, pull subcategories from existing products
    if (subCategories.length === 0) {
      const prodSubs = new Set();
      products.filter(p => p.metal === metal && p.mainCategory === mainCat).forEach(p => {
        if (p.subCategory) prodSubs.add(p.subCategory);
      });
      subCategories = Array.from(prodSubs);
    }
  }

  const prettyMain = mainCat === "ALL" ? "All Designs" : (mainCat === "FOR WOMEN" ? "All Women" : (mainCat === "FOR MEN" ? "All For Men" : `All ${mainCat}`));

  let chips = [
    { id: "ALL", label: prettyMain }
  ];

  subCategories.forEach(sub => {
    chips.push({ id: sub, label: sub });
  });

  container.innerHTML = chips.map(chip => {
    const isActive = activeFilters.subCategory === chip.id;
    return `
      <button class="wizard-chip-btn ${isActive ? 'active' : ''}" onclick="selectWizardChip('${chip.id}', event)">
        ${chip.label}
      </button>
    `;
  }).join("");
}

// STEP 3 Action: User selects a Sub-Category (Design Type)
function selectWizardChip(subCatId, event) {
  if (event) event.stopPropagation();

  activeFilters.subCategory = subCatId;
  activeFilters.subSubCategory = null;

  renderWizardStep3();
  updateShowCollectionButton();

  // Check if this sub-category has sub-sub-categories (Level 3 style choices) in categoryTree
  const metal = activeFilters.metal;
  const mainCat = activeFilters.mainCategory;
  const tree = categoryTree[metal] || {};
  const catNode = tree[mainCat];

  let subSubItems = [];
  if (catNode && typeof catNode === "object" && !Array.isArray(catNode) && subCatId !== "ALL") {
    if (Array.isArray(catNode[subCatId]) && catNode[subCatId].length > 0) {
      subSubItems = catNode[subCatId];
    }
  }

  const step4Container = document.getElementById("wizardStep4Container");

  if (subSubItems.length > 0) {
    // Reveal Step 4 for specific style selection (e.g. Rani Haar, Choker, Jhumka, Pola...)
    if (step4Container) {
      step4Container.style.display = "block";
      renderWizardStep4(subSubItems, subCatId);
      scrollToWizardStep(step4Container);
    }
  } else {
    // No sub-sub categories: hide Step 4 and reveal collection directly
    if (step4Container) step4Container.style.display = "none";
    revealCollections();
  }
}

// STEP 4: Render Sub-Sub Categories / Specific Styles strictly from categoryTree
function renderWizardStep4(items, parentSubCat) {
  const container = document.getElementById("wizardStep4ChipsRow");
  const title = document.getElementById("wizardStep4Title");
  if (!container) return;

  if (title) {
    title.textContent = `Select ${parentSubCat} Style`;
  }

  const chips = [
    { id: "ALL", label: `All ${parentSubCat}` },
    ...items.map(item => ({ id: item, label: item }))
  ];

  container.innerHTML = chips.map(chip => {
    const isActive = activeFilters.subSubCategory === chip.id;
    return `
      <button class="wizard-chip-btn ${isActive ? 'active' : ''}" onclick="selectWizardStep4Chip('${chip.id}', event)">
        ${chip.label}
      </button>
    `;
  }).join("");

  // Update Step 4 CTA button count
  const count = getFilteredProducts().length;
  const pill = document.getElementById("showCollectionCountPillStep4");
  if (pill) pill.textContent = `${count} ${count === 1 ? 'Piece' : 'Pieces'}`;
}

// STEP 4 Action: User selects a Specific Style
function selectWizardStep4Chip(styleId, event) {
  if (event) event.stopPropagation();

  activeFilters.subSubCategory = styleId;

  // Re-render Step 4 chips active state
  const metal = activeFilters.metal;
  const mainCat = activeFilters.mainCategory;
  const tree = categoryTree[metal] || {};
  const catNode = tree[mainCat];
  if (catNode && catNode[activeFilters.subCategory]) {
    renderWizardStep4(catNode[activeFilters.subCategory], activeFilters.subCategory);
  }

  // Reveal collections immediately
  revealCollections();
}

function updateShowCollectionButton() {
  const count = getFilteredProducts().length;
  const pill = document.getElementById("showCollectionCountPill");
  if (pill) pill.textContent = `${count} ${count === 1 ? 'Piece' : 'Pieces'}`;

  const pill4 = document.getElementById("showCollectionCountPillStep4");
  if (pill4) pill4.textContent = `${count} ${count === 1 ? 'Piece' : 'Pieces'}`;
}

// Reveal collections after selection & auto-scroll to results
function revealCollections() {
  if (!activeFilters.metal) {
    selectMetal('GOLD');
    return;
  }

  const collectionSection = document.getElementById("collectionResultsSection");
  if (!collectionSection) return;

  collectionSection.style.display = "block";
  renderFilteredCollectionFeed();

  // Auto-scroll to results
  scrollToWizardStep(collectionSection);
}

// Render Collection Feed OR Empty State with Back Button if 0 items
function renderFilteredCollectionFeed() {
  const feed = document.getElementById("catalogContent");
  const badge = document.getElementById("collectionFilterBadge");
  if (!feed) return;

  const matching = getFilteredProducts();

  const isGold = activeFilters.metal === "GOLD";
  const metalName = isGold ? "22K Gold" : "92.5 Silver";
  let catName = "All";

  if (activeFilters.mainCategory === "FOR MEN") catName = "For Men";
  else if (activeFilters.mainCategory === "FOR WOMEN") catName = "Women's";
  else if (activeFilters.mainCategory === "PUJA ITEMS") catName = "Puja Items";
  else if (activeFilters.mainCategory === "UNISEX") catName = "Couple / Unisex";
  else if (activeFilters.mainCategory && activeFilters.mainCategory.includes("MISC")) catName = "Miscellaneous";
  else if (activeFilters.mainCategory && activeFilters.mainCategory !== "ALL") catName = activeFilters.mainCategory;

  const subName = (!activeFilters.subCategory || activeFilters.subCategory === "ALL") ? "" : ` &bull; ${activeFilters.subCategory}`;
  const subSubName = (!activeFilters.subSubCategory || activeFilters.subSubCategory === "ALL") ? "" : ` &gt; ${activeFilters.subSubCategory}`;

  if (badge) {
    badge.innerHTML = `${metalName} &bull; ${catName}${subName}${subSubName} (${matching.length} Available)`;
  }

  // Check if matching has products or is empty
  if (matching.length === 0) {
    feed.innerHTML = `
      <div class="empty-results-card">
        <div class="empty-icon">💎</div>
        <h3 class="empty-title">No Designs in This Category Currently</h3>
        <p class="empty-desc">
          এই বিভাগে বর্তমানে কোনো গহনা উপলব্ধ নেই। আমরা শীঘ্রই নতুন হলমার্কড ডিজাইন যুক্ত করছি।
        </p>
        <button class="empty-back-home-btn" onclick="resetWizardAndReturnHome()">
          <span>🏠</span> Back to Options / পুনরায় পছন্দ বাছুন
        </button>
      </div>
    `;
  } else {
    renderGridView(matching, feed);
  }
}

// Step Navigation Back Buttons
function goBackToStep2() {
  const step3 = document.getElementById("wizardStep3Container");
  const step4 = document.getElementById("wizardStep4Container");
  const results = document.getElementById("collectionResultsSection");
  const step2 = document.getElementById("wizardStep2Container");

  if (step3) step3.style.display = "none";
  if (step4) step4.style.display = "none";
  if (results) results.style.display = "none";
  activeFilters.mainCategory = null;
  activeFilters.subCategory = null;
  activeFilters.subSubCategory = null;

  renderWizardStep2();

  if (step2) {
    scrollToWizardStep(step2);
  }
}

function goBackToStep3() {
  const step4 = document.getElementById("wizardStep4Container");
  const results = document.getElementById("collectionResultsSection");
  const step3 = document.getElementById("wizardStep3Container");

  if (step4) step4.style.display = "none";
  if (results) results.style.display = "none";
  activeFilters.subSubCategory = null;

  renderWizardStep3();

  if (step3) {
    scrollToWizardStep(step3);
  }
}

// Reset Wizard and Return to Initial Step 1 Options on Home Page
function resetWizardAndReturnHome() {
  initWizardNeutralState();
  const step1 = document.getElementById("wizardStep1Container");
  if (step1) {
    scrollToWizardStep(step1);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function hideCollections() {
  const collectionSection = document.getElementById("collectionResultsSection");
  if (collectionSection) {
    collectionSection.style.display = "none";
  }

  const step4 = document.getElementById("wizardStep4Container");
  const step3 = document.getElementById("wizardStep3Container");
  const step2 = document.getElementById("wizardStep2Container");

  if (step4 && step4.style.display !== "none") {
    scrollToWizardStep(step4);
  } else if (step3 && step3.style.display !== "none") {
    scrollToWizardStep(step3);
  } else if (step2 && step2.style.display !== "none") {
    scrollToWizardStep(step2);
  } else {
    resetWizardAndReturnHome();
  }
}

// Unified, high-reliability smooth scroll with sticky header offset
function scrollToWizardStep(targetEl) {
  if (!targetEl) return;

  if (targetEl.style.display === "none") {
    targetEl.style.display = "block";
  }

  const performScroll = () => {
    const header = document.querySelector(".store-header");
    const headerHeight = header ? header.offsetHeight : 70;
    const rect = targetEl.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const targetY = rect.top + scrollTop - (headerHeight + 14);

    window.scrollTo({
      top: Math.max(0, targetY),
      behavior: "smooth"
    });

    try {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {}
  };

  requestAnimationFrame(performScroll);
  setTimeout(performScroll, 70);
}

// Render Products in Horizontal Showcase Track
function renderHorizontalProducts(items) {
  const track = document.getElementById("horizontalProductsTrack");
  const dotsRow = document.getElementById("carouselDotsRow");
  if (!track) return;

  const rateActive = isPriceRateActive();

  if (!items || items.length === 0) {
    track.innerHTML = `
      <div style="padding:40px 20px; text-align:center; color:var(--text-dim); width:100%;">
        <p>No jewellery found in this collection.</p>
      </div>
    `;
    if (dotsRow) dotsRow.innerHTML = "";
    return;
  }

  track.innerHTML = items.map((item, idx) => {
    const isLiked = userLikedIds.has(item.id);
    const priceInfo = calculateProductPrice(item);
    const showWeight = item.displayPreference === "weight" || item.displayPreference === "both";
    const showPrice = item.displayPreference === "price" || item.displayPreference === "both";
    const mainImg = item.images && item.images.length > 0 ? item.images[0] : "logo.jpg";
    const metalLabel = item.metal === "GOLD" ? "22K Gold" : (item.metalPurity === "92.5" ? "92.5 Silver" : "Silver");

    let priceHtml = "";
    if (showPrice) {
      if (rateActive && priceInfo.displayable) {
        priceHtml = `<span class="grid-price">₹ ${priceInfo.price.toLocaleString('en-IN')}</span>`;
      }
    }

    let weightHtml = showWeight ? `<span class="grid-weight">⚖️ ${item.netWeight}g</span>` : "";
    const waText = encodeURIComponent(`Hello Manna Jewellery Works, I want to inquire about: ${item.title} (${item.itemCode})`);
    const waUrl = `https://wa.me/${storeConfig.whatsappNumber || '919874126698'}?text=${waText}`;

    return `
      <div class="horizontal-card" id="card-${item.id}">
        <!-- Media with Double-Tap to like -->
        <div class="grid-media" onclick="handleCardMediaTap(event, '${item.id}')">
          <img src="${mainImg}" alt="${item.title}" loading="lazy">
          <span class="grid-top-badge ${item.metal === 'GOLD' ? 'badge-gold' : 'badge-silver'}">
            ${metalLabel}
          </span>
          <button class="card-like-btn ${isLiked ? 'liked' : ''}" id="card-like-${item.id}" onclick="toggleLike('${item.id}', event)" title="Like Piece">
            <span>${isLiked ? '❤️' : '🤍'}</span>
            <span class="like-num-badge" id="card-like-count-${item.id}">${item.likes || 0}</span>
          </button>
          <div class="heart-burst" id="heart-burst-${item.id}">❤️</div>
          <div class="double-tap-guidance">
            <span>Double-tap to like ❤️</span>
          </div>
        </div>

        <!-- Clean Minimal Details (Low text density) -->
        <div class="grid-details">
          <div class="grid-header-meta">
            <span class="grid-code">${item.itemCode}</span>
            <span class="grid-purity-pill">${metalLabel}</span>
          </div>
          <h3 class="grid-title">${item.title}</h3>
          <div class="grid-meta-row">
            ${weightHtml}
            ${priceHtml}
          </div>
          <!-- Clean Action Buttons -->
          <div class="card-bottom-actions">
            <button class="btn-card-details" onclick="openProductDetailModal('${item.id}')">
              <span>View Details</span>
            </button>
            <a href="${waUrl}" target="_blank" class="btn-card-wa" title="Inquire on WhatsApp">
              <span>💬 WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Build Pagination Dots
  if (dotsRow) {
    dotsRow.innerHTML = items.map((_, i) => `
      <div class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="scrollToHorizontalIndex(${i})"></div>
    `).join("");
  }
}

// Arrow Button Navigation
function scrollHorizontalProducts(direction) {
  const container = document.getElementById("horizontalProductsScroll");
  if (!container) return;
  const card = container.querySelector(".horizontal-card");
  const cardWidth = card ? card.offsetWidth + 16 : 300;
  container.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
}

// Scroll to specific card by index
function scrollToHorizontalIndex(index) {
  const container = document.getElementById("horizontalProductsScroll");
  if (!container) return;
  const cards = container.querySelectorAll(".horizontal-card");
  if (cards[index]) {
    cards[index].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

// Watch scroll position and update dots
function setupHorizontalScrollWatcher() {
  const container = document.getElementById("horizontalProductsScroll");
  if (!container) return;

  let isTicking = false;
  container.addEventListener("scroll", () => {
    if (!isTicking) {
      window.requestAnimationFrame(() => {
        const cards = container.querySelectorAll(".horizontal-card");
        const dots = document.querySelectorAll(".carousel-dot");
        if (cards.length === 0 || dots.length === 0) {
          isTicking = false;
          return;
        }

        const containerCenter = container.scrollLeft + container.offsetWidth / 2;
        let activeIdx = 0;
        let minDiff = Infinity;

        cards.forEach((card, idx) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const diff = Math.abs(containerCenter - cardCenter);
          if (diff < minDiff) {
            minDiff = diff;
            activeIdx = idx;
          }
        });

        dots.forEach((dot, idx) => {
          dot.classList.toggle("active", idx === activeIdx);
        });

        isTicking = false;
      });
      isTicking = true;
    }
  }, { passive: true });
}

// Toggle between Horizontal Carousel & Vertical List
function toggleViewLayout() {
  const horizontalSection = document.getElementById("horizontalProductSection");
  const verticalContainer = document.getElementById("catalogContent");
  const toggleBtnIcon = document.getElementById("viewToggleIcon");

  if (currentViewLayout === "horizontal") {
    currentViewLayout = "vertical";
    if (horizontalSection) horizontalSection.style.display = "none";
    if (verticalContainer) verticalContainer.style.display = "block";
    if (toggleBtnIcon) toggleBtnIcon.textContent = "↔ Swipe";
  } else {
    currentViewLayout = "horizontal";
    if (horizontalSection) horizontalSection.style.display = "block";
    if (verticalContainer) verticalContainer.style.display = "none";
    if (toggleBtnIcon) toggleBtnIcon.textContent = "↕ List";
  }
}

// Backward compatibility helpers
function initWizard() { initWizardNeutralState(); }
function setWizardStep(s) {}
function wizardSelectMetal(m) { selectMetal(m); }
function renderCategoryNav() {}
function clearFilters() { initWizardNeutralState(); }


// Tree Navigation Drawer
function renderTreeDrawer() {
  const container = document.getElementById("treeContentArea");
  if (!container) return;

  let html = "";

  ["GOLD", "SILVER"].forEach(metalKey => {
    const metalTree = categoryTree[metalKey];
    html += `
      <div class="tree-node-group">
        <div class="tree-metal-title ${metalKey === 'GOLD' ? 'tree-metal-gold' : 'tree-metal-silver'}" onclick="selectFromTree('${metalKey}', 'ALL', 'ALL', 'ALL')">
          <span>✨ ${metalKey} JEWELLERY</span>
          <small>Explore All &rarr;</small>
        </div>
    `;

    Object.keys(metalTree).forEach(mainCat => {
      const subCats = metalTree[mainCat];
      html += `
        <div class="tree-main-category">
          <div class="tree-main-label" onclick="selectFromTree('${metalKey}', '${mainCat}', 'ALL', 'ALL')">
            <span>🔹 ${mainCat}</span>
            <small style="color:var(--text-dim)">&rarr;</small>
          </div>
      `;

      if (Array.isArray(subCats) && subCats.length > 0) {
        html += `<div class="tree-sub-list">`;
        subCats.forEach(subItem => {
          html += `
            <div class="tree-sub-item" onclick="selectFromTree('${metalKey}', '${mainCat}', '${subItem}', 'ALL')">
              <span>• ${subItem}</span>
            </div>
          `;
        });
        html += `</div>`;
      } else if (typeof subCats === "object" && !Array.isArray(subCats)) {
        html += `<div class="tree-sub-list">`;
        Object.keys(subCats).forEach(subCatTitle => {
          const subSubCats = subCats[subCatTitle];
          html += `
            <div class="tree-sub-item" onclick="selectFromTree('${metalKey}', '${mainCat}', '${subCatTitle}', 'ALL')">
              <span>📁 ${subCatTitle}</span>
            </div>
          `;
          if (Array.isArray(subSubCats) && subSubCats.length > 0) {
            html += `<div class="tree-sub-sub-list">`;
            subSubCats.forEach(subSubItem => {
              html += `
                <div class="tree-sub-sub-item" onclick="selectFromTree('${metalKey}', '${mainCat}', '${subCatTitle}', '${subSubItem}')">
                  └ ${subSubItem}
                </div>
              `;
            });
            html += `</div>`;
          }
        });
        html += `</div>`;
      } else if (mainCat === "MISCELLANEOUS" || mainCat === "PUJA ITEMS" || mainCat === "MISCELLANEOUS ITEMS") {
        html += `
          <div class="tree-sub-list">
            <div class="tree-sub-item" style="color:var(--gold-bright); font-style: italic;" onclick="selectFromTree('${metalKey}', '${mainCat}', 'ALL', 'ALL')">
              📷 Direct Product Photo Gallery &rarr;
            </div>
          </div>
        `;
      }

      html += `</div>`;
    });

    html += `</div>`;
  });

  container.innerHTML = html;
}

function openTreeDrawer() {
  const drawer = document.getElementById("categoryDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  if (drawer && backdrop) {
    drawer.classList.add("open");
    backdrop.classList.add("open");
  }
}

function closeTreeDrawer() {
  const drawer = document.getElementById("categoryDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  if (drawer && backdrop) {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
  }
}

function selectFromTree(metal, mainCat, subCat, subSubCat) {
  activeFilters.metal = metal;
  activeFilters.mainCategory = mainCat;
  activeFilters.subCategory = subCat;
  activeFilters.subSubCategory = subSubCat;

  document.querySelectorAll(".metal-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.metal === metal);
  });

  closeTreeDrawer();
  renderCategoryNav();
  applyFiltersAndRender();
}

// Product Filtering & Sorting
function getFilteredProducts() {
  let list = [...products];

  // Metal Filter
  if (activeFilters.metal !== "ALL") {
    list = list.filter(p => p.metal === activeFilters.metal);
  }

  // Main Category Filter
  if (activeFilters.mainCategory !== "ALL") {
    list = list.filter(p => p.mainCategory === activeFilters.mainCategory);
  }

  // Sub Category Filter (Smart flexible matching for approachable chips)
  if (activeFilters.subCategory !== "ALL") {
    const targetSub = activeFilters.subCategory.toLowerCase();
    list = list.filter(p => {
      if (!p.subCategory) return false;
      const sub = p.subCategory.toLowerCase();
      return sub === targetSub || sub.includes(targetSub) || targetSub.includes(sub);
    });
  }

  // Sub-Sub Category Filter
  if (activeFilters.subSubCategory !== "ALL") {
    list = list.filter(p => p.subSubCategory === activeFilters.subSubCategory);
  }

  // Search Query Filter
  if (activeFilters.searchQuery.trim()) {
    const q = activeFilters.searchQuery.toLowerCase();
    list = list.filter(p => 
      (p.itemCode && p.itemCode.toLowerCase().includes(q)) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
      (p.subSubCategory && p.subSubCategory.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // Sorting
  const sortBy = activeFilters.sortBy;
  list.sort((a, b) => {
    if (sortBy === "trending") {
      const scoreA = (a.likes || 0) * 2 + (a.views || 0);
      const scoreB = (b.likes || 0) * 2 + (b.views || 0);
      return scoreB - scoreA;
    } else if (sortBy === "likes") {
      return (b.likes || 0) - (a.likes || 0);
    } else if (sortBy === "views") {
      return (b.views || 0) - (a.views || 0);
    } else if (sortBy === "newest") {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    } else if (sortBy === "weight_asc") {
      return (parseFloat(a.netWeight) || 0) - (parseFloat(b.netWeight) || 0);
    } else if (sortBy === "weight_desc") {
      return (parseFloat(b.netWeight) || 0) - (parseFloat(a.netWeight) || 0);
    }
    return 0;
  });

  return list;
}

// Render Core Catalogue Content (Standard Clean Grid & Direct Photo Gallery)
function applyFiltersAndRender() {
  const container = document.getElementById("catalogContent");
  if (!container) return;

  const filtered = getFilteredProducts();

  // Special direct image gallery condition:
  const isDirectImageMode = (
    activeFilters.mainCategory === "MISCELLANEOUS" || 
    activeFilters.mainCategory === "PUJA ITEMS" || 
    activeFilters.mainCategory === "MISCELLANEOUS ITEMS"
  );

  renderCatalogStatusBar(filtered.length);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💎</div>
        <h3>No Jewellery Found / কোনো গহনা পাওয়া যায়নি</h3>
        <p>No products match your current filter selections. Try resetting filters.</p>
        <button class="btn-primary" style="margin-top:16px;" onclick="clearFilters()">Show All Jewellery / সব দেখুন</button>
      </div>
    `;
    return;
  }

  if (isDirectImageMode) {
    renderDirectGalleryView(filtered, container);
  } else {
    renderGridView(filtered, container);
  }
}

// Catalogue Result Status Bar
function renderCatalogStatusBar(count) {
  const bar = document.getElementById("catalogStatusBar");
  if (!bar) return;

  let labelParts = [];
  if (activeFilters.metal !== "ALL") {
    labelParts.push(activeFilters.metal === "GOLD" ? "22K Gold" : "92.5 Silver");
  }
  if (activeFilters.mainCategory !== "ALL") {
    labelParts.push(activeFilters.mainCategory);
  }
  if (activeFilters.subCategory !== "ALL") {
    labelParts.push(activeFilters.subCategory);
  }
  if (activeFilters.subSubCategory !== "ALL") {
    labelParts.push(activeFilters.subSubCategory);
  }
  if (activeFilters.searchQuery) {
    labelParts.push(`"${activeFilters.searchQuery}"`);
  }

  let desc = labelParts.length > 0 ? labelParts.join(" &bull; ") : "All Jewellery Collection";

  bar.innerHTML = `
    <div>Showing <span class="catalog-status-count">${count} pieces</span> in <strong>${desc}</strong></div>
    ${labelParts.length > 0 ? `<button class="reset-all-btn" onclick="clearFilters()">Show All Pieces</button>` : ''}
  `;
}

// DIRECT IMAGE GALLERY VIEW (For Puja Items & Miscellaneous)
function renderDirectGalleryView(items, container) {
  let title = activeFilters.mainCategory;
  container.innerHTML = `
    <div class="direct-gallery-container">
      <div class="direct-gallery-header">
        <h2 class="direct-gallery-title">${title}</h2>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
          Touch any product to view weight, purity, live price, and direct WhatsApp / Call inquiry.
        </p>
      </div>
      <div class="direct-gallery-grid">
        ${items.map(item => `
          <div class="gallery-photo-item" onclick="openProductDetailModal('${item.id}')">
            <img src="${item.images[0]}" alt="${item.title}" loading="lazy">
            <div class="gallery-item-overlay">
              <span>${item.itemCode}</span>
              <span>👆 Tap for Details</span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

// REELS VIEW (Instagram / TikTok vertical scrolling cards)
function renderReelsView(items, container) {
  const rateActive = isPriceRateActive();

  container.innerHTML = `
    <div class="reels-container" id="reelsContainer">
      ${items.map((item, idx) => {
        const isLiked = userLikedIds.has(item.id);
        const priceInfo = calculateProductPrice(item);
        const showWeight = item.displayPreference === "weight" || item.displayPreference === "both";
        const showPrice = item.displayPreference === "price" || item.displayPreference === "both";
        const mainImg = item.images && item.images.length > 0 ? item.images[0] : "logo.jpg";

        let priceHtml = "";
        if (showPrice) {
          if (rateActive && priceInfo.displayable) {
            priceHtml = `<span class="metric-pill pill-price">₹ ${priceInfo.price.toLocaleString('en-IN')}</span>`;
          } else {
            priceHtml = `<span class="metric-pill pill-price-expired">Price on Request (Rate Expired)</span>`;
          }
        }

        let weightHtml = showWeight ? `<span class="metric-pill pill-weight">⚖️ ${item.netWeight} g</span>` : "";

        return `
          <div class="reel-card" data-product-id="${item.id}" id="reel-${item.id}">
            <!-- Media Area -->
            <div class="reel-media-wrapper" 
                 onclick="handleReelTap(event, '${item.id}')"
                 ondblclick="handleReelDoubleTap(event, '${item.id}')">
              <img src="${mainImg}" alt="${item.title}" class="reel-media-img" loading="lazy">
              
              <!-- Badges -->
              <div class="reel-badges-top">
                <span class="metal-badge ${item.metal === 'GOLD' ? 'badge-gold' : 'badge-silver'}">
                  ${item.metal === 'GOLD' ? '22K Gold' : (item.metalPurity === '92.5' ? '92.5 Hallmark Silver' : '80.0 Silver')}
                </span>
                <span class="item-code-badge">${item.itemCode}</span>
              </div>

              <!-- Multiple images indicator if >1 -->
              ${item.images.length > 1 ? `
                <div class="carousel-dots">
                  ${item.images.map((_, i) => `<div class="carousel-dot ${i === 0 ? 'active' : ''}"></div>`).join("")}
                </div>
              ` : ''}

              <!-- Floating Heart Particle target -->
              <div class="heart-burst" id="heart-burst-${item.id}">❤️</div>
            </div>

            <!-- Right Vertical Action Sidebar (Instagram/TikTok style) -->
            <div class="reel-actions-bar">
              <!-- Like Action -->
              <button class="action-item ${isLiked ? 'liked' : ''}" 
                      id="like-btn-${item.id}" 
                      onclick="toggleLike('${item.id}', event)">
                <div class="action-icon-circle">
                  ${isLiked ? '❤️' : '🤍'}
                </div>
                <span class="action-count" id="like-count-${item.id}">${item.likes || 0}</span>
              </button>

              <!-- Views Counter -->
              <div class="action-item">
                <div class="action-icon-circle" style="font-size:1.1rem;">
                  👁️
                </div>
                <span class="action-count" id="view-count-${item.id}">${item.views || 0}</span>
              </div>

              <!-- WhatsApp Action -->
              <button class="action-item" onclick="inquireOnWhatsApp('${item.id}', event)">
                <div class="action-icon-circle whatsapp-action-circle">
                  💬
                </div>
                <span class="action-count">Ask</span>
              </button>

              <!-- Quick View / Share -->
              <button class="action-item" onclick="openProductDetailModal('${item.id}')">
                <div class="action-icon-circle">
                  🔍
                </div>
                <span class="action-count">Details</span>
              </button>
            </div>

            <!-- Bottom Information Overlay -->
            <div class="reel-bottom-info">
              <h3 class="reel-title" onclick="openProductDetailModal('${item.id}')">${item.title}</h3>
              <div class="reel-category-crumb">
                <span>${item.mainCategory}</span>
                ${item.subCategory ? `<span>&bull; ${item.subCategory}</span>` : ''}
                ${item.subSubCategory ? `<span>&bull; ${item.subSubCategory}</span>` : ''}
              </div>

              <div class="reel-metrics-strip">
                ${weightHtml}
                ${priceHtml}
              </div>

              <div class="double-tap-hint">
                <span>Double tap anywhere on the image to like ❤️</span>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ==========================================================================
// DOUBLE-TAP TO LIKE & CAROUSEL GESTURES
// ==========================================
let lastCardTapTimes = {};
let singleCardTapTimers = {};

function handleCardMediaTap(event, productId) {
  // If user clicked the like button directly, ignore image double-tap
  if (event.target.closest('.card-like-btn')) return;

  const now = Date.now();
  const lastTap = lastCardTapTimes[productId] || 0;
  const timeDiff = now - lastTap;

  if (timeDiff < 360 && timeDiff > 40) {
    // Double tap detected!
    clearTimeout(singleCardTapTimers[productId]);
    lastCardTapTimes[productId] = 0;

    // Toggle like if not liked yet
    if (!userLikedIds.has(productId)) {
      toggleLike(productId, event);
    }
    triggerHeartBurst(productId);

    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  } else {
    lastCardTapTimes[productId] = now;
    // Set timer for single tap: opens product detail modal if no second tap occurs
    singleCardTapTimers[productId] = setTimeout(() => {
      openProductDetailModal(productId);
      lastCardTapTimes[productId] = 0;
    }, 300);
  }
}

function triggerHeartBurst(productId) {
  const burst = document.getElementById(`heart-burst-${productId}`);
  if (!burst) return;
  burst.classList.remove("active");
  void burst.offsetWidth; // Force DOM reflow
  burst.classList.add("active");
  setTimeout(() => {
    burst.classList.remove("active");
  }, 900);
}

function handleCarouselSlideTap(event, productId) {
  const now = Date.now();
  const lastTap = lastCardTapTimes[`modal_${productId}`] || 0;
  if (now - lastTap < 360 && now - lastTap > 40) {
    if (!userLikedIds.has(productId)) {
      toggleLike(productId, event);
    }
    const modalBurst = document.getElementById("modal-heart-burst");
    if (modalBurst) {
      modalBurst.classList.remove("active");
      void modalBurst.offsetWidth;
      modalBurst.classList.add("active");
      setTimeout(() => modalBurst.classList.remove("active"), 900);
    }
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    lastCardTapTimes[`modal_${productId}`] = 0;
  } else {
    lastCardTapTimes[`modal_${productId}`] = now;
  }
}

// GRID VIEW - STRICTLY 1 ITEM PER ROW with Double-Tap to Like
function renderGridView(items, container) {
  const rateActive = isPriceRateActive();
  const countBadge = document.getElementById("feedProductCount");
  if (countBadge) {
    countBadge.innerText = `${items.length} Designs`;
  }

  container.innerHTML = `
    <div class="grid-container">
      ${items.map(item => {
        const isLiked = userLikedIds.has(item.id);
        const priceInfo = calculateProductPrice(item);
        const showWeight = item.displayPreference === "weight" || item.displayPreference === "both";
        const showPrice = item.displayPreference === "price" || item.displayPreference === "both";
        const mainImg = item.images && item.images.length > 0 ? item.images[0] : "logo.jpg";
        const metalLabel = item.metal === "GOLD" ? "22K Gold" : (item.metalPurity === "92.5" ? "92.5 Silver" : "Silver");

        let priceHtml = "";
        if (showPrice) {
          if (rateActive && priceInfo.displayable) {
            priceHtml = `<span class="grid-price">₹ ${priceInfo.price.toLocaleString('en-IN')}</span>`;
          } else {
            priceHtml = `<span class="grid-price" style="font-size:0.75rem; color:var(--text-dim);">Ask Price</span>`;
          }
        }

        let weightHtml = showWeight ? `<span class="grid-weight">⚖️ ${item.netWeight}g</span>` : "<span></span>";
        const waText = encodeURIComponent(`Hello Manna Jewellery Works, I want to inquire about: ${item.title} (${item.itemCode})`);
        const waUrl = `https://wa.me/${storeConfig.whatsappNumber || '919874126698'}?text=${waText}`;

        return `
          <div class="grid-card" id="card-${item.id}">
            <!-- Media with Double-Tap detection -->
            <div class="grid-media" onclick="handleCardMediaTap(event, '${item.id}')">
              <img src="${mainImg}" alt="${item.title}" loading="lazy">
              <span class="grid-top-badge ${item.metal === 'GOLD' ? 'badge-gold' : 'badge-silver'}">
                ${metalLabel}
              </span>
              <!-- Working Like Button on Card -->
              <button class="card-like-btn ${isLiked ? 'liked' : ''}" id="card-like-${item.id}" onclick="toggleLike('${item.id}', event)" title="Like Piece">
                <span>${isLiked ? '❤️' : '🤍'}</span>
                <span class="like-num-badge" id="card-like-count-${item.id}">${item.likes || 0}</span>
              </button>
              <!-- Double-tap popping heart -->
              <div class="heart-burst" id="heart-burst-${item.id}">❤️</div>
              <div class="double-tap-guidance">
                <span>❤️ ডবল ট্যাপে লাইক করুন / Double-tap to like</span>
              </div>
            </div>

            <!-- Details -->
            <div class="grid-details">
              <div class="grid-header-meta">
                <span class="grid-code">${item.itemCode}</span>
                <span class="grid-purity-pill">${metalLabel}</span>
              </div>
              <h3 class="grid-title">${item.title}</h3>
              <div class="grid-meta-row">
                ${weightHtml}
                ${priceHtml}
              </div>
              <!-- Large Touch Buttons -->
              <div class="card-bottom-actions">
                <button class="btn-card-details" onclick="openProductDetailModal('${item.id}')">
                  <span>🔍 বিস্তারিত দেখুন (View Details)</span>
                </button>
                <a href="${waUrl}" target="_blank" class="btn-card-wa" title="Inquire on WhatsApp">
                  <span>💬 WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// Working Like Function (Persists, updates card, updates modal, provides feedback)
function toggleLike(productId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const product = products.find(p => p.id === productId);
  if (!product) return;

  const wasLiked = userLikedIds.has(productId);

  if (wasLiked) {
    userLikedIds.delete(productId);
    product.likes = Math.max(0, (product.likes || 0) - 1);
    showToast("Removed from Liked Items");
  } else {
    userLikedIds.add(productId);
    product.likes = (product.likes || 0) + 1;
    showToast("❤️ Added to Liked Pieces!");
  }

  saveUserLikes();
  saveProducts();

  // 1. Update Heart on the Product Card
  const cardLikeBtn = document.getElementById(`card-like-${productId}`);
  if (cardLikeBtn) {
    cardLikeBtn.classList.toggle("liked", !wasLiked);
    cardLikeBtn.innerHTML = `<span>${!wasLiked ? '❤️' : '🤍'}</span> <span class="like-num-badge" id="card-like-count-${productId}">${product.likes || 0}</span>`;
  }

  // 2. Update Heart in Product Detail Modal if open
  const modalLikeBtn = document.getElementById("modalLikeBtn");
  if (modalLikeBtn) {
    modalLikeBtn.classList.toggle("liked", !wasLiked);
    modalLikeBtn.innerHTML = `<span>${!wasLiked ? '❤️ Liked' : '🤍 Like Piece'}</span> <span style="font-size:0.8rem; opacity:0.8;">(${product.likes || 0})</span>`;
  }
}


// WhatsApp Inquiry
function inquireOnWhatsApp(productId, event) {
  if (event) event.stopPropagation();
  const product = products.find(p => p.id === productId) || products[0];
  if (!product) return;

  const priceInfo = calculateProductPrice(product);
  const priceText = isPriceRateActive() && priceInfo.displayable ? `₹${priceInfo.price.toLocaleString('en-IN')}` : "Price upon request";

  const message = `Hello Manna Jewellery Works,\nI am interested in this piece from your catalogue:\n\n*Item:* ${product.title}\n*Code:* ${product.itemCode}\n*Metal:* ${product.metal} (${product.metalPurity || '22K'})\n*Net Weight:* ${product.netWeight} grams\n*Estimated Price:* ${priceText}\n\nPlease share more details and availability!`;

  const phone = storeConfig.whatsappNumber || "919874126698";
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ==========================================
// PRODUCT DETAIL MODAL WITH TOUCH SWIPE CAROUSEL
// ==========================================
let detailModalActiveSlideIndex = 0;
let detailModalMediaList = [];

function openProductDetailModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById("productDetailModal");
  const backdrop = document.getElementById("detailModalBackdrop");
  if (!modal || !backdrop) return;

  const priceInfo = calculateProductPrice(product);
  const isLiked = userLikedIds.has(product.id);
  const rateActive = isPriceRateActive();
  const phone = storeConfig.phone || "+91 98741 26698";

  // Register view internally for manager insights
  product.views = (product.views || 0) + 1;
  saveProducts();

  const mediaList = product.images && product.images.length > 0 ? product.images : ["logo.jpg"];
  detailModalMediaList = mediaList;
  detailModalActiveSlideIndex = 0;

  // Build Carousel Track Slides
  const slidesHtml = mediaList.map((mediaUrl, idx) => {
    const isVideo = mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm") || mediaUrl.includes("video");
    if (isVideo) {
      return `
        <div class="carousel-slide" onclick="handleCarouselSlideTap(event, '${product.id}')">
          <video src="${mediaUrl}" controls playsinline style="width:100%; height:100%; object-fit:cover;"></video>
        </div>
      `;
    }
    return `
      <div class="carousel-slide" onclick="handleCarouselSlideTap(event, '${product.id}')">
        <img src="${mediaUrl}" alt="${product.title}" loading="lazy">
      </div>
    `;
  }).join("");

  modal.innerHTML = `
    <button class="modal-close-cross" onclick="closeProductDetailModal()">&times;</button>
    <div style="display:flex; flex-direction:column; gap:16px;">
      
      <!-- Multi-photo/Video Touch Swipe Carousel -->
      <div class="modal-carousel-container" id="modalCarouselContainer">
        <div class="carousel-track" id="modalCarouselTrack">
          ${slidesHtml}
        </div>
        <!-- Modal Double-Tap Heart Burst -->
        <div class="heart-burst" id="modal-heart-burst">❤️</div>
        
        ${mediaList.length > 1 ? `
          <button class="carousel-nav-btn carousel-prev" onclick="prevDetailModalSlide()">&lang;</button>
          <button class="carousel-nav-btn carousel-next" onclick="nextDetailModalSlide()">&rang;</button>
          <span class="carousel-badge-counter" id="modalCarouselCounter">1 / ${mediaList.length}</span>
          <span class="carousel-swipe-hint">👈 Swipe to see more 👉</span>
        ` : ''}
      </div>

      <!-- Thumbnail switcher strip if multiple photos -->
      ${mediaList.length > 1 ? `
        <div class="modal-thumb-strip">
          ${mediaList.map((mediaUrl, i) => `
            <img src="${mediaUrl}" class="modal-thumb-img ${i === 0 ? 'active' : ''}" onclick="goToDetailModalSlide(${i})" alt="thumb">
          `).join("")}
        </div>
      ` : ''}

      <!-- Title & Metal Info -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-family:monospace; color:var(--maroon-primary); font-size:0.85rem; font-weight:700;">
            Code: ${product.itemCode}
          </span>
          <span style="font-size:0.75rem; background:var(--maroon-soft); color:var(--maroon-primary); padding:3px 10px; border-radius:var(--radius-full); font-weight:700; border:1px solid var(--maroon-border);">
            ${product.metal === 'GOLD' ? '🟡 22K Gold' : '⚪ ' + (product.metalPurity || '92.5') + ' Silver'}
          </span>
        </div>
        <h2 style="font-family:var(--font-serif); font-size:1.35rem; color:var(--text-main); font-weight:700; line-height:1.3;">
          ${product.title}
        </h2>
        <p style="font-size:0.82rem; color:var(--maroon-primary); font-weight:600; margin-top:4px;">
          ${product.mainCategory} ${product.subCategory ? '&bull; ' + product.subCategory : ''} ${product.subSubCategory ? '&bull; ' + product.subSubCategory : ''}
        </p>
      </div>

      <!-- Specs Box -->
      <div class="modal-specs-box">
        <div class="spec-cell">
          <span class="spec-label">Net Weight (ওজন)</span>
          <span class="spec-val">⚖️ ${product.netWeight} grams</span>
        </div>
        <div class="spec-cell">
          <span class="spec-label">Purity Standard</span>
          <span class="spec-val" style="color:var(--gold-dark);">
            ${product.metal === 'GOLD' ? '22K (916 Hallmark)' : (product.metalPurity === '92.5' ? '92.5 Hallmark' : '80.0 Traditional')}
          </span>
        </div>
        <div class="spec-cell">
          <span class="spec-label">Estimated Price (আনুমানিক মূল্য)</span>
          <span class="spec-val" style="color:var(--maroon-primary);">
            ${rateActive && priceInfo.displayable ? '₹ ' + priceInfo.price.toLocaleString('en-IN') : 'Contact for Live Price'}
          </span>
        </div>
        <div class="spec-cell">
          <span class="spec-label">Rate Validity</span>
          <span class="spec-val" style="font-size:0.85rem; color:${rateActive ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight:700;">
            ${rateActive ? '● Active Live Rate' : '● Rate Expired'}
          </span>
        </div>
      </div>

      <!-- Description -->
      ${product.description ? `
        <div style="font-size:0.88rem; color:var(--text-muted); line-height:1.6; background:var(--bg-elevated); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
          <strong style="color:var(--maroon-primary); display:block; margin-bottom:4px; font-size:0.8rem; text-transform:uppercase;">Product Details:</strong>
          ${product.description}
        </div>
      ` : ''}

      <!-- Direct Contact Actions (Tailored for Seniors/Mid-aged Users) -->
      <div class="modal-actions-row">
        <button class="btn-whatsapp-large" onclick="inquireOnWhatsApp('${product.id}')">
          <span>💬 Inquire on WhatsApp</span>
        </button>
        <a class="btn-call-large" href="tel:${phone}">
          <span>📞 Call Store</span>
        </a>
        <button class="btn-like-detail ${isLiked ? 'liked' : ''}" id="modalLikeBtn" onclick="toggleLike('${product.id}', event)">
          <span>${isLiked ? '❤️ Liked' : '🤍 Like Piece'}</span>
          <span style="font-size:0.8rem; opacity:0.8;">(${product.likes || 0})</span>
        </button>
      </div>

    </div>
  `;

  backdrop.classList.add("open");
  setupDetailModalSwipe();
}

function closeProductDetailModal() {
  const backdrop = document.getElementById("detailModalBackdrop");
  if (backdrop) backdrop.classList.remove("open");
}

// Touch Swipe Setup for Carousel
function setupDetailModalSwipe() {
  const container = document.getElementById("modalCarouselContainer");
  if (!container) return;

  let startX = 0;
  let startY = 0;
  let isSwiping = false;

  container.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length === 0) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
  }, { passive: true });

  container.addEventListener("touchend", (e) => {
    if (!isSwiping || !e.changedTouches || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const diffX = endX - startX;
    isSwiping = false;

    if (diffX < -35) {
      // Swiped Left -> Next slide
      nextDetailModalSlide();
    } else if (diffX > 35) {
      // Swiped Right -> Previous slide
      prevDetailModalSlide();
    }
  }, { passive: true });
}

function nextDetailModalSlide() {
  if (detailModalMediaList.length <= 1) return;
  detailModalActiveSlideIndex = (detailModalActiveSlideIndex + 1) % detailModalMediaList.length;
  updateDetailModalSlide();
}

function prevDetailModalSlide() {
  if (detailModalMediaList.length <= 1) return;
  detailModalActiveSlideIndex = (detailModalActiveSlideIndex - 1 + detailModalMediaList.length) % detailModalMediaList.length;
  updateDetailModalSlide();
}

function goToDetailModalSlide(index) {
  detailModalActiveSlideIndex = index;
  updateDetailModalSlide();
}

function updateDetailModalSlide() {
  const track = document.getElementById("modalCarouselTrack");
  const counter = document.getElementById("modalCarouselCounter");
  if (track) {
    track.style.transform = `translateX(-${detailModalActiveSlideIndex * 100}%)`;
  }
  if (counter) {
    counter.textContent = `${detailModalActiveSlideIndex + 1} / ${detailModalMediaList.length}`;
  }
  document.querySelectorAll(".modal-thumb-img").forEach((thumb, i) => {
    thumb.classList.toggle("active", i === detailModalActiveSlideIndex);
  });
}

// ==========================================
// DEDICATED SEARCH PAGE VIEW LOGIC
// (Only search bar is shown until something is searched)
// ==========================================
function switchMainView(view) {
  const homeView = document.getElementById("homePageView") || document.getElementById("cataloguePageView");
  const searchView = document.getElementById("searchPageView");
  const dockHome = document.getElementById("dockBtnHome");
  const dockSearch = document.getElementById("dockBtnSearch");

  // Toggle back to home if tapping search while already in search
  if (view === "search" && searchView && searchView.style.display === "block") {
    view = "home";
  }

  if (view === "search") {
    if (homeView) homeView.style.display = "none";
    if (searchView) searchView.style.display = "block";
    if (dockHome) dockHome.classList.remove("active");
    if (dockSearch) dockSearch.classList.add("active");

    const searchInput = document.getElementById("dedicatedSearchInput");
    if (searchInput) {
      searchInput.focus();
      onDedicatedSearchInput(searchInput.value);
    }
  } else {
    // 'home'
    if (homeView) homeView.style.display = "block";
    if (searchView) searchView.style.display = "none";
    if (dockHome) dockHome.classList.add("active");
    if (dockSearch) dockSearch.classList.remove("active");

    // Return to neutral options-only view
    resetWizardAndReturnHome();
  }
}

function onDedicatedSearchInput(query) {
  const q = (query || "").trim().toLowerCase();
  const promptState = document.getElementById("searchPromptState");
  const resultsGrid = document.getElementById("searchResultsGrid");

  if (!resultsGrid || !promptState) return;

  if (!q) {
    // Show only the search bar and prompt until something is searched
    promptState.style.display = "block";
    resultsGrid.style.display = "none";
    resultsGrid.innerHTML = "";
    return;
  }

  promptState.style.display = "none";
  resultsGrid.style.display = "grid";

  // Search across ALL jewellery items (both gold & silver)
  const matching = products.filter(p => 
    (p.itemCode && p.itemCode.toLowerCase().includes(q)) ||
    (p.title && p.title.toLowerCase().includes(q)) ||
    (p.mainCategory && p.mainCategory.toLowerCase().includes(q)) ||
    (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
    (p.subSubCategory && p.subSubCategory.toLowerCase().includes(q)) ||
    (p.description && p.description.toLowerCase().includes(q))
  );

  if (matching.length === 0) {
    resultsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
        <h4 style="font-size: 1.15rem; color: var(--text-main);">No matching jewellery found</h4>
        <p style="font-size: 0.85rem; margin-top: 4px;">Try searching for "Gold", "Necklace", "Haar", "Bangle", "Ring", or item code.</p>
      </div>
    `;
    return;
  }

  renderGridView(matching, resultsGrid);
}

function clearDedicatedSearch() {
  const input = document.getElementById("dedicatedSearchInput");
  if (input) {
    input.value = "";
    input.focus();
  }
  onDedicatedSearchInput("");
}

function closeProductDetailModal() {
  const backdrop = document.getElementById("detailModalBackdrop");
  if (backdrop) backdrop.classList.remove("open");
}

// ==========================================
// MANAGER PORTAL & PIN LOGIC (PIN: 1958)
// ==========================================
let enteredPin = "";

function triggerManagerLogin() {
  enteredPin = "";
  updatePinDisplay();
  const backdrop = document.getElementById("pinModalBackdrop");
  if (backdrop) backdrop.classList.add("open");
}

function closePinModal() {
  const backdrop = document.getElementById("pinModalBackdrop");
  if (backdrop) backdrop.classList.remove("open");
  enteredPin = "";
}

function pressKey(num) {
  if (enteredPin.length < 4) {
    enteredPin += num;
    updatePinDisplay();
    if (enteredPin.length === 4) {
      setTimeout(verifyPin, 150);
    }
  }
}

function deleteKey() {
  if (enteredPin.length > 0) {
    enteredPin = enteredPin.slice(0, -1);
    updatePinDisplay();
  }
}

function updatePinDisplay() {
  for (let i = 0; i < 4; i++) {
    const box = document.getElementById(`pin-box-${i}`);
    if (box) {
      if (i < enteredPin.length) {
        box.textContent = "•";
        box.classList.add("filled");
      } else {
        box.textContent = "";
        box.classList.remove("filled");
      }
    }
  }
}

function verifyPin() {
  const targetPin = storeConfig.pin || "1958";
  if (enteredPin === targetPin) {
    closePinModal();
    openManagerPortal();
    showToast("Welcome to Manager's Portal!");
  } else {
    const card = document.getElementById("managerPinCard");
    if (card) {
      card.classList.add("shake");
      setTimeout(() => card.classList.remove("shake"), 400);
    }
    showToast("Incorrect PIN. Please try again.");
    enteredPin = "";
    updatePinDisplay();
  }
}

function openManagerPortal() {
  const portal = document.getElementById("managerPortalBackdrop");
  if (portal) {
    portal.classList.add("open");
    switchPortalTab("addProduct");
    updatePortalCountdown();
  }
}

function closeManagerPortal() {
  const portal = document.getElementById("managerPortalBackdrop");
  if (portal) portal.classList.remove("open");
}

function switchPortalTab(tabName) {
  document.querySelectorAll(".portal-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  const body = document.getElementById("portalBody");
  if (!body) return;

  if (tabName === "addProduct") {
    renderAddProductTab(body);
  } else if (tabName === "metals") {
    renderMetalsTab(body);
  } else if (tabName === "categories") {
    renderCategoriesTab(body);
  } else if (tabName === "products") {
    renderProductsListTab(body);
  } else if (tabName === "insights") {
    renderInsightsTab(body);
  } else if (tabName === "others") {
    renderOthersTab(body);
  }
}

// TAB 1: ADD PRODUCT
function renderAddProductTab(container) {
  const nextItemCode = generateUniqueItemCode("GOLD");

  container.innerHTML = `
    <div>
      <h3 style="font-family:var(--font-serif); color:var(--gold-bright); margin-bottom:14px;">Add New Jewellery Piece</h3>
      
      <form id="addProductForm" onsubmit="handleProductSubmit(event)">
        <div class="form-grid">
          
          <div class="form-group">
            <label class="form-label">Metal Type <span class="req">*</span></label>
            <select class="form-select" id="newProdMetal" onchange="onAddProductMetalChange(this.value)" required>
              <option value="GOLD" selected>Gold</option>
              <option value="SILVER">Silver</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Item Code <span class="req">*</span></label>
            <div style="display:flex; gap:6px;">
              <input type="text" class="form-input" id="newProdItemCode" value="${nextItemCode}" required>
              <button type="button" class="btn-secondary" onclick="regenerateItemCode()" title="Regenerate Code">🔄</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Main Category <span class="req">*</span></label>
            <select class="form-select" id="newProdMainCat" onchange="onAddProductMainCatChange(this.value)" required>
              <!-- Filled dynamically -->
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Sub-Category</label>
            <select class="form-select" id="newProdSubCat" onchange="onAddProductSubCatChange(this.value)">
              <option value="">None / Not Applicable</option>
            </select>
          </div>

          <div class="form-group" id="subSubCatGroup" style="display:none;">
            <label class="form-label">Sub-Sub Category (e.g. Rani Haar)</label>
            <select class="form-select" id="newProdSubSubCat">
              <option value="">None</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Product Title <span class="req">*</span></label>
            <input type="text" class="form-input" id="newProdTitle" placeholder="e.g. Traditional Peacock Jhumka" required>
          </div>

          <div class="form-group">
            <label class="form-label">Product Net Weight (Grams) <span class="req">*</span></label>
            <input type="number" step="0.01" class="form-input" id="newProdWeight" placeholder="e.g. 14.50" required>
          </div>

          <div class="form-group">
            <label class="form-label">Pricing System <span class="req">*</span></label>
            <select class="form-select" id="newProdPricingSystem" onchange="onPricingSystemChange(this.value)" required>
              <option value="floating" selected>Floating Pricing System (Changes with live metal rates)</option>
              <option value="fixed">Fixed Price / Thouko (Price never changes)</option>
            </select>
            <small style="font-size:0.68rem; color:var(--text-dim);">*Note: Customers will never see internal formula or 'Thouko' label.</small>
          </div>

          <!-- Fixed Price Input (Thouko) -->
          <div class="form-group" id="fixedPriceGroup" style="display:none;">
            <label class="form-label">Fixed Total Price (₹) <span class="req">*</span></label>
            <input type="number" step="1" class="form-input" id="newProdFixedPrice" placeholder="e.g. 45000">
          </div>

          <!-- Floating Pricing Fields -->
          <div class="form-group" id="floatingPurityGroup">
            <label class="form-label">Metal Purity Rate To Follow</label>
            <select class="form-select" id="newProdPurity">
              <option value="22k">Gold Standard 22K</option>
              <option value="92.5">Silver 92.50 (Hallmarked Rate)</option>
              <option value="80.0">Silver 80.00 (Below Hallmarked Rate)</option>
            </select>
          </div>

          <div class="form-group" id="floatingMakingTypeGroup">
            <label class="form-label">Making Charge Type</label>
            <select class="form-select" id="newProdMakingType">
              <option value="percent">Percentage of Metal Value (%)</option>
              <option value="fixed_per_gram">Fixed Making Charge per Gram (₹/g)</option>
            </select>
          </div>

          <div class="form-group" id="floatingMakingValGroup">
            <label class="form-label">Making Charge Value</label>
            <input type="number" step="0.1" class="form-input" id="newProdMakingValue" value="12" placeholder="e.g. 12 (%) or 450 (₹/g)">
          </div>

          <!-- Display Options on Front Page -->
          <div class="form-group">
            <label class="form-label">Front Page Customer Display <span class="req">*</span></label>
            <select class="form-select" id="newProdDisplayPref" required>
              <option value="both" selected>Show Both (Approx Weight & Approx Price)</option>
              <option value="weight">Show Approximate Weight Only</option>
              <option value="price">Show Approximate Price Only</option>
              <option value="none">Show None (Images and Title Only)</option>
            </select>
            <small style="font-size:0.68rem; color:var(--text-dim);">Prices only show if updated within 48 hours.</small>
          </div>

        </div>

        <!-- Images Section -->
        <div style="background:var(--bg-card); padding:16px; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.08); margin-bottom:16px;">
          <h4 style="font-size:0.85rem; color:var(--gold-bright); margin-bottom:10px;">Product Photos / Media (Multiple Supported)</h4>
          
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div>
              <label class="form-label">Upload Photo Files</label>
              <input type="file" id="newProdFileUploader" accept="image/*,video/*" multiple class="form-input" onchange="handleFileMediaUpload(event)">
            </div>
            
            <div>
              <label class="form-label">Or Add Image URLs (comma separated)</label>
              <input type="text" id="newProdImageUrls" class="form-input" placeholder="https://images.unsplash.com/photo-..., https://...">
            </div>

            <!-- Previews -->
            <div id="mediaPreviews" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;"></div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">Description (Optional)</label>
          <textarea class="form-textarea" id="newProdDesc" rows="2" placeholder="Handcrafted with filigree details..."></textarea>
        </div>

        <button type="submit" class="btn-primary" style="width:100%; padding:14px;">
          ✨ Add Product to Catalogue
        </button>
      </form>
    </div>
  `;

  // Initialize category cascades
  onAddProductMetalChange("GOLD");
}

let stagedMediaUrls = [];

function handleFileMediaUpload(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      stagedMediaUrls.push(event.target.result);
      renderMediaPreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderMediaPreviews() {
  const container = document.getElementById("mediaPreviews");
  if (!container) return;

  container.innerHTML = stagedMediaUrls.map((url, i) => `
    <div style="position:relative; width:60px; height:60px; border-radius:6px; overflow:hidden; border:1px solid var(--gold-border);">
      <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
      <span onclick="removeStagedMedia(${i})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.7); color:#fff; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; font-size:10px; cursor:pointer;">&times;</span>
    </div>
  `).join("");
}

function removeStagedMedia(index) {
  stagedMediaUrls.splice(index, 1);
  renderMediaPreviews();
}

function generateUniqueItemCode(metal) {
  const prefix = metal === "GOLD" ? "MJW-GLD" : "MJW-SLV";
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${rand}`;
}

function regenerateItemCode() {
  const metal = document.getElementById("newProdMetal").value;
  document.getElementById("newProdItemCode").value = generateUniqueItemCode(metal);
}

function onAddProductMetalChange(metal) {
  const mainCatSelect = document.getElementById("newProdMainCat");
  const puritySelect = document.getElementById("newProdPurity");
  if (!mainCatSelect) return;

  // Populate Main Categories based on tree
  const tree = categoryTree[metal];
  const categories = Object.keys(tree);

  mainCatSelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");
  
  if (puritySelect) {
    if (metal === "GOLD") {
      puritySelect.innerHTML = `<option value="22k" selected>Gold Standard 22K</option>`;
    } else {
      puritySelect.innerHTML = `
        <option value="92.5" selected>Silver 92.50 (Hallmarked Rate)</option>
        <option value="80.0">Silver 80.00 (Below Hallmarked Rate)</option>
      `;
    }
  }

  onAddProductMainCatChange(categories[0]);
}

function onAddProductMainCatChange(mainCat) {
  const metal = document.getElementById("newProdMetal").value;
  const subCatSelect = document.getElementById("newProdSubCat");
  const subSubGroup = document.getElementById("subSubCatGroup");
  if (!subCatSelect) return;

  const node = categoryTree[metal][mainCat];

  if (Array.isArray(node) && node.length > 0) {
    subCatSelect.innerHTML = `<option value="">Select Sub-Category</option>` + node.map(s => `<option value="${s}">${s}</option>`).join("");
    subCatSelect.style.display = "block";
    if (subSubGroup) subSubGroup.style.display = "none";
  } else if (typeof node === "object" && node !== null && !Array.isArray(node)) {
    const keys = Object.keys(node);
    subCatSelect.innerHTML = `<option value="">Select Sub-Category</option>` + keys.map(k => `<option value="${k}">${k}</option>`).join("");
    subCatSelect.style.display = "block";
    onAddProductSubCatChange(keys[0]);
  } else {
    // Miscellaneous or Puja items
    subCatSelect.innerHTML = `<option value="">Direct Showcase / No Sub-Category</option>`;
    if (subSubGroup) subSubGroup.style.display = "none";
  }
}

function onAddProductSubCatChange(subCat) {
  const metal = document.getElementById("newProdMetal").value;
  const mainCat = document.getElementById("newProdMainCat").value;
  const subSubGroup = document.getElementById("subSubCatGroup");
  const subSubSelect = document.getElementById("newProdSubSubCat");

  const node = categoryTree[metal][mainCat];
  if (typeof node === "object" && node !== null && !Array.isArray(node) && node[subCat] && Array.isArray(node[subCat]) && node[subCat].length > 0) {
    subSubGroup.style.display = "block";
    subSubSelect.innerHTML = `<option value="">None / All</option>` + node[subCat].map(item => `<option value="${item}">${item}</option>`).join("");
  } else {
    if (subSubGroup) subSubGroup.style.display = "none";
  }
}

function onPricingSystemChange(val) {
  const fixedGroup = document.getElementById("fixedPriceGroup");
  const floatingPurity = document.getElementById("floatingPurityGroup");
  const floatingType = document.getElementById("floatingMakingTypeGroup");
  const floatingVal = document.getElementById("floatingMakingValGroup");

  if (val === "fixed") {
    fixedGroup.style.display = "block";
    floatingPurity.style.display = "none";
    floatingType.style.display = "none";
    floatingVal.style.display = "none";
  } else {
    fixedGroup.style.display = "none";
    floatingPurity.style.display = "block";
    floatingType.style.display = "block";
    floatingVal.style.display = "block";
  }
}

function handleProductSubmit(e) {
  e.preventDefault();

  const metal = document.getElementById("newProdMetal").value;
  const itemCode = document.getElementById("newProdItemCode").value.trim();
  const mainCategory = document.getElementById("newProdMainCat").value;
  const subCategory = document.getElementById("newProdSubCat").value;
  const subSubCategory = document.getElementById("newProdSubSubCat") ? document.getElementById("newProdSubSubCat").value : "";
  const title = document.getElementById("newProdTitle").value.trim();
  const netWeight = parseFloat(document.getElementById("newProdWeight").value) || 0;
  const pricingSystem = document.getElementById("newProdPricingSystem").value;
  const fixedPrice = parseFloat(document.getElementById("newProdFixedPrice").value) || 0;
  const metalPurity = document.getElementById("newProdPurity").value;
  const makingChargeType = document.getElementById("newProdMakingType").value;
  const makingChargeValue = parseFloat(document.getElementById("newProdMakingValue").value) || 0;
  const displayPreference = document.getElementById("newProdDisplayPref").value;
  const description = document.getElementById("newProdDesc").value.trim();

  // Combine media
  const urlInput = document.getElementById("newProdImageUrls").value.trim();
  let mediaList = [...stagedMediaUrls];
  if (urlInput) {
    const urls = urlInput.split(",").map(u => u.trim()).filter(Boolean);
    mediaList.push(...urls);
  }

  if (mediaList.length === 0) {
    // Default fallback
    mediaList.push("https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80");
  }

  const newProduct = {
    id: itemCode,
    itemCode,
    title,
    metal,
    metalPurity,
    mainCategory,
    subCategory,
    subSubCategory,
    netWeight,
    pricingSystem,
    fixedPrice,
    makingChargeType,
    makingChargeValue,
    displayPreference,
    images: mediaList,
    likes: 0,
    views: 0,
    createdAt: new Date().toISOString(),
    description
  };

  products.unshift(newProduct);
  saveProducts();

  showToast(`Product "${title}" (${itemCode}) added successfully!`);
  stagedMediaUrls = [];
  applyFiltersAndRender();
  switchPortalTab("products");
}

// TAB 2: METALS PRICING
function renderMetalsTab(container) {
  const rates = storeConfig.metalRates;
  const timeInfo = getRateRemainingTime();
  const lastUpdatedDate = new Date(rates.lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  container.innerHTML = `
    <div>
      <h3 style="font-family:var(--font-serif); color:var(--gold-bright); margin-bottom:12px;">Metals & Finished Product Pricing</h3>

      <!-- 48h Countdown Status Box -->
      <div class="rate-countdown-box">
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted); display:block;">48-Hour Rate Countdown Status</span>
          <div class="countdown-timer-text ${timeInfo.active ? '' : 'expired'}" id="portalCountdownTimer">
            ${timeInfo.active ? timeInfo.text : 'EXPIRED (Prices Hidden from Customers)'}
          </div>
          <small style="font-size:0.7rem; color:var(--text-dim);">Last Updated: ${lastUpdatedDate}</small>
        </div>
        <button class="btn-primary" onclick="updateMetalRatesTimestampNow()">
          🔄 Reset 48h Clock to Now
        </button>
      </div>

      <!-- Pricing Form -->
      <form onsubmit="handleSaveMetalRates(event)">
        <h4 style="font-size:0.9rem; color:var(--gold-bright); margin-bottom:10px;">1. Standard Rates of Metals</h4>
        
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Gold Standard 22K Rate (₹ / Gram) <span class="req">*</span></label>
            <input type="number" step="1" id="metalGold22k" class="form-input" value="${rates.gold22k}" required>
            <small style="color:var(--text-dim); font-size:0.7rem;">(Equivalent to ₹${(rates.gold22k * 10).toLocaleString('en-IN')} per 10 grams)</small>
          </div>

          <div class="form-group">
            <label class="form-label">Silver 92.50 Rate (Hallmarked ₹ / Gram) <span class="req">*</span></label>
            <input type="number" step="0.5" id="metalSilver925" class="form-input" value="${rates.silver925}" required>
            <small style="color:var(--text-dim); font-size:0.7rem;">(Equivalent to ₹${(rates.silver925 * 10).toLocaleString('en-IN')} per 10 grams)</small>
          </div>

          <div class="form-group">
            <label class="form-label">Silver 80.00 Rate (Below Hallmarked ₹ / Gram) <span class="req">*</span></label>
            <input type="number" step="0.5" id="metalSilver800" class="form-input" value="${rates.silver800}" required>
            <small style="color:var(--text-dim); font-size:0.7rem;">(Equivalent to ₹${(rates.silver800 * 10).toLocaleString('en-IN')} per 10 grams)</small>
          </div>
        </div>

        <h4 style="font-size:0.9rem; color:var(--gold-bright); margin:18px 0 10px;">2. Pricing of Finished Products (Default Floating Making Charges)</h4>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">
          Applied to products using the floating pricing system. Individual products can still have custom making charges.
        </p>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Default Gold Making Charge Type</label>
            <select id="defaultGoldMakingType" class="form-select">
              <option value="percent" ${rates.defaultGoldMakingType === 'percent' ? 'selected' : ''}>Percentage (%) of Gold Value</option>
              <option value="fixed_per_gram" ${rates.defaultGoldMakingType === 'fixed_per_gram' ? 'selected' : ''}>Fixed Price per Gram (₹/g)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Default Gold Making Value</label>
            <input type="number" step="0.1" id="defaultGoldMakingValue" class="form-input" value="${rates.defaultGoldMakingValue}">
          </div>

          <div class="form-group">
            <label class="form-label">Default Silver Making Charge Type</label>
            <select id="defaultSilverMakingType" class="form-select">
              <option value="percent" ${rates.defaultSilverMakingType === 'percent' ? 'selected' : ''}>Percentage (%) of Silver Value</option>
              <option value="fixed_per_gram" ${rates.defaultSilverMakingType === 'fixed_per_gram' ? 'selected' : ''}>Fixed Price per Gram (₹/g)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Default Silver Making Value</label>
            <input type="number" step="0.1" id="defaultSilverMakingValue" class="form-input" value="${rates.defaultSilverMakingValue}">
          </div>
        </div>

        <button type="submit" class="btn-primary" style="margin-top:14px; padding:12px 24px;">
          💾 Save & Update All Metal Rates
        </button>
      </form>
    </div>
  `;
}

function updatePortalCountdown() {
  const el = document.getElementById("portalCountdownTimer");
  if (!el) return;
  const timeInfo = getRateRemainingTime();
  el.textContent = timeInfo.active ? timeInfo.text : "EXPIRED (Prices Hidden from Customers)";
  el.className = `countdown-timer-text ${timeInfo.active ? '' : 'expired'}`;
}

function updateMetalRatesTimestampNow() {
  storeConfig.metalRates.lastUpdated = new Date().toISOString();
  saveStoreConfig();
  showToast("Rates updated! 48-hour clock reset to 48 hours remaining.");
  switchPortalTab("metals");
  applyFiltersAndRender();
}

function handleSaveMetalRates(e) {
  e.preventDefault();

  storeConfig.metalRates.gold22k = parseFloat(document.getElementById("metalGold22k").value) || 7200;
  storeConfig.metalRates.silver925 = parseFloat(document.getElementById("metalSilver925").value) || 95;
  storeConfig.metalRates.silver800 = parseFloat(document.getElementById("metalSilver800").value) || 80;
  storeConfig.metalRates.defaultGoldMakingType = document.getElementById("defaultGoldMakingType").value;
  storeConfig.metalRates.defaultGoldMakingValue = parseFloat(document.getElementById("defaultGoldMakingValue").value) || 12;
  storeConfig.metalRates.defaultSilverMakingType = document.getElementById("defaultSilverMakingType").value;
  storeConfig.metalRates.defaultSilverMakingValue = parseFloat(document.getElementById("defaultSilverMakingValue").value) || 25;
  storeConfig.metalRates.lastUpdated = new Date().toISOString();

  saveStoreConfig();
  showToast("All metal rates updated and saved successfully!");
  applyFiltersAndRender();
  switchPortalTab("metals");
}

// TAB 3: MANAGE CATEGORIES & SUB-CATEGORIES
function renderCategoriesTab(container) {
  container.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
        <h3 style="font-family:var(--font-serif); color:var(--gold-bright);">Manage Categories & Sub-Categories</h3>
        <button class="btn-secondary" onclick="promptAddCategory()">➕ Add Category / Sub-Category</button>
      </div>

      <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:16px;">
        Add, reorganize, or remove categories from your catalogue tree hierarchy.
      </p>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
        <!-- Gold Tree -->
        <div style="background:var(--bg-card); padding:14px; border-radius:var(--radius-md); border:1px solid rgba(212,175,55,0.2);">
          <h4 style="color:var(--gold-bright); margin-bottom:10px;">✨ GOLD CATEGORIES</h4>
          <div id="goldCategoryTreeManager"></div>
        </div>

        <!-- Silver Tree -->
        <div style="background:var(--bg-card); padding:14px; border-radius:var(--radius-md); border:1px solid rgba(196,203,212,0.2);">
          <h4 style="color:var(--silver-primary); margin-bottom:10px;">✨ SILVER CATEGORIES</h4>
          <div id="silverCategoryTreeManager"></div>
        </div>
      </div>
    </div>
  `;

  renderManagerTreeNodes("GOLD", document.getElementById("goldCategoryTreeManager"));
  renderManagerTreeNodes("SILVER", document.getElementById("silverCategoryTreeManager"));
}

function renderManagerTreeNodes(metal, container) {
  if (!container) return;
  const tree = categoryTree[metal];

  let html = "";
  Object.keys(tree).forEach(mainCat => {
    const val = tree[mainCat];
    html += `
      <div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:600; font-size:0.85rem;">
          <span>${mainCat}</span>
          <button class="btn-danger" style="padding:2px 6px; font-size:0.65rem;" onclick="deleteMainCategory('${metal}', '${mainCat}')">Delete</button>
        </div>
    `;

    if (Array.isArray(val)) {
      html += `<div style="margin-left:12px; margin-top:4px; display:flex; flex-direction:column; gap:4px;">`;
      val.forEach((sub, idx) => {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
            <span>• ${sub}</span>
            <span style="color:#ff6b77; cursor:pointer;" onclick="deleteSubItem('${metal}', '${mainCat}', ${idx})">&times;</span>
          </div>
        `;
      });
      html += `</div>`;
    } else if (typeof val === "object" && val !== null) {
      html += `<div style="margin-left:12px; margin-top:4px;">`;
      Object.keys(val).forEach(subTitle => {
        html += `
          <div style="font-size:0.78rem; color:var(--gold-bright); margin-top:4px;">📁 ${subTitle}</div>
        `;
        if (Array.isArray(val[subTitle])) {
          val[subTitle].forEach((subSub, sIdx) => {
            html += `
              <div style="margin-left:12px; display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-dim);">
                <span>└ ${subSub}</span>
                <span style="color:#ff6b77; cursor:pointer;" onclick="deleteSubSubItem('${metal}', '${mainCat}', '${subTitle}', ${sIdx})">&times;</span>
              </div>
            `;
          });
        }
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  container.innerHTML = html;
}

function deleteMainCategory(metal, mainCat) {
  if (confirm(`Are you sure you want to delete category "${mainCat}" from ${metal}?`)) {
    delete categoryTree[metal][mainCat];
    saveCategoryTree();
    switchPortalTab("categories");
    showToast(`Category "${mainCat}" deleted.`);
  }
}

function deleteSubItem(metal, mainCat, index) {
  categoryTree[metal][mainCat].splice(index, 1);
  saveCategoryTree();
  switchPortalTab("categories");
  showToast("Sub-category removed.");
}

function deleteSubSubItem(metal, mainCat, subTitle, index) {
  categoryTree[metal][mainCat][subTitle].splice(index, 1);
  saveCategoryTree();
  switchPortalTab("categories");
  showToast("Sub-category item removed.");
}

function promptAddCategory() {
  const metal = prompt("Enter metal (GOLD or SILVER):", "GOLD");
  if (!metal || (metal.toUpperCase() !== "GOLD" && metal.toUpperCase() !== "SILVER")) {
    alert("Please enter GOLD or SILVER.");
    return;
  }
  const m = metal.toUpperCase();

  const mainCat = prompt(`Enter Main Category name for ${m} (e.g. FOR WOMEN or KIDS COLLECTION):`);
  if (!mainCat) return;

  if (!categoryTree[m][mainCat]) {
    const isList = confirm("Will this category hold a simple list of sub-items? (Click OK for simple list, Cancel for nested group)");
    categoryTree[m][mainCat] = isList ? [] : {};
  }

  const subItem = prompt(`Enter subcategory to add inside "${mainCat}" (or leave blank):`);
  if (subItem) {
    if (Array.isArray(categoryTree[m][mainCat])) {
      categoryTree[m][mainCat].push(subItem);
    } else {
      categoryTree[m][mainCat][subItem] = [];
    }
  }

  saveCategoryTree();
  switchPortalTab("categories");
  showToast("Category structure updated!");
}

// TAB 4: PRODUCTS MANAGER (Search, Edit, Delete)
function renderProductsListTab(container) {
  container.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:10px; flex-wrap:wrap;">
        <h3 style="font-family:var(--font-serif); color:var(--gold-bright);">Products Catalogue (${products.length})</h3>
        
        <div style="display:flex; gap:8px;">
          <input type="text" id="portalProdSearch" placeholder="Search by Code or Title..." class="form-input" style="width:240px;" oninput="filterPortalProducts(this.value)">
          <button class="btn-primary" onclick="switchPortalTab('addProduct')">➕ Add Product</button>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
          <thead>
            <tr style="border-bottom:1px solid rgba(212,175,55,0.3); color:var(--gold-bright);">
              <th style="padding:8px;">Item</th>
              <th style="padding:8px;">Code</th>
              <th style="padding:8px;">Metal</th>
              <th style="padding:8px;">Category</th>
              <th style="padding:8px;">Net Wt</th>
              <th style="padding:8px;">Pricing Type</th>
              <th style="padding:8px;">Likes / Views</th>
              <th style="padding:8px;">Actions</th>
            </tr>
          </thead>
          <tbody id="portalProductsTableBody">
            <!-- Rendered by filterPortalProducts -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  filterPortalProducts("");
}

function filterPortalProducts(query) {
  const tbody = document.getElementById("portalProductsTableBody");
  if (!tbody) return;

  const q = (query || "").toLowerCase();
  const filtered = products.filter(p => 
    !q || p.itemCode.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">No matching products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
      <td style="padding:8px; display:flex; align-items:center; gap:8px;">
        <img src="${p.images[0]}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;">
        <span style="font-weight:600; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.title}</span>
      </td>
      <td style="padding:8px; font-family:monospace; color:var(--gold-bright);">${p.itemCode}</td>
      <td style="padding:8px;">${p.metal}</td>
      <td style="padding:8px;">${p.mainCategory} &bull; ${p.subCategory || '-'}</td>
      <td style="padding:8px;">${p.netWeight} g</td>
      <td style="padding:8px;">${p.pricingSystem === 'fixed' ? 'Fixed (Thouko)' : 'Floating Rate'}</td>
      <td style="padding:8px;">❤️ ${p.likes || 0} / 👁️ ${p.views || 0}</td>
      <td style="padding:8px;">
        <button class="btn-secondary" style="padding:3px 8px; font-size:0.7rem; margin-right:4px;" onclick="openEditProductModal('${p.id}')">Edit</button>
        <button class="btn-danger" style="padding:3px 8px; font-size:0.7rem;" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function deleteProduct(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  if (confirm(`Are you sure you want to delete product "${prod.title}" (${prod.itemCode})?`)) {
    products = products.filter(p => p.id !== productId);
    saveProducts();
    showToast(`Product ${prod.itemCode} deleted.`);
    filterPortalProducts(document.getElementById("portalProdSearch") ? document.getElementById("portalProdSearch").value : "");
    applyFiltersAndRender();
  }
}

// Edit Product Modal
function openEditProductModal(productId) {
  const p = products.find(prod => prod.id === productId);
  if (!p) return;

  const title = prompt("Edit Title:", p.title);
  if (title === null) return;
  p.title = title.trim();

  const weight = prompt("Edit Net Weight in grams:", p.netWeight);
  if (weight !== null) p.netWeight = parseFloat(weight) || p.netWeight;

  const display = prompt("Edit Front Display (both, weight, price, none):", p.displayPreference);
  if (display && ["both", "weight", "price", "none"].includes(display)) {
    p.displayPreference = display;
  }

  saveProducts();
  showToast(`Product ${p.itemCode} updated.`);
  filterPortalProducts("");
  applyFiltersAndRender();
}

// TAB 5: INSIGHTS & ANALYTICS
function renderInsightsTab(container) {
  const totalLikes = products.reduce((acc, p) => acc + (p.likes || 0), 0);
  const totalViews = products.reduce((acc, p) => acc + (p.views || 0), 0);

  // Top products
  const topLiked = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);
  const topViewed = [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  container.innerHTML = `
    <div>
      <h3 style="font-family:var(--font-serif); color:var(--gold-bright); margin-bottom:14px;">Store Insights & Customer Engagement</h3>

      <!-- Stats Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
        <div style="background:var(--bg-card); padding:16px; border-radius:var(--radius-md); border:1px solid rgba(212,175,55,0.2);">
          <span style="font-size:0.75rem; color:var(--text-muted);">Total Catalogue Items</span>
          <h2 style="color:var(--gold-bright); font-size:1.8rem; margin-top:4px;">${products.length}</h2>
        </div>
        <div style="background:var(--bg-card); padding:16px; border-radius:var(--radius-md); border:1px solid rgba(255,51,102,0.2);">
          <span style="font-size:0.75rem; color:var(--text-muted);">Total Customer Likes</span>
          <h2 style="color:var(--accent-heart); font-size:1.8rem; margin-top:4px;">❤️ ${totalLikes}</h2>
        </div>
        <div style="background:var(--bg-card); padding:16px; border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.1);">
          <span style="font-size:0.75rem; color:var(--text-muted);">Total Catalogue Views</span>
          <h2 style="color:#fff; font-size:1.8rem; margin-top:4px;">👁️ ${totalViews}</h2>
        </div>
      </div>

      <!-- Top Liked / Top Viewed -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
        <!-- Top Liked -->
        <div style="background:var(--bg-card); padding:14px; border-radius:var(--radius-md);">
          <h4 style="color:var(--accent-heart); margin-bottom:10px;">🔥 Top 5 Most Liked Pieces</h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${topLiked.map(item => `
              <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.78rem;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <img src="${item.images[0]}" style="width:30px; height:30px; border-radius:4px; object-fit:cover;">
                  <span style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.title}</span>
                </div>
                <strong style="color:var(--accent-heart);">❤️ ${item.likes || 0}</strong>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Top Viewed -->
        <div style="background:var(--bg-card); padding:14px; border-radius:var(--radius-md);">
          <h4 style="color:var(--gold-bright); margin-bottom:10px;">🌟 Top 5 Most Viewed Pieces</h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${topViewed.map(item => `
              <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.78rem;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <img src="${item.images[0]}" style="width:30px; height:30px; border-radius:4px; object-fit:cover;">
                  <span style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.title}</span>
                </div>
                <strong style="color:var(--gold-glow);">👁️ ${item.views || 0}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

    </div>
  `;
}

// TAB 6: OTHERS (Logo, PIN, GitHub Pages Export)
function renderOthersTab(container) {
  container.innerHTML = `
    <div>
      <h3 style="font-family:var(--font-serif); color:var(--gold-bright); margin-bottom:14px;">Store Settings & GitHub Pages Deployment</h3>

      <!-- Change Logo & Name -->
      <div style="background:var(--bg-card); padding:16px; border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.08); margin-bottom:16px;">
        <h4 style="font-size:0.9rem; color:var(--gold-bright); margin-bottom:10px;">Store Branding</h4>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Store Name</label>
            <input type="text" id="settingStoreName" class="form-input" value="${storeConfig.storeName}">
          </div>
          <div class="form-group">
            <label class="form-label">Customer WhatsApp / Call Number (with country code)</label>
            <input type="text" id="settingWhatsApp" class="form-input" value="${storeConfig.whatsappNumber || '919874126698'}">
          </div>
        </div>

        <div style="margin-top:10px;">
          <label class="form-label">Custom Store Logo</label>
          <div style="display:flex; align-items:center; gap:12px; margin-top:6px;">
            <img id="currentLogoPreview" src="${storeConfig.logoUrl}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:1px solid var(--gold-primary);">
            <input type="file" id="logoUploadInput" accept="image/*" class="form-input" onchange="handleLogoUpload(event)">
          </div>
        </div>

        <button class="btn-primary" style="margin-top:14px;" onclick="saveBrandingSettings()">Save Branding</button>
      </div>

      <!-- Update PIN -->
      <div style="background:var(--bg-card); padding:16px; border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.08); margin-bottom:16px;">
        <h4 style="font-size:0.9rem; color:var(--gold-bright); margin-bottom:10px;">Manager Portal Security (PIN)</h4>
        <div style="max-width:300px;">
          <div class="form-group">
            <label class="form-label">New 4-Digit Security PIN</label>
            <input type="password" maxlength="4" id="settingNewPin" class="form-input" placeholder="Current: ${storeConfig.pin}">
          </div>
          <button class="btn-secondary" style="margin-top:10px;" onclick="updateManagerPin()">Update PIN</button>
        </div>
      </div>

      <!-- GitHub Pages Deployment Section as Requested -->
      <div style="background:linear-gradient(135deg, rgba(46,164,79,0.1), rgba(20,19,17,0.9)); padding:20px; border-radius:var(--radius-md); border:1px solid rgba(46,164,79,0.4); margin-bottom:16px;">
        <h4 style="color:#2ea44f; font-size:1.05rem; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
          🚀 How to Publish on GitHub Pages
        </h4>
        <p style="font-size:0.82rem; color:var(--text-main); margin-bottom:14px; line-height:1.6;">
          Tap the green button below to download <strong>manna-jewellery-catalog-github.zip</strong>, extract it, and upload <code>index.html</code> (along with images/ and videos/ if present) to your GitHub repository.
        </p>

        <button class="btn-github-green" onclick="downloadGitHubPagesZip()">
          📦 Download Ready-to-Upload GitHub Pages ZIP
        </button>

        <p style="font-size:0.72rem; color:var(--text-dim); margin-top:10px;">
          *Every time you add or edit products in your browser, this ZIP will automatically bundle your updated catalogue data and latest metal rates!
        </p>
      </div>

      <!-- Backup / Export Data -->
      <div style="background:var(--bg-card); padding:16px; border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.08);">
        <h4 style="font-size:0.9rem; color:var(--text-muted); margin-bottom:8px;">Data Backup & Restore</h4>
        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" onclick="exportDataJson()">📥 Export Data (JSON Backup)</button>
          <button class="btn-secondary" onclick="document.getElementById('importDataInput').click()">📤 Import Data (Restore JSON)</button>
          <input type="file" id="importDataInput" accept=".json" style="display:none;" onchange="importDataJson(event)">
        </div>
      </div>

    </div>
  `;
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    storeConfig.logoUrl = event.target.result;
    document.getElementById("currentLogoPreview").src = storeConfig.logoUrl;
    saveStoreConfig();
    showToast("Logo updated successfully!");
  };
  reader.readAsDataURL(file);
}

function saveBrandingSettings() {
  storeConfig.storeName = document.getElementById("settingStoreName").value.trim() || storeConfig.storeName;
  storeConfig.whatsappNumber = document.getElementById("settingWhatsApp").value.trim() || storeConfig.whatsappNumber;
  saveStoreConfig();
  showToast("Store branding saved!");
}

function updateManagerPin() {
  const pin = document.getElementById("settingNewPin").value.trim();
  if (pin.length === 4 && /^\d+$/.test(pin)) {
    storeConfig.pin = pin;
    saveStoreConfig();
    showToast(`PIN changed successfully to ${pin}`);
    document.getElementById("settingNewPin").value = "";
  } else {
    alert("Please enter a valid 4-digit numeric PIN.");
  }
}

// Download Ready-to-Upload GitHub Pages ZIP using JSZip
async function downloadGitHubPagesZip() {
  if (typeof JSZip === "undefined") {
    showToast("Loading ZIP generator library...");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
  }

  showToast("Preparing GitHub Pages package...");

  const zip = new JSZip();

  // Generate updated data.js content containing current products, rates, tree
  const updatedDataJs = `
// Auto-generated catalogue bundle for Manna Jewellery Works
const DEFAULT_STORE_CONFIG = ${JSON.stringify(storeConfig, null, 2)};
const DEFAULT_CATEGORY_TREE = ${JSON.stringify(categoryTree, null, 2)};
const INITIAL_PRODUCTS = ${JSON.stringify(products, null, 2)};
  `.trim();

  // Fetch index.html, style.css, app.js from current location or embedded strings
  try {
    const [indexResp, cssResp, appResp] = await Promise.all([
      fetch("index.html").then(r => r.text()),
      fetch("style.css").then(r => r.text()),
      fetch("app.js").then(r => r.text())
    ]);

    zip.file("index.html", indexResp);
    zip.file("style.css", cssResp);
    zip.file("app.js", appResp);
    zip.file("data.js", updatedDataJs);

    // Also include logo.jpg
    try {
      const logoResp = await fetch("logo.jpg");
      const logoBlob = await logoResp.blob();
      zip.file("logo.jpg", logoBlob);
    } catch (e) {
      console.warn("logo.jpg fetch fallback", e);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = "manna-jewellery-catalog-github.zip";
    link.click();

    showToast("✅ manna-jewellery-catalog-github.zip downloaded!");
  } catch (err) {
    console.error("ZIP creation error", err);
    // Fallback: download data.js directly
    downloadBlob(updatedDataJs, "data.js", "application/javascript");
    showToast("Downloaded data.js! Upload it to your repository.");
  }
}

function exportDataJson() {
  const exportPayload = {
    storeConfig,
    categoryTree,
    products,
    exportedAt: new Date().toISOString()
  };
  const jsonStr = JSON.stringify(exportPayload, null, 2);
  downloadBlob(jsonStr, `manna-jewellery-backup-${Date.now()}.json`, "application/json");
  showToast("Backup JSON exported!");
}

function importDataJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.storeConfig) storeConfig = data.storeConfig;
      if (data.categoryTree) categoryTree = data.categoryTree;
      if (data.products) products = data.products;

      saveStoreConfig();
      saveCategoryTree();
      saveProducts();

      showToast("Data restored successfully!");
      applyFiltersAndRender();
      switchPortalTab("products");
    } catch (err) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// UI Event Listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById("mainSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      activeFilters.searchQuery = e.target.value;
      renderFilterTags();
      applyFiltersAndRender();
    });
  }

  // Sort dropdown
  const sortSelect = document.getElementById("sortSelector");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      activeFilters.sortBy = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Keyboard shortcut to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductDetailModal();
      closePinModal();
      closeTreeDrawer();
    }
  });
}

function toggleSearchOverlay() {
  const box = document.getElementById("searchBarContainer");
  if (box) {
    box.classList.toggle("open");
    if (box.classList.contains("open")) {
      document.getElementById("mainSearchInput").focus();
    }
  }
}

function toggleViewMode() {
  currentViewMode = "grid";
  applyFiltersAndRender();
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>✨</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
