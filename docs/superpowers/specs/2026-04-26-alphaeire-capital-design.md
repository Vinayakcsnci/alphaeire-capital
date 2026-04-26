# AlphaEire Capital — Agentic Organisation Design Spec

**Date:** 2026-04-26
**Project:** CEAI CA — Build an Agentic Organisation
**Organisation:** AlphaEire Capital (Ireland-based stock market investment firm, ISEQ-focused)
**Business Challenge:** Irish market stock analysis & alerting pipeline

---

## 1. Organisation Overview

AlphaEire Capital is a fictional Dublin-based investment firm modelled on the structure of BlackRock Ireland. It specialises in ISEQ-listed equities and serves both institutional and retail investors in the Irish market. The business challenge the agentic system solves is: **automatically identifying high-signal Irish stocks, designing and building a monitoring dashboard, communicating opportunities to investors, and producing an operational plan** — all without manual handoffs between departments.

The agentic approach is justified because each stage (research → design → build → communicate → govern) requires distinct expertise and produces structured output that feeds the next stage. A single-agent system would conflate these concerns; a human team would be slower and inconsistent.

---

## 2. Architecture

### File Structure

```
CE/
├── pipeline.py              # Python — runs the 5-agent chain via Anthropic SDK
├── demo_outputs.json        # Pre-generated agent outputs, embedded in site
├── index.html               # GitHub Pages site (single page)
├── style.css                # Site styling
├── app.js                   # Pipeline UI logic + live Claude API calls
├── skill/
│   ├── SKILL.md             # Skill file with YAML frontmatter (Researcher agent)
│   └── researcher-skill.zip # Zipped skill for submission
└── docs/
    └── superpowers/specs/   # This design doc
```

### Data Flow

1. `pipeline.py` runs locally with the Anthropic API key
2. Each of the 5 agents is called sequentially; each agent's full output is appended to the next agent's user message as context
3. Final outputs saved to `demo_outputs.json`
4. `index.html` loads `demo_outputs.json` and renders it in the pipeline UI (Demo Mode)
5. In Live Mode, `app.js` calls `https://api.anthropic.com/v1/messages` directly from the browser using the user-supplied API key and the `anthropic-dangerous-direct-browser-access: true` header
6. Agents run sequentially in the browser; each card animates through Running → Done states

---

## 3. The Five Agents

All agents use **claude-opus-4-7** as the underlying model. Each has a distinct Irish name, personality, and system prompt tailored to AlphaEire Capital.

### Agent 1 — Researcher: Aoife
- **Role:** Senior Equity Analyst, ISEQ specialist
- **Superpower:** Deep analysis and pattern recognition
- **System Prompt:** "You are Aoife, a senior equity analyst at AlphaEire Capital, an Irish investment firm focused on ISEQ-listed stocks. Your role is to analyse current Irish market conditions, identify 3–5 stocks showing strong signals (momentum, undervaluation, or volatility opportunity), and produce a structured research brief. For each stock, provide: ticker, sector, current signal type, key rationale (2–3 sentences), and a risk flag. Close with an overall market outlook paragraph. Be precise, data-informed, and professional."
- **Output:** Research brief — 5 stock picks with signals, rationale, and market outlook

### Agent 2 — Designer: Ciarán
- **Role:** Product Designer
- **Superpower:** Creative problem-solving and design thinking
- **Input:** Aoife's research brief
- **System Prompt:** "You are Ciarán, a product designer at AlphaEire Capital. You have received a research brief from our equity analyst. Design a stock monitoring dashboard and real-time alert system for our portfolio managers. Produce a detailed design specification covering: (1) dashboard layout and key UI components, (2) alert trigger rules for each stock signal type, (3) data visualisation choices, (4) UX rationale for each decision. Format your output as a structured design specification document."
- **Output:** Design spec — dashboard layout, alert rules, UX rationale

### Agent 3 — Maker: Siobhán
- **Role:** Senior Full-Stack Developer
- **Superpower:** Technical craftsmanship and rapid prototyping
- **Input:** Ciarán's design spec
- **System Prompt:** "You are Siobhán, a senior developer at AlphaEire Capital. You have received a design specification for a stock monitoring dashboard. Build a working HTML/CSS/JavaScript dashboard that implements this design. Use realistic placeholder data for the stocks identified in the research brief. Output the complete, self-contained HTML file with embedded CSS and JS. The dashboard must include: stock cards with signal badges, a simple price chart (using Chart.js via CDN), and an alert notification panel."
- **Output:** Working HTML/CSS/JS dashboard code (self-contained)

