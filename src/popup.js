// Whisperly - popup.js (MV3)
// Guarda la API Key en chrome.storage y dispara el análisis.

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('save');
  const analyzeBtn = document.getElementById('analyze');

  if (!apiKeyInput || !saveBtn || !analyzeBtn) {
    console.error('[Whisperly popup] DOM elements missing.');
    return;
  }

  // Cargar API Key guardada
  chrome.storage.local.get('OPENAI_API_KEY', ({ OPENAI_API_KEY }) => {
    if (OPENAI_API_KEY) apiKeyInput.value = OPENAI_API_KEY;
  });

  // Guardar API Key
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.local.set({ OPENAI_API_KEY: key }, () => {
      console.log('[Whisperly popup] API key saved');
      saveBtn.textContent = 'Saved ✓';
      setTimeout(() => window.close(), 300);
    });
  });

  // Disparar análisis
  analyzeBtn.addEventListener('click', () => {
    console.log('[Whisperly popup] sending analyze request');
    chrome.runtime.sendMessage({ type: 'WHISPERLY_ANALYZE' });
    window.close();
  });
});
