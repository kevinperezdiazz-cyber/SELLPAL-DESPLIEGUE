/**
 * SELLPAL / INVERCAJAS - Módulo de Pedidos del Cliente
 * Consulta, renderizado de estados visuales y modal con desglose detallado de ítems.
 */

const Orders = (function () {
  let ordersList = [];
  let currentFilter = 'all';

  async function initOrdersPage() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    try {
      ordersList = await window.ApiService.getPedidos();
      renderOrders();
      setupFilterButtons();
    } catch (e) {
      console.error('Error al cargar pedidos:', e);
      container.innerHTML = `<div class="alert alert-danger">Error al cargar el historial de pedidos.</div>`;
    }
  }

  function renderOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    let filtered = [...ordersList];
    if (currentFilter !== 'all') {
      filtered = filtered.filter(o => o.estado.toLowerCase() === currentFilter.toLowerCase());
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 bg-white rounded-3 border">
          <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
          <h5 class="mt-3 text-secondary">No hay pedidos registrados con este estado</h5>
          <p class="text-muted small">Realiza tu primer pedido desde el catálogo mayorista.</p>
          <a href="catalogo.html" class="btn btn-accent btn-sm mt-2">Ir al Catálogo</a>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(order => createOrderCardHTML(order)).join('');
  }

  function getBadgeClass(status) {
    switch (status.toLowerCase()) {
      case 'pendiente': return 'badge-order-pendiente';
      case 'procesando': return 'badge-order-procesando';
      case 'enviado': return 'badge-order-enviado';
      case 'entregado': return 'badge-order-entregado';
      case 'cancelado': return 'badge-order-cancelado';
      default: return 'bg-secondary text-white';
    }
  }

  function getStatusIcon(status) {
    switch (status.toLowerCase()) {
      case 'pendiente': return 'bi-clock-history';
      case 'procesando': return 'bi-gear-wide-connected';
      case 'enviado': return 'bi-truck';
      case 'entregado': return 'bi-check2-circle';
      case 'cancelado': return 'bi-x-circle';
      default: return 'bi-info-circle';
    }
  }

  function createOrderCardHTML(order) {
    const badgeClass = getBadgeClass(order.estado);
    const icon = getStatusIcon(order.estado);
    const itemCount = Array.isArray(order.items) ? order.items.reduce((s, i) => s + (i.cantidad || 0), 0) : 0;

    return `
      <div class="order-card shadow-sm">
        <div class="d-flex flex-wrap justify-content-between align-items-center pb-3 border-bottom mb-3 gap-2">
          <div>
            <span class="text-muted small">Número de Pedido:</span>
            <h5 class="fw-bold text-dark mb-0">${order.codigo}</h5>
            <span class="text-muted small"><i class="bi bi-calendar3 me-1"></i>${order.fecha}</span>
          </div>
          <div class="text-end">
            <span class="badge-order ${badgeClass} mb-1">
              <i class="bi ${icon}"></i> ${order.estado}
            </span>
            <div class="small text-muted">${order.metodoPago}</div>
          </div>
        </div>

        <div class="row align-items-center">
          <div class="col-md-7 mb-2 mb-md-0">
            <div class="small text-muted mb-1">
              <i class="bi bi-geo-alt-fill text-danger me-1"></i>Entrega en: <span class="fw-medium text-dark">${order.direccionEntrega || 'Dirección registrada'}</span>
            </div>
            <div class="small text-muted">
              <i class="bi bi-boxes text-primary me-1"></i>Contenido: <span class="fw-medium text-dark">${order.items ? order.items.length : 0} referencias (${itemCount} unidades en total)</span>
            </div>
          </div>
          <div class="col-md-5 text-md-end">
            <div class="small text-muted">Total a Pagar:</div>
            <div class="fs-4 fw-extrabold text-primary">${window.ApiService.formatCOP(order.total)}</div>
            <button class="btn btn-outline-primary btn-sm mt-2" onclick="Orders.openOrderDetail(${order.id})">
              <i class="bi bi-receipt me-1"></i> Ver Detalle Completo
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async function openOrderDetail(orderId) {
    const order = ordersList.find(o => Number(o.id) === Number(orderId)) || await window.ApiService.getPedidoById(orderId);
    if (!order) return;

    let modalEl = document.getElementById('orderDetailModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'orderDetailModal';
      modalEl.className = 'modal fade';
      modalEl.tabIndex = -1;
      document.body.appendChild(modalEl);
    }

    const itemsRows = (order.items || []).map(item => `
      <tr>
        <td class="small fw-medium">${item.codigo || '-'}</td>
        <td class="small">${item.nombre}</td>
        <td class="text-center small">${item.cantidad}</td>
        <td class="text-end small">${window.ApiService.formatCOP(item.precio)}</td>
        <td class="text-end small fw-bold">${window.ApiService.formatCOP(item.subtotal || (item.precio * item.cantidad))}</td>
      </tr>
    `).join('');

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-dark text-white">
            <div>
              <h5 class="modal-title fw-bold mb-0">Detalle del Pedido ${order.codigo}</h5>
              <span class="small text-light opacity-75">Fecha: ${order.fecha}</span>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <div class="p-3 bg-light rounded-3 h-100">
                  <h6 class="fw-bold text-dark mb-2"><i class="bi bi-person-circle text-primary me-2"></i>Datos del Cliente</h6>
                  <p class="mb-1 small"><strong>Cliente:</strong> ${order.clienteNombre}</p>
                  <p class="mb-1 small"><strong>Dirección:</strong> ${order.direccionEntrega || 'N/A'}</p>
                  <p class="mb-0 small"><strong>Notas:</strong> ${order.notas || 'Sin observaciones'}</p>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 bg-light rounded-3 h-100">
                  <h6 class="fw-bold text-dark mb-2"><i class="bi bi-credit-card text-success me-2"></i>Estado & Pago</h6>
                  <p class="mb-1 small"><strong>Estado Actual:</strong> <span class="badge ${getBadgeClass(order.estado)}">${order.estado}</span></p>
                  <p class="mb-1 small"><strong>Forma de Pago:</strong> ${order.metodoPago}</p>
                  <p class="mb-0 small"><strong>Plataforma:</strong> SELLPAL / INVERCAJAS Mayorista</p>
                </div>
              </div>
            </div>

            <h6 class="fw-bold text-dark mb-2"><i class="bi bi-cart3 text-primary me-2"></i>Productos Solicitados</h6>
            <div class="table-responsive border rounded-3 mb-3">
              <table class="table table-sm table-striped mb-0">
                <thead class="table-light">
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th class="text-center">Cant.</th>
                    <th class="text-end">Unitario</th>
                    <th class="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </div>

            <div class="row justify-content-end">
              <div class="col-md-5">
                <ul class="list-group list-group-flush border rounded-3 p-2">
                  <li class="list-group-item d-flex justify-content-between align-items-center border-0 px-2 py-1 small">
                    <span class="text-muted">Subtotal:</span>
                    <span>${window.ApiService.formatCOP(order.subtotal || Math.round(order.total / 1.19))}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center border-0 px-2 py-1 small">
                    <span class="text-muted">IVA (19%):</span>
                    <span>${window.ApiService.formatCOP(order.iva || (order.total - Math.round(order.total / 1.19)))}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center border-0 px-2 py-2 fw-bold fs-6">
                    <span>Total:</span>
                    <span class="text-primary">${window.ApiService.formatCOP(order.total)}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
            <button type="button" class="btn btn-outline-primary btn-sm" onclick="window.print()">
              <i class="bi bi-printer me-1"></i> Imprimir Comprobante
            </button>
          </div>
        </div>
      </div>
    `;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
  }

  function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.order-status-filter');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-status');
        filterButtons.forEach(b => b.classList.remove('active', 'btn-primary'));
        filterButtons.forEach(b => b.classList.add('btn-outline-secondary'));
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-primary', 'active');
        renderOrders();
      });
    });
  }

  return {
    initOrdersPage,
    openOrderDetail
  };
})();

window.Orders = Orders;
