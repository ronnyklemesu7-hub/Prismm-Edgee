// database.js methods are now loaded globally via window

let state = {
  products: [],
  businesses: [],
  customers: [],
  orders: [],
  cart: JSON.parse(localStorage.getItem('edgeProducts_cart') || '[]'),
  wishlist: JSON.parse(localStorage.getItem('edgeProducts_wishlist') || '[]'),
  recentlyViewed: JSON.parse(localStorage.getItem('edgeProducts_recent') || '[]'),
  sortOrder: 'relevance',
  activeSection: 'shops', // Default landing section is All Shops
  activeProduct: null,
  activeProductMainImgIndex: 0,
  selectedCategory: 'all',
  selectedSubCategory: null,
  selectedShopCategory: 'all',
  currentHeroIndex: 0,
  storeSearchQuery: '',
  storeSearchCat: 'all',
  emailSignee: sessionStorage.getItem('active_email') || null,
  storefrontMedia: []
};

let heroTimer = null;

// Global helper for element selection
const el = (id) => document.getElementById(id);

// ===================== INITIALIZATION =====================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const db = await initDatabase();
    await seedDatabase(db);
    await refreshState();

    bindStaticEvents();
    updateAuthUI();

    // BroadcastChannel sync across browser tabs
    try {
      const syncChannel = new BroadcastChannel('prism_shop_sync');
      syncChannel.onmessage = (e) => {
        if (e.data && e.data.type === 'PRISM_SHOP_UPDATED') {
          refreshState();
        }
      };
    } catch (_) {}

    window.addEventListener('storage', (e) => {
      if (e.key === 'prism_shop_sync') refreshState();
    });
    window.addEventListener('focus', () => refreshState());

    // Auto-refresh fallback every 5 seconds
    setInterval(() => refreshState(), 5000);

    router();
  } catch (error) {
    console.error('App initialization failed:', error);
  }
});

// ===================== STATE REFRESH =====================

async function refreshState() {
  state.products = await getAllItems('products') || [];
  state.businesses = await getAllItems('businesses') || [];
  state.customers = await getAllItems('customers') || [];
  state.orders = await getAllItems('orders') || [];
  state.storefrontMedia = await getAllItems('storefrontMedia') || [];

  renderHeroSlideshow();
  renderProductGrid();
  renderShopsDirectory();
  renderCartCount();
  if (typeof renderWishlistCount === 'function') renderWishlistCount();
  if (state.activeSection === 'product' && state.activeProduct) {
    const freshProd = state.products.find(p => p.id === state.activeProduct.id);
    if (freshProd) {
      state.activeProduct = freshProd;
      renderProductDetailUI();
    }
  }
}

// ===================== EVENT BINDING & TAB ACTIVATION =====================

