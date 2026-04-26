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

// Load demo outputs on page load
fetch('demo_outputs.json')
  .then(r => r.json())
  .then(data => {
    demoOutputs = data;
    AGENT_KEYS.forEach(key => setBadge(key, 'done'));
    // Auto-select researcher
    selectAgent('researcher');
  })
  .catch(err => console.warn('demo_outputs.json load failed:', err));

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

// ─── LIVE MODE ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  researcher: "You are Aoife, a senior equity analyst at AlphaEire Capital, an Irish investment firm focused on ISEQ-listed stocks. Your role is to analyse current Irish market conditions, identify 3-5 stocks showing strong signals (momentum, undervaluation, or volatility opportunity), and produce a structured research brief. For each stock provide: ticker, sector, current signal type, key rationale (2-3 sentences), and a risk flag. Close with an overall Irish market outlook paragraph. Be precise, data-informed, and professional. Use realistic ISEQ tickers such as CRH.L, BIRG.I, AIB.I, RYA.I, KRZ.I, DCC.L.",

  designer: "You are Ciarán, a product designer at AlphaEire Capital. You have received a research brief from our equity analyst team. Design a stock monitoring dashboard and real-time alert system for our portfolio managers. Produce a detailed design specification covering: (1) dashboard layout and key UI components with exact descriptions, (2) alert trigger rules for each stock signal type identified in the research, (3) data visualisation choices (chart types, colour coding, thresholds), (4) UX rationale for every major decision. Format your output as a structured design specification document with clear headings.",

  maker: "You are Siobhán, a senior full-stack developer at AlphaEire Capital. You have received a design specification for a stock monitoring dashboard. Build a working, self-contained HTML file (with embedded CSS and JavaScript) that implements this design. Use realistic placeholder data for the ISEQ stocks identified in the research brief. The dashboard must include: stock cards with signal badges (BUY/WATCH/ALERT), a line chart using Chart.js (load via CDN: https://cdn.jsdelivr.net/npm/chart.js), and an alert notification panel on the right side. Output ONLY the complete HTML file contents — no explanations before or after, just the raw HTML starting with <!DOCTYPE html>.",

  communicator: "You are Declan, head of investor relations at AlphaEire Capital. Based on the equity research brief and the AI-powered monitoring dashboard built by our technology team, produce two things: (1) A professional investor alert email with subject line and body (~250 words) announcing the top Irish stock opportunities to our client base. (2) Two LinkedIn posts — one targeting Irish retail investors (casual, engaging, ~100 words) and one targeting institutional investors (formal, data-led, ~120 words) — both promoting AlphaEire Capital's new AI-powered ISEQ monitoring capability. Tone: confident, trustworthy, Irish-market-focused.",

  manager: "You are Margaret, Chief Investment Officer at AlphaEire Capital. Review the full pipeline output from your team: the equity research brief, the dashboard design specification, the working prototype description, and the investor communications. Produce three sections: (1) Executive Summary (~150 words) assessing strategic alignment and output quality. (2) 90-Day Operational Plan with exactly 5 concrete, numbered milestones. (3) Risk & Compliance section covering: GDPR implications of using AI for investment recommendations, EU AI Act classification of this system, and how AlphaEire Capital will maintain customer trust. Be authoritative, strategic, and candid about both strengths and gaps."
};

const USER_PROMPTS = {
  researcher: () => "Analyse the current Irish stock market (ISEQ). Identify 3-5 stocks with strong signals and produce your full research brief now.",
  designer: (ctx) => "Here is the research brief from our equity analyst:\n\n--- RESEARCH BRIEF ---\n" + ctx.researcher + "\n\nNow produce your full design specification for the stock monitoring dashboard.",
  maker: (ctx) => "Here is the context from our analyst and designer:\n\n--- RESEARCH BRIEF ---\n" + ctx.researcher + "\n\n--- DESIGN SPECIFICATION ---\n" + ctx.designer + "\n\nNow build the complete self-contained HTML dashboard. Output only the HTML.",
  communicator: (ctx) => "Here is the context from our analyst and developer:\n\n--- RESEARCH BRIEF ---\n" + ctx.researcher + "\n\n--- DASHBOARD BUILT ---\nA working HTML/JS dashboard has been built. Key features: stock signal cards, Chart.js line chart, alert panel.\n\nNow produce the investor alert email and two LinkedIn posts.",
  manager: (ctx) => "Here is the full pipeline output from your team:\n\n--- RESEARCH BRIEF (Aoife) ---\n" + ctx.researcher + "\n\n--- DESIGN SPECIFICATION (Ciarán) ---\n" + ctx.designer + "\n\n--- WORKING PROTOTYPE (Siobhán) ---\nSelf-contained HTML dashboard with Chart.js, stock signal cards, alert panel.\n\n--- INVESTOR COMMUNICATIONS (Declan) ---\n" + ctx.communicator + "\n\nNow produce your executive summary, 90-day operational plan, and risk & compliance section."
};

async function callClaude(apiKey, systemPrompt, userMessage) {
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
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API error ' + response.status);
  }
  const data = await response.json();
  return data.content[0].text;
}

async function runLivePipeline() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  if (!apiKey) { alert('Please enter your Anthropic API key.'); return; }

  const runBtn = document.getElementById('run-btn');
  const statusEl = document.getElementById('live-status');
  runBtn.disabled = true;
  liveOutputs = {};
  AGENT_KEYS.forEach(k => setBadge(k, 'ready'));

  const ctx = {};

  for (const key of AGENT_KEYS) {
    setBadge(key, 'running');
    statusEl.textContent = 'Running ' + AGENT_LABELS[key] + '…';
    if (selectedAgent === key) selectAgent(key);
    try {
      const userMsg = USER_PROMPTS[key](ctx);
      const output = await callClaude(apiKey, SYSTEM_PROMPTS[key], userMsg);
      ctx[key] = output;
      liveOutputs[key] = output;
      setBadge(key, 'done');
      if (selectedAgent === key) selectAgent(key);
    } catch (e) {
      setBadge(key, 'error');
      statusEl.textContent = 'Error on ' + AGENT_LABELS[key] + ': ' + e.message;
      runBtn.disabled = false;
      return;
    }
  }

  statusEl.textContent = 'Pipeline complete! Click any agent to view its output.';
  runBtn.disabled = false;
  selectAgent('manager');
}
