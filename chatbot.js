/**
 * SELLPAL / INVERCAJAS - Asistente Virtual (Chatbot)
 * Responde dudas frecuentes sobre la empresa, productos, pedidos y contacto.
 * Widget flotante en la esquina inferior derecha.
 */

const SellpalChatbot = (function () {
  const KNOWLEDGE = [
    {
      keys: ['hola', 'buenos dias', 'buenas', 'hey', 'saludos', 'buenas tardes', 'buenas noches'],
      answer: '¡Hola! 👋 Soy el asistente virtual de <strong>SELLPAL / INVERCAJAS</strong>. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre la empresa, productos, pedidos, horarios o contacto.'
    },
    {
      keys: ['quien eres', 'que eres', 'asistente', 'bot', 'chatbot'],
      answer: 'Soy el <strong>asistente virtual de SELLPAL</strong>, la plataforma digital de <strong>INVERCAJAS S.A.S.</strong> Estoy aquí para resolver dudas sobre la empresa, el catálogo mayorista, pedidos y canales de contacto.'
    },
    {
      keys: ['empresa', 'invercajas', 'que es invercajas', 'quienes son', 'sobre la empresa', 'compania', 'compañia'],
      answer: '<strong>INVERCAJAS S.A.S.</strong> es una compañía líder en distribución mayorista y logística de consumo masivo en Colombia. Se especializa en galletas, confitería, chocolates y pasabocas de marcas como Mondelez (Oreo, Club Social, Trident, Halls, Milka, entre otras). <strong>SELLPAL</strong> es su plataforma digital B2B.'
    },
    {
      keys: ['sellpal', 'que es sellpal', 'plataforma'],
      answer: '<strong>SELLPAL</strong> es la plataforma digital de INVERCAJAS para distribución mayorista. Permite a clientes mayoristas consultar el catálogo, realizar pedidos, ver su historial y a los administradores gestionar inventario, entregas, pagos y reportes.'
    },
    {
      keys: ['producto', 'productos', 'catalogo', 'catálogo', 'que venden', 'marcas', 'oreo', 'mondelez', 'portafolio'],
      answer: 'Distribuimos productos de <strong>Mondelez</strong> y otras marcas: galletas (Oreo, Club Social, Chips Ahoy, Belvita), confitería (Halls, Sparkies), chocolates (Milka), gomas de mascar (Trident) y snacks. Puedes ver el catálogo completo en la sección <em>Catálogo</em> de la tienda.'
    },
    {
      keys: ['pedido', 'pedidos', 'como pedir', 'cómo pedir', 'ordenar', 'compra', 'comprar'],
      answer: 'Para realizar un pedido: 1) Inicia sesión como cliente mayorista, 2) Entra al <strong>Catálogo</strong>, 3) Agrega productos al carrito, 4) Completa el checkout con dirección y método de pago. Los pedidos se procesan y despachan según disponibilidad de stock.'
    },
    {
      keys: ['precio', 'precios', 'mayorista', 'descuento', 'cotizacion', 'cotización'],
      answer: 'Los precios en SELLPAL son <strong>mayoristas</strong> (por caja / display). Para cotizaciones especiales por volumen o convenios institucionales, contacta al equipo comercial por WhatsApp <strong>+57 310 456 7890</strong> o al correo <strong>distribucion@invercajas.com.co</strong>.'
    },
    {
      keys: ['horario', 'horarios', 'atencion', 'atención', 'abierto', 'cuando'],
      answer: 'Horario de atención comercial: <strong>Lunes a Viernes de 7:00 AM a 6:00 PM</strong>. La línea WhatsApp mayorista (+57 310 456 7890) opera en ese mismo horario.'
    },
    {
      keys: ['contacto', 'telefono', 'teléfono', 'whatsapp', 'correo', 'email', 'ubicacion', 'ubicación', 'direccion', 'dirección', 'donde estan', 'dónde están'],
      answer: '📍 <strong>Oficina:</strong> Parque Industrial Celta, Km 7 Vía Medellín, Bodega 14<br>📧 <strong>Correos:</strong> distribucion@invercajas.com.co | soporte@sellpal.co<br>📱 <strong>WhatsApp mayorista:</strong> +57 310 456 7890<br>☎️ <strong>PBX:</strong> (601) 745-8900'
    },
    {
      keys: ['entrega', 'entregas', 'despacho', 'envio', 'envío', 'logistica', 'logística', 'tiempo de entrega'],
      answer: 'INVERCAJAS gestiona entregas a puntos de venta y distribuidores. El estado del pedido (Pendiente, Procesando, Enviado, Entregado) se puede consultar en <em>Mis Pedidos</em>. Los tiempos dependen de la ciudad y la ruta logística asignada.'
    },
    {
      keys: ['pago', 'pagos', 'metodo de pago', 'método de pago', 'transferencia', 'nequi', 'efectivo'],
      answer: 'Métodos de pago disponibles: <strong>Transferencia Bancaria</strong>, <strong>Efectivo Contra Entrega</strong> y <strong>Nequi / Daviplata</strong>. Al confirmar el pedido eliges el método; el área de cobranza valida los comprobantes.'
    },
    {
      keys: ['factura', 'facturas', 'factura electronica', 'factura electrónica'],
      answer: 'Cada pedido genera una facturación asociada al cliente. En el panel administrativo (Reportes) se pueden generar e imprimir <strong>facturas individuales por cliente/pedido</strong>. Los clientes pueden ver el detalle de sus pedidos en la sección Mis Pedidos.'
    },
    {
      keys: ['registro', 'registrarse', 'cuenta', 'crear cuenta', 'cliente nuevo'],
      answer: 'Si aún no tienes cuenta mayorista, ve a <strong>Registro</strong> en el menú, completa tus datos (razón social, NIT/CC, correo, dirección) y crea una contraseña segura. Un asesor puede validar tu cupo de crédito después del registro.'
    },
    {
      keys: ['login', 'iniciar sesion', 'iniciar sesión', 'contraseña', 'password', 'acceso'],
      answer: 'Inicia sesión en la página de Login con tu correo corporativo y contraseña. Hay perfiles de <strong>Cliente Mayorista</strong> (tienda/catálogo) y <strong>Administrador</strong> (panel de control). Si olvidaste la contraseña, usa la opción “¿Olvidaste tu contraseña?” en el login.'
    },
    {
      keys: ['admin', 'administrador', 'panel', 'crud', 'dashboard'],
      answer: 'El panel administrativo de SELLPAL permite gestionar cargos, empleados, clientes, categorías, productos, pedidos, pagos, entregas, reportes y auditoría. Solo usuarios con rol administrador pueden acceder.'
    },
    {
      keys: ['stock', 'inventario', 'disponibilidad', 'agotado'],
      answer: 'El inventario se actualiza en tiempo real en el catálogo. Los productos con stock bajo se marcan y el panel admin muestra alertas de reposición. Al agregar al carrito se valida que no superes el stock disponible.'
    },
    {
      keys: ['gracias', 'ok', 'listo', 'perfecto', 'excelente'],
      answer: '¡Con gusto! Si tienes otra duda sobre INVERCAJAS o SELLPAL, escríbeme. También puedes contactar a un asesor humano por WhatsApp +57 310 456 7890.'
    },
    {
      keys: ['adios', 'adiós', 'chao', 'hasta luego', 'bye'],
      answer: '¡Hasta pronto! Gracias por usar SELLPAL / INVERCAJAS. Que tengas un excelente día. 👋'
    }
  ];

  const FALLBACK = 'No estoy seguro de esa consulta. Puedo ayudarte con: <strong>empresa</strong>, <strong>productos</strong>, <strong>pedidos</strong>, <strong>precios</strong>, <strong>entregas</strong>, <strong>pagos</strong>, <strong>horarios</strong> o <strong>contacto</strong>. También puedes escribir a soporte@sellpal.co o WhatsApp +57 310 456 7890.';

  let isOpen = false;

  function normalize(text) {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function findAnswer(userText) {
    const q = normalize(userText);
    if (!q) return 'Escribe tu pregunta y con gusto te ayudo.';

    let best = null;
    let bestScore = 0;

    KNOWLEDGE.forEach(entry => {
      let score = 0;
      entry.keys.forEach(key => {
        const k = normalize(key);
        if (q === k) score += 10;
        else if (q.includes(k)) score += 5;
        else if (k.includes(q) && q.length >= 4) score += 3;
      });
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    });

    if (best && bestScore >= 3) return best.answer;
    return FALLBACK;
  }

  function appendMessage(container, html, type) {
    const div = document.createElement('div');
    div.className = 'sellpal-chat-msg sellpal-chat-msg-' + type;
    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function handleSend() {
    const input = document.getElementById('sellpalChatInput');
    const body = document.getElementById('sellpalChatBody');
    if (!input || !body) return;

    const text = input.value.trim();
    if (!text) return;

    appendMessage(body, escapeHtml(text), 'user');
    input.value = '';

    const typing = document.createElement('div');
    typing.className = 'sellpal-chat-msg sellpal-chat-msg-bot sellpal-chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    setTimeout(() => {
      typing.remove();
      appendMessage(body, findAnswer(text), 'bot');
    }, 450 + Math.random() * 400);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toggle() {
    const panel = document.getElementById('sellpalChatPanel');
    const btn = document.getElementById('sellpalChatToggle');
    if (!panel || !btn) return;
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    btn.classList.toggle('open', isOpen);
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
      const input = document.getElementById('sellpalChatInput');
      if (input) setTimeout(() => input.focus(), 200);
    }
  }

  function injectUI() {
    if (document.getElementById('sellpalChatWidget')) return;

    const root = document.createElement('div');
    root.id = 'sellpalChatWidget';
    root.innerHTML = `
      <div id="sellpalChatPanel" class="sellpal-chat-panel" role="dialog" aria-label="Asistente virtual SELLPAL">
        <div class="sellpal-chat-header">
          <div class="d-flex align-items-center gap-2">
            <div class="sellpal-chat-avatar"><i class="bi bi-robot"></i></div>
            <div>
              <div class="fw-bold small mb-0">Asistente SELLPAL</div>
              <div class="sellpal-chat-status"><span class="dot"></span> En línea · INVERCAJAS</div>
            </div>
          </div>
          <button type="button" class="sellpal-chat-close" id="sellpalChatClose" title="Cerrar" aria-label="Cerrar chat">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div id="sellpalChatBody" class="sellpal-chat-body">
          <div class="sellpal-chat-msg sellpal-chat-msg-bot">
            ¡Hola! Soy el asistente de <strong>INVERCAJAS / SELLPAL</strong>. Pregúntame sobre la empresa, productos, pedidos, horarios o contacto.
          </div>
          <div class="sellpal-chat-suggestions">
            <button type="button" data-q="¿Qué es INVERCAJAS?">Empresa</button>
            <button type="button" data-q="¿Cómo hago un pedido?">Pedidos</button>
            <button type="button" data-q="¿Cuál es el contacto?">Contacto</button>
            <button type="button" data-q="Horarios de atención">Horarios</button>
          </div>
        </div>
        <div class="sellpal-chat-footer">
          <input type="text" id="sellpalChatInput" placeholder="Escribe tu pregunta..." autocomplete="off" maxlength="400" aria-label="Mensaje">
          <button type="button" id="sellpalChatSend" title="Enviar" aria-label="Enviar">
            <i class="bi bi-send-fill"></i>
          </button>
        </div>
      </div>
      <button type="button" id="sellpalChatToggle" class="sellpal-chat-toggle" aria-expanded="false" aria-label="Abrir asistente virtual">
        <i class="bi bi-chat-dots-fill icon-open"></i>
        <i class="bi bi-x-lg icon-close"></i>
        <span class="sellpal-chat-badge">1</span>
      </button>
    `;
    document.body.appendChild(root);

    document.getElementById('sellpalChatToggle').addEventListener('click', toggle);
    document.getElementById('sellpalChatClose').addEventListener('click', () => {
      if (isOpen) toggle();
    });
    document.getElementById('sellpalChatSend').addEventListener('click', handleSend);
    document.getElementById('sellpalChatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });

    root.querySelectorAll('.sellpal-chat-suggestions button').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('sellpalChatInput');
        input.value = btn.getAttribute('data-q');
        handleSend();
      });
    });
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectUI);
    } else {
      injectUI();
    }
  }

  return { init, findAnswer };
})();

SellpalChatbot.init();
window.SellpalChatbot = SellpalChatbot;