function bindStaticEvents() {
  // Logo link goes home
  const logo = el('logo-link');
  if (logo) {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection('home');
      state.selectedCategory = 'all';
      state.selectedSubCategory = null;
      syncCategoryUI();
      renderProductGrid();
    });
  }

  // Section Tabs (Home / Shops / Admin Portal / Secondary Nav Category tabs)
  document.querySelectorAll('.nav-section-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const section = tab.dataset.section || 'home';
      if (section === 'admin') {
        window.location.href = 'admin.html';
        return;
      }

      const cat = tab.dataset.cat || 'all';
      state.selectedCategory = cat;
      state.selectedShopCategory = cat;
      state.selectedSubCategory = null;

      if (section === 'shops') {
        if (location.hash !== '#/shops') {
          location.hash = '#/shops';
        } else {
          switchSection('shops');
        }
      } else {
        if (location.hash !== '#/') {
          location.hash = '#/';
        } else {
          switchSection('home');
        }
      }
    });
  });

  // Search Submit
  const searchForm = el('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.storeSearchQuery = el('search-input').value.trim().toLowerCase();
      state.storeSearchCat = el('search-cat').value;
      
      switchSection('home');
      renderProductGrid();
    });
  }

  // Sidebar Product Category Buttons
  document.querySelectorAll('.sidebar-cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.dataset.cat || 'all';
      state.selectedCategory = cat;
      state.selectedShopCategory = cat;
      state.selectedSubCategory = null;
      if (state.activeSection === 'shops') {
        syncShopCategoryUI();
        renderShopsDirectory();
      } else {
        switchSection('home');
        syncCategoryUI();
        renderProductGrid();
      }
    });
  });

  // Flyout Subcategory Links
  document.querySelectorAll('.flyout a[data-sub]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cat = link.dataset.sub;
      state.selectedCategory = cat;
      state.selectedShopCategory = cat;
      state.selectedSubCategory = link.dataset.subName || null;
      if (state.activeSection === 'shops') {
        syncShopCategoryUI();
        renderShopsDirectory();
      } else {
        switchSection('home');
        syncCategoryUI();
        renderProductGrid();
      }
    });
  });

  // Top Tabs Product Category Buttons
  document.querySelectorAll('.product-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.dataset.cat || 'all';
      state.selectedCategory = cat;
      state.selectedShopCategory = cat;
      state.selectedSubCategory = null;
      location.hash = '#/products';
      switchSection('home');
      syncCategoryUI();
      renderProductGrid();
    });
  });

  // Category Pills (Home & Shops)
  document.querySelectorAll('.cat-pills button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.dataset.cat || btn.dataset.shopCat || btn.dataset['shop-cat'] || 'all';
      state.selectedCategory = cat;
      state.selectedShopCategory = cat;
      state.selectedSubCategory = null;
      if (state.activeSection === 'shops') {
        location.hash = '#/shops';
        switchSection('shops');
        syncShopCategoryUI();
        renderShopsDirectory();
      } else {
        location.hash = '#/products';
        switchSection('home');
        syncCategoryUI();
        renderProductGrid();
      }
    });
  });

  // Sidebar Shop Category Buttons
  document.querySelectorAll('.sidebar-shop-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.dataset.shopCat || btn.dataset['shop-cat'] || 'all';
      state.selectedShopCategory = cat;
      state.selectedCategory = cat;
      location.hash = '#/shops';
      switchSection('shops');
      syncShopCategoryUI();
      renderShopsDirectory();
    });
  });

  // Top Tabs Shop Category Buttons
  document.querySelectorAll('.shop-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = btn.dataset.shopCat || btn.dataset['shop-cat'] || 'all';
      state.selectedShopCategory = cat;
      state.selectedCategory = cat;
      location.hash = '#/shops';
      switchSection('shops');
      syncShopCategoryUI();
      renderShopsDirectory();
    });
  });

  // Slideshow Arrows
  const prevArrow = el('hero-prev');
  if (prevArrow) prevArrow.addEventListener('click', () => changeSlide(-1));

  const nextArrow = el('hero-next');
  if (nextArrow) nextArrow.addEventListener('click', () => changeSlide(1));

  // Sign In Trigger Modal
  const signinTrigger = el('signin-trigger-btn');
  if (signinTrigger) {
    signinTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.emailSignee) {
        if (confirm(`Currently signed in as ${state.emailSignee}. Do you wish to sign out?`)) {
          sessionStorage.removeItem('active_email');
          state.emailSignee = null;
          updateAuthUI();
          toast('Logged out successfully');
        }
      } else {
        el('signin-modal').hidden = false;
      }
    });
  }

  // Close Sign In Modal
  const signinClose = el('signin-modal-close');
  if (signinClose) {
    signinClose.addEventListener('click', () => {
      el('signin-modal').hidden = true;
    });
  }

  // Sign In Form Submit (Email Sign-up)
  const signinForm = el('signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = el('signin-email').value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Please enter a valid email address.');
        return;
      }

      state.emailSignee = email;
      sessionStorage.setItem('active_email', email);
      el('signin-modal').hidden = true;
      el('signin-email').value = '';

      const id = 'cust_' + Math.random().toString(36).substr(2, 9);
      const newCustomer = {
        id,
        email: email.toLowerCase(),
        method: 'Email Registration',
        joinedAt: new Date().toLocaleString()
      };
      
      try {
        await saveItem('customers', newCustomer);
        await refreshState();
        updateAuthUI();
        toast('Registration Successful!');
      } catch (err) {
        console.error('Failed to register customer:', err);
      }
    });
  }

  // Cart & Overlay events
  const cartBtn = el('cart-open-btn');
  const cartDrawer = el('cart-drawer');
  const cartClose = el('cart-close-btn');
  const overlay = el('cart-overlay');
  const wlBtn = el('wishlist-open-btn');
  const wlDrawer = el('wishlist-drawer');
  const wlClose = el('wishlist-close-btn');

  function closeDrawers() {
    if(cartDrawer) cartDrawer.hidden = true;
    if(wlDrawer) wlDrawer.hidden = true;
    if(overlay) overlay.hidden = true;
  }
  
  if (wlBtn && wlDrawer && overlay) {
    wlBtn.addEventListener('click', () => {
      closeDrawers();
      wlDrawer.hidden = false;
      overlay.hidden = false;
      if (typeof renderWishlistDrawer === 'function') renderWishlistDrawer();
    });
  }
  if (wlClose) wlClose.addEventListener('click', closeDrawers);

  if (cartBtn && cartDrawer && overlay) {
    cartBtn.addEventListener('click', () => {
      closeDrawers();
      if (typeof renderCartDrawer === 'function') renderCartDrawer();
      cartDrawer.hidden = false;
      overlay.hidden = false;
    });
  }
  if (cartClose) {
    cartClose.addEventListener('click', closeDrawers);
  }
  if (overlay) {
    overlay.addEventListener('click', closeDrawers);
  }

  // Checkout trigger
  let mapInstance = null;
  const checkoutBtn = el('cart-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (state.cart.length === 0) {
        toast('Your cart is empty');
        return;
      }
      if (typeof closeDrawers === 'function') closeDrawers();
      
      const coModal = el('checkout-modal');
      const step1 = el('checkout-step-1');
      if (coModal) coModal.hidden = false;
      if (step1) step1.hidden = false;
      if (el('checkout-step-delivery')) el('checkout-step-delivery').hidden = true;
      if (el('checkout-step-pickup')) el('checkout-step-pickup').hidden = true;
    });
  }

  const coClose = el('checkout-modal-close');
  if (coClose) coClose.addEventListener('click', () => { el('checkout-modal').hidden = true; });

  const btnDel = el('checkout-btn-delivery');
  if (btnDel) btnDel.addEventListener('click', () => {
    el('checkout-step-1').hidden = true;
    el('checkout-step-delivery').hidden = false;
    
    // Initialize leaflet map if not already done
    setTimeout(() => {
      if (!mapInstance && window.L) {
        mapInstance = L.map('checkout-map').setView([5.6037, -0.1870], 13); // Accra center
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);
        
        let marker = L.marker([5.6037, -0.1870], {draggable: true}).addTo(mapInstance);
        mapInstance.on('click', function(e) {
          marker.setLatLng(e.latlng);
        });
      } else if (mapInstance) {
        mapInstance.invalidateSize();
      }
    }, 100);
  });

  const btnPic = el('checkout-btn-pickup');
  if (btnPic) btnPic.addEventListener('click', () => {
    el('checkout-step-1').hidden = true;
    el('checkout-step-pickup').hidden = false;
  });

  const formDel = el('checkout-form-delivery');
  if (formDel) formDel.addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Delivery order confirmed!');
    state.cart = [];
    localStorage.setItem('edgeProducts_cart', JSON.stringify(state.cart));
    if (typeof renderCartCount === 'function') renderCartCount();
    if (typeof renderCartDrawer === 'function') renderCartDrawer();
    el('checkout-modal').hidden = true;
  });

  const formPic = el('checkout-form-pickup');
  if (formPic) formPic.addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Pickup order confirmed!');
    state.cart = [];
    localStorage.setItem('edgeProducts_cart', JSON.stringify(state.cart));
    if (typeof renderCartCount === 'function') renderCartCount();
    if (typeof renderCartDrawer === 'function') renderCartDrawer();
    el('checkout-modal').hidden = true;
  });

  const sortSelect = el('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.sortOrder = sortSelect.value;
      renderProductGrid();
    });
  }

  const quoteBtn = el('pd-request-quote');
  if (quoteBtn) {
    quoteBtn.addEventListener('click', () => {
      if (state.activeProduct) {
        el('quote-product-name').textContent = `Product: ${state.activeProduct.name}`;
        el('quote-qty').value = state.activeProduct.moq || 1;
        el('quote-modal').hidden = false;
      }
    });
  }

  const quoteClose = el('quote-modal-close');
  if (quoteClose) quoteClose.addEventListener('click', () => { el('quote-modal').hidden = true; });

  const quoteForm = el('quote-form');
  if (quoteForm) {
    quoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      toast('Quote request submitted! A supplier will contact you shortly.');
      el('quote-modal').hidden = true;
      quoteForm.reset();
    });
  }

  // Product page stepper buttons
  const qtyMinus = el('qty-minus');
  if (qtyMinus) {
    qtyMinus.addEventListener('click', () => {
      const input = el('qty-value');
      input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
    });
  }

  const qtyPlus = el('qty-plus');
  if (qtyPlus) {
    qtyPlus.addEventListener('click', () => {
      const input = el('qty-value');
      input.value = (parseInt(input.value, 10) || 1) + 1;
    });
  }

  // Product detail addToCart
  const pdAddCart = el('pd-add-cart');
  if (pdAddCart) {
    pdAddCart.addEventListener('click', () => {
      if (!state.activeProduct) return;
      const qty = parseInt(el('qty-value').value, 10) || 1;
      addToCart(state.activeProduct.id, qty);
    });
  }

  // Product detail contact supplier
  const pdContact = el('pd-contact');
  if (pdContact) {
    pdContact.addEventListener('click', () => {
      toast('Message sent to supplier! They will contact you at your registered email.');
    });
  }

  // Back to home button in product detail
  const backHome = el('pd-back-home-btn');
  if (backHome) {
    backHome.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection('home');
    });
  }
}

