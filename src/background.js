// Whisperly - background.js (MV3)
// Recibe la orden, asegura overlay, captura, llama a OpenAI y muestra el tip.

const MODEL = "gpt-4o-mini"; // rápido y económico
const SYSTEM_PROMPT = `
You are Whisperly, a contextual UX/UI assistant. Analyze the screenshot and return 1–3 concise, actionable tips.
- Be specific and practical.
- Prefer heuristics, accessibility, clarity, affordance, hierarchy.
- Max 60 words total.
- English output. Bullet points.
`.trim();

// Asegura que el overlay y el content script están inyectados en la pestaña
async function ensureOverlay(tabId) {
  try { await chrome.scripting.insertCSS({ target: { tabId }, files: ['overlay.css'] }); } catch (e) {}
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch (e) {}

  // Si por timing el content todavía no montó, crea contenedor mínimo
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (!document.getElementById('whisperly-overlay')) {
        const wrap = document.createElement('div');
        wrap.id = 'whisperly-overlay';
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

        const bodyEl = wrap.querySelector('#whisperly-body');
        wrap.querySelector('#whisp-copy')?.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(bodyEl?.textContent || ""); } catch {}
        });
        wrap.querySelector('#whisp-close')?.addEventListener('click', () => wrap.classList.remove('show'));
      }
    }
  });
}

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  console.log('[Whisperly background] received message', msg);
  if (msg.type !== 'WHISPERLY_ANALYZE') return;

  try {
    console.log('[Whisperly background] starting analyze…');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { console.warn('[Whisperly] no active tab'); return; }

    await ensureOverlay(tab.id);

    // Mostrar "Analyzing…"
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.dispatchEvent(new CustomEvent('whisperly:loading'))
    });

    // Captura la pestaña
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    console.log('[Whisperly background] captured PNG length', dataUrl?.length || 0);

    // API Key
    const { OPENAI_API_KEY } = await chrome.storage.local.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      await showError(tab.id, 'Missing OpenAI API Key.');
      return;
    }

    // Llamada real a OpenAI (chat.completions con imagen)
    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Provide UX/UI improvement tips for this UI." },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 180
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    console.log('[Whisperly background] API status', res.status);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      await showError(tab.id, `API error (${res.status}): ${errText.slice(0, 140)}`);
      return;
    }

    const data = await res.json();
    const tip = data?.choices?.[0]?.message?.content?.trim()
      || "No clear issues detected. Try a different view or increase contrast on primary actions.";

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [tip],
      func: (t) => window.dispatchEvent(new CustomEvent('whisperly:tip', { detail: t }))
    });

    console.log('[Whisperly background] done');
  } catch (e) {
    console.error('[Whisperly background] error', e);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await showError(tab.id, (e && e.message) ? e.message : String(e));
  }
});

async function showError(tabId, message) {
  await chrome.scripting.executeScript({
    target: { tabId },
    args: [message],
    func: (msg) => window.dispatchEvent(new CustomEvent('whisperly:error', { detail: msg }))
  });
}
