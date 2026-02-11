/* =========================
 NaaS (with CORS-resilient fetch)
 ========================= */
const btn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const result = document.getElementById('result');

function setLoading(isLoading) {
  if (isLoading) {
    btn.classList.add('loading');
    btn.setAttribute('disabled', 'true');
    result.classList.add('loading');
    result.textContent = 'Fetching…';
    copyBtn.setAttribute('disabled', 'true');
  } else {
    btn.classList.remove('loading');
    btn.removeAttribute('disabled');
    result.classList.remove('loading');
  }
}

function setResultText(text) {
  result.textContent = text;
  if (text && text.trim().length > 0) {
    copyBtn.removeAttribute('disabled');
  } else {
    copyBtn.setAttribute('disabled', 'true');
  }
}

// ---- Fetch helpers (origin first, then CORS-safe fallback) ----
function withTimeout(promise, ms, controller) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => {
      try { controller?.abort?.(); } catch {}
      rej(new Error(`Timeout after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithCorsFallback(url, { timeoutMs = 7000 } = {}) {
  const opts = { method: 'GET', mode: 'cors', cache: 'no-store', credentials: 'omit', redirect: 'follow' };
  const attempt = async (u) => {
    const ac = new AbortController();
    const p = fetch(u, { ...opts, signal: ac.signal });
    return withTimeout(p, timeoutMs, ac);
  };
  try {
    return await attempt(url);
  } catch (e1) {
    // Retry via a read-only CORS-friendly proxy
    await sleep(200);
    const proxied = `https://r.jina.ai/http/${url.replace(/^https?:\/\//, '')}`;
    try {
      return await attempt(proxied);
    } catch (e2) {
      const err = new Error(`Origin & fallback failed: ${e1?.message ?? e1} \n ${e2?.message ?? e2}`);
      err.originError = e1;
      err.fallbackError = e2;
      throw err;
    }
  }
}

function classifyFetchError(err, res) {
  if (res && !res.ok) return { kind: 'http', detail: `HTTP ${res.status}` };
  if (err?.name === 'AbortError' || /Timeout/i.test(err?.message ?? '')) return { kind: 'timeout', detail: 'Request timed out' };
  if (err && err.message && /TypeError/i.test(err.message)) return { kind: 'cors', detail: 'Blocked by CORS (browser)' };
  return { kind: 'network', detail: err?.message ?? 'Network error' };
}

/* ------- RESILIENT reasons.json loader & random picker ------- */
let __reasonsCache = null;

async function loadReasons() {
  if (Array.isArray(__reasonsCache)) return __reasonsCache;

  try {
    // Resolve against document base (works if app is in a subfolder)
    const url = new URL('reasons.json', document.baseURI).toString();
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    // Some static hosts serve JSON as text/plain; handle both.
    const ct = res.headers.get('content-type') ?? '';
    let data;
    if (ct.includes('application/json')) {
      data = await res.json();
    } else {
      const txt = await res.text();
      data = JSON.parse(txt);
    }

    const arr = Array.isArray(data) ? data : [];
    __reasonsCache = arr
      .map(x => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean);

  } catch (e) {
    console.warn('Failed to load reasons.json:', e);
    __reasonsCache = [];
  }
  return __reasonsCache;
}

function pickRandom(arr) {
  if (!arr || !arr.length) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

/* (Optional) Preload once so the first failure is instant */
loadReasons().catch(e => console.warn('Preload reasons failed:', e));

async function getMessage() {
  setLoading(true);
  try {
    const url = 'https://naas.isalman.dev/no';
    const res = await fetchWithCorsFallback(url, { timeoutMs: 7000 });
    if (!res.ok) {
      const { detail } = classifyFetchError(null, res);
      throw new Error(detail);
    }

    let messageText = '';
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      messageText = (data && typeof data.reason === 'string') ? data.reason : JSON.stringify(data);
    } else {
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        messageText = (parsed && typeof parsed.reason === 'string') ? parsed.reason : text;
      } catch {
        messageText = text;
      }
    }

    setResultText(messageText?.trim() ?? 'No message returned.');
  } catch (err) {
    console.error(err);
    const { detail } = classifyFetchError(err);

    // Try to show a random fallback from reasons.json
    try {
      const reasons = await loadReasons();
      let random = pickRandom(reasons);

      // Optional: seed one line if reasons.json is empty/unavailable
      if (!random && (!reasons || reasons.length === 0)) {
        random = "Not today—try again in a bit.";
      }

      if (random && random.trim()) {
        setResultText(random.trim());
      } else {
        setResultText(`My problems more than yours, so please hold up. ${detail}. Please try again.`);
      }
    } catch (e) {
      setResultText(`Failed to fetch message. ${detail}. Please try again.`);
    }
  } finally {
    setLoading(false);
  }
}

