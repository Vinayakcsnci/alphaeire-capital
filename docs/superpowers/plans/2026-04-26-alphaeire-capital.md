# AlphaEire Capital — Agentic Investment Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-agent agentic investment pipeline for AlphaEire Capital (ISEQ stock analysis) with a GitHub Pages demo site and a Claude Code skill file.

**Architecture:** A Python pipeline script runs 5 Claude agents sequentially, each agent's output becoming the next agent's context, saving results to `demo_outputs.json`. A static GitHub Pages site renders these results in Demo Mode and re-runs the pipeline live from the browser in Live Mode via the Anthropic API.

**Tech Stack:** Python 3 + anthropic SDK (pipeline), Vanilla HTML/CSS/JS (site), claude-opus-4-7 (all agents), Chart.js via CDN (in Maker's dashboard output)

---

## File Map

| File | Responsibility |
|------|---------------|
| `pipeline.py` | Runs 5 agents sequentially, saves outputs to JSON |
| `demo_outputs.json` | Pre-generated agent outputs, loaded by site in Demo Mode |
| `index.html` | Single-page GitHub Pages site — layout and markup |
| `style.css` | All styling — pipeline bar, agent cards, output panel |
| `app.js` | Demo Mode loader + Live Mode Claude API calls |
| `skill/SKILL.md` | Researcher agent packaged as a Claude Code skill |
| `skill/researcher-skill.zip` | Zipped skill for submission |

---

## Task 1: Project Structure + Python Dependencies

**Files:**
- Create: `pipeline.py`
- Create: `requirements.txt`

- [ ] **Step 1: Create requirements.txt**

```
anthropic>=0.40.0
```

- [ ] **Step 2: Install dependencies**

```bash
pip install anthropic
```

Expected output: `Successfully installed anthropic-x.x.x`

- [ ] **Step 3: Create pipeline.py skeleton and verify imports work**

```python
import anthropic
import json
import sys

API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE"

client = anthropic.Anthropic(api_key=API_KEY)
print("Anthropic client initialised successfully.")
```

- [ ] **Step 4: Run the skeleton to verify the client initialises**

```bash
python pipeline.py
```

Expected: `Anthropic client initialised successfully.`

- [ ] **Step 5: Commit**

```bash
git init
git add requirements.txt pipeline.py
git commit -m "feat: initialise project with anthropic dependency"
```

---

## Task 2: Write the Full pipeline.py with 5 Agent System Prompts

**Files:**
- Modify: `pipeline.py`

- [ ] **Step 1: Replace pipeline.py with the full implementation**

```python
import anthropic
import json
import sys

API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE"

client = anthropic.Anthropic(api_key=API_KEY)

AGENTS = {
    "researcher": {
        "label": "Aoife — Researcher",
        "system": (
            "You are Aoife, a senior equity analyst at AlphaEire Capital, an Irish investment firm "
            "focused on ISEQ-listed stocks. Your role is to analyse current Irish market conditions, "
            "identify 3-5 stocks showing strong signals (momentum, undervaluation, or volatility "
            "opportunity), and produce a structured research brief. For each stock provide: ticker, "
            "sector, current signal type, key rationale (2-3 sentences), and a risk flag. "
            "Close with an overall Irish market outlook paragraph. "
            "Be precise, data-informed, and professional. Use realistic ISEQ tickers such as "
            "CRH.L, BIRG.I, AIB.I, RYA.I, KRZ.I, DCC.L, APAM.AS, and others."
        ),
    },
    "designer": {
        "label": "Ciarán — Designer",
        "system": (
            "You are Ciarán, a product designer at AlphaEire Capital. You have received a research "
            "brief from our equity analyst team. Design a stock monitoring dashboard and real-time "
            "alert system for our portfolio managers. Produce a detailed design specification covering: "
            "(1) dashboard layout and key UI components with exact descriptions, "
            "(2) alert trigger rules for each stock signal type identified in the research, "
            "(3) data visualisation choices (chart types, colour coding, thresholds), "
            "(4) UX rationale for every major decision. "
            "Format your output as a structured design specification document with clear headings."
        ),
    },
    "maker": {
        "label": "Siobhán — Maker",
        "system": (
            "You are Siobhán, a senior full-stack developer at AlphaEire Capital. You have received "
            "a design specification for a stock monitoring dashboard. Build a working, self-contained "
            "HTML file (with embedded CSS and JavaScript) that implements this design. "
            "Use realistic placeholder data for the ISEQ stocks identified in the research brief. "
            "The dashboard must include: stock cards with signal badges (BUY/WATCH/ALERT), "
            "a line chart using Chart.js (load via CDN: https://cdn.jsdelivr.net/npm/chart.js), "
            "and an alert notification panel on the right side. "
            "Output ONLY the complete HTML file contents — no explanations before or after, "
            "just the raw HTML starting with <!DOCTYPE html>."
        ),
    },
    "communicator": {
        "label": "Declan — Communicator",
        "system": (
            "You are Declan, head of investor relations at AlphaEire Capital. "
            "Based on the equity research brief and the AI-powered monitoring dashboard built by "
            "our technology team, produce two things: "
            "(1) A professional investor alert email with subject line and body (~250 words) "
            "announcing the top Irish stock opportunities to our client base. "
            "(2) Two LinkedIn posts — one targeting Irish retail investors (casual, engaging, ~100 words) "
            "and one targeting institutional investors (formal, data-led, ~120 words) — both promoting "
            "AlphaEire Capital's new AI-powered ISEQ monitoring capability. "
            "Tone: confident, trustworthy, Irish-market-focused. Include a clear CTA in each piece."
        ),
    },
    "manager": {
        "label": "Margaret — Manager",
        "system": (
            "You are Margaret, Chief Investment Officer at AlphaEire Capital. "
            "Review the full pipeline output from your team: the equity research brief, "
            "the dashboard design specification, the working prototype description, "
            "and the investor communications. Produce three sections: "
            "(1) Executive Summary (~150 words) assessing strategic alignment and output quality. "
            "(2) 90-Day Operational Plan with exactly 5 concrete, numbered milestones. "
            "(3) Risk & Compliance section covering: GDPR implications of using AI for investment "
            "recommendations, EU AI Act classification of this system, and how AlphaEire Capital "
            "will maintain customer trust. "
            "Be authoritative, strategic, and candid about both strengths and gaps."
        ),
    },
}


def run_agent(agent_key: str, user_message: str) -> str:
    agent = AGENTS[agent_key]
    print(f"\n{'='*60}")
    print(f"Running: {agent['label']}")
    print(f"{'='*60}")
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=3000,
        system=agent["system"],
        messages=[{"role": "user", "content": user_message}],
    )
    output = response.content[0].text
    print(output[:300] + "..." if len(output) > 300 else output)
    return output


def build_context(label: str, content: str) -> str:
    return f"\n\n--- {label} ---\n{content}"


def main():
    outputs = {}

    # Agent 1: Researcher
    research_brief = run_agent(
        "researcher",
        "Analyse the current Irish stock market (ISEQ). Identify 3-5 stocks with strong signals "
        "and produce your full research brief now.",
    )
    outputs["researcher"] = research_brief

    # Agent 2: Designer
    designer_context = (
        "Here is the research brief from our equity analyst:\n"
        + build_context("RESEARCH BRIEF", research_brief)
        + "\n\nNow produce your full design specification for the stock monitoring dashboard."
    )
    design_spec = run_agent("designer", designer_context)
    outputs["designer"] = design_spec

    # Agent 3: Maker
    maker_context = (
        "Here is the context from our analyst and designer:"
        + build_context("RESEARCH BRIEF", research_brief)
        + build_context("DESIGN SPECIFICATION", design_spec)
        + "\n\nNow build the complete self-contained HTML dashboard. Output only the HTML."
    )
    dashboard_code = run_agent("maker", maker_context)
    outputs["maker"] = dashboard_code

    # Agent 4: Communicator
    comms_context = (
        "Here is the context from our analyst and developer:"
        + build_context("RESEARCH BRIEF", research_brief)
        + build_context("DASHBOARD BUILT", "A working HTML/JS dashboard has been built implementing the design spec. Key features: stock cards with signal badges, Chart.js line chart, alert panel.")
        + "\n\nNow produce the investor alert email and two LinkedIn posts."
    )
    comms_pack = run_agent("communicator", comms_context)
    outputs["communicator"] = comms_pack

    # Agent 5: Manager
    manager_context = (
        "Here is the full pipeline output from your team:"
        + build_context("RESEARCH BRIEF (Aoife)", research_brief)
        + build_context("DESIGN SPECIFICATION (Ciarán)", design_spec)
        + build_context("WORKING PROTOTYPE (Siobhán)", "Self-contained HTML dashboard built with Chart.js, stock signal cards, and alert panel.")
        + build_context("INVESTOR COMMUNICATIONS (Declan)", comms_pack)
        + "\n\nNow produce your executive summary, 90-day operational plan, and risk & compliance section."
    )
    executive_report = run_agent("manager", manager_context)
    outputs["manager"] = executive_report

    # Save to JSON
    with open("demo_outputs.json", "w", encoding="utf-8") as f:
        json.dump(outputs, f, ensure_ascii=False, indent=2)

    print("\n\nPipeline complete. Outputs saved to demo_outputs.json")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the pipeline and verify all 5 agents complete**

```bash
python pipeline.py
```

Expected: Each agent prints its label and a preview of its output. Final line: `Pipeline complete. Outputs saved to demo_outputs.json`

- [ ] **Step 3: Verify demo_outputs.json has all 5 keys**

```bash
python -c "import json; d=json.load(open('demo_outputs.json')); print(list(d.keys()))"
```

Expected: `['researcher', 'designer', 'maker', 'communicator', 'manager']`

- [ ] **Step 4: Commit**

```bash
git add pipeline.py demo_outputs.json
git commit -m "feat: add 5-agent pipeline and generate demo outputs"
```

---

## Task 3: Build index.html

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AlphaEire Capital — Agentic Investment Pipeline</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <!-- HEADER -->
  <header>
    <div class="header-inner">
      <div class="brand">
        <span class="brand-icon">⬡</span>
        <div>
          <h1>AlphaEire Capital</h1>
          <p class="tagline">AI-Powered Irish Market Intelligence Pipeline</p>
        </div>
      </div>
      <div class="mode-toggle">
        <button id="btn-demo" class="mode-btn active" onclick="switchMode('demo')">Demo Mode</button>
        <button id="btn-live" class="mode-btn" onclick="switchMode('live')">Live Mode</button>
      </div>
    </div>
  </header>

  <!-- LIVE MODE CONTROLS -->
  <div id="live-controls" class="live-controls hidden">
    <div class="live-inner">
      <input id="api-key-input" type="password" placeholder="Paste your Anthropic API key..." />
      <button id="run-btn" onclick="runLivePipeline()">▶ Run Full Pipeline</button>
      <span id="live-status" class="live-status"></span>
    </div>
  </div>

  <!-- PIPELINE BAR -->
  <section class="pipeline-section">
    <div class="pipeline-bar">

      <div class="agent-card" id="card-researcher" onclick="selectAgent('researcher')">
        <div class="agent-icon">🔍</div>
        <div class="agent-name">Aoife</div>
        <div class="agent-role">Researcher</div>
        <div class="status-badge" id="badge-researcher">Ready</div>
      </div>

      <div class="arrow">→</div>

      <div class="agent-card" id="card-designer" onclick="selectAgent('designer')">
        <div class="agent-icon">🎨</div>
        <div class="agent-name">Ciarán</div>
        <div class="agent-role">Designer</div>
        <div class="status-badge" id="badge-designer">Ready</div>
      </div>

      <div class="arrow">→</div>

      <div class="agent-card" id="card-maker" onclick="selectAgent('maker')">
        <div class="agent-icon">⚙️</div>
        <div class="agent-name">Siobhán</div>
        <div class="agent-role">Maker</div>
        <div class="status-badge" id="badge-maker">Ready</div>
      </div>

      <div class="arrow">→</div>

      <div class="agent-card" id="card-communicator" onclick="selectAgent('communicator')">
        <div class="agent-icon">📢</div>
        <div class="agent-name">Declan</div>
        <div class="agent-role">Communicator</div>
        <div class="status-badge" id="badge-communicator">Ready</div>
      </div>

      <div class="arrow">→</div>

      <div class="agent-card" id="card-manager" onclick="selectAgent('manager')">
        <div class="agent-icon">👔</div>
        <div class="agent-name">Margaret</div>
        <div class="agent-role">Manager</div>
        <div class="status-badge" id="badge-manager">Ready</div>
      </div>

    </div>
  </section>

  <!-- OUTPUT PANEL -->
  <section class="output-section">
    <div class="output-panel">
      <div class="output-header">
        <span id="output-title">Select an agent above to view its output</span>
      </div>
      <div id="output-body" class="output-body">
        <p class="placeholder-text">Click any agent card in the pipeline above to see what it produced.</p>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer>
    <p>AlphaEire Capital · Agentic Investment Pipeline · Built with Claude claude-opus-4-7 · ISEQ Market Intelligence</p>
  </footer>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the file is well-formed (open in browser and check no JS errors before app.js exists)**

Open `index.html` in a browser. Expected: page renders with header, 5 agent cards in a row, output panel below. No content in output panel yet (app.js not loaded yet is fine at this step).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add index.html pipeline layout"
```

---

## Task 4: Build style.css

**Files:**
- Create: `style.css`

- [ ] **Step 1: Create style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --green: #00c896;
  --dark: #0d1117;
  --card-bg: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --muted: #8b949e;
  --accent: #238636;
  --running: #d29922;
  --done: #00c896;
  --error: #f85149;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--dark);
  color: var(--text);
  min-height: 100vh;
}

