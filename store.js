/**
 * SELLPAL / INVERCAJAS - Módulo de Tienda y Catálogo
 * Renderizado dinámico, filtros por categoría, búsqueda en tiempo real,
 * ordenamiento y visor de detalle de productos.
 */

const Store = (function () {
  let allProducts = [];
  let selectedCategory = 'all';
  let searchTerm = '';
  let sortBy = 'default';

  function resolveImagePath(imgPath) {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://') || imgPath.startsWith('data:')) {
      return imgPath;
    }
    // Normalizar quitando prefijos previos
    let clean = imgPath.replace(/^(\.\.\/)+/, '');
    const pathname = window.location.pathname;
    if (pathname.includes('/pages/admin/')) {
      return '../../' + clean;
    } else if (pathname.includes('/pages/')) {
      return '../' + clean;
    }
    return clean;
  }

  async function initCatalog() {
    try {
      allProducts = await window.ApiService.getProductos();
      renderCategoryFilters();
      applyFiltersAndRender();
      setupEventListeners();
    } catch (e) {
      console.error('Error al inicializar catálogo:', e);
    }
  }

  async function initFeaturedProducts(containerId = 'featuredProductsContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const products = await window.ApiService.getProductos();
      const featured = products.filter(p => p.destacado || p.stock > 10).slice(0, 4);

      container.innerHTML = featured.map(prod => createProductCardHTML(prod)).join('');
    } catch (e) {
      console.error('Error al cargar destacados:', e);
    }
  }

  async function renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    try {
      const categories = await window.ApiService.getCategorias();
      let html = `
        <button class="btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline-secondary'} category-filter-btn rounded-pill px-3 me-2 mb-2" data-category="all">
          Todos los Productos
        </button>
      `;

      categories.forEach(cat => {
        const isActive = String(selectedCategory) === String(cat.id);
        html += `
          <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'} category-filter-btn rounded-pill px-3 me-2 mb-2" data-category="${cat.id}">
            ${cat.nombre}
          </button>
        `;
      });

      container.innerHTML = html;

      // Event delegation
      container.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedCategory = btn.getAttribute('data-category');
          container.querySelectorAll('.category-filter-btn').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-outline-secondary');
          });
          btn.classList.remove('btn-outline-secondary');
          btn.classList.add('btn-primary');
          applyFiltersAndRender();
        });
      });
    } catch (e) {
      console.error('Error al cargar categorías:', e);
    }
  }

  function applyFiltersAndRender() {
    const container = document.getElementById('catalogGrid');
    const counterEl = document.getElementById('catalogCount');
    if (!container) return;

    let filtered = [...allProducts];

    // Filtro por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => String(p.categoriaId) === String(selectedCategory));
    }

    // Filtro por búsqueda
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.marca.toLowerCase().includes(term) ||
        p.codigo.toLowerCase().includes(term) ||
        (p.categoriaNombre && p.categoriaNombre.toLowerCase().includes(term))
      );
    }

    // Ordenamiento
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => a.precio - b.precio);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => b.precio - a.precio);
    } else if (sortBy === 'name-asc') {
      filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    // Contador de resultados
    if (counterEl) {
      counterEl.textContent = `${filtered.length} productos encontrados`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-box2 text-muted" style="font-size: 3.5rem;"></i>
          <h5 class="mt-3 text-secondary">No se encontraron productos</h5>
          <p class="text-muted">Intenta buscar con otros términos o cambia los filtros de categoría.</p>
          <button class="btn btn-outline-primary btn-sm mt-2" onclick="Store.resetFilters()">Restablecer filtros</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(prod => `
      <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
        ${createProductCardHTML(prod)}
      </div>
    `).join('');
  }

  function createProductCardHTML(prod) {
    const isOutOfStock = prod.stock <= 0;
    const isLowStock = prod.stock > 0 && prod.stock <= (prod.stockMinimo || 10);

    let stockBadge = '<span class="badge bg-success product-stock-badge"><i class="bi bi-check-circle me-1"></i>En Stock</span>';
    if (isOutOfStock) {
      stockBadge = '<span class="badge bg-danger product-stock-badge"><i class="bi bi-x-circle me-1"></i>Agotado</span>';
    } else if (isLowStock) {
      stockBadge = `<span class="badge bg-warning text-dark product-stock-badge"><i class="bi bi-exclamation-triangle me-1"></i>Últimas ${prod.stock}</span>`;
    }

    return `
      <div class="product-card shadow-sm">
        <div class="product-img-wrapper">
          <span class="product-brand-tag">${prod.marca.split('/')[1] || prod.marca}</span>
          ${stockBadge}
          <img src="${resolveImagePath(prod.imagen)}" alt="${prod.nombre}" class="product-img" onerror="this.src='${resolveImagePath('assets/img/prod_placeholder.svg')}'">
        </div>
        <div class="product-body">
          <span class="product-category">${prod.categoriaNombre || 'Distribución'}</span>
          <h6 class="product-title" title="${prod.nombre}">${prod.nombre}</h6>
          <p class="product-description">${prod.descripcion ? prod.descripcion.substring(0, 85) + '...' : ''}</p>
          
          <div class="product-price-box">
            <div>
              <span class="product-presentation text-muted">${prod.unidadMedida || 'Unidad Mayorista'}</span>
              <span class="product-price">${window.ApiService.formatCOP(prod.precio)}</span>
            </div>
          </div>
          
          <div class="d-grid gap-2 mt-3">
            <button class="btn btn-accent btn-sm ${isOutOfStock ? 'disabled' : ''}" 
              onclick="Store.handleAddToCart(${prod.id})" 
              ${isOutOfStock ? 'disabled' : ''}>
              <i class="bi bi-cart-plus me-1"></i> ${isOutOfStock ? 'Agotado' : 'Agregar al Pedido'}
            </button>
            <button class="btn btn-outline-secondary btn-sm py-1" onclick="Store.openQuickView(${prod.id})">
              <i class="bi bi-eye me-1"></i> Ver Detalle
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function handleAddToCart(productId) {
    const prod = allProducts.find(p => Number(p.id) === Number(productId));
    if (prod) {
      window.Cart.addItem(prod, 1);
    }
  }

  async function openQuickView(productId) {
    const prod = allProducts.find(p => Number(p.id) === Number(productId)) || await window.ApiService.getProductoById(productId);
    if (!prod) return;

    let modalEl = document.getElementById('quickViewModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'quickViewModal';
      modalEl.className = 'modal fade';
      modalEl.tabIndex = -1;
      document.body.appendChild(modalEl);
    }

    const isOutOfStock = prod.stock <= 0;

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-light">
            <h5 class="modal-title fw-bold text-dark">
              <i class="bi bi-box-seam text-primary me-2"></i>Detalle de Producto
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <div class="row align-items-center">
              <div class="col-md-5 text-center p-3 bg-light rounded-3 mb-3 mb-md-0">
                <img src="${resolveImagePath(prod.imagen)}" alt="${prod.nombre}" class="img-fluid" style="max-height: 220px;" onerror="this.src='${resolveImagePath('assets/img/prod_placeholder.svg')}'">
                <div class="mt-3">
                  <span class="badge bg-dark">${prod.codigo}</span>
                  <span class="badge bg-primary ms-1">${prod.marca}</span>
                </div>
              </div>
              <div class="col-md-7">
                <span class="text-uppercase text-muted fw-bold small">${prod.categoriaNombre}</span>
                <h4 class="fw-bold mt-1 text-dark">${prod.nombre}</h4>
                <p class="text-muted small">${prod.descripcion}</p>
                
                <div class="p-3 bg-light rounded-3 my-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-muted">Presentación Comercial:</span>
                    <span class="fw-bold">${prod.unidadMedida || 'Caja / Display'}</span>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="text-muted">Disponibilidad en Bodega:</span>
                    <span class="fw-bold ${prod.stock <= (prod.stockMinimo || 10) ? 'text-warning' : 'text-success'}">
                      ${prod.stock} unidades (${prod.estado})
                    </span>
                  </div>
                  <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span class="fs-6 fw-bold">Precio Mayorista:</span>
                    <span class="fs-4 fw-extrabold text-primary">${window.ApiService.formatCOP(prod.precio)}</span>
                  </div>
                </div>

                <div class="d-flex align-items-center gap-3">
                  <div class="input-group" style="width: 130px;">
                    <button class="btn btn-outline-secondary" type="button" onclick="Store.modalQtyChange(-1)">-</button>
                    <input type="number" class="form-control text-center fw-bold" id="modalProductQty" value="1" min="1" max="${prod.stock}">
                    <button class="btn btn-outline-secondary" type="button" onclick="Store.modalQtyChange(1)">+</button>
                  </div>
                  <button class="btn btn-accent flex-grow-1" onclick="Store.addToCartFromModal(${prod.id})" ${isOutOfStock ? 'disabled' : ''}>
                    <i class="bi bi-cart-plus me-1"></i> ${isOutOfStock ? 'Producto Agotado' : 'Agregar al Carrito'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  }

  function modalQtyChange(delta) {
    const input = document.getElementById('modalProductQty');
    if (!input) return;
    let val = parseInt(input.value, 10) || 1;
    val = Math.max(1, val + delta);
    const max = parseInt(input.getAttribute('max'), 10) || 999;
    if (val > max) val = max;
    input.value = val;
  }

  function addToCartFromModal(productId) {
    const input = document.getElementById('modalProductQty');
    const qty = input ? parseInt(input.value, 10) || 1 : 1;
    const prod = allProducts.find(p => Number(p.id) === Number(productId));
    if (prod) {
      window.Cart.addItem(prod, qty);
      const modalEl = document.getElementById('quickViewModal');
      const bsModal = bootstrap.Modal.getInstance(modalEl);
      if (bsModal) bsModal.hide();
    }
  }

  function resetFilters() {
    selectedCategory = 'all';
    searchTerm = '';
    sortBy = 'default';
    const searchInput = document.getElementById('catalogSearch');
    if (searchInput) searchInput.value = '';
    const sortSelect = document.getElementById('catalogSort');
    if (sortSelect) sortSelect.value = 'default';
    renderCategoryFilters();
    applyFiltersAndRender();
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('catalogSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        applyFiltersAndRender();
      });
    }

    const sortSelect = document.getElementById('catalogSort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        applyFiltersAndRender();
      });
    }
  }

  return {
    initCatalog,
    initFeaturedProducts,
    handleAddToCart,
    openQuickView,
    modalQtyChange,
    addToCartFromModal,
    resetFilters
  };
})();

window.Store = Store;
