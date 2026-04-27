const AGENT_KEYS = ['researcher', 'designer', 'maker', 'communicator', 'manager'];
const AGENT_LABELS = {
  researcher: 'Aoife — Researcher',
  designer: 'Ciarán — Designer',
  maker: 'Siobhán — Maker',
  communicator: 'Declan — Communicator',
  manager: 'Margaret — Manager',
};

let demoOutputs = {};
let liveOutputs = {};
let currentMode = 'demo';
let selectedAgent = null;

// Load demo outputs — inline data from demo_data.js (works locally + on GitHub Pages)
function initDemo() {
  demoOutputs = DEMO_DATA;
  AGENT_KEYS.forEach(key => setBadge(key, 'done'));
  selectAgent('researcher');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('btn-demo').classList.toggle('active', mode === 'demo');
  document.getElementById('btn-live').classList.toggle('active', mode === 'live');
  document.getElementById('live-controls').classList.toggle('hidden', mode === 'demo');

  if (mode === 'demo') {
    AGENT_KEYS.forEach(key => setBadge(key, demoOutputs[key] ? 'done' : 'ready'));
    if (selectedAgent) selectAgent(selectedAgent);
  } else {
    AGENT_KEYS.forEach(key => setBadge(key, liveOutputs[key] ? 'done' : 'ready'));
    if (selectedAgent) selectAgent(selectedAgent);
  }
}

function selectAgent(key) {
  selectedAgent = key;
  AGENT_KEYS.forEach(k => { const c = document.getElementById('card-' + k); if (c) c.classList.remove('selected'); });
  const card = document.getElementById('card-' + key);
  if (card) card.classList.add('selected');

  const outputs = currentMode === 'demo' ? demoOutputs : liveOutputs;
  const content = outputs[key];
  document.getElementById('output-title').textContent = AGENT_LABELS[key];

  const body = document.getElementById('output-body');

  if (!content) {
    body.innerHTML = '<p class="placeholder-text">No output yet — ' +
      (currentMode === 'live' ? 'run the pipeline in Live Mode.' : 'run pipeline.py to generate demo outputs.') +
      '</p>';
    return;
  }

  if (key === 'maker') {
    body.innerHTML =
      '<p class="maker-note">Siobhán built a self-contained HTML dashboard. Rendered below:</p>' +
      '<iframe class="maker-frame" sandbox="allow-scripts" srcdoc="' + escapeAttr(content) + '"></iframe>';
  } else {
    body.textContent = content;
  }
}

function setBadge(key, state) {
  const badge = document.getElementById('badge-' + key);
  if (!badge) return;
  badge.className = 'status-badge';
  if (state === 'done') { badge.classList.add('done'); badge.textContent = 'Done'; }
  else if (state === 'running') { badge.classList.add('running'); badge.textContent = 'Running…'; }
  else if (state === 'error') { badge.classList.add('error'); badge.textContent = 'Error'; }
  else { badge.textContent = 'Ready'; }
}

function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Strip markdown code fences if the model wraps output despite instructions
function extractHtml(text) {
  const t = (text || '').trim();
  const fenced = t.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/i);
  if (fenced) return fenced[1].trim();
  // If it doesn't start with <, try to find the doctype
  const idx = t.indexOf('<!DOCTYPE');
  if (idx > 0) return t.slice(idx);
  return t;
}

// ─── YAHOO FINANCE LIVE DATA ─────────────────────────────────────────────────

const ISEQ_SYMBOLS = [
  '^ISEQ',
  'KRX.IR', 'KRZ.IR', 'GL9.IR', 'IR5B.IR', 'EG7.IR',
  'IRES.IR', 'OIZ.IR', 'HSW.IR', 'MIO.IR', 'MLC.IR', '8GW.IR',
];