// ===================== SECTION ROUTER =====================

function switchSection(section) {
  if (section === 'admin') {
    window.location.href = 'admin.html';
    return;
  }

  state.activeSection = section;
  
  const homePage = el('page-home');
  const shopsPage = el('page-shops');
  const productPage = el('page-product');

  if (homePage) homePage.hidden = true;
  if (shopsPage) shopsPage.hidden = true;
  if (productPage) productPage.hidden = true;

  if (section === 'home') {
    if (homePage) homePage.hidden = false;
    if (el('hero-section')) el('hero-section').hidden = false;
    syncCategoryUI();
    renderProductGrid();
  } else if (section === 'shops') {
    if (shopsPage) shopsPage.hidden = false;
    if (el('hero-section')) el('hero-section').hidden = false;
    syncShopCategoryUI();
    renderShopsDirectory();
  } else if (section === 'product') {
    if (productPage) productPage.hidden = false;
    if (el('hero-section')) el('hero-section').hidden = true;
  }
  
  document.querySelectorAll('.nav-section-tab').forEach(t => {
    const isTabActive = t.dataset.section === section && 
      (!t.dataset.cat || t.dataset.cat === state.selectedCategory);
    t.classList.toggle('active', isTabActive);
  });
}

function router() {
  const hash = location.hash || '#/shops';
  if (hash.indexOf('#/product/') === 0) {
    const id = hash.replace('#/product/', '');
    const p = state.products.find(x => x.id === id);
    if (p) {
      state.activeProduct = p;
      state.activeProductMainImgIndex = 0;
      trackRecentlyViewed(p.id);
      switchSection('product');
      renderProductDetailUI();
      renderRecentlyViewed();
    } else {
      location.hash = '#/shops';
    }
  } else if (hash.indexOf('#/products') === 0 || hash.indexOf('#/home') === 0) {
    switchSection('home');
  } else {
    switchSection('shops');
  }
}

window.addEventListener('hashchange', router);

// ===================== UI UPDATES & UTILS =====================

function updateAuthUI() {
  const trigger = el('signin-trigger-btn');
  if (!trigger) return;
  
  if (state.emailSignee) {
    trigger.textContent = state.emailSignee;
    trigger.classList.remove('muted');
    trigger.style.color = 'var(--amber)';
  } else {
    trigger.textContent = 'Sign In';
    trigger.classList.add('muted');
    trigger.style.color = '';
  }
}

function syncCategoryUI() {
  document.querySelectorAll('.sidebar-cat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === state.selectedCategory);
  });

  document.querySelectorAll('.product-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === state.selectedCategory);
  });

  document.querySelectorAll('#cat-pills button').forEach(btn => {
    const cat = btn.dataset.cat || btn.dataset.shopCat || btn.dataset['shop-cat'];
    btn.classList.toggle('active', cat === state.selectedCategory);
  });

  document.querySelectorAll('.nav-section-tab').forEach(btn => {
    if (btn.dataset.cat) {
      btn.classList.toggle('active', btn.dataset.cat === state.selectedCategory);
    }
  });

  const title = el('content-title');
  if (title) {
    let text = state.selectedCategory === 'all' 
      ? 'Curated Marketplace'
      : getCategoryLabel(state.selectedCategory) + ' — Marketplace';
    if (state.selectedSubCategory) {
      text += ` (${state.selectedSubCategory})`;
    }
    title.textContent = text;
  }
}

