/**
 * SELLPAL / INVERCAJAS - Módulo de Gestión del Carrito de Compras
 * Sincronizado en tiempo real con localStorage y con el badge del navbar.
 */

const CART_STORAGE_KEY = 'SELLPAL_SHOPPING_CART_V1';

const Cart = (function () {
  function getItems() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error al obtener carrito:', e);
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    updateNavbarBadge();
  }

  function addItem(product, quantity = 1) {
    const items = getItems();
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);
    const existingIndex = items.findIndex(item => Number(item.productoId) === Number(product.id));

    if (existingIndex > -1) {
      const newQty = items[existingIndex].cantidad + qtyToAdd;
      if (product.stock !== undefined && newQty > product.stock) {
        showToastNotification(`Solo quedan ${product.stock} unidades disponibles de este producto`, 'warning');
        items[existingIndex].cantidad = product.stock;
      } else {
        items[existingIndex].cantidad = newQty;
        showToastNotification(`Se actualizaron las cantidades en el carrito (${items[existingIndex].cantidad} uds)`, 'success');
      }
    } else {
      if (product.stock !== undefined && product.stock < qtyToAdd) {
        showToastNotification(`No hay suficiente inventario disponible`, 'warning');
        return false;
      }
      items.push({
        productoId: Number(product.id),
        codigo: product.codigo,
        nombre: product.nombre,
        marca: product.marca,
        precio: Number(product.precio),
        imagen: product.imagen || 'assets/img/prod_placeholder.svg',
        cantidad: qtyToAdd,
        stockMax: Number(product.stock) || 999
      });
      showToastNotification(`¡Producto agregado al carrito de pedidos!`, 'success');
    }

    saveItems(items);
    return true;
  }

  function updateQty(productId, newQty) {
    const items = getItems();
    const target = items.find(i => Number(i.productoId) === Number(productId));
    if (!target) return;

    const parsedQty = parseInt(newQty, 10);
    if (parsedQty <= 0) {
      removeItem(productId);
      return;
    }

    if (target.stockMax && parsedQty > target.stockMax) {
      target.cantidad = target.stockMax;
      showToastNotification(`Máximo stock disponible alcanzado (${target.stockMax})`, 'warning');
    } else {
      target.cantidad = parsedQty;
    }

    saveItems(items);
  }

  function removeItem(productId) {
    let items = getItems();
    items = items.filter(i => Number(i.productoId) !== Number(productId));
    saveItems(items);
    showToastNotification('Producto retirado del carrito', 'info');
  }

  function clear() {
    localStorage.removeItem(CART_STORAGE_KEY);
    updateNavbarBadge();
  }

  function getCount() {
    const items = getItems();
    return items.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
  }

  function getSubtotal() {
    const items = getItems();
    return items.reduce((sum, item) => sum + (Number(item.precio) * Number(item.cantidad)), 0);
  }

  function getIVA() {
    return Math.round(getSubtotal() * 0.19);
  }

  function getTotal() {
    return getSubtotal() + getIVA();
  }

  function updateNavbarBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const totalCount = getCount();
    badges.forEach(badge => {
      badge.textContent = totalCount;
      if (totalCount > 0) {
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    });
  }

  // Notificación Toast flotante
  function showToastNotification(message, type = 'success') {
    let container = document.querySelector('.toast-container-custom');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container-custom';
      document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-success text-white' : 
                    type === 'warning' ? 'bg-warning text-dark' : 
                    type === 'danger' ? 'bg-danger text-white' : 'bg-primary text-white';

    toastEl.className = `toast align-items-center ${bgClass} border-0 shadow-lg show mb-2`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'} fs-5"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;

    container.appendChild(toastEl);
    setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 300);
    }, 3500);
  }

  // Actualizar el badge tan pronto cargue el script
  document.addEventListener('DOMContentLoaded', () => {
    updateNavbarBadge();
  });

  return {
    getItems,
    addItem,
    updateQty,
    removeItem,
    clear,
    getCount,
    getSubtotal,
    getIVA,
    getTotal,
    updateNavbarBadge,
    showToastNotification
  };
})();

window.Cart = Cart;
