/**
 * SELLPAL / INVERCAJAS - Módulo de Validación de Contraseñas
 * Evalúa fortaleza, reglas de seguridad, confirmación de coincidencia y alternancia de visibilidad.
 */

const PasswordValidator = (function () {
  const RULES = [
    { key: 'length', regex: /.{8,}/, label: 'Mínimo 8 caracteres' },
    { key: 'upper', regex: /[A-Z]/, label: 'Al menos una letra mayúscula (A-Z)' },
    { key: 'lower', regex: /[a-z]/, label: 'Al menos una letra minúscula (a-z)' },
    { key: 'number', regex: /[0-9]/, label: 'Al menos un número (0-9)' },
    { key: 'special', regex: /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\]/, label: 'Al menos un caracter especial (@, #, $, etc.)' }
  ];

  function evaluate(password) {
    if (!password) {
      return {
        score: 0,
        level: 'empty',
        label: 'Ingresa una contraseña',
        colorClass: 'bg-secondary',
        percent: 0,
        rules: RULES.map(r => ({ ...r, passed: false })),
        isValid: false
      };
    }

    const rulesStatus = RULES.map(r => ({
      ...r,
      passed: r.regex.test(password)
    }));

    const passedCount = rulesStatus.filter(r => r.passed).length;
    let level = 'weak';
    let label = 'Muy Débil';
    let colorClass = 'strength-weak';
    let percent = 20;

    if (passedCount <= 2) {
      level = 'weak';
      label = 'Débil (insegura)';
      colorClass = 'strength-weak';
      percent = passedCount * 15;
    } else if (passedCount === 3) {
      level = 'fair';
      label = 'Regular (moderada)';
      colorClass = 'strength-fair';
      percent = 50;
    } else if (passedCount === 4) {
      level = 'good';
      label = 'Buena (segura)';
      colorClass = 'strength-good';
      percent = 75;
    } else if (passedCount === 5) {
      level = 'strong';
      label = 'Excelente (muy segura)';
      colorClass = 'strength-strong';
      percent = 100;
    }

    return {
      score: passedCount,
      level,
      label,
      colorClass,
      percent,
      rules: rulesStatus,
      isValid: passedCount >= 4 // Mínimo 4 de 5 reglas para ser aceptable en registro/cambio
    };
  }

  function toggleVisibility(inputId, buttonEl) {
    const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    const icon = buttonEl.querySelector('i');
    if (icon) {
      if (isPassword) {
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
        buttonEl.setAttribute('title', 'Ocultar contraseña');
      } else {
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
        buttonEl.setAttribute('title', 'Mostrar contraseña');
      }
    }
  }

  /**
   * Vincula automáticamente un formulario con campos de contraseña
   * @param {Object} config
   * {
   *   inputId: string,
   *   confirmInputId?: string,
   *   meterBarId?: string,
   *   feedbackTextId?: string,
   *   checklistContainerId?: string,
   *   matchIndicatorId?: string,
   *   submitBtnId?: string
   * }
   */
  function attach(config) {
    const input = document.getElementById(config.inputId);
    const confirmInput = config.confirmInputId ? document.getElementById(config.confirmInputId) : null;
    const meterBar = config.meterBarId ? document.getElementById(config.meterBarId) : null;
    const feedbackText = config.feedbackTextId ? document.getElementById(config.feedbackTextId) : null;
    const checklist = config.checklistContainerId ? document.getElementById(config.checklistContainerId) : null;
    const matchIndicator = config.matchIndicatorId ? document.getElementById(config.matchIndicatorId) : null;
    const submitBtn = config.submitBtnId ? document.getElementById(config.submitBtnId) : null;

    if (!input) return;

    // Render initial checklist if container exists
    if (checklist) {
      renderChecklist(checklist, RULES.map(r => ({ ...r, passed: false })));
    }

    function update() {
      const val = input.value;
      const evalResult = evaluate(val);

      // Actualizar medidor
      if (meterBar) {
        meterBar.style.width = evalResult.percent + '%';
        meterBar.className = 'progress-bar ' + (val ? evalResult.colorClass : '');
      }

      // Actualizar texto
      if (feedbackText) {
        if (!val) {
          feedbackText.textContent = 'Mínimo 8 caracteres, mayúsculas, números y símbolos';
          feedbackText.className = 'small text-muted';
        } else {
          feedbackText.textContent = `Fortaleza: ${evalResult.label}`;
          feedbackText.className = `small fw-bold ${evalResult.level === 'weak' ? 'text-danger' : evalResult.level === 'fair' ? 'text-warning' : evalResult.level === 'good' ? 'text-info' : 'text-success'}`;
        }
      }

      // Actualizar lista de reglas
      if (checklist) {
        renderChecklist(checklist, evalResult.rules);
      }

      // Verificar confirmación
      let passwordsMatch = true;
      if (confirmInput && confirmInput.value) {
        passwordsMatch = val === confirmInput.value;
        if (matchIndicator) {
          if (passwordsMatch) {
            matchIndicator.innerHTML = '<span class="text-success small fw-semibold"><i class="bi bi-check-circle-fill me-1"></i>Las contraseñas coinciden</span>';
          } else {
            matchIndicator.innerHTML = '<span class="text-danger small fw-semibold"><i class="bi bi-x-circle-fill me-1"></i>Las contraseñas no coinciden</span>';
          }
        }
      } else if (matchIndicator) {
        matchIndicator.innerHTML = '';
      }

      // Habilitar o deshabilitar botón si fue suministrado
      if (submitBtn) {
        const canSubmit = evalResult.isValid && (!confirmInput || passwordsMatch && confirmInput.value.length > 0);
        submitBtn.disabled = !canSubmit;
      }

      return evalResult;
    }

    input.addEventListener('input', update);
    if (confirmInput) {
      confirmInput.addEventListener('input', update);
    }

    // Inicializar estado
    update();

    return {
      evaluate: () => evaluate(input.value),
      isMatch: () => confirmInput ? input.value === confirmInput.value : true
    };
  }

  function renderChecklist(container, rules) {
    container.innerHTML = rules.map(rule => `
      <div class="password-rule-item ${rule.passed ? 'valid' : 'invalid'}">
        <i class="bi ${rule.passed ? 'bi-check-circle-fill text-success' : 'bi-circle text-muted'}"></i>
        <span>${rule.label}</span>
      </div>
    `).join('');
  }

  return {
    evaluate,
    toggleVisibility,
    attach
  };
})();

window.PasswordValidator = PasswordValidator;