function syncShopCategoryUI() {
  document.querySelectorAll('.sidebar-shop-btn').forEach(btn => {
    const cat = btn.dataset.shopCat || btn.dataset['shop-cat'];
    btn.classList.toggle('active', cat === state.selectedShopCategory);
  });

  document.querySelectorAll('.shop-tab-btn').forEach(btn => {
    const cat = btn.dataset.shopCat || btn.dataset['shop-cat'];
    btn.classList.toggle('active', cat === state.selectedShopCategory);
  });

  document.querySelectorAll('#shops-cat-pills button').forEach(btn => {
    const cat = btn.dataset.shopCat || btn.dataset['shop-cat'] || btn.dataset.cat;
    btn.classList.toggle('active', cat === state.selectedShopCategory);
  });

  document.querySelectorAll('.nav-section-tab').forEach(btn => {
    if (btn.dataset.cat) {
      btn.classList.toggle('active', btn.dataset.cat === state.selectedShopCategory);
    }
  });

  const title = el('shops-content-title');
  if (title) {
    title.textContent = state.selectedShopCategory === 'all'
      ? 'Registered Boutiques & Brands'
      : getCategoryLabel(state.selectedShopCategory) + ' — Boutiques';
  }
}

function getCategoryColor(cat) {
  const map = {
    electronics: 'var(--cat-electronics)',
    food: 'var(--cat-food)',
    beauty: 'var(--cat-beauty)',
    tools: 'var(--amber)',
    apparel: '#4A5568',
    industrial: '#4A5568'
  };
  return map[cat] || 'var(--amber)';
}

function getCategoryLabel(cat) {
  const map = {
    electronics: 'Electronics',
    food: 'Food Services',
    beauty: 'Beauty & Cosmetics',
    tools: 'Technical Tools',
    apparel: 'Apparel & Textiles',
    industrial: 'Home & Industrial'
  };
  return map[cat] || cat;
}

function getCategoryTint(cat) {
  const map = {
    electronics: 'var(--cat-electronics-tint)',
    food: 'var(--cat-food-tint)',
    beauty: 'var(--cat-beauty-tint)',
    tools: 'var(--amber-tint)',
    apparel: 'rgba(74, 85, 104, 0.18)',
    industrial: 'rgba(74, 85, 104, 0.18)'
  };
  return map[cat] || 'var(--amber-tint)';
}