async function copyToClipboard() {
  const text = result.textContent ?? '';
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    const originalLabel = copyBtn.querySelector('.copy-label').textContent;
    copyBtn.classList.add('copy-success');
    copyBtn.querySelector('.copy-label').textContent = 'Copied!';
    copyBtn.setAttribute('disabled', 'true');
    setTimeout(() => {
      copyBtn.classList.remove('copy-success');
      copyBtn.querySelector('.copy-label').textContent = originalLabel;
      copyBtn.removeAttribute('disabled');
    }, 1200);
  } catch (e) {
    console.error('Clipboard write failed:', e);
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); alert('Copied to clipboard.'); }
    finally { document.body.removeChild(ta); }
  }
}

btn.addEventListener('click', getMessage);
copyBtn.addEventListener('click', copyToClipboard);

/* =========================
 LaaS (mirrors the same CORS hardening)
 ========================= */
const mainTitle = document.getElementById('mainTitle');
const openLaaSBtn = document.getElementById('openLaaSBtn');
const backToNaaSBtn = document.getElementById('backToNaaSBtn');
const naasSection = document.getElementById('naasSection');
const laasSection = document.getElementById('laasSection');
const naasFooter = document.getElementById('naasFooter');
const laasFooter = document.getElementById('laasFooter');
const laasGenerateBtn = document.getElementById('laasGenerateBtn');
const laasCopyBtn = document.getElementById('laasCopyBtn');
const laasResult = document.getElementById('laasResult');
const laasCategory = document.getElementById('laasCategory');

// (Optional) hero swap if you implemented it
const heroImage = document.getElementById('heroImage');
const NAAS_IMG_SRC = 'image.png';
const NAAS_IMG_ALT = 'Cat meme';
const LAAS_IMG_SRC = 'laas.jpg';
const LAAS_IMG_ALT = 'Lies As A Service hero';

function setTitleToNaaS() { if (mainTitle) mainTitle.textContent = 'NaaS - No As A Service'; }
function setTitleToLaaS() { if (mainTitle) mainTitle.textContent = 'LaaS - Lies As A Service'; }

function showLaaS() {
  if (naasSection) naasSection.hidden = true;
  if (laasSection) laasSection.hidden = false;
  if (naasFooter) naasFooter.style.display = 'none';
  if (laasFooter) laasFooter.style.display = '';
  setTitleToLaaS();
  if (heroImage) { heroImage.src = LAAS_IMG_SRC; heroImage.alt = LAAS_IMG_ALT; }
  if (laasResult) laasResult.textContent = 'Choose a category and click to get a reason.';
  if (laasCopyBtn) laasCopyBtn.setAttribute('disabled', 'true');
}

function showNaaS() {
  if (laasSection) laasSection.hidden = true;
  if (naasSection) naasSection.hidden = false;
  if (laasFooter) laasFooter.style.display = 'none';
  if (naasFooter) naasFooter.style.display = '';
  setTitleToNaaS();
  if (heroImage) { heroImage.src = NAAS_IMG_SRC; heroImage.alt = NAAS_IMG_ALT; }
}

openLaaSBtn?.addEventListener('click', showLaaS);
backToNaaSBtn?.addEventListener('click', showNaaS);

function laasSetLoading(isLoading) {
  if (!laasGenerateBtn || !laasResult || !laasCopyBtn) return;
  if (isLoading) {
    laasGenerateBtn.classList.add('loading');
    laasGenerateBtn.setAttribute('disabled', 'true');
    laasResult.classList.add('loading');
    laasResult.textContent = 'Fetching…';
    laasCopyBtn.setAttribute('disabled', 'true');
  } else {
    laasGenerateBtn.classList.remove('loading');
    laasGenerateBtn.removeAttribute('disabled');
    laasResult.classList.remove('loading');
  }
}