### Agent 4 — Communicator: Declan
- **Role:** Head of Investor Relations
- **Superpower:** Persuasion and storytelling
- **Input:** Aoife's research brief + Siobhán's dashboard
- **System Prompt:** "You are Declan, head of investor relations at AlphaEire Capital. Based on the equity research brief and the new AI-powered monitoring dashboard built by our tech team, produce: (1) a professional investor alert email (subject line + body, ~250 words) announcing the top stock opportunities to our client base, and (2) two LinkedIn posts (one for retail investors, one for institutional) promoting AlphaEire Capital's new AI monitoring capability. Tone: confident, trustworthy, Irish-market-focused."
- **Output:** Investor alert email + 2 LinkedIn posts

### Agent 5 — Manager: Margaret
- **Role:** Chief Investment Officer
- **Superpower:** Leadership and orchestration
- **Input:** All previous agent outputs
- **System Prompt:** "You are Margaret, Chief Investment Officer at AlphaEire Capital. Review the full pipeline output from your team: the equity research brief, the dashboard design specification, the working prototype, and the investor communications. Produce: (1) an executive summary (150 words) assessing the quality and strategic alignment of the team's work, (2) a 90-day operational plan with 5 concrete milestones, (3) a risk and compliance section covering GDPR implications, EU AI Act considerations, and customer trust. Be authoritative, strategic, and candid."
- **Output:** Executive summary + 90-day plan + compliance section

---

## 4. Pipeline Handoff Logic

```
Researcher (Aoife)
  └─► output: research_brief
        └─► Designer (Ciarán) receives: research_brief
              └─► output: design_spec
                    └─► Maker (Siobhán) receives: research_brief + design_spec
                          └─► output: dashboard_code
                                └─► Communicator (Declan) receives: research_brief + dashboard_code
                                      └─► output: comms_pack
                                            └─► Manager (Margaret) receives: ALL outputs
                                                  └─► output: executive_report
```

Each agent's user message includes all prior outputs as context, clearly labelled with headers, so no information is lost across the chain.

---

## 5. GitHub Pages Site (index.html + app.js + style.css)

### Layout
- **Header:** "AlphaEire Capital — Agentic Investment Pipeline" + mode toggle (Demo / Live)
- **Pipeline bar:** 5 agent cards in a horizontal row with arrow connectors; each card shows name, role, and status badge
- **Output panel:** Clicking an agent card displays its full output in a formatted panel below
- **Live Mode controls:** API key input field + "Run Full Pipeline" button; agents animate sequentially

### Demo Mode
- Loads `demo_outputs.json` on page load
- All 5 agent cards show as "Done" immediately
- Clicking each card shows its pre-generated output

### Live Mode
- User enters Anthropic API key
- Clicks "Run Full Pipeline"
- JS calls Claude API sequentially for each agent, passing accumulated context
- Cards animate: Pending → Running → Done as each agent completes
- Uses `anthropic-dangerous-direct-browser-access: true` header

---

## 6. Skill File

The Researcher agent (Aoife) is packaged as a Claude Code skill:

**SKILL.md frontmatter:**
```yaml
---
name: iseq-researcher
description: Analyses Irish stock market (ISEQ) conditions and produces a structured equity research brief with 3-5 stock picks, signal types, rationale, and market outlook. Designed for AlphaEire Capital's agentic investment pipeline.
---
```

Packaged as `researcher-skill.zip` containing `SKILL.md`.

---

## 7. Error Handling

- **Pipeline.py:** Each agent call wrapped in try/except; on failure, prints error and exits with message
- **Live Mode (browser):** Each agent fetch wrapped in try/catch; on error, card shows "Error" badge in red and pipeline halts with user-visible message
- **Demo Mode:** Always works — no network calls required

---

## 8. Out of Scope

- Real-time stock data API integration (placeholder data only)
- User authentication or saved sessions
- Mobile-optimised layout (desktop-first for demo purposes)
- Backend server or database
