/**
 * SELLPAL / INVERCAJAS - Motor CRUD Unificado para el Panel de Control
 * Controla: Cargos, Empleados, Clientes, Categorías, Productos, Pedidos, Pagos y Entregas.
 * Incluye validación de formularios, modales Bootstrap, búsqueda y confirmaciones de eliminación.
 */

const CrudEngine = (function () {

  // ==========================================
  // DASHBOARD GENERAL
  // ==========================================
  async function initDashboard() {
    try {
      const [productos, clientes, pedidos, entregas] = await Promise.all([
        window.ApiService.getProductos(),
        window.ApiService.getClientes(),
        window.ApiService.getPedidos(),
        window.ApiService.getEntregas()
      ]);

      // KPIs
      const totalProdsEl = document.getElementById('kpiTotalProductos');
      if (totalProdsEl) totalProdsEl.textContent = productos.length;

      const totalClientesEl = document.getElementById('kpiTotalClientes');
      if (totalClientesEl) totalClientesEl.textContent = clientes.length;

      const totalPedidosEl = document.getElementById('kpiTotalPedidos');
      if (totalPedidosEl) totalPedidosEl.textContent = pedidos.length;

      const pedidosPendientes = pedidos.filter(p => p.estado === 'Pendiente');
      const pedidosPendientesEl = document.getElementById('kpiPedidosPendientes');
      if (pedidosPendientesEl) pedidosPendientesEl.textContent = pedidosPendientes.length;

      const totalVentas = pedidos
        .filter(p => p.estado !== 'Cancelado')
        .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
      const totalVentasEl = document.getElementById('kpiTotalVentas');
      if (totalVentasEl) totalVentasEl.textContent = window.ApiService.formatCOP(totalVentas);

      const entregasPendientes = entregas.filter(e => e.estado !== 'Entregado');
      const entregasPendientesEl = document.getElementById('kpiEntregasPendientes');
      if (entregasPendientesEl) entregasPendientesEl.textContent = entregasPendientes.length;

      // Alertas de Bajo Stock
      renderLowStockAlerts(productos);

      // Tabla de Pedidos Recientes
      renderRecentOrders(pedidos.slice(0, 5));

    } catch (e) {
      console.error('Error al cargar dashboard:', e);
    }
  }

  function renderLowStockAlerts(productos) {
    const container = document.getElementById('lowStockTableBody');
    if (!container) return;

    const lowStockList = productos.filter(p => p.stock <= (p.stockMinimo || 10));

    if (lowStockList.length === 0) {
      container.innerHTML = `<tr><td colspan="5" class="text-center text-success py-3"><i class="bi bi-check-circle me-1"></i>Todos los productos tienen niveles óptimos de stock</td></tr>`;
      return;
    }

    container.innerHTML = lowStockList.map(prod => `
      <tr>
        <td><span class="badge bg-dark">${prod.codigo}</span></td>
        <td class="fw-bold text-dark">${prod.nombre}</td>
        <td>${prod.categoriaNombre}</td>
        <td class="text-center">
          <span class="badge ${prod.stock === 0 ? 'bg-danger' : 'bg-warning text-dark'} fs-6 px-2">
            ${prod.stock} / min ${prod.stockMinimo || 10}
          </span>
        </td>
        <td>
          <a href="productos.html" class="btn btn-outline-primary btn-sm py-0 px-2">Reponer Stock</a>
        </td>
      </tr>
    `).join('');
  }

  function renderRecentOrders(recentList) {
    const container = document.getElementById('recentOrdersTableBody');
    if (!container) return;

    container.innerHTML = recentList.map(ord => {
      let badge = 'bg-warning text-dark';
      if (ord.estado === 'Entregado') badge = 'bg-success text-white';
      if (ord.estado === 'Enviado') badge = 'bg-info text-dark';
      if (ord.estado === 'Cancelado') badge = 'bg-danger text-white';

      return `
        <tr>
          <td><span class="fw-bold">${ord.codigo}</span></td>
          <td>${ord.clienteNombre}</td>
          <td>${ord.fecha}</td>
          <td class="fw-bold text-primary">${window.ApiService.formatCOP(ord.total)}</td>
          <td><span class="badge ${badge}">${ord.estado}</span></td>
          <td>
            <a href="pedidos.html" class="btn btn-sm btn-light border py-0 px-2">Gestionar</a>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // HELPER MODAL CONFIRMAR ELIMINACIÓN
  // ==========================================
  function confirmDelete(title, message, onConfirm) {
    let modalEl = document.getElementById('confirmDeleteModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'confirmDeleteModal';
      modalEl.className = 'modal fade';
      modalEl.tabIndex = -1;
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content border-0 shadow">
          <div class="modal-body text-center p-4">
            <div class="text-danger mb-3">
              <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem;"></i>
            </div>
            <h5 class="fw-bold mb-2">${title}</h5>
            <p class="text-muted small mb-4">${message}</p>
            <div class="d-flex justify-content-center gap-2">
              <button type="button" class="btn btn-light btn-sm px-3" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-danger btn-sm px-3" id="confirmDeleteActionBtn">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    document.getElementById('confirmDeleteActionBtn').onclick = async () => {
      bsModal.hide();
      await onConfirm();
    };
  }

  // ==========================================
  // CRUD 1: CARGOS
  // ==========================================
  async function initCargos() {
    const tableBody = document.getElementById('cargosTableBody');
    const searchInput = document.getElementById('cargosSearchInput');
    const createBtn = document.getElementById('btnNuevoCargo');
    const form = document.getElementById('cargoForm');
    const modalEl = document.getElementById('cargoModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

    let cargos = [];

    async function load() {
      cargos = await window.ApiService.getCargos();
      render(cargos);
    }

    function render(list) {
      if (!tableBody) return;
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No se encontraron cargos registrados.</td></tr>`;
        return;
      }
      tableBody.innerHTML = list.map(c => `
        <tr>
          <td><span class="text-muted fw-bold">#${c.id}</span></td>
          <td class="fw-bold text-dark">${c.nombre}</td>
          <td>${c.descripcion || '-'}</td>
          <td><span class="badge ${c.estado === 'Activo' ? 'bg-success' : 'bg-secondary'}">${c.estado}</span></td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn action-btn-edit" title="Editar" onclick="CrudEngine.editCargo(${c.id})"><i class="bi bi-pencil-fill"></i></button>
              <button class="action-btn action-btn-delete" title="Eliminar" onclick="CrudEngine.deleteCargo(${c.id})"><i class="bi bi-trash-fill"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const filtered = cargos.filter(c => c.nombre.toLowerCase().includes(val) || (c.descripcion && c.descripcion.toLowerCase().includes(val)));
        render(filtered);
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('cargoId').value = '';
        document.getElementById('cargoModalTitle').textContent = 'Registrar Nuevo Cargo';
        modal.show();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cargoId').value;
        const data = {
          nombre: document.getElementById('cargoNombre').value.trim(),
          descripcion: document.getElementById('cargoDescripcion').value.trim(),
          estado: document.getElementById('cargoEstado').value
        };

        if (id) {
          await window.ApiService.updateCargo(id, data);
          window.adminToast('Cargo actualizado exitosamente', 'success');
        } else {
          await window.ApiService.createCargo(data);
          window.adminToast('Cargo registrado exitosamente', 'success');
        }

        modal.hide();
        load();
      });
    }

    window.CrudEngine.editCargo = async (id) => {
      const c = cargos.find(item => Number(item.id) === Number(id));
      if (!c) return;
      document.getElementById('cargoId').value = c.id;
      document.getElementById('cargoNombre').value = c.nombre;
      document.getElementById('cargoDescripcion').value = c.descripcion || '';
      document.getElementById('cargoEstado').value = c.estado || 'Activo';
      document.getElementById('cargoModalTitle').textContent = 'Modificar Cargo';
      modal.show();
    };

    window.CrudEngine.deleteCargo = (id) => {
      confirmDelete('Eliminar Cargo', '¿Está seguro de eliminar este cargo laboral? Esta acción no se puede deshacer.', async () => {
        await window.ApiService.deleteCargo(id);
        window.adminToast('Cargo eliminado correctamente', 'info');
        load();
      });
    };

    load();
  }

  // ==========================================
  // CRUD 2: EMPLEADOS
  // ==========================================
  async function initEmpleados() {
    const tableBody = document.getElementById('empleadosTableBody');
    const searchInput = document.getElementById('empleadosSearchInput');
    const createBtn = document.getElementById('btnNuevoEmpleado');
    const form = document.getElementById('empleadoForm');
    const modalEl = document.getElementById('empleadoModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

    let empleados = [];
    let cargos = [];

    async function populateCargosSelect() {
      cargos = await window.ApiService.getCargos();
      const select = document.getElementById('empleadoCargoId');
      if (select) {
        select.innerHTML = `<option value="">Seleccione un cargo...</option>` +
          cargos.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
      }
    }

    async function load() {
      await populateCargosSelect();
      empleados = await window.ApiService.getEmpleados();
      render(empleados);
    }

    function render(list) {
      if (!tableBody) return;
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron empleados registrados.</td></tr>`;
        return;
      }
      tableBody.innerHTML = list.map(e => `
        <tr>
          <td><span class="text-muted fw-bold">#${e.id}</span></td>
          <td class="fw-bold">${e.documento}</td>
          <td class="text-dark fw-bold">${e.nombre}</td>
          <td><span class="badge bg-primary">${e.cargoNombre}</span></td>
          <td>${e.email}<br><small class="text-muted">${e.telefono}</small></td>
          <td><span class="badge ${e.estado === 'Activo' ? 'bg-success' : 'bg-secondary'}">${e.estado}</span></td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn action-btn-edit" title="Editar" onclick="CrudEngine.editEmpleado(${e.id})"><i class="bi bi-pencil-fill"></i></button>
              <button class="action-btn action-btn-delete" title="Eliminar" onclick="CrudEngine.deleteEmpleado(${e.id})"><i class="bi bi-trash-fill"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const filtered = empleados.filter(emp => 
          emp.nombre.toLowerCase().includes(val) || 
          emp.documento.includes(val) || 
          emp.cargoNombre.toLowerCase().includes(val)
        );
        render(filtered);
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('empleadoId').value = '';
        document.getElementById('empleadoModalTitle').textContent = 'Registrar Nuevo Empleado';
        modal.show();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('empleadoId').value;
        const cargoId = document.getElementById('empleadoCargoId').value;
        const cargoObj = cargos.find(c => Number(c.id) === Number(cargoId));

        const data = {
          documento: document.getElementById('empleadoDocumento').value.trim(),
          nombre: document.getElementById('empleadoNombre').value.trim(),
          email: document.getElementById('empleadoEmail').value.trim(),
          telefono: document.getElementById('empleadoTelefono').value.trim(),
          cargoId: Number(cargoId),
          cargoNombre: cargoObj ? cargoObj.nombre : 'Sin Cargo',
          estado: document.getElementById('empleadoEstado').value
        };

        if (id) {
          await window.ApiService.updateEmpleado(id, data);
          window.adminToast('Empleado actualizado exitosamente', 'success');
        } else {
          await window.ApiService.createEmpleado(data);
          window.adminToast('Empleado registrado exitosamente', 'success');
        }

        modal.hide();
        load();
      });
    }

    window.CrudEngine.editEmpleado = (id) => {
      const emp = empleados.find(item => Number(item.id) === Number(id));
      if (!emp) return;
      document.getElementById('empleadoId').value = emp.id;
      document.getElementById('empleadoDocumento').value = emp.documento;
      document.getElementById('empleadoNombre').value = emp.nombre;
      document.getElementById('empleadoEmail').value = emp.email;
      document.getElementById('empleadoTelefono').value = emp.telefono;
      document.getElementById('empleadoCargoId').value = emp.cargoId;
      document.getElementById('empleadoEstado').value = emp.estado || 'Activo';
      document.getElementById('empleadoModalTitle').textContent = 'Modificar Empleado';
      modal.show();
    };

    window.CrudEngine.deleteEmpleado = (id) => {
      confirmDelete('Eliminar Empleado', '¿Desea desvincular o eliminar el registro de este colaborador?', async () => {
        await window.ApiService.deleteEmpleado(id);
        window.adminToast('Empleado eliminado', 'info');
        load();
      });
    };

    load();
  }

  // ==========================================
  // CRUD 3: CLIENTES
  // ==========================================
  async function initClientes() {
    const tableBody = document.getElementById('clientesTableBody');
    const searchInput = document.getElementById('clientesSearchInput');
    const createBtn = document.getElementById('btnNuevoCliente');
    const form = document.getElementById('clienteForm');
    const modalEl = document.getElementById('clienteModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

    let clientes = [];

    async function load() {
      clientes = await window.ApiService.getClientes();
      render(clientes);
    }

    function render(list) {
      if (!tableBody) return;
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay clientes registrados.</td></tr>`;
        return;
      }
      tableBody.innerHTML = list.map(c => `
        <tr>
          <td><span class="badge bg-light text-dark border">${c.tipoDocumento || 'CC'}: ${c.documento}</span></td>
          <td class="fw-bold text-dark">${c.nombre}</td>
          <td><i class="bi bi-geo-alt text-danger me-1"></i>${c.direccion}, ${c.ciudad || 'Bogotá'}</td>
          <td>${c.telefono}<br><small class="text-muted">${c.email}</small></td>
          <td class="fw-bold text-success">${window.ApiService.formatCOP(c.cupoCredito || 0)}</td>
          <td><span class="badge ${c.estado === 'Activo' ? 'bg-success' : 'bg-secondary'}">${c.estado}</span></td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn action-btn-edit" title="Editar" onclick="CrudEngine.editCliente(${c.id})"><i class="bi bi-pencil-fill"></i></button>
              <button class="action-btn action-btn-delete" title="Eliminar" onclick="CrudEngine.deleteCliente(${c.id})"><i class="bi bi-trash-fill"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const filtered = clientes.filter(c => 
          c.nombre.toLowerCase().includes(val) || 
          c.documento.includes(val) || 
          (c.ciudad && c.ciudad.toLowerCase().includes(val))
        );
        render(filtered);
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('clienteId').value = '';
        document.getElementById('clienteModalTitle').textContent = 'Registrar Nuevo Cliente';
        modal.show();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('clienteId').value;
        const data = {
          tipoDocumento: document.getElementById('clienteTipoDoc').value,
          documento: document.getElementById('clienteDoc').value.trim(),
          nombre: document.getElementById('clienteNombre').value.trim(),
          email: document.getElementById('clienteEmail').value.trim(),
          telefono: document.getElementById('clienteTelefono').value.trim(),
          direccion: document.getElementById('clienteDireccion').value.trim(),
          ciudad: document.getElementById('clienteCiudad').value.trim(),
          cupoCredito: Number(document.getElementById('clienteCupo').value) || 0,
          estado: document.getElementById('clienteEstado').value
        };

        if (id) {
          await window.ApiService.updateCliente(id, data);
          window.adminToast('Cliente actualizado exitosamente', 'success');
        } else {
          await window.ApiService.createCliente(data);
          window.adminToast('Cliente registrado exitosamente', 'success');
        }

        modal.hide();
        load();
      });
    }

    window.CrudEngine.editCliente = (id) => {
      const c = clientes.find(item => Number(item.id) === Number(id));
      if (!c) return;
      document.getElementById('clienteId').value = c.id;
      document.getElementById('clienteTipoDoc').value = c.tipoDocumento || 'NIT';
      document.getElementById('clienteDoc').value = c.documento;
      document.getElementById('clienteNombre').value = c.nombre;
      document.getElementById('clienteEmail').value = c.email;
      document.getElementById('clienteTelefono').value = c.telefono;
      document.getElementById('clienteDireccion').value = c.direccion;
      document.getElementById('clienteCiudad').value = c.ciudad || 'Bogotá';
      document.getElementById('clienteCupo').value = c.cupoCredito || 0;
      document.getElementById('clienteEstado').value = c.estado || 'Activo';
      document.getElementById('clienteModalTitle').textContent = 'Modificar Cliente';
      modal.show();
    };

    window.CrudEngine.deleteCliente = (id) => {
      confirmDelete('Eliminar Cliente', '¿Está seguro de remover a este cliente del directorio?', async () => {
        await window.ApiService.deleteCliente(id);
        window.adminToast('Cliente eliminado', 'info');
        load();
      });
    };

    load();
  }

  // ==========================================
  // CRUD 4: CATEGORÍAS
  // ==========================================
  async function initCategorias() {
    const tableBody = document.getElementById('categoriasTableBody');
    const searchInput = document.getElementById('categoriasSearchInput');
    const createBtn = document.getElementById('btnNuevaCategoria');
    const form = document.getElementById('categoriaForm');
    const modalEl = document.getElementById('categoriaModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

    let categorias = [];

    async function load() {
      categorias = await window.ApiService.getCategorias();
      render(categorias);
    }

    function render(list) {
      if (!tableBody) return;
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No se encontraron categorías.</td></tr>`;
        return;
      }
      tableBody.innerHTML = list.map(c => `
        <tr>
          <td><span class="badge bg-dark">${c.codigo}</span></td>
          <td class="fw-bold text-dark">${c.nombre}</td>
          <td>${c.descripcion || '-'}</td>
          <td><span class="badge ${c.estado === 'Activo' ? 'bg-success' : 'bg-secondary'}">${c.estado}</span></td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn action-btn-edit" title="Editar" onclick="CrudEngine.editCategoria(${c.id})"><i class="bi bi-pencil-fill"></i></button>
              <button class="action-btn action-btn-delete" title="Eliminar" onclick="CrudEngine.deleteCategoria(${c.id})"><i class="bi bi-trash-fill"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const filtered = categorias.filter(c => c.nombre.toLowerCase().includes(val) || c.codigo.toLowerCase().includes(val));
        render(filtered);
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('categoriaId').value = '';
        document.getElementById('categoriaModalTitle').textContent = 'Registrar Nueva Categoría';
        modal.show();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('categoriaId').value;
        const data = {
          codigo: document.getElementById('categoriaCodigo').value.trim().toUpperCase(),
          nombre: document.getElementById('categoriaNombre').value.trim(),
          descripcion: document.getElementById('categoriaDescripcion').value.trim(),
          estado: document.getElementById('categoriaEstado').value
        };

        if (id) {
          await window.ApiService.updateCategoria(id, data);
          window.adminToast('Categoría actualizada exitosamente', 'success');
        } else {
          await window.ApiService.createCategoria(data);
          window.adminToast('Categoría registrada exitosamente', 'success');
        }

        modal.hide();
        load();
      });
    }

    window.CrudEngine.editCategoria = (id) => {
      const c = categorias.find(item => Number(item.id) === Number(id));
      if (!c) return;
      document.getElementById('categoriaId').value = c.id;
      document.getElementById('categoriaCodigo').value = c.codigo;
      document.getElementById('categoriaNombre').value = c.nombre;
      document.getElementById('categoriaDescripcion').value = c.descripcion || '';
      document.getElementById('categoriaEstado').value = c.estado || 'Activo';
      document.getElementById('categoriaModalTitle').textContent = 'Modificar Categoría';
      modal.show();
    };

    window.CrudEngine.deleteCategoria = (id) => {
      confirmDelete('Eliminar Categoría', '¿Está seguro de eliminar esta categoría del catálogo?', async () => {
        await window.ApiService.deleteCategoria(id);
        window.adminToast('Categoría eliminada', 'info');
        load();
      });
    };

    load();
  }

  // ==========================================
  // CRUD 5: PRODUCTOS
  // ==========================================
  async function initProductos() {
    const tableBody = document.getElementById('productosTableBody');
    const searchInput = document.getElementById('productosSearchInput');
    const createBtn = document.getElementById('btnNuevoProducto');
    const form = document.getElementById('productoForm');
    const modalEl = document.getElementById('productoModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

    let productos = [];
    let categorias = [];

    async function populateCategoriasSelect() {
      categorias = await window.ApiService.getCategorias();
      const select = document.getElementById('productoCategoriaId');
      if (select) {
        select.innerHTML = `<option value="">Seleccione una categoría...</option>` +
          categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
      }
    }

    async function load() {
      await populateCategoriasSelect();
      productos = await window.ApiService.getProductos();
      render(productos);
    }

    function render(list) {
      if (!tableBody) return;
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No se encontraron productos.</td></tr>`;
        return;
      }
      tableBody.innerHTML = list.map(p => {
        let stockBadge = '<span class="badge bg-success">Disponible</span>';
        if (p.stock <= 0) stockBadge = '<span class="badge bg-danger">Agotado</span>';
        else if (p.stock <= (p.stockMinimo || 10)) stockBadge = `<span class="badge bg-warning text-dark">Bajo Stock (${p.stock})</span>`;

        const imgSrc = (p.imagen && !p.imagen.startsWith('http')) ? ('../../' + p.imagen.replace(/^(\.\.\/)+/, '')) : (p.imagen || '../../assets/img/prod_placeholder.svg');
        return `
          <tr>
            <td><span class="badge bg-dark">${p.codigo}</span></td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <img src="${imgSrc}" alt="" style="width: 38px; height: 38px; object-fit: contain;" class="border rounded p-1" onerror="this.src='../../assets/img/prod_placeholder.svg'">
                <div>
                  <div class="fw-bold text-dark">${p.nombre}</div>
                  <small class="text-muted">${p.marca} • ${p.unidadMedida || 'Und'}</small>
                </div>
              </div>
            </td>
            <td>${p.categoriaNombre}</td>
            <td class="fw-bold text-primary">${window.ApiService.formatCOP(p.precio)}</td>
            <td class="text-center fw-bold">${p.stock}</td>
            <td>${stockBadge}</td>
            <td>
              <div class="action-btn-group">
                <button class="action-btn action-btn-edit" title="Editar" onclick="CrudEngine.editProducto(${p.id})"><i class="bi bi-pencil-fill"></i></button>
                <button class="action-btn action-btn-delete" title="Eliminar" onclick="CrudEngine.deleteProducto(${p.id})"><i class="bi bi-trash-fill"></i></button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const filtered = productos.filter(p => 
          p.nombre.toLowerCase().includes(val) || 
          p.codigo.toLowerCase().includes(val) || 
          p.marca.toLowerCase().includes(val)
        );
        render(filtered);
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('productoId').value = '';
        document.getElementById('productoModalTitle').textContent = 'Registrar Nuevo Producto';
        modal.show();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('productoId').value;
        const catId = document.getElementById('productoCategoriaId').value;
        const catObj = categorias.find(c => Number(c.id) === Number(catId));

        const data = {
          codigo: document.getElementById('productoCodigo').value.trim().toUpperCase(),
          nombre: document.getElementById('productoNombre').value.trim(),
          marca: document.getElementById('productoMarca').value.trim(),
          categoriaId: Number(catId),
          categoriaNombre: catObj ? catObj.nombre : 'General',
          precio: Number(document.getElementById('productoPrecio').value) || 0,
          stock: Number(document.getElementById('productoStock').value) || 0,
          stockMinimo: Number(document.getElementById('productoStockMin').value) || 10,
          unidadMedida: document.getElementById('productoUnidad').value.trim(),
          descripcion: document.getElementById('productoDescripcion').value.trim(),
          imagen: document.getElementById('productoImagen').value.trim() || 'assets/img/prod_placeholder.svg'
        };

        if (id) {
          await window.ApiService.updateProducto(id, data);
          window.adminToast('Producto actualizado exitosamente', 'success');
        } else {
          await window.ApiService.createProducto(data);
          window.adminToast('Producto registrado exitosamente', 'success');
        }

        modal.hide();
        load();
      });
    }

    window.CrudEngine.editProducto = (id) => {
      const p = productos.find(item => Number(item.id) === Number(id));
      if (!p) return;
      document.getElementById('productoId').value = p.id;
      document.getElementById('productoCodigo').value = p.codigo;
      document.getElementById('productoNombre').value = p.nombre;
      document.getElementById('productoMarca').value = p.marca;
      document.getElementById('productoCategoriaId').value = p.categoriaId;
      document.getElementById('productoPrecio').value = p.precio;
      document.getElementById('productoStock').value = p.stock;
      document.getElementById('productoStockMin').value = p.stockMinimo || 10;
      document.getElementById('productoUnidad').value = p.unidadMedida || '';
      document.getElementById('productoDescripcion').value = p.descripcion || '';
      document.getElementById('productoImagen').value = p.imagen || '';
      document.getElementById('productoModalTitle').textContent = 'Modificar Producto';
      modal.show();
    };

    window.CrudEngine.deleteProducto = (id) => {
      confirmDelete('Eliminar Producto', '¿Está seguro de eliminar este producto del inventario?', async () => {
        await window.ApiService.deleteProducto(id);
        window.adminToast('Producto eliminado', 'info');
        load();
      });
    };

    load();
  }

  // ==========================================
  // CRUD 6: PEDIDOS Y DETALLES
  // ==========================================
  async function initPedidos() {
    const tableBody = document.getElementById('pedidosTableBody');
    const searchInput = document.getElementById('pedidosSearchInput');
    const statusFilter = document.getElementById('pedidosStatusFilter');

    let pedidos = [];

    async function load() {
      pedidos = await window.ApiService.getPedidos();
      render(pedidos);
    }

    function render(list) {
      if (!tableBody) return;
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron pedidos.</td></tr>`;
        return;
      }
      tableBody.innerHTML = list.map(ord => {
        let badge = 'bg-warning text-dark';
        if (ord.estado === 'Entregado') badge = 'bg-success text-white';
        if (ord.estado === 'Procesando') badge = 'bg-primary text-white';
        if (ord.estado === 'Enviado') badge = 'bg-info text-dark';
        if (ord.estado === 'Cancelado') badge = 'bg-danger text-white';

        return `
          <tr>
            <td><span class="fw-bold">${ord.codigo}</span></td>
            <td>
              <div class="fw-bold text-dark">${ord.clienteNombre}</div>
              <small class="text-muted"><i class="bi bi-geo-alt me-1"></i>${ord.direccionEntrega}</small>
            </td>
            <td>${ord.fecha}</td>
            <td class="fw-bold text-primary">${window.ApiService.formatCOP(ord.total)}</td>
            <td>
              <select class="form-select form-select-sm" style="width: 140px;" onchange="CrudEngine.changePedidoEstado(${ord.id}, this.value)">
                <option value="Pendiente" ${ord.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="Procesando" ${ord.estado === 'Procesando' ? 'selected' : ''}>Procesando</option>
                <option value="Enviado" ${ord.estado === 'Enviado' ? 'selected' : ''}>Enviado</option>
                <option value="Entregado" ${ord.estado === 'Entregado' ? 'selected' : ''}>Entregado</option>
                <option value="Cancelado" ${ord.estado === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
              </select>
            </td>
            <td>
              <div class="action-btn-group">
                <button class="action-btn action-btn-view" title="Ver Detalle" onclick="CrudEngine.viewPedidoDetalle(${ord.id})"><i class="bi bi-eye-fill"></i></button>
                <button class="action-btn action-btn-delete" title="Eliminar" onclick="CrudEngine.deletePedido(${ord.id})"><i class="bi bi-trash-fill"></i></button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', applyFilters);
    }

    function applyFilters() {
      const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const status = statusFilter ? statusFilter.value : 'all';

      let filtered = pedidos.filter(ord => {
        const matchesTerm = ord.codigo.toLowerCase().includes(term) || ord.clienteNombre.toLowerCase().includes(term);
        const matchesStatus = status === 'all' || ord.estado.toLowerCase() === status.toLowerCase();
        return matchesTerm && matchesStatus;
      });

      render(filtered);
    }

    window.CrudEngine.changePedidoEstado = async (id, nuevoEstado) => {
      await window.ApiService.updatePedidoEstado(id, nuevoEstado);
      window.adminToast(`Estado del pedido actualizado a "${nuevoEstado}"`, 'success');
      load();
    };

    window.CrudEngine.viewPedidoDetalle = async (id) => {
      const ord = pedidos.find(p => Number(p.id) === Number(id));
      if (!ord) return;

      let modalEl = document.getElementById('adminPedidoModal');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'adminPedidoModal';
        modalEl.className = 'modal fade';
        modalEl.tabIndex = -1;
        document.body.appendChild(modalEl);
      }

      const rows = (ord.items || []).map(i => `
        <tr>
          <td><span class="badge bg-secondary">${i.codigo}</span></td>
          <td>${i.nombre}</td>
          <td class="text-center">${i.cantidad}</td>
          <td class="text-end">${window.ApiService.formatCOP(i.precio)}</td>
          <td class="text-end fw-bold">${window.ApiService.formatCOP(i.subtotal || (i.precio * i.cantidad))}</td>
        </tr>
      `).join('');

      modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">Desglose de Ítems - Pedido ${ord.codigo}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <strong>Cliente:</strong> ${ord.clienteNombre}<br>
                  <strong>Dirección:</strong> ${ord.direccionEntrega}<br>
                  <strong>Forma de Pago:</strong> ${ord.metodoPago}
                </div>
                <div class="text-end">
                  <span class="badge bg-primary fs-6">${ord.estado}</span><br>
                  <small class="text-muted">${ord.fecha}</small>
                </div>
              </div>
              <table class="table table-bordered table-striped">
                <thead class="table-light">
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th class="text-center">Cant</th>
                    <th class="text-end">Precio Unit</th>
                    <th class="text-end">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                  <tr>
                    <th colspan="4" class="text-end">Total Liquidado:</th>
                    <th class="text-end text-primary fs-5">${window.ApiService.formatCOP(ord.total)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      `;

      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    };

    window.CrudEngine.deletePedido = (id) => {
      confirmDelete('Eliminar Pedido', '¿Está seguro de eliminar este registro de pedido de la base de datos?', async () => {
        await window.ApiService.deletePedido(id);
        window.adminToast('Pedido eliminado', 'info');
        load();
      });
    };

    load();
  }

  // ==========================================
  // CRUD 7: PAGOS
  // ==========================================
  async function initPagos() {
    const tableBody = document.getElementById('pagosTableBody');
    const searchInput = document.getElementById('pagosSearchInput');
    const createBtn = document.getElementById('btnNuevoPago');
    const form = document.getElementById('pagoForm');
    const modalEl = document.getElementById('pagoModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

    let pagos = [];

    async function load() {
      pagos = await window.ApiService.getPagos();
      render(pagos);
    }

    function render(list) {
      if (!tableBody) return;
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No hay pagos registrados.</td></tr>`;
        return;
      }
      tableBody.innerHTML = list.map(p => `
        <tr>
          <td><span class="text-muted fw-bold">#PAG-${p.id}</span></td>
          <td><span class="badge bg-dark">${p.pedidoCodigo}</span></td>
          <td class="fw-bold text-dark">${p.clienteNombre}</td>
          <td>${p.fecha}</td>
          <td class="fw-bold text-success">${window.ApiService.formatCOP(p.monto)}</td>
          <td><span class="badge bg-light text-dark border">${p.metodo}</span></td>
          <td><span class="badge ${p.estado === 'Aprobado' ? 'bg-success' : 'bg-warning text-dark'}">${p.estado}</span></td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn action-btn-edit" title="Editar" onclick="CrudEngine.editPago(${p.id})"><i class="bi bi-pencil-fill"></i></button>
              <button class="action-btn action-btn-delete" title="Eliminar" onclick="CrudEngine.deletePago(${p.id})"><i class="bi bi-trash-fill"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const filtered = pagos.filter(p => 
          p.pedidoCodigo.toLowerCase().includes(val) || 
          p.clienteNombre.toLowerCase().includes(val) || 
          p.metodo.toLowerCase().includes(val)
        );
        render(filtered);
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('pagoId').value = '';
        document.getElementById('pagoModalTitle').textContent = 'Registrar Comprobante de Pago';
        modal.show();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('pagoId').value;
        const data = {
          pedidoCodigo: document.getElementById('pagoPedidoCodigo').value.trim().toUpperCase(),
          clienteNombre: document.getElementById('pagoCliente').value.trim(),
          monto: Number(document.getElementById('pagoMonto').value) || 0,
          metodo: document.getElementById('pagoMetodo').value,
          comprobante: document.getElementById('pagoComprobante').value.trim() || 'N/A',
          estado: document.getElementById('pagoEstado').value
        };

        try {
          if (id) {
            await window.ApiService.updatePago(id, data);
            window.adminToast('Pago actualizado con éxito', 'success');
          } else {
            await window.ApiService.createPago(data);
            window.adminToast('Pago registrado con éxito', 'success');
          }
          modal.hide();
          load();
        } catch (err) {
          console.error(err);
          window.adminToast((err && err.message) || 'No se pudo guardar el pago. Revisa el código de pedido y la consola.', 'danger');
        }
      });
    }

    window.CrudEngine.editPago = (id) => {
      const p = pagos.find(item => Number(item.id) === Number(id));
      if (!p) return;
      document.getElementById('pagoId').value = p.id;
      document.getElementById('pagoPedidoCodigo').value = p.pedidoCodigo;
      document.getElementById('pagoCliente').value = p.clienteNombre;
      document.getElementById('pagoMonto').value = p.monto;
      document.getElementById('pagoMetodo').value = p.metodo;
      document.getElementById('pagoComprobante').value = p.comprobante || '';
      document.getElementById('pagoEstado').value = p.estado;
      document.getElementById('pagoModalTitle').textContent = 'Modificar Conciliación de Pago';
      modal.show();
    };

    window.CrudEngine.deletePago = (id) => {
      confirmDelete('Eliminar Pago', '¿Desea anular o eliminar este comprobante de pago?', async () => {
        await window.ApiService.deletePago(id);
        window.adminToast('Pago eliminado', 'info');
        load();
      });
    };

    load();
  }

  // ==========================================
  // CRUD 8: ENTREGAS
  // ==========================================
  async function initEntregas() {
    const tableBody = document.getElementById('entregasTableBody');
    const searchInput = document.getElementById('entregasSearchInput');
    const createBtn = document.getElementById('btnNuevaEntrega');
    const form = document.getElementById('entregaForm');
    const modalEl = document.getElementById('entregaModal');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

    let entregas = [];
    let empleados = [];

    async function populateRepartidores() {
      empleados = await window.ApiService.getEmpleados();
      const select = document.getElementById('entregaRepartidorId');
      if (select) {
        select.innerHTML = `<option value="">Seleccione repartidor...</option>` +
          empleados.map(e => `<option value="${e.id}">${e.nombre} (${e.cargoNombre})</option>`).join('');
      }
    }

    async function load() {
      await populateRepartidores();
      entregas = await window.ApiService.getEntregas();
      render(entregas);
    }

    function render(list) {
      if (!tableBody) return;
      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron despachos de entrega.</td></tr>`;
        return;
      }
      tableBody.innerHTML = list.map(e => `
        <tr>
          <td><span class="badge bg-secondary">${e.guia || 'GUIA-TEMP'}</span></td>
          <td><span class="fw-bold">${e.pedidoCodigo}</span></td>
          <td><i class="bi bi-truck text-primary me-1"></i>${e.repartidorNombre || 'Sin Asignar'}</td>
          <td><i class="bi bi-geo-alt text-danger me-1"></i>${e.direccion}</td>
          <td>${e.fechaEstimada || '-'}</td>
          <td><span class="badge ${e.estado === 'Entregado' ? 'bg-success' : e.estado === 'En Ruta' ? 'bg-info text-dark' : 'bg-warning text-dark'}">${e.estado}</span></td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn action-btn-edit" title="Editar" onclick="CrudEngine.editEntrega(${e.id})"><i class="bi bi-pencil-fill"></i></button>
              <button class="action-btn action-btn-delete" title="Eliminar" onclick="CrudEngine.deleteEntrega(${e.id})"><i class="bi bi-trash-fill"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    if (searchInput) {
      searchInput.addEventListener('input', (ev) => {
        const val = ev.target.value.toLowerCase().trim();
        const filtered = entregas.filter(e => 
          e.guia.toLowerCase().includes(val) || 
          e.pedidoCodigo.toLowerCase().includes(val) || 
          (e.repartidorNombre && e.repartidorNombre.toLowerCase().includes(val))
        );
        render(filtered);
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('entregaId').value = '';
        document.getElementById('entregaModalTitle').textContent = 'Asignar Nueva Entrega / Despacho';
        modal.show();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('entregaId').value;
        const repId = document.getElementById('entregaRepartidorId').value;
        const repObj = empleados.find(emp => Number(emp.id) === Number(repId));

        const data = {
          guia: document.getElementById('entregaGuia').value.trim().toUpperCase(),
          pedidoCodigo: document.getElementById('entregaPedidoCodigo').value.trim().toUpperCase(),
          repartidorId: repId ? Number(repId) : null,
          repartidorNombre: repObj ? repObj.nombre : 'Sin Asignar',
          direccion: document.getElementById('entregaDireccion').value.trim(),
          fechaEstimada: document.getElementById('entregaFecha').value,
          estado: document.getElementById('entregaEstado').value
        };

        try {
          if (id) {
            await window.ApiService.updateEntrega(id, data);
            window.adminToast('Entrega actualizada con éxito', 'success');
          } else {
            await window.ApiService.createEntrega(data);
            window.adminToast('Entrega programada con éxito', 'success');
          }
          modal.hide();
          load();
        } catch (err) {
          console.error(err);
          window.adminToast((err && err.message) || 'No se pudo guardar la entrega. Usa un PED-XXXXXX existente y un repartidor.', 'danger');
        }
      });
    }

    window.CrudEngine.editEntrega = (id) => {
      const e = entregas.find(item => Number(item.id) === Number(id));
      if (!e) return;
      document.getElementById('entregaId').value = e.id;
      document.getElementById('entregaGuia').value = e.guia || '';
      document.getElementById('entregaPedidoCodigo').value = e.pedidoCodigo || '';
      document.getElementById('entregaRepartidorId').value = e.repartidorId || '';
      document.getElementById('entregaDireccion').value = e.direccion || '';
      document.getElementById('entregaFecha').value = e.fechaEstimada || '';
      document.getElementById('entregaEstado').value = e.estado || 'Pendiente Despacho';
      document.getElementById('entregaModalTitle').textContent = 'Modificar Guía de Entrega';
      modal.show();
    };

    window.CrudEngine.deleteEntrega = (id) => {
      confirmDelete('Eliminar Entrega', '¿Desea cancelar y eliminar este registro de entrega?', async () => {
        await window.ApiService.deleteEntrega(id);
        window.adminToast('Entrega eliminada', 'info');
        load();
      });
    };

    load();
  }

  return {
    initDashboard,
    initCargos,
    initEmpleados,
    initClientes,
    initCategorias,
    initProductos,
    initPedidos,
    initPagos,
    initEntregas
  };
})();

window.CrudEngine = CrudEngine;