function laasSetResultText(text) {
  if (!laasResult || !laasCopyBtn) return;
  laasResult.textContent = text;
  if (text && text.trim().length > 0) laasCopyBtn.removeAttribute('disabled');
  else laasCopyBtn.setAttribute('disabled', 'true');
}

async function getLaaSMessage() {
  laasSetLoading(true);
  try {
    const cat = (laasCategory?.value ?? 'random').trim();
    const url = `https://lies-as-a-service.onrender.com/lie?category=${encodeURIComponent(cat)}`;
    const res = await fetchWithCorsFallback(url, { timeoutMs: 7000 });
    if (!res.ok) {
      const { detail } = classifyFetchError(null, res);
      throw new Error(detail);
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      const text =
        (typeof data?.lie === 'string' && data.lie) ||
        (typeof data?.reason === 'string' && data.reason) ||
        (typeof data?.message === 'string' && data.message) ||
        JSON.stringify(data);
      laasSetResultText((text ?? '').trim() || 'No message returned.');
    } else {
      const text = (await res.text()) ?? '';
      laasSetResultText(text.trim() || 'No message returned.');
    }
  } catch (err) {
    console.error(err);
    const { detail } = classifyFetchError(err);
    laasSetResultText(`Failed to fetch message. ${detail}. Please try again.`);
  } finally {
    laasSetLoading(false);
  }
}

async function laasCopyToClipboard() {
  const text = laasResult?.textContent ?? '';
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    const originalLabel = laasCopyBtn.querySelector('.copy-label').textContent;
    laasCopyBtn.classList.add('copy-success');
    laasCopyBtn.querySelector('.copy-label').textContent = 'Copied!';
    laasCopyBtn.setAttribute('disabled', 'true');
    setTimeout(() => {
      laasCopyBtn.classList.remove('copy-success');
      laasCopyBtn.querySelector('.copy-label').textContent = originalLabel;
      laasCopyBtn.removeAttribute('disabled');
    }, 1200);
  } catch (e) {
    console.error('Clipboard write failed:', e);
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); alert('Copied to clipboard.'); }
    finally { document.body.removeChild(ta); }
  }
}

laasGenerateBtn?.addEventListener('click', getLaaSMessage);
laasCopyBtn?.addEventListener('click', laasCopyToClipboard);

// Initial state
(function initUI() {
  if (naasFooter) naasFooter.style.display = '';
  if (laasFooter) laasFooter.style.display = 'none';
  if (heroImage) {
    heroImage.src = NAAS_IMG_SRC;
    heroImage.alt = NAAS_IMG_ALT;
  }
})();

/* ========= Deep-linking (load LaaS via URL) ========= */
// Accept: ?view=laas (optionally &cat=...) OR #laas (optionally #laas:<category>)
(function initDeepLink() {
  try {
    const params = new URLSearchParams(window.location.search);
    const view = (params.get('view') ?? '').toLowerCase();

    // Check hash pattern: #laas or #laas:category
    const hash = (window.location.hash ?? '').replace(/^#/, '');
    let hashView = '';
    let hashCategory = '';
    if (hash) {
      const [hView, hCat] = hash.split(':');
      hashView = (hView ?? '').toLowerCase();
      hashCategory = (hCat ?? '').trim();
    }

    // Determine desired view
    const wantsLaaS = (view === 'laas') || (hashView === 'laas');

    // Optional category from search param or hash
    const catFromQuery = (params.get('cat') ?? '').trim();
    const cat = (hashCategory || catFromQuery || '').toLowerCase();

    if (wantsLaaS) {
      // Preselect category if valid
      if (cat && document.getElementById('laasCategory')) {
        const select = document.getElementById('laasCategory');
        // Only set if the option exists; otherwise ignore
        const exists = Array.from(select.options).some(o => o.value === cat);
        if (exists) select.value = cat;
      }
      // Show LaaS instantly (no animation)
      if (typeof showLaaS === 'function') showLaaS();
    }
  } catch (e) {
    console.warn('Deep-link init failed:', e);
  }
})();

