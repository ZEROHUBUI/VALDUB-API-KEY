(function () {
  "use strict";

  var ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";
  var KEY_NAME = "valdub.apiKey";
  var MODE_NAME = "valdub.rememberKey";
  var TIMEOUT_MS = 15000;

  var MSG = {
    empty: "Лутфан API Key-ро ворид кунед.",
    busy: "Санҷида истодаем...",
    ok: "API Key дуруст аст ✓",
    invalid: "API Key нодуруст аст ё дастрасӣ надорад.",
    network: "Пайвастшавӣ ба интернет вуҷуд надорад.",
    rate: "Лимити истифодаи API расидааст. Баъдтар дубора кӯшиш кунед.",
    server: "Сервер ҷавоб надод. Баъдтар дубора кӯшиш кунед.",
    unknown: "Ҳангоми санҷиш хатогӣ ба вуҷуд омад.",
    cont: "Калид тасдиқ шуд. Шумо ба экрани навбатӣ мегузаред.",
    sessionHint: "Калид танҳо то пӯшидани ин варақа дар sessionStorage-и браузер мемонад.",
    localHint: "Калид дар localStorage-и ин браузер нигоҳ дошта мешавад ва пас аз пӯшидани браузер низ мемонад. Онро метавонед бо тугмаи тоза кардан нест кунед."
  };

  var $ = function (id) { return document.getElementById(id); };
  var input = $("key"), wrap = $("inputWrap"), eyeBtn = $("eyeBtn"), clearBtn = $("clearBtn");
  var verifyBtn = $("verifyBtn"), continueBtn = $("continueBtn"), statusEl = $("status");
  var remember = $("remember"), hint = $("storeHint");

  var verifying = false, validated = false, controller = null;

  /* ---------- Storage ---------- */
  function safe(fn) { try { return fn(); } catch (e) { return null; } }
  function readSaved() {
    return safe(function () { return sessionStorage.getItem(KEY_NAME); }) ||
           safe(function () { return localStorage.getItem(KEY_NAME); }) || "";
  }
  function clearSaved() {
    safe(function () { sessionStorage.removeItem(KEY_NAME); });
    safe(function () { localStorage.removeItem(KEY_NAME); });
  }
  function saveKey(key) {
    clearSaved();
    if (remember.checked) safe(function () { localStorage.setItem(KEY_NAME, key); });
    else safe(function () { sessionStorage.setItem(KEY_NAME, key); });
  }
  function updateHint() { hint.textContent = remember.checked ? MSG.localHint : MSG.sessionHint; }

  /* ---------- UI state ---------- */
  function setStatus(text, kind) {
    statusEl.textContent = text || "";
    statusEl.className = "status" + (kind ? " " + kind : "");
    wrap.classList.remove("ok", "bad");
    if (kind === "ok") wrap.classList.add("ok");
    if (kind === "err") { void wrap.offsetWidth; wrap.classList.add("bad"); }
  }
  function setValidated(v) {
    validated = v;
    continueBtn.disabled = !v;
    continueBtn.classList.toggle("ready", v);
  }
  function setLoading(v) {
    verifying = v;
    verifyBtn.disabled = v;
    verifyBtn.classList.toggle("loading", v);
    verifyBtn.setAttribute("aria-busy", v ? "true" : "false");
  }
  function syncClear() { clearBtn.hidden = input.value.length === 0; }

  /* ---------- Real validation via Gemini API ---------- */
  async function verify() {
    if (verifying) return;
    var key = input.value.trim();
    setValidated(false);
    if (!key) { setStatus(MSG.empty, "err"); input.focus(); return; }

    setLoading(true);
    setStatus(MSG.busy, "busy");
    controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    try {
      var res = await fetch(ENDPOINT, {
        method: "GET",
        headers: { "x-goog-api-key": key },
        signal: controller.signal,
        cache: "no-store"
      });
      if (res.ok) {
        saveKey(key);
        setValidated(true);
        setStatus(MSG.ok, "ok");
      } else if (res.status === 429) {
        setStatus(MSG.rate, "warn");
      } else if (res.status >= 500) {
        setStatus(MSG.server, "err");
      } else if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
        setStatus(MSG.invalid, "err");
      } else {
        setStatus(MSG.unknown, "err");
      }
    } catch (e) {
      if (e && e.name === "AbortError") setStatus(MSG.server, "err");
      else if (e instanceof TypeError) setStatus(MSG.network, "err");
      else setStatus(MSG.unknown, "err");
    } finally {
      clearTimeout(timer);
      controller = null;
      setLoading(false);
    }
  }

  /* ---------- Navigation architecture ---------- */
  var Nav = {
    current: "api-key",
    go: function (to, payload) {
      var from = this.current;
      this.current = to;
      try { history.pushState({ screen: to }, "", "#/" + to); } catch (e) { location.hash = "#/" + to; }
      document.dispatchEvent(new CustomEvent("valdub:navigate", { detail: { from: from, to: to, payload: payload || null } }));
    }
  };
  window.VALDUB = window.VALDUB || {};
  window.VALDUB.navigate = function (to, payload) { Nav.go(to, payload); };
  window.VALDUB.getApiKey = function () { return validated ? input.value.trim() : ""; };

  window.addEventListener("popstate", function () {
    Nav.current = location.hash.replace("#/", "") || "api-key";
  });

  /* ---------- Events ---------- */
  eyeBtn.addEventListener("click", function () {
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    eyeBtn.setAttribute("aria-pressed", show ? "true" : "false");
    eyeBtn.setAttribute("aria-label", show ? "Пинҳон кардани калид" : "Нишон додани калид");
    eyeBtn.title = show ? "Пинҳон кардан" : "Нишон додан";
    input.focus();
  });

  clearBtn.addEventListener("click", function () {
    if (verifying && controller) controller.abort();
    input.value = "";
    clearSaved();
    setValidated(false);
    setStatus("");
    syncClear();
    input.focus();
  });

  input.addEventListener("input", function () {
    syncClear();
    if (validated) { setValidated(false); }
    if (!verifying) setStatus("");
  });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); verify(); } });

  remember.addEventListener("change", function () {
    updateHint();
    if (validated) saveKey(input.value.trim());
    safe(function () { localStorage.setItem(MODE_NAME, remember.checked ? "1" : "0"); });
  });

  verifyBtn.addEventListener("click", verify);

  continueBtn.addEventListener("click", function () {
    if (!validated) return;
    setStatus(MSG.cont, "ok");
    Nav.go("home", { apiKeyReady: true });
  });

  /* ---------- Init ---------- */
  remember.checked = safe(function () { return localStorage.getItem(MODE_NAME); }) === "1" &&
                     !!safe(function () { return localStorage.getItem(KEY_NAME); });
  updateHint();
  var saved = readSaved();
  if (saved) { input.value = saved; }
  syncClear();
})();
