/**
 * SELLPAL / INVERCAJAS - Módulo de Reportes Administrativos
 * Análisis de ventas, rotación de productos, distribución de pagos e inventario.
 * Exportación a formato CSV (Excel) y generación de PDF para impresión.
 */

const AdminReports = (function () {
  let currentFilter = 'all';
  let currentCategory = 'all';
  let cachedData = null;

  async function init() {
    loadCategories();
    setupEventListeners();
    await loadReports();
  }

  async function loadCategories() {
    try {
      const categorias = await ApiService.getCategorias();
      const select = document.getElementById('reportCategorySelect');
      if (select) {
        select.innerHTML = '<option value="all">Todas las categorías</option>' +
          categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
      }
    } catch (e) {
      console.error('Error al cargar categorías:', e);
    }
  }

  function setupEventListeners() {
    const periodButtons = document.querySelectorAll('[data-report-period]');
    periodButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        periodButtons.forEach(b => b.classList.remove('active', 'btn-primary'));
        periodButtons.forEach(b => b.classList.add('btn-outline-primary'));
        
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-outline-primary');
        
        currentFilter = btn.getAttribute('data-report-period');
        loadReports();
      });
    });

    const catSelect = document.getElementById('reportCategorySelect');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        loadReports();
      });
    }
  }

  async function loadReports() {
    const loader = document.getElementById('reportLoader');
    const content = document.getElementById('reportContent');
    if (loader) loader.style.display = 'block';
    if (content) content.style.opacity = '0.5';

    try {
      const data = await ApiService.getReportData(currentFilter, currentCategory);
      cachedData = data;
      renderKPIs(data);
      renderTopProducts(data);
      renderPaymentMethods(data);
      renderStockAlerts(data);
      renderRecentOrdersSummary(data);

      const printDateEl = document.getElementById('printReportDate');
      if (printDateEl) {
        printDateEl.textContent = new Date().toLocaleString('es-CO');
      }
    } catch (err) {
      console.error('Error al generar reportes:', err);
    } finally {
      if (loader) loader.style.display = 'none';
      if (content) content.style.opacity = '1';
    }
  }

  function renderKPIs(data) {
    const kpiVentas = document.getElementById('kpiTotalVentas');
    const kpiPedidos = document.getElementById('kpiTotalPedidos');
    const kpiTicket = document.getElementById('kpiTicketPromedio');
    const kpiCumplimiento = document.getElementById('kpiTasaCumplimiento');
    const kpiValorInv = document.getElementById('kpiValorInventario');

    if (kpiVentas) kpiVentas.textContent = ApiService.formatCOP(data.totalVentas);
    if (kpiPedidos) kpiPedidos.textContent = data.totalPedidos;
    if (kpiTicket) kpiTicket.textContent = ApiService.formatCOP(data.ticketPromedio);
    if (kpiCumplimiento) kpiCumplimiento.textContent = `${data.tasaCumplimiento}%`;
    if (kpiValorInv) kpiValorInv.textContent = ApiService.formatCOP(data.valorInventario);
  }

  function renderTopProducts(data) {
    const tbody = document.getElementById('topProductsTableBody');
    if (!tbody) return;

    if (!data.topProductos || data.topProductos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No hay ventas registradas en el período seleccionado.</td></tr>`;
      return;
    }

    const maxUnits = Math.max(...data.topProductos.map(p => p.cantidadTotal), 1);

    tbody.innerHTML = data.topProductos.slice(0, 5).map((p, idx) => {
      const pct = Math.round((p.cantidadTotal / maxUnits) * 100);
      let badgeClass = 'bg-secondary';
      if (idx === 0) badgeClass = 'bg-warning text-dark fw-bold';
      else if (idx === 1) badgeClass = 'bg-light text-dark border';
      else if (idx === 2) badgeClass = 'bg-warning-subtle text-dark';

      return `
        <tr>
          <td class="text-center"><span class="badge ${badgeClass} rounded-pill px-2">#${idx + 1}</span></td>
          <td>
            <strong>${p.nombre}</strong>
            <div class="small text-muted">${p.codigo || 'SKU-00' + p.productoId}</div>
          </td>
          <td class="text-center fw-bold">${p.cantidadTotal} uds</td>
          <td class="text-end fw-bold text-success">${ApiService.formatCOP(p.dineroTotal)}</td>
          <td style="width: 150px;">
            <div class="progress report-progress-bar">
              <div class="progress-bar bg-primary" style="width: ${pct}%"></div>
            </div>
            <span class="small text-muted" style="font-size: 0.72rem;">${pct}% del líder</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderPaymentMethods(data) {
    const elEfectivo = document.getElementById('payEfectivoTotal');
    const elTransferencia = document.getElementById('payTransferenciaTotal');
    const elNequi = document.getElementById('payNequiTotal');

    const totalMetodos = (data.pagosPorMetodo.efectivo + data.pagosPorMetodo.transferencia + data.pagosPorMetodo.nequi) || 1;

    if (elEfectivo) elEfectivo.textContent = ApiService.formatCOP(data.pagosPorMetodo.efectivo);
    if (elTransferencia) elTransferencia.textContent = ApiService.formatCOP(data.pagosPorMetodo.transferencia);
    if (elNequi) elNequi.textContent = ApiService.formatCOP(data.pagosPorMetodo.nequi);

    const barEf = document.getElementById('payBarEfectivo');
    const barTr = document.getElementById('payBarTransferencia');
    const barNe = document.getElementById('payBarNequi');

    if (barEf) barEf.style.width = Math.round((data.pagosPorMetodo.efectivo / totalMetodos) * 100) + '%';
    if (barTr) barTr.style.width = Math.round((data.pagosPorMetodo.transferencia / totalMetodos) * 100) + '%';
    if (barNe) barNe.style.width = Math.round((data.pagosPorMetodo.nequi / totalMetodos) * 100) + '%';
  }

  function renderStockAlerts(data) {
    const tbody = document.getElementById('stockAlertsTableBody');
    if (!tbody) return;

    if (!data.productosBajoStock || data.productosBajoStock.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-success py-3"><i class="bi bi-check-circle me-1"></i>Todos los productos tienen existencias adecuadas.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.productosBajoStock.map(p => `
      <tr>
        <td><strong>${p.nombre}</strong> <span class="small text-muted">(${p.marca || 'INVERCAJAS'})</span></td>
        <td class="text-center"><span class="badge ${p.stock <= 0 ? 'bg-danger' : 'bg-warning text-dark'}">${p.stock} uds</span></td>
        <td class="text-center text-muted">${p.stockMinimo || 10} uds</td>
        <td class="text-end">
          <span class="badge ${p.stock <= 0 ? 'bg-danger' : 'bg-warning text-dark'}">${p.estado}</span>
        </td>
      </tr>
    `).join('');
  }

  function renderRecentOrdersSummary(data) {
    const tbody = document.getElementById('reportOrdersTableBody');
    if (!tbody) return;

    if (!data.pedidos || data.pedidos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay pedidos en este rango.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.pedidos.slice(0, 6).map(p => `
      <tr>
        <td><strong>${p.codigo}</strong></td>
        <td>${p.clienteNombre}</td>
        <td class="small text-muted">${p.fecha}</td>
        <td class="text-end fw-bold">${ApiService.formatCOP(p.total)}</td>
        <td class="text-center"><span class="badge ${p.estado === 'Entregado' ? 'bg-success' : p.estado === 'Despachado' ? 'bg-primary' : 'bg-warning text-dark'}">${p.estado}</span></td>
      </tr>
    `).join('');
  }

  function exportReportCSV() {
    if (!cachedData) {
      alert('Aún no se han cargado los datos del reporte.');
      return;
    }

    const rows = [
      ['REPORTE EJECUTIVO COMERCIAL Y DE INVENTARIO - SELLPAL INVERCAJAS S.A.S.'],
      ['Fecha de Generación', new Date().toLocaleString('es-CO')],
      ['Periodo Filtrado', currentFilter],
      [''],
      ['MÉTRICA', 'VALOR'],
      ['Ventas Totales (COP)', cachedData.totalVentas],
      ['Total de Pedidos', cachedData.totalPedidos],
      ['Ticket Promedio (COP)', cachedData.ticketPromedio],
      ['Valorización Inventario (COP)', cachedData.valorInventario],
      ['Total Unidades en Bodega', cachedData.totalItemsInventario],
      ['Tasa de Cumplimiento Entregas (%)', cachedData.tasaCumplimiento + '%'],
      [''],
      ['PAGOS POR MÉTODO'],
      ['Efectivo Contra Entrega', cachedData.pagosPorMetodo.efectivo],
      ['Transferencia Bancaria', cachedData.pagosPorMetodo.transferencia],
      ['Billeteras Digitales (Nequi/Daviplata)', cachedData.pagosPorMetodo.nequi],
      [''],
      ['TOP 5 PRODUCTOS MÁS VENDIDOS'],
      ['Puesto', 'Producto', 'Código / SKU', 'Cantidad Total Vendida', 'Total en Ventas (COP)']
    ];

    if (cachedData.topProductos && cachedData.topProductos.length > 0) {
      cachedData.topProductos.forEach((p, idx) => {
        rows.push([
          `#${idx + 1}`,
          `"${p.nombre.replace(/"/g, '""')}"`,
          p.codigo || 'SKU-' + p.productoId,
          p.cantidadTotal,
          p.dineroTotal
        ]);
      });
    } else {
      rows.push(['-', 'Sin ventas registradas en el período', '-', 0, 0]);
    }

    rows.push(['']);
    rows.push(['ALERTAS DE INVENTARIO CRÍTICO']);
    rows.push(['Producto', 'Stock Actual', 'Stock Mínimo', 'Estado']);
    if (cachedData.productosBajoStock && cachedData.productosBajoStock.length > 0) {
      cachedData.productosBajoStock.forEach(p => {
        rows.push([
          `"${p.nombre.replace(/"/g, '""')}"`,
          p.stock,
          p.stockMinimo || 10,
          p.estado
        ]);
      });
    } else {
      rows.push(['Inventario en niveles óptimos', '-', '-', 'OK']);
    }

    // Unir con saltos de línea y anteponer BOM para UTF-8 en Excel
    const csvContent = '\uFEFF' + rows.map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_SELLPAL_${currentFilter}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Registrar en auditoría
    const user = (window.Auth && Auth.getSession()) || { nombre: 'Administrador', rol: 'admin' };
    if (window.ApiService && typeof ApiService.logActivity === 'function') {
      ApiService.logActivity('REPORTE', 'Reportes', `Exportación de reporte comercial en formato CSV (Filtro: ${currentFilter})`, user.nombre, 'Administrador');
    }
  }

  function printReportPDF() {
    const user = (window.Auth && Auth.getSession()) || { nombre: 'Administrador', rol: 'admin' };
    if (window.ApiService && typeof ApiService.logActivity === 'function') {
      ApiService.logActivity('REPORTE', 'Reportes', `Impresión / Exportación PDF de reporte comercial`, user.nombre, 'Administrador');
    }
    // Asegurar que no quede una factura individual en modo print
    const inv = document.getElementById('invoicePrintArea');
    if (inv) inv.innerHTML = '';
    window.print();
  }

  // ==================== FACTURAS INDIVIDUALES POR CLIENTE ====================

  let allPedidosForInvoices = [];
  let clientesForFilter = [];

  async function loadInvoicesSection() {
    try {
      const [pedidos, clientes] = await Promise.all([
        ApiService.getPedidos(),
        ApiService.getClientes()
      ]);
      allPedidosForInvoices = (pedidos || []).filter(p => p.estado !== 'Cancelado');
      clientesForFilter = clientes || [];

      const select = document.getElementById('invoiceClientFilter');
      if (select) {
        select.innerHTML = '<option value="all">Todos los clientes</option>' +
          clientesForFilter.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
      }

      renderInvoicesTable('all');
    } catch (e) {
      console.error('Error al cargar facturas:', e);
      const tbody = document.getElementById('invoicesTableBody');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">No se pudieron cargar las facturas.</td></tr>`;
      }
    }
  }

  function renderInvoicesTable(clientId) {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;

    let list = [...allPedidosForInvoices];
    if (clientId && clientId !== 'all') {
      list = list.filter(p => String(p.clienteId) === String(clientId));
    }

    // Ordenar por fecha descendente
    list.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay facturas / pedidos para este cliente.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => `
      <tr>
        <td><strong class="text-primary">${p.codigo || 'PED-' + p.id}</strong></td>
        <td>${p.clienteNombre || '—'}</td>
        <td class="small text-muted">${p.fecha || '—'}</td>
        <td class="small">${p.metodoPago || '—'}</td>
        <td class="text-end fw-bold">${ApiService.formatCOP(p.total)}</td>
        <td class="text-center">
          <span class="badge ${p.estado === 'Entregado' ? 'bg-success' : p.estado === 'Enviado' || p.estado === 'Despachado' ? 'bg-primary' : 'bg-warning text-dark'}">${p.estado || '—'}</span>
        </td>
        <td class="text-center">
          <button type="button" class="btn btn-sm btn-outline-primary" title="Ver / Imprimir factura" onclick="AdminReports.openInvoice(${p.id})">
            <i class="bi bi-receipt me-1"></i> Factura
          </button>
        </td>
      </tr>
    `).join('');
  }

  function onInvoiceClientFilterChange() {
    const select = document.getElementById('invoiceClientFilter');
    renderInvoicesTable(select ? select.value : 'all');
  }

  async function openInvoice(pedidoId) {
    try {
      let pedido = allPedidosForInvoices.find(p => Number(p.id) === Number(pedidoId));
      if (!pedido && window.ApiService.getPedidoById) {
        pedido = await ApiService.getPedidoById(pedidoId);
      }
      if (!pedido) {
        alert('No se encontró el pedido / factura.');
        return;
      }

      // Enriquecer con datos del cliente si es posible
      let cliente = null;
      if (pedido.clienteId && clientesForFilter.length) {
        cliente = clientesForFilter.find(c => Number(c.id) === Number(pedido.clienteId));
      }

      const modalBody = document.getElementById('invoiceModalBody');
      const modalEl = document.getElementById('invoiceModal');
      if (!modalBody || !modalEl) return;

      modalBody.innerHTML = buildInvoiceHTML(pedido, cliente);
      const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      bsModal.show();

      // Guardar HTML para impresión
      const printArea = document.getElementById('invoicePrintArea');
      if (printArea) printArea.innerHTML = buildInvoiceHTML(pedido, cliente, true);

      const user = (window.Auth && Auth.getSession()) || { nombre: 'Administrador' };
      if (window.ApiService && typeof ApiService.logActivity === 'function') {
        ApiService.logActivity('FACTURA', 'Reportes', `Visualización de factura individual: ${pedido.codigo} — ${pedido.clienteNombre}`, user.nombre, 'Administrador');
      }
    } catch (e) {
      console.error(e);
      alert('Error al generar la factura.');
    }
  }

  function buildInvoiceHTML(pedido, cliente, forPrint = false) {
    const items = Array.isArray(pedido.items) ? pedido.items : [];
    const itemsRows = items.map((it, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><small class="text-muted">${it.codigo || ''}</small><br>${it.nombre || 'Producto'}</td>
        <td class="text-center">${it.cantidad || 0}</td>
        <td class="text-end">${ApiService.formatCOP(it.precio)}</td>
        <td class="text-end fw-semibold">${ApiService.formatCOP(it.subtotal || (it.precio * it.cantidad))}</td>
      </tr>
    `).join('') || `<tr><td colspan="5" class="text-center text-muted">Sin ítems detallados</td></tr>`;

    const docCliente = cliente
      ? `${cliente.tipoDocumento || 'NIT/CC'}: ${cliente.documento || '—'}`
      : 'Documento: —';
    const dirCliente = cliente?.direccion || pedido.direccionEntrega || '—';
    const telCliente = cliente?.telefono || '—';
    const emailCliente = cliente?.email || '—';
    const facturaNum = 'FAC-' + String(pedido.codigo || pedido.id).replace(/^PED-?/i, '');

    return `
      <div class="invoice-document ${forPrint ? '' : ''}">
        <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
          <div>
            <h4 class="fw-bold text-primary mb-1">INVERCAJAS S.A.S.</h4>
            <div class="small text-muted">
              Plataforma SELLPAL · Distribución Mayorista<br>
              Parque Industrial Celta, Km 7 Vía Medellín, Bodega 14<br>
              PBX: (601) 745-8900 · distribucion@invercajas.com.co<br>
              NIT: 900.543.210-1
            </div>
          </div>
          <div class="text-end">
            <span class="badge bg-primary fs-6 mb-2">FACTURA DE VENTA</span>
            <div class="fw-bold">${facturaNum}</div>
            <div class="small text-muted">Pedido: ${pedido.codigo || pedido.id}</div>
            <div class="small text-muted">Fecha: ${pedido.fecha || '—'}</div>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-md-6">
            <h6 class="fw-bold text-uppercase small text-muted mb-2">Facturado a</h6>
            <div class="fw-bold">${pedido.clienteNombre || 'Cliente'}</div>
            <div class="small">${docCliente}</div>
            <div class="small">${dirCliente}</div>
            <div class="small">Tel: ${telCliente} · ${emailCliente}</div>
          </div>
          <div class="col-md-6">
            <h6 class="fw-bold text-uppercase small text-muted mb-2">Detalles de la operación</h6>
            <div class="small"><strong>Método de pago:</strong> ${pedido.metodoPago || '—'}</div>
            <div class="small"><strong>Estado del pedido:</strong> ${pedido.estado || '—'}</div>
            <div class="small"><strong>Dirección de entrega:</strong> ${pedido.direccionEntrega || '—'}</div>
            ${pedido.notas ? `<div class="small"><strong>Notas:</strong> ${pedido.notas}</div>` : ''}
          </div>
        </div>

        <div class="table-responsive mb-3">
          <table class="table table-sm table-bordered align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="text-center" style="width:40px">#</th>
                <th>Descripción / Producto</th>
                <th class="text-center" style="width:70px">Cant.</th>
                <th class="text-end" style="width:110px">P. Unitario</th>
                <th class="text-end" style="width:120px">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
        </div>

        <div class="row justify-content-end">
          <div class="col-md-5">
            <table class="table table-sm mb-0">
              <tr>
                <td class="text-muted">Subtotal</td>
                <td class="text-end">${ApiService.formatCOP(pedido.subtotal)}</td>
              </tr>
              <tr>
                <td class="text-muted">IVA (19%)</td>
                <td class="text-end">${ApiService.formatCOP(pedido.iva)}</td>
              </tr>
              <tr class="fw-bold fs-5">
                <td>TOTAL</td>
                <td class="text-end text-primary">${ApiService.formatCOP(pedido.total)}</td>
              </tr>
            </table>
          </div>
        </div>

        <div class="mt-4 pt-3 border-top small text-muted text-center">
          Documento generado por SELLPAL · INVERCAJAS S.A.S. · ${new Date().toLocaleString('es-CO')}<br>
          Este comprobante corresponde a la operación comercial mayorista asociada al pedido indicado.
        </div>
      </div>
    `;
  }

  function printCurrentInvoice() {
    const printArea = document.getElementById('invoicePrintArea');
    if (!printArea || !printArea.innerHTML.trim()) {
      alert('Abre primero una factura para imprimirla.');
      return;
    }
    document.body.classList.add('printing-invoice');
    const cleanup = () => {
      document.body.classList.remove('printing-invoice');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    // Fallback si afterprint no dispara
    setTimeout(cleanup, 1000);
  }

  // Ampliar init
  const _origInit = init;
  async function initWithInvoices() {
    await _origInit();
    await loadInvoicesSection();
    const select = document.getElementById('invoiceClientFilter');
    if (select) {
      select.addEventListener('change', onInvoiceClientFilterChange);
    }
  }

  return {
    init: initWithInvoices,
    loadReports,
    exportReportCSV,
    printReportPDF,
    loadInvoicesSection,
    openInvoice,
    printCurrentInvoice,
    onInvoiceClientFilterChange
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  AdminReports.init();
});
