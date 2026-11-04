/**
 * SELLPAL - ApiService 100% REST → Spring Boot → PostgreSQL
 * Misma API pública que sellpal-fixed (para admin-crud, store, orders…).
 * Sin localStorage como base de datos.
 */
const ApiService = (function () {
  const BASE = '';

  function formatCOP(value) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(value || 0);
  }

  async function request(path, options = {}) {
    const opts = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {})
      },
      ...options
    };
    if (opts.body && typeof opts.body === 'object') {
      opts.body = JSON.stringify(opts.body);
    }
    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (e) {
      throw new Error('Sin conexión al servidor Spring Boot (:8080). ' + (e.message || ''));
    }
    if (res.status === 204) return null;
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!res.ok) {
      const msg = (data && (data.message || data.error || data)) || res.statusText || 'Error API';
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  }

  // ---------- MAPEOS BD → forma de la UI sellpal-fixed ----------
  function mapCargo(c) {
    if (!c) return null;
    return {
      id: c.id_cargo,
      nombre: c.nombre_cargo,
      descripcion: c.descripcion || '',
      estado: c.estado || 'Activo'
    };
  }
  function mapCategoria(c) {
    if (!c) return null;
    return {
      id: c.id_categoria,
      codigo: c.codigo || '',
      nombre: c.nombre,
      descripcion: c.tipo || '',
      estado: 'Activo'
    };
  }
  function mapProducto(p) {
    if (!p) return null;
    const cat = p.categoria || {};
    const stock = Number(p.stock) || 0;
    const min = Number(p.stockMinimo) || 0;
    const nombre = p.nombre || '';
    const lower = nombre.toLowerCase();
    let estadoUi = 'Disponible';
    if (String(p.estado || '').toUpperCase() === 'INACTIVO') estadoUi = 'Agotado';
    else if (stock <= 0) estadoUi = 'Agotado';
    else if (stock <= min) estadoUi = 'Bajo Stock';
    let marca = p.marca || '';
    if (!marca) {
      if (/oreo|club social|trident|halls|chips|milka|belvita|sparkies|chokis|mondelez/.test(lower)) marca = 'Mondelez';
      else marca = 'INVERCAJAS';
    }
    let imagen = p.imagen || '';
    if (!imagen) {
      if (lower.includes('oreo')) imagen = 'assets/img/prod_oreo.jpg';
      else if (lower.includes('club social')) imagen = 'assets/img/prod_clubsocial.jpg';
      else if (lower.includes('trident')) imagen = 'assets/img/prod_trident.jpg';
      else if (lower.includes('halls')) imagen = 'assets/img/prod_halls.jpg';
      else if (lower.includes('chips') || lower.includes('ahoy') || lower.includes('chokis')) imagen = 'assets/img/prod_chipsahoy.jpg';
      else if (lower.includes('milka') || lower.includes('chocoramo')) imagen = 'assets/img/prod_milka.jpg';
      else if (lower.includes('belvita')) imagen = 'assets/img/prod_belvita.jpg';
      else if (lower.includes('sparkies') || lower.includes('menta')) imagen = 'assets/img/prod_sparkies.jpg';
      else imagen = 'assets/img/prod_placeholder.svg';
    }
    return {
      id: p.id != null ? p.id : p.id_producto,
      codigo: p.codigo || ('PROD-' + (p.id != null ? p.id : '')),
      nombre,
      marca,
      categoriaId: cat.id_categoria ?? cat.id ?? null,
      categoriaNombre: cat.nombre || 'General',
      precio: Number(p.precio) || 0,
      stock,
      stockMinimo: min,
      unidadMedida: p.unidadMedida || 'Unidad Mayorista',
      descripcion: p.descripcion || '',
      imagen,
      destacado: !!p.destacado,
      estado: estadoUi
    };
  }
  function mapEmpleado(e) {
    if (!e) return null;
    const cargo = e.cargo || {};
    return {
      id: e.documento_unico,
      documento: String(e.documento_unico ?? ''),
      nombre: e.nombre || '',
      email: e.email || '',
      telefono: e.telefono || '',
      cargoId: cargo.id_cargo ?? null,
      cargoNombre: cargo.nombre_cargo || '',
      estado: 'Activo',
      sueldo: e.sueldo != null ? Number(e.sueldo) : 0
    };
  }
  function mapCliente(c) {
    if (!c) return null;
    return {
      id: c.documento_unico,
      tipoDocumento: 'NIT',
      documento: String(c.documento_unico ?? ''),
      nombre: c.nombre || '',
      email: c.email || '',
      telefono: c.telefono || '',
      direccion: c.direccion || '',
      ciudad: '',
      cupoCredito: 0,
      estado: c.estado_cuenta || 'Activo'
    };
  }
  function mapPedido(p) {
    if (!p) return null;
    const cliente = p.cliente || {};
    const estado = p.estado || {};
    const items = (p.detalles || []).map(d => {
      const prod = d.producto || {};
      const cant = Number(d.cantidad) || 0;
      const precio = Number(d.precioUnitario) || 0;
      return {
        productoId: prod.id,
        codigo: prod.codigo || '',
        nombre: prod.nombre || '',
        precio,
        cantidad: cant,
        subtotal: Number(d.total) || precio * cant
      };
    });
    return {
      id: p.id_pedido,
      codigo: 'PED-' + String(p.id_pedido).padStart(6, '0'),
      clienteId: cliente.documento_unico,
      clienteNombre: cliente.nombre || '',
      fecha: p.fecha || '',
      estado: estado.nombre_estado || 'Pendiente',
      metodoPago: '',
      direccionEntrega: cliente.direccion || '',
      subtotal: Number(p.total) || 0,
      iva: 0,
      total: Number(p.total) || 0,
      notas: '',
      items
    };
  }

  // ==================== CARGOS ====================
  async function getCargos() {
    return ((await request('/api/cargos')) || []).map(mapCargo);
  }
  async function createCargo(cargo) {
    return mapCargo(await request('/api/cargos', {
      method: 'POST',
      body: {
        nombre_cargo: cargo.nombre,
        descripcion: cargo.descripcion || '',
        estado: cargo.estado || 'Activo'
      }
    }));
  }
  async function updateCargo(id, cargo) {
    return mapCargo(await request('/api/cargos/' + id, {
      method: 'PUT',
      body: {
        nombre_cargo: cargo.nombre,
        descripcion: cargo.descripcion || '',
        estado: cargo.estado || 'Activo'
      }
    }));
  }
  async function deleteCargo(id) {
    await request('/api/cargos/' + id, { method: 'DELETE' });
    return true;
  }

  // ==================== EMPLEADOS ====================
  async function getEmpleados() {
    return ((await request('/api/empleados')) || []).map(mapEmpleado);
  }
  async function createEmpleado(emp) {
    const doc = Number(String(emp.documento).replace(/\D/g, ''));
    return mapEmpleado(await request('/api/empleados', {
      method: 'POST',
      body: {
        documento_unico: doc,
        nombre: emp.nombre,
        email: emp.email || null,
        telefono: emp.telefono || null,
        direccion: emp.direccion || null,
        sueldo: emp.sueldo != null ? emp.sueldo : 1000000,
        cargo: { id_cargo: Number(emp.cargoId) }
      }
    }));
  }
  async function updateEmpleado(id, emp) {
    const doc = Number(id);
    return mapEmpleado(await request('/api/empleados/' + doc, {
      method: 'PUT',
      body: {
        documento_unico: doc,
        nombre: emp.nombre,
        email: emp.email || null,
        telefono: emp.telefono || null,
        direccion: emp.direccion || null,
        sueldo: emp.sueldo != null ? emp.sueldo : 1000000,
        cargo: { id_cargo: Number(emp.cargoId) }
      }
    }));
  }
  async function deleteEmpleado(id) {
    await request('/api/empleados/' + id, { method: 'DELETE' });
    return true;
  }

  // ==================== CLIENTES ====================
  async function getClientes() {
    return ((await request('/api/clientes')) || []).map(mapCliente);
  }
  async function createCliente(cli) {
    const doc = Number(String(cli.documento).replace(/\D/g, ''));
    return mapCliente(await request('/api/clientes', {
      method: 'POST',
      body: {
        documento_unico: doc,
        nombre: cli.nombre,
        email: cli.email || null,
        telefono: cli.telefono || null,
        direccion: cli.direccion || null,
        tipo_cliente: cli.tipoDocumento || cli.tipo_cliente || 'Cliente',
        estado_cuenta: cli.estado || 'Activo'
      }
    }));
  }
  async function updateCliente(id, cli) {
    const doc = Number(id);
    return mapCliente(await request('/api/clientes/' + doc, {
      method: 'PUT',
      body: {
        documento_unico: doc,
        nombre: cli.nombre,
        email: cli.email || null,
        telefono: cli.telefono || null,
        direccion: cli.direccion || null,
        tipo_cliente: cli.tipoDocumento || cli.tipo_cliente || 'Cliente',
        estado_cuenta: cli.estado || 'Activo'
      }
    }));
  }
  async function deleteCliente(id) {
    await request('/api/clientes/' + id, { method: 'DELETE' });
    return true;
  }

  // ==================== CATEGORÍAS ====================
  async function getCategorias() {
    return ((await request('/api/categorias')) || []).map(mapCategoria);
  }
  async function createCategoria(cat) {
    return mapCategoria(await request('/api/categorias', {
      method: 'POST',
      body: {
        nombre: cat.nombre,
        tipo: cat.descripcion || cat.tipo || 'General',
        codigo: cat.codigo || null
      }
    }));
  }
  async function updateCategoria(id, cat) {
    return mapCategoria(await request('/api/categorias/' + id, {
      method: 'PUT',
      body: {
        nombre: cat.nombre,
        tipo: cat.descripcion || cat.tipo || 'General',
        codigo: cat.codigo || null
      }
    }));
  }
  async function deleteCategoria(id) {
    await request('/api/categorias/' + id, { method: 'DELETE' });
    return true;
  }

  // ==================== PRODUCTOS ====================
  async function getProductos() {
    return ((await request('/api/productos')) || []).map(mapProducto);
  }
  async function getProductoById(id) {
    return mapProducto(await request('/api/productos/' + id));
  }
  async function createProducto(prod) {
    return mapProducto(await request('/api/productos', {
      method: 'POST',
      body: {
        nombre: prod.nombre,
        descripcion: prod.descripcion || '',
        precio: prod.precio,
        stock: prod.stock != null ? prod.stock : 0,
        estado: (prod.estado === 'Agotado' || prod.estado === 'Inactivo') ? 'INACTIVO' : 'ACTIVO',
        categoria: { id_categoria: Number(prod.categoriaId) },
        codigo: prod.codigo || null,
        marca: prod.marca || null,
        stockMinimo: prod.stockMinimo != null ? prod.stockMinimo : 0,
        unidadMedida: prod.unidadMedida || null,
        imagen: prod.imagen || null,
        destacado: !!prod.destacado
      }
    }));
  }
  async function updateProducto(id, prod) {
    return mapProducto(await request('/api/productos/' + id, {
      method: 'PUT',
      body: {
        nombre: prod.nombre,
        descripcion: prod.descripcion || '',
        precio: prod.precio,
        stock: prod.stock != null ? prod.stock : 0,
        estado: (prod.estado === 'Agotado' || prod.estado === 'Inactivo') ? 'INACTIVO' : 'ACTIVO',
        categoria: { id_categoria: Number(prod.categoriaId) },
        codigo: prod.codigo || null,
        marca: prod.marca || null,
        stockMinimo: prod.stockMinimo != null ? prod.stockMinimo : 0,
        unidadMedida: prod.unidadMedida || null,
        imagen: prod.imagen || null,
        destacado: !!prod.destacado
      }
    }));
  }
  async function deleteProducto(id) {
    await request('/api/productos/' + id, { method: 'DELETE' });
    return true;
  }

  // ==================== PEDIDOS ====================
  async function getPedidos() {
    return ((await request('/api/pedidos')) || []).map(mapPedido);
  }
  async function getPedidoById(id) {
    return mapPedido(await request('/api/pedidos/' + id));
  }
  async function createPedido(pedidoUi) {
    const estados = (await request('/api/estados-pedido')) || [];
    const nombre = String(pedidoUi.estado || 'Pendiente').toLowerCase();
    let est = estados.find(e => String(e.nombre_estado || '').toLowerCase() === nombre);
    if (!est && estados.length) est = estados[0];
    if (!est) throw new Error('No hay estados de pedido en la BD. Ejecute SELLPAL_TODO_EN_UNO.sql');

    // Interfaz fija envía user.id; el backend necesita documento_unico del CLIENTE.
    // Preferimos documento de la sesión (Auth) sin modificar carrito.html.
    let rawCliente = pedidoUi.clienteId;
    try {
      const sess = JSON.parse(localStorage.getItem('SELLPAL_CURRENT_SESSION') || 'null');
      if (sess && sess.documento) rawCliente = sess.documento;
      else if (sess && sess.documento_unico) rawCliente = sess.documento_unico;
    } catch (_) {}
    const clienteId = Number(String(rawCliente == null ? '' : rawCliente).replace(/\D/g, ''));
    if (!clienteId || Number.isNaN(clienteId)) {
      throw new Error('Documento de cliente inválido. Inicia sesión con una cuenta de cliente (documento numérico) o regístrate de nuevo.');
    }
    if (!pedidoUi.items || !pedidoUi.items.length) {
      throw new Error('El pedido no tiene productos.');
    }
    const body = {
      cliente: { documento_unico: clienteId },
      estado: { id_estado: est.id_estado },
      empleado_registro: pedidoUi.empleadoId
        ? { documento_unico: Number(pedidoUi.empleadoId) }
        : null,
      detalles: (pedidoUi.items || []).map(it => ({
        producto: { id: Number(it.productoId) },
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precio)
      }))
    };
    return mapPedido(await request('/api/pedidos', { method: 'POST', body }));
  }
  async function updatePedidoEstado(id, nuevoEstado) {
    // Persiste en PostgreSQL vía PUT /api/pedidos/{id}/estado
    const actualizado = await request('/api/pedidos/' + id + '/estado', {
      method: 'PUT',
      body: { estado: nuevoEstado }
    });
    return mapPedido(actualizado);
  }
  async function deletePedido(id) {
    await request('/api/pedidos/' + id, { method: 'DELETE' });
    return true;
  }

  // ==================== PAGOS / ENTREGAS ====================
  function parsePedidoId(codigo) {
    if (codigo == null || codigo === '') return null;
    if (typeof codigo === 'number') return codigo;
    const m = String(codigo).match(/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function mapEntrega(e) {
    if (!e) return null;
    const det = e.detalle || {};
    const ped = det.pedido || {};
    const cli = ped.cliente || {};
    const emp = e.empleado_repartidor || {};
    const pedId = ped.id_pedido || null;
    return {
      id: e.id_entrega,
      guia: 'ENT-' + String(e.id_entrega).padStart(5, '0'),
      pedidoCodigo: pedId ? ('PED-' + String(pedId).padStart(6, '0')) : '',
      pedidoId: pedId,
      clienteNombre: cli.nombre || '',
      repartidorId: emp.documento_unico || null,
      repartidorNombre: emp.nombre || 'Sin asignar',
      direccion: cli.direccion || e.observaciones || '',
      fechaEstimada: e.fecha_entrega ? String(e.fecha_entrega).substring(0, 10) : '',
      estado: e.estado || 'PENDIENTE',
      observaciones: e.observaciones || '',
      id_detalle: det.id_detalle || null
    };
  }

  function mapPago(p) {
    if (!p) return null;
    const ent = p.entrega || {};
    const det = ent.detalle || {};
    const ped = det.pedido || {};
    const cli = ped.cliente || {};
    const pedId = ped.id_pedido || null;
    return {
      id: p.id_pago,
      metodo: p.metodo_pago || 'Transferencia',
      monto: Number(p.monto) || 0,
      fecha: p.fecha_pago ? String(p.fecha_pago).substring(0, 19).replace('T', ' ') : '',
      estado: p.estado_pago || 'PENDIENTE',
      pedidoCodigo: pedId ? ('PED-' + String(pedId).padStart(6, '0')) : (ent.id_entrega ? ('ENT-' + ent.id_entrega) : '—'),
      clienteNombre: cli.nombre || '—',
      entregaId: ent.id_entrega || null,
      comprobante: ''
    };
  }

  async function getPagos() {
    const list = (await request('/api/pagos')) || [];
    return list.map(mapPago);
  }

  async function createPago(pago) {
    let entregaId = pago.entregaId || pago.id_entrega || null;
    const pedidoId = parsePedidoId(pago.pedidoCodigo || pago.pedidoId);

    // Si no hay entrega, intentar encontrar una del pedido o crearla
    if (!entregaId && pedidoId) {
      const entregas = await getEntregas();
      const match = entregas.find(e => Number(e.pedidoId) === Number(pedidoId));
      if (match) entregaId = match.id;
    }
    if (!entregaId && pedidoId) {
      const auto = await createEntrega({
        pedidoCodigo: 'PED-' + String(pedidoId).padStart(6, '0'),
        estado: 'PENDIENTE',
        observaciones: 'Generada automáticamente al registrar pago'
      });
      entregaId = auto && auto.id;
    }
    if (!entregaId) {
      throw new Error('No se pudo asociar el pago a una entrega. Indica un código de pedido válido (ej. PED-000002) y asegúrate de que el pedido exista.');
    }

    const body = {
      metodo_pago: pago.metodo || 'Transferencia',
      monto: Number(pago.monto) || 0,
      estado_pago: pago.estado || 'PENDIENTE',
      fecha_pago: new Date().toISOString().substring(0, 19),
      entrega: { id_entrega: Number(entregaId) }
    };
    const p = await request('/api/pagos', { method: 'POST', body });
    try { await logActivity('CREACIÓN', 'Pagos', 'Pago #' + p.id_pago + ' — $' + body.monto + ' (' + body.metodo_pago + ')', 'Admin', 'Administrador'); } catch (_) {}
    return mapPago(p);
  }

  async function updatePago(id, pago) {
    const prev = (await request('/api/pagos/' + id)) || {};
    const body = {
      metodo_pago: pago.metodo || prev.metodo_pago || 'Transferencia',
      monto: Number(pago.monto != null ? pago.monto : prev.monto) || 0,
      estado_pago: pago.estado || prev.estado_pago || 'PENDIENTE',
      fecha_pago: prev.fecha_pago || new Date().toISOString().substring(0, 19),
      entrega: prev.entrega || (pago.entregaId ? { id_entrega: Number(pago.entregaId) } : null)
    };
    const p = await request('/api/pagos/' + id, { method: 'PUT', body });
    try { await logActivity('EDICIÓN', 'Pagos', 'Pago #' + id + ' actualizado', 'Admin', 'Administrador'); } catch (_) {}
    return mapPago(p);
  }

  async function deletePago(id) {
    await request('/api/pagos/' + id, { method: 'DELETE' });
    try { await logActivity('ELIMINACIÓN', 'Pagos', 'Pago #' + id + ' eliminado', 'Admin', 'Administrador'); } catch (_) {}
    return true;
  }

  async function getEntregas() {
    const list = (await request('/api/entregas')) || [];
    return list.map(mapEntrega);
  }

  async function createEntrega(ent) {
    const pedidoId = parsePedidoId(ent.pedidoCodigo || ent.pedidoId);
    let detalleId = ent.id_detalle ? Number(ent.id_detalle) : null;

    if (!detalleId && pedidoId) {
      const ped = await request('/api/pedidos/' + pedidoId);
      if (ped && Array.isArray(ped.detalles) && ped.detalles.length) {
        detalleId = ped.detalles[0].id_detalle;
      }
    }
    if (!detalleId) {
      throw new Error('No hay detalle de pedido para crear la entrega. Verifica el código PED-XXXXXX.');
    }

    let repartidorDoc = ent.repartidorId ? Number(ent.repartidorId) : null;
    if (!repartidorDoc) {
      const emps = (await request('/api/empleados')) || [];
      if (emps.length) repartidorDoc = emps[0].documento_unico;
    }
    if (!repartidorDoc) {
      throw new Error('No hay empleados en la BD para asignar como repartidor. Crea un empleado primero.');
    }

    const body = {
      estado: ent.estado || 'PENDIENTE',
      observaciones: [ent.guia, ent.direccion, ent.observaciones].filter(Boolean).join(' | ') || '',
      fecha_entrega: ent.fechaEstimada
        ? (String(ent.fechaEstimada).length === 10 ? ent.fechaEstimada + 'T12:00:00' : ent.fechaEstimada)
        : null,
      detalle: { id_detalle: detalleId },
      empleado_repartidor: { documento_unico: repartidorDoc }
    };
    const e = await request('/api/entregas', { method: 'POST', body });
    try { await logActivity('CREACIÓN', 'Entregas', 'Entrega #' + e.id_entrega + ' — pedido ' + (ent.pedidoCodigo || pedidoId), 'Admin', 'Administrador'); } catch (_) {}
    return mapEntrega(e);
  }

  async function updateEntrega(id, ent) {
    const prev = (await request('/api/entregas/' + id)) || {};
    const body = {
      estado: ent.estado || prev.estado || 'PENDIENTE',
      observaciones: ent.observaciones != null ? ent.observaciones : (ent.direccion || prev.observaciones || ''),
      fecha_entrega: ent.fechaEstimada
        ? (String(ent.fechaEstimada).length === 10 ? ent.fechaEstimada + 'T12:00:00' : ent.fechaEstimada)
        : prev.fecha_entrega,
      detalle: prev.detalle,
      empleado_repartidor: ent.repartidorId
        ? { documento_unico: Number(ent.repartidorId) }
        : prev.empleado_repartidor
    };
    const e = await request('/api/entregas/' + id, { method: 'PUT', body });
    try { await logActivity('EDICIÓN', 'Entregas', 'Entrega #' + id + ' → ' + body.estado, 'Admin', 'Administrador'); } catch (_) {}
    return mapEntrega(e);
  }

  async function deleteEntrega(id) {
    await request('/api/entregas/' + id, { method: 'DELETE' });
    try { await logActivity('ELIMINACIÓN', 'Entregas', 'Entrega #' + id + ' eliminada', 'Admin', 'Administrador'); } catch (_) {}
    return true;
  }

  // ==================== AUDIT (localStorage + actividad real) ====================
  const AUDIT_KEY = 'sellpal_audit_logs_v1';

  async function logActivity(accion, modulo, detalle, usuario, rol) {
    try {
      const raw = localStorage.getItem(AUDIT_KEY);
      const logs = raw ? JSON.parse(raw) : [];
      logs.unshift({
        id: Date.now(),
        fecha: new Date().toISOString(),
        accion: accion || 'ACCIÓN',
        modulo: modulo || 'Sistema',
        detalle: detalle || '',
        usuario: usuario || 'Sistema',
        rol: rol || 'Admin'
      });
      localStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 500)));
    } catch (e) {
      console.warn('logActivity', e);
    }
    return true;
  }

  async function getAuditLogs() {
    try {
      const raw = localStorage.getItem(AUDIT_KEY);
      let logs = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(logs)) logs = [];

      // Si está vacío, generar entradas a partir de pedidos/pagos/entregas existentes
      if (logs.length === 0) {
        try {
          const [pedidos, pagos, entregas] = await Promise.all([
            getPedidos().catch(() => []),
            request('/api/pagos').catch(() => []),
            request('/api/entregas').catch(() => [])
          ]);
          (pedidos || []).slice(0, 15).forEach(p => {
            logs.push({
              id: 'ped-' + p.id,
              fecha: p.fecha || new Date().toISOString(),
              accion: 'PEDIDO',
              modulo: 'Pedidos',
              detalle: (p.codigo || '') + ' — ' + (p.clienteNombre || '') + ' — ' + (p.estado || '') + ' — ' + (p.total || 0),
              usuario: 'Sistema',
              rol: 'Sistema'
            });
          });
          (pagos || []).slice(0, 10).forEach(p => {
            logs.push({
              id: 'pag-' + p.id_pago,
              fecha: p.fecha_pago || new Date().toISOString(),
              accion: 'PAGO',
              modulo: 'Pagos',
              detalle: 'Pago #' + p.id_pago + ' — ' + (p.metodo_pago || '') + ' — $' + (p.monto || 0) + ' — ' + (p.estado_pago || ''),
              usuario: 'Sistema',
              rol: 'Sistema'
            });
          });
          (entregas || []).slice(0, 10).forEach(e => {
            logs.push({
              id: 'ent-' + e.id_entrega,
              fecha: e.fecha_entrega || new Date().toISOString(),
              accion: 'ENTREGA',
              modulo: 'Entregas',
              detalle: 'Entrega #' + e.id_entrega + ' — ' + (e.estado || '') + ' — ' + (e.observaciones || ''),
              usuario: 'Sistema',
              rol: 'Sistema'
            });
          });
        } catch (_) {}
      }
      return logs;
    } catch (e) {
      console.warn('getAuditLogs', e);
      return [];
    }
  }

  async function clearAuditLogs() {
    localStorage.removeItem(AUDIT_KEY);
    return true;
  }

  // ==================== REPORTES ====================

  async function getReportData(dateFilter = 'all') {
    let productos = await getProductos();
    let pedidos = await getPedidos();
    try {
      const resumen = await request('/api/reportes/resumen');
      if (resumen) {
        /* se combina abajo */
      }
    } catch (_) {}

    if (dateFilter === 'today') {
      const t = new Date().toISOString().substring(0, 10);
      pedidos = pedidos.filter(p => String(p.fecha).startsWith(t));
    }
    const pedidosValidos = pedidos.filter(p => p.estado !== 'Cancelado');
    const totalVentas = pedidosValidos.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const prodVentas = {};
    pedidosValidos.forEach(ord => {
      (ord.items || []).forEach(item => {
        if (!prodVentas[item.productoId]) {
          prodVentas[item.productoId] = {
            productoId: item.productoId, nombre: item.nombre, codigo: item.codigo,
            cantidadTotal: 0, dineroTotal: 0
          };
        }
        prodVentas[item.productoId].cantidadTotal += Number(item.cantidad) || 0;
        prodVentas[item.productoId].dineroTotal += Number(item.subtotal) || 0;
      });
    });
    let pagos = [];
    let entregas = [];
    try { pagos = await getPagos(); } catch (_) {}
    try { entregas = await getEntregas(); } catch (_) {}

    const pagosPorMetodo = { efectivo: 0, transferencia: 0, nequi: 0 };
    (pagos || []).forEach(pg => {
      const m = String(pg.metodo || pg.metodo_pago || '').toLowerCase();
      const monto = Number(pg.monto) || 0;
      if (m.includes('efectivo')) pagosPorMetodo.efectivo += monto;
      else if (m.includes('nequi') || m.includes('daviplata')) pagosPorMetodo.nequi += monto;
      else if (m.includes('llave') || m.includes('bre-b') || m.includes('breb')) pagosPorMetodo.transferencia += monto;
      else pagosPorMetodo.transferencia += monto;
    });

    const entregasCompletadas = (entregas || []).filter(e => String(e.estado || '').toLowerCase().includes('entreg')).length;
    const entregasPendientes = (entregas || []).filter(e => !String(e.estado || '').toLowerCase().includes('entreg')).length;
    const tasaCumplimiento = (entregas || []).length
      ? Math.round((entregasCompletadas / entregas.length) * 100)
      : 100;

    return {
      totalVentas,
      totalPedidos: pedidos.length,
      ticketPromedio: pedidosValidos.length ? Math.round(totalVentas / pedidosValidos.length) : 0,
      pagosPorMetodo,
      topProductos: Object.values(prodVentas).sort((a, b) => b.cantidadTotal - a.cantidadTotal),
      totalItemsInventario: productos.reduce((s, p) => s + (Number(p.stock) || 0), 0),
      valorInventario: productos.reduce((s, p) => s + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0),
      productosBajoStock: productos.filter(p => p.stock <= (p.stockMinimo || 10)),
      entregasCompletadas,
      entregasPendientes,
      tasaCumplimiento,
      pedidos: pedidosValidos
    };
  }


  // ==================== USUARIOS (aprobación admin) ====================
  async function getUsuarios() {
    return (await request('/api/usuarios')) || [];
  }
  async function getUsuariosPendientes() {
    return (await request('/api/usuarios/pendientes')) || [];
  }
  async function aprobarUsuario(id) {
    return request('/api/usuarios/' + id + '/aprobar', { method: 'PUT' });
  }
  async function rechazarUsuario(id) {
    return request('/api/usuarios/' + id + '/rechazar', { method: 'PUT' });
  }

  return {
    formatCOP,
    getCargos, createCargo, updateCargo, deleteCargo,
    getEmpleados, createEmpleado, updateEmpleado, deleteEmpleado,
    getClientes, createCliente, updateCliente, deleteCliente,
    getCategorias, createCategoria, updateCategoria, deleteCategoria,
    getProductos, getProductoById, createProducto, updateProducto, deleteProducto,
    getPedidos, getPedidoById, createPedido, updatePedidoEstado, deletePedido,
    getPagos, createPago, updatePago, deletePago,
    getEntregas, createEntrega, updateEntrega, deleteEntrega,
    logActivity, getAuditLogs, clearAuditLogs, getReportData,
    getUsuarios, getUsuariosPendientes, aprobarUsuario, rechazarUsuario
  };
})();

window.ApiService = ApiService;