/* HEADER */
header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 16px 32px;
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand { display: flex; align-items: center; gap: 14px; }
.brand-icon { font-size: 2rem; color: var(--green); }
.brand h1 { font-size: 1.4rem; font-weight: 700; color: var(--text); }
.tagline { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }

/* MODE TOGGLE */
.mode-toggle { display: flex; gap: 8px; }
.mode-btn {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}
.mode-btn.active {
  background: var(--green);
  border-color: var(--green);
  color: #000;
  font-weight: 600;
}
.mode-btn:hover:not(.active) { border-color: var(--green); color: var(--green); }

/* LIVE CONTROLS */
.live-controls {
  background: #111;
  border-bottom: 1px solid var(--border);
  padding: 12px 32px;
}
.live-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
#api-key-input {
  flex: 1;
  padding: 9px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.85rem;
}
#api-key-input:focus { outline: none; border-color: var(--green); }
#run-btn {
  padding: 9px 22px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
}
#run-btn:hover { background: #2ea043; }
#run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.live-status { font-size: 0.8rem; color: var(--muted); }
.hidden { display: none !important; }

/* PIPELINE SECTION */
.pipeline-section {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}
.pipeline-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}
.arrow {
  font-size: 1.6rem;
  color: var(--green);
  flex-shrink: 0;
  padding: 0 4px;
}

