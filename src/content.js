// Whisperly - content.js
// Monta el overlay y escucha eventos del background.

(function initWhisperlyOverlay(){
  if (window.__whisperlyMounted) return;
  window.__whisperlyMounted = true;

  const existing = document.getElementById('whisperly-overlay');
  const wrap = existing || document.createElement('div');
  wrap.id = 'whisperly-overlay';
  if (!existing) {
    wrap.innerHTML = `
      <div class="whisp-card">
        <div class="whisp-head">Whisperly</div>
        <div class="whisp-body" id="whisperly-body">Waiting…</div>
        <div class="whisp-actions">
          <button id="whisp-copy" title="Copy tip">Copy</button>
          <button id="whisp-close" title="Close">×</button>
        </div>
      </div>`;
    document.documentElement.appendChild(wrap);
  }

  const bodyEl = wrap.querySelector('#whisperly-body');

  const copyBtn = wrap.querySelector('#whisp-copy');
  if (copyBtn && !copyBtn.__bound) {
    copyBtn.__bound = true;
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(bodyEl?.textContent || ""); } catch {}
    });
  }
  const closeBtn = wrap.querySelector('#whisp-close');
  if (closeBtn && !closeBtn.__bound) {
    closeBtn.__bound = true;
    closeBtn.addEventListener('click', () => wrap.classList.remove('show'));
  }

  window.addEventListener('whisperly:loading', () => {
    bodyEl.textContent = 'Analyzing…';
    wrap.classList.add('show');
  });

  window.addEventListener('whisperly:tip', (e) => {
    bodyEl.textContent = e.detail || 'No result.';
    wrap.classList.add('show');
  });

  window.addEventListener('whisperly:error', (e) => {
    bodyEl.textContent = 'Error: ' + (e.detail || 'Unknown.');
    wrap.classList.add('show');
  });

  console.log('[Whisperly content] overlay ready');
})();