function toast(msg) {
  const t = el('toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._tm);
  t._tm = setTimeout(() => { t.hidden = true; }, 2200);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ===================== HERO SLIDESHOW (SHOP PRODUCTS UPLOAD CONNECTED) =====================

function renderHeroSlideshow() {
  const track = el('slide-track');
  const dots = el('hero-dots');
  if (!track) return;

  let slides = [];
  
  // 1. Prioritize images uploaded in the Shop Products Upload tab in Admin (storefrontMedia)
  if (state.storefrontMedia && state.storefrontMedia.length > 0) {
    state.storefrontMedia.forEach(m => {
      const srcUrl = m.url || m.src;
      if (srcUrl && typeof srcUrl === 'string' && srcUrl.trim()) {
        slides.push({
          img: srcUrl.trim(),
          title: m.caption || m.name || 'Uploaded Shop Product',
          desc: 'Published from Admin Shop Products Upload.',
          eyebrow: 'Admin Catalog Upload'
        });
      }
    });
  }

  // 2. Combine with images from catalog products database
  if (state.products && state.products.length > 0) {
    state.products.forEach(p => {
      if (p.images && p.images.length > 0) {
        p.images.forEach(imgUrl => {
          if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim() && !slides.some(s => s.img === imgUrl.trim())) {
            slides.push({
              img: imgUrl.trim(),
              title: p.name || 'Product Listing',
              desc: p.description || 'Featured Product Listing',
              eyebrow: p.category || 'Shop Product'
            });
          }
        });
      }
    });
  }

  // 3. Fallback sample luxury images if no items uploaded yet
  if (slides.length === 0) {
    slides = [
      {
        img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200',
        title: 'Vance & Co. Imperial Tourbillon',
        desc: 'Upload images in Admin Shop Products Upload tab to populate this slideshow.',
        eyebrow: 'Featured Masterwork'
      },
      {
        img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1200',
        title: 'Prism Edge Obsidian Console',
        desc: 'High precision acoustic pre-amplifiers.',
        eyebrow: 'Acoustics & Tech'
      }
    ];
  }

  const slice = slides.slice(0, 12);
  if (state.currentHeroIndex >= slice.length || state.currentHeroIndex < 0) {
    state.currentHeroIndex = 0;
  }

  track.innerHTML = '';
  if (dots) dots.innerHTML = '';

  slice.forEach((s, idx) => {
    const slide = document.createElement('div');
    slide.className = 'slide' + (idx === state.currentHeroIndex ? ' active' : '');
    
    slide.innerHTML = `
      <img class="slide-img" src="${s.img}" alt="${esc(s.title)}" onerror="this.src='assets/no-goods-placeholder.jpg'">
      <div class="slide-copy">
        <div class="eyebrow">${esc(s.eyebrow)}</div>
        <h2>${esc(s.title)}</h2>
        <p>${esc(s.desc)}</p>
      </div>
    `;
    track.appendChild(slide);

    if (dots) {
      const dot = document.createElement('button');
      dot.className = idx === state.currentHeroIndex ? 'active' : '';
      dot.addEventListener('click', () => {
        state.currentHeroIndex = idx;
        renderHeroSlideshow();
      });
      dots.appendChild(dot);
    }
  });

  restartSlideTimer(slice.length);
}

function changeSlide(direction) {
  const slides = document.querySelectorAll('.slide');
  if (slides.length <= 1) return;
  state.currentHeroIndex = (state.currentHeroIndex + direction + slides.length) % slides.length;
  renderHeroSlideshow();
}

function restartSlideTimer(count) {
  clearInterval(heroTimer);
  if (count <= 1) return;
  heroTimer = setInterval(() => {
    changeSlide(1);
  }, 4500);
}

// ===================== PRODUCT GRID (HOME) =====================

function renderProductGrid() {
  const grid = el('product-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const cat = state.selectedCategory;
  const subCat = state.selectedSubCategory;
  const q = state.storeSearchQuery;
  const searchCat = state.storeSearchCat;

  const filtered = state.products.filter(p => {
    if (!p) return false;
    
    const pCategory = (p.category || p.cat || '').toLowerCase();

    const matchesSearchCat = searchCat === 'all' || pCategory.includes(searchCat.toLowerCase());

    let matchesCategory = true;
    if (cat !== 'all') {
      if (cat === 'electronics') {
        matchesCategory = pCategory.includes('electronics');
      } else if (cat === 'beauty') {
        matchesCategory = pCategory.includes('beauty');
      } else if (cat === 'food') {
        matchesCategory = pCategory.includes('food');
      } else if (cat === 'tools') {
        matchesCategory = pCategory.includes('tool');
      } else if (cat === 'apparel') {
        matchesCategory = pCategory.includes('apparel') || pCategory.includes('textile');
      } else if (cat === 'industrial') {
        matchesCategory = pCategory.includes('industrial') || pCategory.includes('home');
      } else {
        matchesCategory = pCategory.includes(cat.toLowerCase());
      }
    }

    let matchesSub = true;
    if (subCat && matchesCategory) {
      const pDesc = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
      matchesSub = pDesc.includes(subCat.toLowerCase());
    }

    const name = (p.name || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const matchesSearchText = !q || name.includes(q) || desc.includes(q);

    return p.visible !== false && matchesSearchCat && matchesCategory && matchesSub && matchesSearchText;
  });

  // Sort products
  if (state.sortOrder === 'price-asc') filtered.sort((a,b) => (a.price||0) - (b.price||0));
  else if (state.sortOrder === 'price-desc') filtered.sort((a,b) => (b.price||0) - (a.price||0));
  else if (state.sortOrder === 'rating') filtered.sort((a,b) => (b.rating||0) - (a.rating||0));
  else if (state.sortOrder === 'newest') filtered.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
  else if (state.sortOrder === 'trending') filtered.sort((a,b) => (b.trending?1:0) - (a.trending?1:0));

  const countEl = el('product-count');
  if (countEl) countEl.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-cat" style="grid-column: 1/-1;">
        <b>No listings align with criteria</b>
        Try clearing your search query or selecting another marketplace category.
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    const cColor = getCategoryColor((p.category || p.cat || '').toLowerCase());
    const cTint = getCategoryTint((p.category || p.cat || '').toLowerCase());
    card.style.setProperty('--cat-color', cColor);
    card.style.setProperty('--cat-tint', cTint);

    const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : (p.url || p.src || 'assets/no-goods-placeholder.jpg');
    
    let badgeHtml = '';
    const biz = state.businesses.find(b => b.id === p.businessId);
    if (biz && biz.isVerified) {
      badgeHtml = '<span class="card-badge verified">VERIFIED SUPPLIER</span>';
    } else if (p.trending) {
      badgeHtml = '<span class="card-badge trending">TRENDING</span>';
    } else if (p.badge) {
      badgeHtml = `<span class="card-badge">${esc(p.badge)}</span>`;
    }

    const priceVal = (typeof p.price === 'number') ? p.price.toLocaleString() : (p.price || '0');
    const moqVal = p.moq || 1;
    const isWished = state.wishlist.includes(p.id);

    card.innerHTML = `
      <div class="card-media" onclick="location.hash='#/product/${p.id}'" style="cursor:pointer;">
        <img src="${imgUrl}" alt="${esc(p.name)}" onerror="this.src='assets/no-goods-placeholder.jpg'">
        ${badgeHtml}
        <button class="wishlist-btn ${isWished ? 'active' : ''}" data-id="${p.id}" title="Add to wishlist">♥</button>
      </div>
      <div class="card-body">
        <div class="name" onclick="location.hash='#/product/${p.id}'" style="cursor:pointer;">${esc(p.name)}</div>
        <div class="stars" aria-label="${p.reviews ? `${p.reviews} reviews` : 'No reviews yet'}">★★★★★ <span class="count">(${p.reviews || 0})</span></div>
        <div class="price">GHS ${priceVal}</div>
        <div class="moq">MOQ: ${moqVal} unit${moqVal > 1 ? 's' : ''}</div>
        <div class="card-actions">
          <button class="view-btn" onclick="location.hash='#/product/${p.id}'">Details</button>
          <button class="primary add-btn">Add to Cart</button>
        </div>
      </div>
    `;

    card.querySelector('.add-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(p.id, 1);
    });
    const wishBtn = card.querySelector('.wishlist-btn');
    if (wishBtn) wishBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWishlist(p.id);
    });

    grid.appendChild(card);
  });
}

// ===================== SHOPS DIRECTORY =====================

