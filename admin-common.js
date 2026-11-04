/**
 * SELLPAL / INVERCAJAS - Funcionalidades Comunes del Panel Administrativo
 * Manejo del Sidebar responsive, Topbar de usuario, Toasts y Helpers globales.
 */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  highlightActiveNav();
  renderAdminUserInfo();
});

function initSidebar() {
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.querySelector('.admin-sidebar');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.innerWidth < 992) {
        document.body.classList.toggle('sidebar-mobile-show');
      } else {
        document.body.classList.toggle('sidebar-collapsed');
      }
    });
  }

  // Cerrar sidebar al hacer click en el backdrop móvil
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  backdrop.addEventListener('click', () => {
    document.body.classList.remove('sidebar-mobile-show');
  });
}

function highlightActiveNav() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.sidebar-nav-item');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.includes(href)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function renderAdminUserInfo() {
  const userNameEl = document.getElementById('adminUserName');
  const userRoleEl = document.getElementById('adminUserRole');
  if (userNameEl && window.Auth) {
    const session = window.Auth.getSession();
    userNameEl.textContent = session ? session.nombre.split(' ')[0] : 'Admin';
    if (userRoleEl) {
      userRoleEl.textContent = session && session.rol === 'admin' ? 'Administrador General' : 'Panel de Control';
    }
  }
}

// Helper global de notificaciones Toast para la zona administrativa
window.adminToast = function (message, type = 'success') {
  let container = document.querySelector('.admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'admin-toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '99999';
    document.body.appendChild(container);
  }

  const toastId = 'toast_' + Date.now();
  const bgClass = type === 'success' ? 'bg-success text-white' :
                  type === 'warning' ? 'bg-warning text-dark' :
                  type === 'danger' ? 'bg-danger text-white' : 'bg-primary text-white';

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg show" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'} fs-5"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);
  setTimeout(() => {
    if (toastEl) {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.remove(), 300);
    }
  }, 4000);
};