/* AGENT CARDS */
.agent-card {
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 130px;
  flex-shrink: 0;
}
.agent-card:hover { border-color: var(--green); transform: translateY(-2px); }
.agent-card.selected { border-color: var(--green); box-shadow: 0 0 0 3px rgba(0,200,150,0.15); }
.agent-icon { font-size: 2rem; margin-bottom: 8px; }
.agent-name { font-weight: 700; font-size: 1rem; margin-bottom: 2px; }
.agent-role { font-size: 0.75rem; color: var(--muted); margin-bottom: 10px; }

/* STATUS BADGES */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--border);
  color: var(--muted);
}
.status-badge.done { background: rgba(0,200,150,0.15); color: var(--done); }
.status-badge.running { background: rgba(210,153,34,0.15); color: var(--running); }
.status-badge.error { background: rgba(248,81,73,0.15); color: var(--error); }

/* OUTPUT PANEL */
.output-section {
  padding: 0 32px 32px;
  max-width: 1200px;
  margin: 0 auto;
}
.output-panel {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
.output-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: #0d1117;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--green);
}
.output-body {
  padding: 24px;
  min-height: 300px;
  max-height: 600px;
  overflow-y: auto;
  font-size: 0.875rem;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
.placeholder-text { color: var(--muted); font-style: italic; }

/* MAKER IFRAME */
.maker-frame {
  width: 100%;
  height: 520px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}
.maker-note {
  font-size: 0.75rem;
  color: var(--muted);
  margin-bottom: 12px;
}

/* FOOTER */
footer {
  text-align: center;
  padding: 24px;
  font-size: 0.75rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
}
```

- [ ] **Step 2: Reload index.html in browser, verify styling**

Expected: Dark background, green accents, 5 styled agent cards in a row with arrows, output panel visible below.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add site styling"
```

---

## Task 5: Build app.js — Demo Mode

**Files:**
- Create: `app.js`

- [ ] **Step 1: Create app.js with Demo Mode loader**

```javascript
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
  .catch(() => console.warn('demo_outputs.json not found — run pipeline.py first'));

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
  AGENT_KEYS.forEach(k => document.getElementById('card-' + k).classList.remove('selected'));
  document.getElementById('card-' + key).classList.add('selected');

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
      '<iframe class="maker-frame" srcdoc="' + escapeHtml(content) + '"></iframe>';
  } else {
    body.textContent = content;
  }
}

function setBadge(key, state) {
  const badge = document.getElementById('badge-' + key);
  badge.className = 'status-badge';
  if (state === 'done') { badge.classList.add('done'); badge.textContent = 'Done'; }
  else if (state === 'running') { badge.classList.add('running'); badge.textContent = 'Running…'; }
  else if (state === 'error') { badge.classList.add('error'); badge.textContent = 'Error'; }
  else { badge.textContent = 'Ready'; }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

- [ ] **Step 2: Open index.html in browser and verify Demo Mode works**

Expected:
- Page loads, fetches `demo_outputs.json`
- All 5 badges show "Done" in green
- Clicking each card shows its output in the panel
- Maker card shows the HTML dashboard in an iframe

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add demo mode output loader"
```

---

## Task 6: Add Live Mode to app.js

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Append Live Mode pipeline runner to app.js**

```javascript
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
```

- [ ] **Step 2: Test Live Mode in browser**

Open `index.html` → click "Live Mode" → paste Anthropic API key → click "Run Full Pipeline". Expected: each agent card animates Running → Done, output appears in panel when card is clicked.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add live mode pipeline runner with Claude API calls"
```

---

## Task 7: Create Skill File

**Files:**
- Create: `skill/SKILL.md`
- Create: `skill/researcher-skill.zip` (via zip command)

- [ ] **Step 1: Create skill/SKILL.md**

```bash
mkdir skill
```

Create `skill/SKILL.md` with this exact content:

```markdown
---
name: iseq-researcher
description: Analyses Irish stock market (ISEQ) conditions and produces a structured equity research brief with 3-5 stock picks, signal types, key rationale, and a market outlook. Designed as the Researcher agent in AlphaEire Capital's agentic investment pipeline.
---

# ISEQ Researcher — Aoife

You are Aoife, a senior equity analyst at AlphaEire Capital, an Irish investment firm focused on ISEQ-listed stocks.

## Your Role

Analyse current Irish market conditions, identify 3-5 stocks showing strong signals, and produce a structured research brief.

## Output Format

For each stock:
- **Ticker** (e.g. CRH.L, BIRG.I, AIB.I, RYA.I)
- **Sector**
- **Signal type** (Momentum / Undervaluation / Volatility Opportunity)
- **Rationale** (2-3 sentences)
- **Risk flag**

Close with an **Irish Market Outlook** paragraph.

## Personality

Precise, data-driven, professionally measured. Never speculative without evidence. Your output feeds directly into the Designer agent who will build a dashboard based on your findings — be structured and specific.
```

- [ ] **Step 2: Zip the skill file**

```bash
cd skill && zip researcher-skill.zip SKILL.md && cd ..
```

Expected: `skill/researcher-skill.zip` created containing `SKILL.md`

- [ ] **Step 3: Verify zip contents**

```bash
python -c "import zipfile; z=zipfile.ZipFile('skill/researcher-skill.zip'); print(z.namelist())"
```

Expected: `['SKILL.md']`

- [ ] **Step 4: Commit**

```bash
git add skill/
git commit -m "feat: add researcher agent skill file"
```

---

## Task 8: GitHub Repository Setup + Pages Deployment

**Files:** None — git/GitHub config only

- [ ] **Step 1: Add .gitignore**

Create `.gitignore`:
```
__pycache__/
*.pyc
.env
brief_extracted.txt
```

- [ ] **Step 2: Add all files and push to GitHub**

```bash
git add .gitignore
git commit -m "chore: add gitignore"
git branch -M main
git remote add origin https://github.com/Vinayakcsnci/alphaeire-capital.git
git push -u origin main
```

- [ ] **Step 3: Enable GitHub Pages**

On GitHub: Settings → Pages → Source: Deploy from branch → Branch: `main` → Folder: `/ (root)` → Save.

Expected: Site published at `https://Vinayakcsnci.github.io/alphaeire-capital`

- [ ] **Step 4: Verify the live site**

Visit `https://Vinayakcsnci.github.io/alphaeire-capital` in a browser. Expected: site loads, Demo Mode shows all 5 agents as Done, clicking cards shows real outputs.

---

## Task 9: Final Verification Checklist

- [ ] `pipeline.py` runs end-to-end and produces `demo_outputs.json` with 5 keys
- [ ] `index.html` loads without console errors
- [ ] Demo Mode: all 5 agent cards show "Done", clicking each shows content
- [ ] Maker card renders the HTML dashboard in an iframe
- [ ] Live Mode: API key input visible, Run button triggers sequential agent calls
- [ ] Live Mode: each card animates Running → Done, selected card output updates live
- [ ] `skill/SKILL.md` has valid YAML frontmatter with `name` and `description`
- [ ] `skill/researcher-skill.zip` contains `SKILL.md`
- [ ] GitHub Pages URL is live and accessible

---

## Self-Review Notes

- All 5 agent system prompts match between `pipeline.py` and `app.js` (SYSTEM_PROMPTS object)
- `escapeHtml()` in app.js correctly escapes Maker's HTML output for iframe `srcdoc`
- `anthropic-dangerous-direct-browser-access: true` header included in all live API calls
- `demo_outputs.json` must be generated BEFORE deploying (Task 2 before Task 8)
- Model name `claude-opus-4-7` used consistently in both pipeline.py and app.js