function renderShopsDirectory() {
  const container = el('shops-directory-list');
  if (!container) return;
  container.innerHTML = '';

  const cat = state.selectedShopCategory;

  const filtered = state.businesses.filter(b => {
    if (!b) return false;
    if (cat === 'all') return true;

    const cats = (b.categories || b.categoriesBar || []).map(c => c.toLowerCase());
    
    if (cat === 'electronics') {
      return cats.some(c => c.includes('electronics'));
    } else if (cat === 'beauty') {
      return cats.some(c => c.includes('beauty'));
    } else if (cat === 'food') {
      return cats.some(c => c.includes('food'));
    } else if (cat === 'tools') {
      return cats.some(c => c.includes('tool'));
    } else if (cat === 'apparel') {
      return cats.some(c => c.includes('apparel') || c.includes('textile'));
    } else if (cat === 'industrial') {
      return cats.some(c => c.includes('industrial') || c.includes('home'));
    }
    
    return cats.some(c => c.includes(cat.toLowerCase()));
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-cat">
        <b>No registered boutiques found</b>
        Verify your selections or add custom brands from the Admin Portal.
      </div>
    `;
    return;
  }

  filtered.forEach(biz => {
    const card = document.createElement('div');
    card.className = 'shop-card';

    const bannerUrl = biz.coverImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200';
    const logoUrl = biz.logo || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=150';
    const bizCategories = biz.categories || ['General'];

    const bizProducts = state.products.filter(p => p.businessId === biz.id);
    const bizMedia = (state.storefrontMedia || []).filter(m => m.businessId === biz.id);

    let shopAssets = [];
    bizProducts.forEach(p => {
      const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : null;
      if (imgUrl) shopAssets.push({ id: p.id, name: p.name, img: imgUrl, price: p.price, isProduct: true });
    });
    bizMedia.forEach(m => {
      const imgUrl = m.url || m.src;
      if (imgUrl && !shopAssets.some(a => a.img === imgUrl)) {
        shopAssets.push({ id: m.id, name: m.caption || 'Shop Media', img: imgUrl, price: m.price, isProduct: false });
      }
    });

    let galleryHtml = '';

    if (shopAssets.length > 0) {
      galleryHtml = `
        <div style="margin-top: 18px; border-top: 1px solid var(--line); padding-top: 16px;">
          <h4 style="font-size:12px; text-transform:uppercase; color:var(--amber); letter-spacing:.05em; margin-bottom:12px;">Shop Catalog & Image Showcase (${shopAssets.length} items)</h4>
          <div class="shop-images-gallery">
            ${shopAssets.map(a => `
              <div class="shop-img-box" ${a.isProduct ? `onclick="location.hash='#/product/${a.id}'"` : ''} style="cursor:pointer;" title="${esc(a.name)}">
                <img src="${a.img}" alt="${esc(a.name)}" onerror="this.src='assets/no-goods-placeholder.jpg'">
                <div style="font-size:10.5px; text-align:center; color:var(--amber); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-top:4px; font-weight:600;">${esc(a.name)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="shop-banner" onclick="state.selectedShopCategory='all'; renderShopsDirectory();" style="cursor:pointer;">
        <img src="${bannerUrl}" alt="${esc(biz.name)}" onerror="this.src='assets/no-goods-placeholder.jpg'">
        <div class="shop-logo-wrap">
          <img src="${logoUrl}" alt="${esc(biz.name)} Logo" onerror="this.style.display='none'">
        </div>
      </div>
      <div class="shop-header">
        <div class="shop-title-area">
          <h3>${esc(biz.name)}</h3>
          <div class="shop-meta-row">
            <span>📍 ${esc(biz.location || 'Accra')}</span>
            <span>📞 ${esc(biz.contact || 'Direct Dial')}</span>
          </div>
        </div>
        <div class="shop-categories-wrap">
          ${bizCategories.map(c => `<span class="shop-cat-badge">${esc(c)}</span>`).join('')}
        </div>
      </div>
      <div class="shop-body">
        <p class="shop-desc">${esc(biz.description || 'Verified supplier catalog.')}</p>
        ${galleryHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

// ===================== PRODUCT DETAIL VIEW =====================

function renderProductDetailUI() {
  const p = state.activeProduct;
  if (!p) return;

  const cColor = getCategoryColor((p.category || p.cat || '').toLowerCase());
  const cTint = getCategoryTint((p.category || p.cat || '').toLowerCase());

  el('pd-crumb-cat').textContent = getCategoryLabel(p.category || p.cat);
  el('pd-crumb-name').textContent = p.name;
  
  const badge = el('pd-badge');
  badge.textContent = p.badge || getCategoryLabel(p.category || p.cat);
  badge.style.background = cColor;
  badge.style.color = '#fff';

  el('pd-title').textContent = p.name;
  el('pd-stars').innerHTML = `★★★★★ <span class="count">(${p.reviews || 22} reviews)</span>`;
  el('pd-price').textContent = `GHS ${(p.price || 0).toLocaleString()}`;
  el('pd-moq').textContent = `MOQ: ${p.moq || 1} units · In Stock: ${p.stock ?? 5}`;
  el('pd-desc').textContent = p.description || p.desc || 'Marketplace listing.';

  const main = el('pd-gallery-main');
  main.style.background = cTint;
  
  const images = (p.images && p.images.length > 0) ? p.images : (p.src ? [p.src] : ['assets/no-goods-placeholder.jpg']);
  main.innerHTML = `<img src="${images[state.activeProductMainImgIndex]}" alt="${esc(p.name)}" onerror="this.src='assets/no-goods-placeholder.jpg'">`;

  const thumbs = el('pd-thumbs');
  thumbs.innerHTML = '';
  images.forEach((img, idx) => {
    const thumb = document.createElement('button');
    thumb.className = idx === state.activeProductMainImgIndex ? 'active' : '';
    thumb.style.background = cTint;
    thumb.innerHTML = `<img src="${img}" onerror="this.src='assets/no-goods-placeholder.jpg'">`;
    thumb.addEventListener('click', () => {
      state.activeProductMainImgIndex = idx;
      renderProductDetailUI();
    });
    thumbs.appendChild(thumb);
  });

  const specs = el('pd-specs');
  const bizName = state.businesses.find(b => b.id === p.businessId)?.name || 'Independent Vendor';
  specs.innerHTML = `
    <tr><td>Brand Vendor</td><td>${esc(bizName)}</td></tr>
    <tr><td>Category Sector</td><td>${esc(getCategoryLabel(p.category || p.cat))}</td></tr>
    <tr><td>Creation Registry</td><td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}</td></tr>
    <tr><td>Safety Escrow</td><td>SSL Secured (Buyer Protection)</td></tr>
  `;

  const supplierCard = el('pd-supplier-card');
  const biz = state.businesses.find(b => b.id === p.businessId);
  if (supplierCard) {
    supplierCard.innerHTML = `
      <div class="supplier-header">
        <strong>${esc(bizName)}</strong>
        ${biz && biz.isVerified ? '<span class="verified-badge">✓ Verified</span>' : ''}
      </div>
      <div class="supplier-details">
        <div>📍 ${esc(biz?.location || 'Location not specified')}</div>
        <div>📞 ${esc(biz?.contact || 'Contact via platform')}</div>
        <div>⏱ Response: ${esc(biz?.responseRate || '95%')}</div>
        <div>📅 Active: ${biz?.yearsActive || 3}+ years</div>
      </div>
    `;
  }

  const related = state.products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
  renderGrid(el('related-grid'), related, false);
}

// ===================== CART ACTIONS =====================

function addToCart(id, qty) {
  const prod = state.products.find(p => p.id === id);
  if (!prod) return;

  if (prod.stock < qty) {
    alert('Acquisition request exceeds active inventory stock.');
    return;
  }

  const existing = state.cart.find(x => x.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({ id, qty });
  }

  saveCart();
  toast('Added to cart');
}

function saveCart() {
  localStorage.setItem('edgeProducts_cart', JSON.stringify(state.cart));
  renderCartCount();
}

function renderCartCount() {
  const countEl = el('cart-count');
  if (!countEl) return;
  const count = state.cart.reduce((total, cur) => total + cur.qty, 0);
  countEl.textContent = count;
}

function renderWishlistDrawer() {
  const c = el('wishlist-items');
  if (!c) return;
  if (state.wishlist.length === 0) {
    c.innerHTML = '<div class="empty-cart"><p>Your wishlist is empty</p></div>';
    return;
  }
  
  c.innerHTML = state.wishlist.map(id => {
    const p = state.products.find(x => x.id === id);
    if (!p) return '';
    const img = p.images && p.images[0] ? p.images[0] : 'assets/no-goods-placeholder.jpg';
    return `
      <div class="cart-item">
        <img src="${esc(img)}" alt="${esc(p.name)}">
        <div class="cart-item-info">
          <h4>${esc(p.name)}</h4>
          <div class="cart-item-price">GHS ${(p.price || 0).toLocaleString()}</div>
          <button class="primary" style="padding: 4px 10px; font-size: 11px; margin-top: 5px;" onclick="addToCart('${p.id}', 1); removeWishlist('${p.id}');">Add to Cart</button>
        </div>
        <button class="cart-item-remove" onclick="removeWishlist('${p.id}')" aria-label="Remove item">×</button>
      </div>
    `;
  }).join('');
}

window.removeWishlist = function(id) {
  state.wishlist = state.wishlist.filter(x => x !== id);
  localStorage.setItem('edgeProducts_wishlist', JSON.stringify(state.wishlist));
  if (typeof renderWishlistCount === 'function') renderWishlistCount();
  renderWishlistDrawer();
  renderProductGrid(); // to update the heart icons
  if (typeof renderProductDetailUI === 'function' && state.activeProduct && state.activeProduct.id === id) renderProductDetailUI();
};

function renderCartDrawer() {
  const wrap = el('cart-items');
  if (!wrap) return;
  wrap.innerHTML = '';

  if (state.cart.length === 0) {
    wrap.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Browse the marketplace to add products.</div>';
    el('cart-subtotal').textContent = 'GHS 0';
    return;
  }

  let subtotal = 0;
  state.cart.forEach(item => {
    const p = state.products.find(x => x.id === item.id);
    if (!p) return;

    const rowTotal = p.price * item.qty;
    subtotal += rowTotal;

    const row = document.createElement('div');
    row.className = 'cart-row';
    const cTint = getCategoryTint((p.category || p.cat || '').toLowerCase());
    const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'assets/no-goods-placeholder.jpg';

    row.innerHTML = `
      <div class="card-media" style="width:48px; height:48px; padding:4px; background:${cTint}">
        <img src="${imgUrl}" onerror="this.src='assets/no-goods-placeholder.jpg'">
      </div>
      <div class="grow">
        <div>${esc(p.name)}</div>
        <div style="color:var(--ink-soft); font-size:12px;">Qty ${item.qty}</div>
        <button class="remove">Remove</button>
      </div>
      <div class="price">GHS ${rowTotal.toLocaleString()}</div>
    `;

    row.querySelector('.remove').addEventListener('click', () => {
      state.cart = state.cart.filter(x => x.id !== item.id);
      saveCart();
      renderCartDrawer();
    });

    wrap.appendChild(row);
  });

  el('cart-subtotal').textContent = `GHS ${subtotal.toLocaleString()}`;
}

async function handleCartCheckout() {
  if (state.cart.length === 0) {
    toast('Cart is empty');
    return;
  }

  const email = state.emailSignee || sessionStorage.getItem('active_email');
  if (!email) {
    el('signin-modal').hidden = false;
    alert('Please register your account email to proceed with transaction.');
    return;
  }

  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const totalCost = state.cart.reduce((total, item) => {
    const p = state.products.find(x => x.id === item.id);
    return total + (p ? (p.price * item.qty) : 0);
  }, 0);

  const orderDetails = {
    id: orderId,
    customerEmail: email,
    items: state.cart.map(item => {
      const p = state.products.find(x => x.id === item.id);
      return {
        productId: item.id,
        name: p ? p.name : 'Unknown Product',
        price: p ? p.price : 0,
        quantity: item.qty
      };
    }),
    total: totalCost,
    phone: '+233 24 000 0000',
    paymentMode: 'Mobile Money (MoMo)',
    status: 'Pending',
    createdAt: new Date().toLocaleString()
  };

  try {
    await saveItem('orders', orderDetails);

    for (const item of state.cart) {
      const prod = state.products.find(p => p.id === item.id);
      if (prod) {
        prod.stock = Math.max(0, (prod.stock || 0) - item.qty);
        prod.sold = (prod.sold || 0) + item.qty;
        await saveItem('products', prod);
      }
    }

    state.cart = [];
    saveCart();
    
    el('cart-drawer').hidden = true;
    el('cart-overlay').hidden = true;
    
    alert(`✧ Order Confirmed!\nReference Code: ${orderId}\nA supplier representative will contact you shortly.`);
    await refreshState();
  } catch (err) {
    console.error('Checkout failed:', err);
    alert('Transacting error occurred.');
  }
}

function trackRecentlyViewed(productId) {
  let recent = state.recentlyViewed.filter(id => id !== productId);
  recent.unshift(productId);
  state.recentlyViewed = recent.slice(0, 8);
  localStorage.setItem('edgeProducts_recent', JSON.stringify(state.recentlyViewed));
}

function renderRecentlyViewed() {
  const section = el('recently-viewed-section');
  const grid = el('recently-viewed-grid');
  if (!section || !grid) return;
  const items = state.recentlyViewed
    .map(id => state.products.find(p => p.id === id))
    .filter(p => p && p.id !== state.activeProduct?.id)
    .slice(0, 4);
  if (items.length === 0) { section.hidden = true; return; }
  section.hidden = false;
  renderGrid(grid, items, false);
}

function toggleWishlist(id) {
  const idx = state.wishlist.indexOf(id);
  if (idx === -1) { state.wishlist.push(id); toast('Added to wishlist'); }
  else { state.wishlist.splice(idx, 1); toast('Removed from wishlist'); }
  localStorage.setItem('edgeProducts_wishlist', JSON.stringify(state.wishlist));
  renderWishlistCount();
  renderProductGrid();
}

function renderWishlistCount() {
  const countEl = el('wishlist-count');
  if (countEl) countEl.textContent = state.wishlist.length;
}

function renderGrid(container, items, allowEmpty) {
  container.innerHTML = '';
  if (!items.length) {
    if (allowEmpty) container.innerHTML = '<div class="empty-cat" style="grid-column:1/-1;"><b>No listings found</b></div>';
    return;
  }
  items.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    const cColor = getCategoryColor((p.category || p.cat || '').toLowerCase());
    const cTint = getCategoryTint((p.category || p.cat || '').toLowerCase());
    card.style.setProperty('--cat-color', cColor);
    card.style.setProperty('--cat-tint', cTint);
    const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'assets/no-goods-placeholder.jpg';
    const priceVal = (typeof p.price === 'number') ? p.price.toLocaleString() : (p.price || '0');
    const isWished = state.wishlist.includes(p.id);
    const moqVal = p.moq || 1;
    let badgeHtml = '';
    const biz = state.businesses.find(b => b.id === p.businessId);
    if (biz && biz.isVerified) {
      badgeHtml = '<span class="card-badge verified">VERIFIED SUPPLIER</span>';
    } else if (p.trending) {
      badgeHtml = '<span class="card-badge trending">TRENDING</span>';
    } else if (p.badge) {
      badgeHtml = `<span class="card-badge">${esc(p.badge)}</span>`;
    }
    card.innerHTML = `
      <div class="card-media" onclick="location.hash='#/product/${p.id}'" style="cursor:pointer;">
        <img src="${imgUrl}" alt="${esc(p.name)}" onerror="this.src='assets/no-goods-placeholder.jpg'">
        ${badgeHtml}
        <button class="wishlist-btn ${isWished ? 'active' : ''}" data-id="${p.id}" title="Add to wishlist">♥</button>
      </div>
      <div class="card-body">
        <div class="name">${esc(p.name)}</div>
        <div class="stars">★★★★★ <span class="count">(${p.reviews || 5})</span></div>
        <div class="price">GHS ${priceVal}</div>
        <div class="moq">MOQ: ${moqVal} unit${moqVal > 1 ? 's' : ''}</div>
        <div class="card-actions">
          <button class="view-btn" onclick="location.hash='#/product/${p.id}'">Details</button>
          <button class="primary add-btn">Add to Cart</button>
        </div>
      </div>
    `;
    card.querySelector('.add-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[CART DEBUG] Add to Cart clicked:', p.id, p.name);
      addToCart(p.id, 1);
    });
    const wishBtn = card.querySelector('.wishlist-btn');
    if (wishBtn) wishBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleWishlist(p.id); });
    container.appendChild(card);
  });
}
