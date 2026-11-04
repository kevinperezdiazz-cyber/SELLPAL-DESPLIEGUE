/**
 * SELLPAL - Auth 100% Spring Security
 * Login: admin@sellpal.co / Admin2026!
 */
const AUTH_STORAGE_KEY = 'SELLPAL_CURRENT_SESSION';

const Auth = (function () {
  function getSession() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setSession(user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    try { renderNavbarUser(); } catch (_) {}
  }

  function clearSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function mapUser(u) {
    if (!u) return null;
    const rol = String(u.rol || 'CLIENTE').toUpperCase();
    return {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: rol === 'ADMIN' ? 'admin' : 'cliente',
      telefono: u.telefono,
      direccion: u.direccion,
      ciudad: u.ciudad,
      documento: u.documento,
      activo: u.activo !== false
    };
  }

  async function login(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email: (email || '').trim(),
          password: password || ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        clearSession();
        return {
          success: false,
          message: data.message || data.error || 'Credenciales incorrectas. Admin: carlos.morales@invercajas.com / admin123 · Cliente: compras@elahorro.co / 123456'
        };
      }
      const user = mapUser(data.usuario || data);
      if (!user) {
        return { success: false, message: 'Respuesta de login incompleta del servidor.' };
      }
      setSession(user);
      return {
        success: true,
        user,
        redirect: user.rol === 'admin' ? 'admin/dashboard.html' : 'catalogo.html'
      };
    } catch (e) {
      console.error(e);
      return {
        success: false,
        message: 'No hay conexión con el servidor (¿Spring Boot en :8080?).'
      };
    }
  }

  async function register(payload) {
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          nombre: payload.nombre,
          email: payload.email,
          password: payload.password,
          passwordConfirm: payload.passwordConfirm || payload.password,
          telefono: payload.telefono || null,
          direccion: payload.direccion || null,
          ciudad: payload.ciudad || null,
          documento: payload.documento || String(Date.now())
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: data.message || data.error || 'No se pudo registrar.' };
      }
      return { success: true, user: mapUser(data) };
    } catch (e) {
      return { success: false, message: e.message || 'Error de red' };
    }
  }

  async function me() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const user = mapUser(await res.json());
      setSession(user);
      return user;
    } catch (_) {
      return getSession();
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (_) {}
    clearSession();
    window.location.href = '/pages/login.html';
  }

  function isAuthenticated() {
    return !!getSession();
  }

  function isAdmin() {
    const s = getSession();
    return !!(s && String(s.rol).toLowerCase() === 'admin');
  }

  function requireAuth(roles) {
    const session = getSession();
    if (!session) {
      window.location.href = '/pages/login.html';
      return null;
    }
    if (roles && roles.length) {
      const ok = roles.map(r => r.toLowerCase()).includes(String(session.rol).toLowerCase());
      if (!ok) {
        window.location.href = '/';
        return null;
      }
    }
    return session;
  }

  function renderNavbarUser() {
    const session = getSession();
    const el = document.getElementById('navUserLabel');
    if (el) el.textContent = session ? session.nombre : 'Invitado';

    const box = document.getElementById('navbarUserContainer');
    if (!box) return;
    const inPages = window.location.pathname.includes('/pages/');
    const base = inPages ? '' : 'pages/';
    if (!session) {
      box.innerHTML = `<a href="${base}login.html" class="btn btn-outline-light btn-sm"><i class="bi bi-box-arrow-in-right me-1"></i>Iniciar Sesión</a>`;
      return;
    }
    const isAdm = String(session.rol).toLowerCase() === 'admin';
    box.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
          <i class="bi bi-person-circle me-1"></i>${session.nombre || 'Usuario'}
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          ${isAdm ? `<li><a class="dropdown-item" href="${base}admin/dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Panel Admin</a></li>` : ''}
          <li><a class="dropdown-item" href="${base}perfil.html"><i class="bi bi-person me-2"></i>Mi perfil</a></li>
          <li><a class="dropdown-item" href="${base}pedidos.html"><i class="bi bi-bag me-2"></i>Mis pedidos</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" onclick="Auth.logout();return false;"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</a></li>
        </ul>
      </div>`;
  }

  return {
    getSession, setSession, clearSession,
    login, register, me, logout,
    isAuthenticated, isAdmin, requireAuth, renderNavbarUser
  };
})();

window.Auth = Auth;
document.addEventListener('DOMContentLoaded', () => {
  try { Auth.renderNavbarUser(); } catch (_) {}
});
