(function () {
  'use strict';

  const STORAGE_KEY = 'valdub_gemini_api_key';
  const SESSION_VERIFIED = 'valdub_api_key_verified';
  const GEMINI_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  const apiKeyInput = document.getElementById('apiKeyInput');
  const toggleVisibility = document.getElementById('toggleVisibility');
  const clearBtn = document.getElementById('clearBtn');
  const validateBtn = document.getElementById('validateBtn');
  const continueBtn = document.getElementById('continueBtn');
  const saveKeyCheckbox = document.getElementById('saveKeyCheckbox');
  const removeSavedBtn = document.getElementById('removeSavedBtn');
  const statusMessage = document.getElementById('statusMessage');
  const toastContainer = document.getElementById('toastContainer');

  const eyeOpen = toggleVisibility.querySelector('.eye-open');
  const eyeClosed = toggleVisibility.querySelector('.eye-closed');
  const btnText = validateBtn.querySelector('.btn-text');
  const btnSpinner = validateBtn.querySelector('.btn-spinner');

  let isValidating = false;
  let isVerified = false;
  let currentKey = '';

  function setStatus(text, type) {
    statusMessage.textContent = text;
    statusMessage.className = 'status-message';
    if (type) {
      statusMessage.classList.add(type);
    }
  }

  function setInputState(state) {
    apiKeyInput.classList.remove('valid', 'invalid');
    if (state) {
      apiKeyInput.classList.add(state);
    }
  }

  function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s';
      setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 260);
    }, 3200);
  }

  function setValidating(loading) {
    isValidating = loading;
    validateBtn.disabled = loading;
    apiKeyInput.disabled = loading;
    toggleVisibility.disabled = loading;
    clearBtn.disabled = loading;

    if (loading) {
      btnText.textContent = 'Санҷида истодаем...';
      btnSpinner.classList.remove('hidden');
      setStatus('Санҷида истодаем...', 'loading');
      setInputState(null);
    } else {
      btnSpinner.classList.add('hidden');
    }
  }

  function setVerified(success) {
    isVerified = success;
    continueBtn.disabled = !success;

    if (success) {
      btnText.textContent = 'API Key тасдиқ шуд ✓';
      validateBtn.classList.add('success-state');
      setStatus('API Key дуруст аст ✓', 'success');
      setInputState('valid');
      try {
        sessionStorage.setItem(SESSION_VERIFIED, '1');
        sessionStorage.setItem('valdub_temp_key', currentKey);
      } catch (e) {}
    } else {
      btnText.textContent = 'Санҷиши API Key';
      validateBtn.classList.remove('success-state');
      continueBtn.disabled = true;
      try {
        sessionStorage.removeItem(SESSION_VERIFIED);
        sessionStorage.removeItem('valdub_temp_key');
      } catch (e) {}
    }
  }

  function mapErrorToMessage(status, errorText) {
    if (status === 0 || status === 'network') {
      return 'Пайвастшавӣ ба интернет дастрас нест.';
    }
    if (status === 400 || status === 401 || status === 403) {
      return 'API Key нодуруст аст ё дастрасӣ надорад.';
    }
    if (status === 429) {
      return 'Лимити API истифода шудааст. Баъдтар дубора кӯшиш кунед.';
    }
    if (status >= 500) {
      return 'Сервер ҷавоб надод. Баъдтар дубора кӯшиш кунед.';
    }
    if (errorText && /cors|failed to fetch|networkerror/i.test(errorText)) {
      return 'Пайвастшавӣ ба интернет дастрас нест.';
    }
    return 'Ҳангоми санҷиш хатогӣ ба вуҷуд омад.';
  }

  async function validateApiKey(key) {
    const url = GEMINI_MODELS_URL + '?key=' + encodeURIComponent(key);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(function () {
        controller.abort();
      }, 15000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && (data.models || Array.isArray(data))) {
          return { ok: true };
        }
        return { ok: false, status: 400, message: 'API Key нодуруст аст ё дастрасӣ надорад.' };
      }

      let errBody = '';
      try {
        const errJson = await response.json();
        if (errJson && errJson.error && errJson.error.message) {
          errBody = errJson.error.message;
        }
      } catch (e) {}

      return {
        ok: false,
        status: response.status,
        message: mapErrorToMessage(response.status, errBody)
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { ok: false, status: 0, message: 'Сервер ҷавоб надод. Баъдтар дубора кӯшиш кунед.' };
      }
      return {
        ok: false,
        status: 'network',
        message: mapErrorToMessage('network', err.message || String(err))
      };
    }
  }

  async function handleValidate() {
    if (isValidating) return;

    const key = apiKeyInput.value.trim();
    currentKey = key;

    if (!key) {
      setStatus('Лутфан API Key-ро ворид кунед.', 'error');
      setInputState('invalid');
      setVerified(false);
      return;
    }

    if (key.length < 20) {
      setStatus('API Key нодуруст аст ё дастрасӣ надорад.', 'error');
      setInputState('invalid');
      setVerified(false);
      return;
    }

    setValidating(true);
    setVerified(false);

    const result = await validateApiKey(key);

    setValidating(false);

    if (result.ok) {
      setVerified(true);
      if (saveKeyCheckbox.checked) {
        try {
          localStorage.setItem(STORAGE_KEY, key);
        } catch (e) {}
      } else {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
      }
      showToast('API Key бо муваффақият тасдиқ шуд', 'success');
    } else {
      setVerified(false);
      setStatus(result.message, 'error');
      setInputState('invalid');
      btnText.textContent = 'Санҷиши API Key';
      showToast(result.message, 'error');
    }
  }

  function handleToggleVisibility() {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    eyeOpen.classList.toggle('hidden', !isPassword);
    eyeClosed.classList.toggle('hidden', isPassword);
    toggleVisibility.setAttribute(
      'aria-label',
      isPassword ? 'Пинҳон кардани API Key' : 'Нишон додани API Key'
    );
  }

  function handleClear() {
    apiKeyInput.value = '';
    currentKey = '';
    setStatus('Лутфан API Key-ро ворид кунед.');
    setInputState(null);
    setVerified(false);
    btnText.textContent = 'Санҷиши API Key';
    validateBtn.classList.remove('success-state');
    apiKeyInput.focus();
  }

  function handleRemoveSaved() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    apiKeyInput.value = '';
    currentKey = '';
    saveKeyCheckbox.checked = false;
    setStatus('Лутфан API Key-ро ворид кунед.');
    setInputState(null);
    setVerified(false);
    btnText.textContent = 'Санҷиши API Key';
    validateBtn.classList.remove('success-state');
    showToast('Калиди захирашуда тоза карда шуд', 'success');
  }

  function handleContinue() {
    if (!isVerified || !currentKey) return;
    try {
      sessionStorage.setItem(SESSION_VERIFIED, '1');
      sessionStorage.setItem('valdub_temp_key', currentKey);
    } catch (e) {}
    showToast('API Key тасдиқ шуд. Марҳилаи навбатӣ ба зудӣ...', 'success');
  }

  function loadSavedKey() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        apiKeyInput.value = saved;
        saveKeyCheckbox.checked = true;
        currentKey = saved;
        setStatus('Калиди захирашуда бор карда шуд. Санҷишро анҷом диҳед.');
      }
    } catch (e) {}
  }

  function init() {
    loadSavedKey();

    toggleVisibility.addEventListener('click', handleToggleVisibility);
    clearBtn.addEventListener('click', handleClear);
    validateBtn.addEventListener('click', handleValidate);
    continueBtn.addEventListener('click', handleContinue);
    removeSavedBtn.addEventListener('click', handleRemoveSaved);

    apiKeyInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleValidate();
      }
    });

    apiKeyInput.addEventListener('input', function () {
      if (isVerified) {
        setVerified(false);
        btnText.textContent = 'Санҷиши API Key';
        validateBtn.classList.remove('success-state');
        setStatus('Лутфан API Key-ро ворид кунед.');
        setInputState(null);
      }
    });

    saveKeyCheckbox.addEventListener('change', function () {
      if (!saveKeyCheckbox.checked) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
      } else if (isVerified && currentKey) {
        try {
          localStorage.setItem(STORAGE_KEY, currentKey);
        } catch (e) {}
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