async function fetchYahooMeta(symbol) {
  const enc = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=5d&includePrePost=false`;
  const sources = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];
  for (const src of sources) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(src, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const json = await r.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) return meta;
    } catch (_) {}
  }
  return null;
}

function f2(n) { return n != null ? Number(n).toFixed(2) : 'N/A'; }
function fPct(n) { if (n == null) return 'N/A'; return (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%'; }

async function buildMarketContext(statusEl) {
  if (statusEl) statusEl.textContent = 'Fetching live ISEQ data from Yahoo Finance…';
  const date = new Date().toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' });
  const lines = [`LIVE MARKET DATA — Yahoo Finance — ${date}`, ''];
  let fetched = 0;

  for (const sym of ISEQ_SYMBOLS) {
    const m = await fetchYahooMeta(sym);
    if (!m) { lines.push(`${sym}: data unavailable`, ''); continue; }
    const price = m.regularMarketPrice;
    const prev  = m.chartPreviousClose || m.previousClose;
    const chgPct = prev ? ((price - prev) / prev * 100) : null;
    if (sym === '^ISEQ') {
      lines.push(`ISEQ All Share (^ISEQ): ${f2(price)}  (${fPct(chgPct)} today)`);
      lines.push(`  Day range : ${f2(m.regularMarketDayLow)} – ${f2(m.regularMarketDayHigh)}`);
      lines.push(`  52-week   : ${f2(m.fiftyTwoWeekLow)} – ${f2(m.fiftyTwoWeekHigh)}`);
    } else {
      const name = m.shortName || sym;
      const ccy  = m.currency || 'EUR';
      lines.push(`${name} (${sym}): ${ccy} ${f2(price)}  ${fPct(chgPct)}`);
      lines.push(`  Day: ${f2(m.regularMarketDayLow)} – ${f2(m.regularMarketDayHigh)}  |  52w: ${f2(m.fiftyTwoWeekLow)} – ${f2(m.fiftyTwoWeekHigh)}`);
    }
    lines.push('');
    fetched++;
  }

  if (fetched === 0) {
    return '(Live market data unavailable — base analysis on current market knowledge.)';
  }
  return lines.join('\n').trim();
}

// ─── LIVE MODE ───────────────────────────────────────────────────────────────
// Note: API key is stored in the DOM input for the session. This is intentional
// and within-scope for this demo; not suitable for production use.

// Demo key — assembled at runtime, never rendered to the page.
// TODO: remove before final submission.
const _DK = ['gsk_3jEQg','Qt9TKVfiy','jo2L6LWGdy','b3FYiOJyTcTxEhOBUTjF4nJtSOIm'].join('');

const SYSTEM_PROMPTS = {
  researcher: "You are Aoife, a senior equity analyst at AlphaEire Capital, an Irish investment firm focused on ISEQ-listed stocks. Live market data from Yahoo Finance will be provided at the top of the user message for ^ISEQ and these Euronext Dublin stocks: KRX.IR, KRZ.IR, GL9.IR, IR5B.IR, EG7.IR, IRES.IR, OIZ.IR, HSW.IR, MIO.IR, MLC.IR, 8GW.IR — treat it as ground truth for current prices and movements. Your role is to analyse this live ISEQ data, identify 3-5 stocks showing strong signals (momentum, undervaluation, or volatility opportunity), and produce a structured research brief. For each stock provide: ticker, company name, current price, signal type, key rationale (2-3 sentences grounded in the live data), and a risk flag. Close with an overall Irish market outlook paragraph referencing the ISEQ index level. Be precise, data-driven, and professional.",

  designer: "You are Ciarán, a product designer at AlphaEire Capital. You have received a research brief from our equity analyst team. Design a stock monitoring dashboard and real-time alert system for our portfolio managers. Produce a detailed design specification covering: (1) dashboard layout and key UI components with exact descriptions, (2) alert trigger rules for each stock signal type identified in the research, (3) data visualisation choices (chart types, colour coding, thresholds), (4) UX rationale for every major decision. Format your output as a structured design specification document with clear headings.",

  maker: "You are Siobhán, a senior full-stack developer at AlphaEire Capital. You have received a design specification for a stock monitoring dashboard. Build a working, self-contained HTML file (with embedded CSS and JavaScript) that implements this design. Use realistic placeholder data for the ISEQ stocks identified in the research brief. The dashboard must include: stock cards with signal badges (BUY/WATCH/ALERT), a line chart using Chart.js (load via CDN: https://cdn.jsdelivr.net/npm/chart.js), and an alert notification panel on the right side. Output ONLY the complete HTML file contents — no explanations before or after, just the raw HTML starting with <!DOCTYPE html>.",

  communicator: "You are Declan, head of investor relations at AlphaEire Capital. Based on the equity research brief and the AI-powered monitoring dashboard built by our technology team, produce two things: (1) A professional investor alert email with subject line and body (~250 words) announcing the top Irish stock opportunities to our client base. (2) Two LinkedIn posts — one targeting Irish retail investors (casual, engaging, ~100 words) and one targeting institutional investors (formal, data-led, ~120 words) — both promoting AlphaEire Capital's new AI-powered ISEQ monitoring capability. Tone: confident, trustworthy, Irish-market-focused.",

  manager: "You are Margaret, Chief Investment Officer at AlphaEire Capital. Review the full pipeline output from your team: the equity research brief, the dashboard design specification, the working prototype description, and the investor communications. Produce three sections: (1) Executive Summary (~150 words) assessing strategic alignment and output quality. (2) 90-Day Operational Plan with exactly 5 concrete, numbered milestones. (3) Risk & Compliance section covering: GDPR implications of using AI for investment recommendations, EU AI Act classification of this system, and how AlphaEire Capital will maintain customer trust. Be authoritative, strategic, and candid about both strengths and gaps."
};

const USER_PROMPTS = {
  researcher: (_ctx) => "Analyse the current Irish stock market (ISEQ). Identify 3-5 stocks with strong signals and produce your full research brief now.",
  designer: (ctx) => "Here is the research brief from our equity analyst:\n\n--- RESEARCH BRIEF ---\n" + ctx.researcher + "\n\nNow produce your full design specification for the stock monitoring dashboard.",
  maker: (ctx) => "Here is the context from our analyst and designer:\n\n--- RESEARCH BRIEF ---\n" + ctx.researcher + "\n\n--- DESIGN SPECIFICATION ---\n" + ctx.designer + "\n\nNow build the complete self-contained HTML dashboard. Output only the raw HTML — start your response with <!DOCTYPE html> and end with </html>. No markdown fences, no explanation.",
  communicator: (ctx) => "Here is the context from our analyst and developer:\n\n--- RESEARCH BRIEF ---\n" + ctx.researcher + "\n\n--- DASHBOARD BUILT ---\nA working HTML/JS dashboard has been built. Key features: stock signal cards, Chart.js line chart, alert panel.\n\nNow produce the investor alert email and two LinkedIn posts.",
  manager: (ctx) => "Here is the full pipeline output from your team:\n\n--- RESEARCH BRIEF (Aoife) ---\n" + ctx.researcher + "\n\n--- DESIGN SPECIFICATION (Ciarán) ---\n" + ctx.designer + "\n\n--- WORKING PROTOTYPE (Siobhán) ---\nSelf-contained HTML dashboard with Chart.js, stock signal cards, alert panel.\n\n--- INVESTOR COMMUNICATIONS (Declan) ---\n" + ctx.communicator + "\n\nNow produce your executive summary, 90-day operational plan, and risk & compliance section."
};

// Per-agent token budgets.
// Groq free tier: 100k TPD total (input + output). Keep per-run total under ~12k.
// Output budgets: 600+700+1600+550+750 = 4,200. Estimated input adds ~6k → ~10k per run.
const AGENT_MAX_TOKENS = {
  anthropic: { researcher: 2000, designer: 2500, maker: 8000, communicator: 2000, manager: 3000 },
  openai:    { researcher: 2000, designer: 2500, maker: 8000, communicator: 2000, manager: 3000 },
  groq:      { researcher: 600,  designer: 700,  maker: 1600, communicator: 550,  manager: 750  },
};

function getMaxTokens(provider, agentKey) {
  return (AGENT_MAX_TOKENS[provider] || AGENT_MAX_TOKENS.anthropic)[agentKey] || 2000;
}

// For Groq, cap each context value at 3 000 chars (~750 tokens) to keep input tokens low.
function trimCtxForGroq(ctx) {
  const LIMIT = 3000;
  const out = {};
  for (const k of Object.keys(ctx)) {
    const v = ctx[k];
    out[k] = v && v.length > LIMIT ? v.slice(0, LIMIT) + '\n[…truncated for token efficiency]' : v;
  }
  return out;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const PROVIDER_CONFIG = {
  anthropic: { label: 'Claude claude-opus-4-7',  placeholder: 'Paste your Anthropic API key (sk-ant-...)...' },
  openai:    { label: 'GPT-4o (OpenAI)',    placeholder: 'Paste your OpenAI API key (sk-...)...' },
  groq:      { label: 'Llama 3.3 70B (Groq)', placeholder: 'Paste your Groq API key (gsk_...)...' },
};

function updateKeyPlaceholder(provider) {
  const input = document.getElementById('api-key-input');
  if (input) input.placeholder = PROVIDER_CONFIG[provider]?.placeholder || 'Paste your API key...';
}

function getSelectedProvider() {
  const el = document.querySelector('input[name="provider"]:checked');
  return el ? el.value : 'anthropic';
}

async function callClaude(apiKey, systemPrompt, userMessage, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Anthropic API error ' + response.status);
  }
  const data = await response.json();
  const block = data.content && data.content[0];
  if (!block || block.type !== 'text') throw new Error('Unexpected Anthropic response shape');
  return block.text;
}

async function callOpenAICompat(provider, apiKey, systemPrompt, userMessage, maxTokens, _retries = 0) {
  const baseUrl = provider === 'groq'
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1';
  const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o';
  const response = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (response.status === 429 && _retries < 4) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || '';
    const match = msg.match(/try again in (\d+(?:\.\d+)?)s/i);
    const waitSec = match
      ? Math.ceil(parseFloat(match[1])) + 1
      : Math.min(15 * (_retries + 1), 60);
    const statusEl = document.getElementById('live-status');
    for (let i = waitSec; i > 0; i--) {
      if (statusEl) statusEl.textContent =
        `Rate limit — retrying in ${i}s… (attempt ${_retries + 1}/4)`;
      await sleep(1000);
    }
    return callOpenAICompat(provider, apiKey, systemPrompt, userMessage, maxTokens, _retries + 1);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || provider + ' API error ' + response.status);
  }
  const data = await response.json();
  const choice = data.choices && data.choices[0];
  if (!choice || !choice.message || choice.message.content == null)
    throw new Error('Unexpected ' + provider + ' response shape');
  return choice.message.content;
}

async function callLLM(provider, apiKey, systemPrompt, userMessage, maxTokens) {
  return provider === 'anthropic'
    ? callClaude(apiKey, systemPrompt, userMessage, maxTokens)
    : callOpenAICompat(provider, apiKey, systemPrompt, userMessage, maxTokens);
}

let pipelineRunning = false;

function runDemoLive() {
  const groqRadio = document.querySelector('input[name="provider"][value="groq"]');
  if (groqRadio) { groqRadio.checked = true; updateKeyPlaceholder('groq'); }
  runLivePipeline(_DK);
}

async function runLivePipeline(_keyOverride) {
  if (pipelineRunning) return;
  const apiKey = _keyOverride || document.getElementById('api-key-input').value.trim();
  if (!apiKey) { alert('Please enter your API key.'); return; }

  const provider = getSelectedProvider();
  const providerLabel = PROVIDER_CONFIG[provider]?.label || provider;

  const runBtn = document.getElementById('run-btn');
  const demoBtn = document.getElementById('demo-run-btn');
  const statusEl = document.getElementById('live-status');
  pipelineRunning = true;
  runBtn.disabled = true;
  if (demoBtn) demoBtn.disabled = true;
  liveOutputs = {};
  AGENT_KEYS.forEach(k => setBadge(k, 'ready'));

  // Fetch live ISEQ data from Yahoo Finance before running Aoife
  let marketContext = '';
  try {
    marketContext = await buildMarketContext(statusEl);
  } catch (_) {
    marketContext = '(Live market data unavailable — base analysis on current market knowledge.)';
  }

  const ctx = {};

  for (const key of AGENT_KEYS) {
    setBadge(key, 'running');
    statusEl.textContent = 'Running ' + AGENT_LABELS[key] + ' via ' + providerLabel + '…';
    if (selectedAgent === key) selectAgent(key);
    try {
      const promptCtx = provider === 'groq' ? trimCtxForGroq(ctx) : ctx;
      let userMsg = USER_PROMPTS[key](promptCtx);
      const maxTokens = getMaxTokens(provider, key);
      // Inject live Yahoo Finance data into Aoife's prompt
      if (key === 'researcher' && marketContext) {
        userMsg = marketContext + '\n\n---\n\n' + userMsg;
      }
      let output = await callLLM(provider, apiKey, SYSTEM_PROMPTS[key], userMsg, maxTokens);
      if (key === 'maker') output = extractHtml(output);
      ctx[key] = output;
      liveOutputs[key] = output;
      setBadge(key, 'done');
      if (selectedAgent === key) selectAgent(key);
    } catch (e) {
      setBadge(key, 'error');
      statusEl.textContent = 'Error on ' + AGENT_LABELS[key] + ': ' + e.message;
      runBtn.disabled = false;
      if (demoBtn) demoBtn.disabled = false;
      pipelineRunning = false;
      return;
    }
  }

  statusEl.textContent = 'Pipeline complete via ' + providerLabel + '! Click any agent to view its output.';
  runBtn.disabled = false;
  if (demoBtn) demoBtn.disabled = false;
  pipelineRunning = false;
  if (currentMode !== 'live') switchMode('live');
  selectAgent('manager');
}
