/**
 * SELLPAL / INVERCAJAS - Módulo de Registros y Auditoría de Actividad
 * Visualización, filtrado y exportación de bitácora de eventos del sistema.
 */

const AdminLogs = (function () {
  let allLogs = [];
  let currentSearch = '';
  let currentAction = 'all';
  let currentModule = 'all';

  async function init() {
    setupEventListeners();
    await loadLogs();
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('logSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        applyFilters();
      });
    }

    const actionFilter = document.getElementById('logActionFilter');
    if (actionFilter) {
      actionFilter.addEventListener('change', (e) => {
        currentAction = e.target.value;
        applyFilters();
      });
    }

    const moduleFilter = document.getElementById('logModuleFilter');
    if (moduleFilter) {
      moduleFilter.addEventListener('change', (e) => {
        currentModule = e.target.value;
        applyFilters();
      });
    }
  }

  async function loadLogs() {
    try {
      allLogs = await ApiService.getAuditLogs();
      populateModuleFilter();
      applyFilters();
    } catch (err) {
      console.error('Error al cargar bitácora de registros:', err);
    }
  }

  function populateModuleFilter() {
    const moduleFilter = document.getElementById('logModuleFilter');
    if (!moduleFilter) return;

    const modules = [...new Set(allLogs.map(l => l.modulo).filter(Boolean))];
    const prevVal = moduleFilter.value;

    moduleFilter.innerHTML = '<option value="all">Todos los Módulos</option>' +
      modules.map(m => `<option value="${m}">${m}</option>`).join('');

    if (modules.includes(prevVal)) {
      moduleFilter.value = prevVal;
    }
  }

  function applyFilters() {
    let filtered = [...allLogs];

    if (currentAction !== 'all') {
      filtered = filtered.filter(l => (l.accion || '').toUpperCase() === currentAction.toUpperCase());
    }

    if (currentModule !== 'all') {
      filtered = filtered.filter(l => (l.modulo || '').toLowerCase() === currentModule.toLowerCase());
    }

    if (currentSearch) {
      filtered = filtered.filter(l =>
        (l.usuario || '').toLowerCase().includes(currentSearch) ||
        (l.detalle || '').toLowerCase().includes(currentSearch) ||
        (l.modulo || '').toLowerCase().includes(currentSearch) ||
        (l.rol || '').toLowerCase().includes(currentSearch) ||
        (l.ip || '').toLowerCase().includes(currentSearch)
      );
    }

    renderTable(filtered);
    updateStats(filtered);
  }

  function renderTable(logs) {
    const tbody = document.getElementById('logsTableBody');
    const emptyState = document.getElementById('logsEmptyState');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = logs.map(log => {
      const act = (log.accion || '').toUpperCase();
      let badgeClass = 'badge-action-modificacion';
      let icon = 'bi-pencil-square';

      if (act === 'CREACIÓN' || act === 'CREACION') {
        badgeClass = 'badge-action-creacion';
        icon = 'bi-plus-circle-fill';
      } else if (act === 'ELIMINACIÓN' || act === 'ELIMINACION') {
        badgeClass = 'badge-action-eliminacion';
        icon = 'bi-trash3-fill';
      } else if (act === 'ACCESO') {
        badgeClass = 'badge-action-acceso';
        icon = 'bi-box-arrow-in-right';
      } else if (act === 'REPORTE') {
        badgeClass = 'badge-action-reporte';
        icon = 'bi-file-earmark-bar-graph';
      }

      return `
        <tr>
          <td class="text-center text-muted fw-bold small" style="width: 50px;">#${log.id}</td>
          <td class="small text-nowrap text-muted"><i class="bi bi-clock me-1"></i>${log.fecha}</td>
          <td>
            <div class="fw-bold text-dark">${log.usuario || 'Sistema'}</div>
            <span class="badge ${log.rol === 'Administrador' ? 'bg-primary' : 'bg-secondary'}" style="font-size: 0.65rem;">${log.rol || 'Sistema'}</span>
          </td>
          <td>
            <span class="badge bg-light text-dark border px-2 py-1">${log.modulo}</span>
          </td>
          <td>
            <span class="badge-action ${badgeClass}">
              <i class="bi ${icon} me-1"></i>${log.accion}
            </span>
          </td>
          <td class="small text-dark">${log.detalle}</td>
          <td class="small text-muted font-monospace text-nowrap">${log.ip || '127.0.0.1'}</td>
        </tr>
      `;
    }).join('');
  }

  function updateStats(filteredLogs) {
    const totalCount = document.getElementById('logCountTotal');
    const filteredCount = document.getElementById('logCountFiltered');
    if (totalCount) totalCount.textContent = allLogs.length;
    if (filteredCount) filteredCount.textContent = filteredLogs.length;
  }

  function exportLogsCSV() {
    if (!allLogs || allLogs.length === 0) {
      alert('No hay registros de auditoría para exportar.');
      return;
    }

    const rows = [
      ['BITÁCORA DE AUDITORÍA Y REGISTROS DE ACTIVIDAD - SELLPAL INVERCAJAS S.A.S.'],
      ['Fecha de Exportación', new Date().toLocaleString('es-CO')],
      ['Total de Eventos Registrados', allLogs.length],
      [''],
      ['ID', 'Fecha y Hora', 'Usuario', 'Rol', 'Módulo', 'Acción', 'Detalle del Evento', 'Dirección IP']
    ];

    allLogs.forEach(l => {
      rows.push([
        l.id,
        `"${l.fecha}"`,
        `"${(l.usuario || '').replace(/"/g, '""')}"`,
        `"${l.rol || ''}"`,
        `"${l.modulo || ''}"`,
        `"${l.accion || ''}"`,
        `"${(l.detalle || '').replace(/"/g, '""')}"`,
        `"${l.ip || '127.0.0.1'}"`
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Auditoria_SELLPAL_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function clearLogs() {
    if (!confirm('¿Estás seguro de que deseas vaciar la bitácora de auditoría?\nEsta acción no se puede deshacer.')) {
      return;
    }

    await ApiService.clearAuditLogs();
    allLogs = [];
    applyFilters();
    alert('Bitácora de registros limpiada correctamente.');
  }

  return {
    init,
    loadLogs,
    exportLogsCSV,
    clearLogs
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  AdminLogs.init();
});
