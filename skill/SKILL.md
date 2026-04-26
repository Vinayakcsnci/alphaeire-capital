---
name: alphaeire-pipeline
description: AlphaEire Capital — 5-agent agentic investment pipeline for ISEQ (Irish Stock Exchange) stock analysis. Includes Researcher (Aoife), Designer (Ciarán), Maker (Siobhán), Communicator (Declan), and Manager (Margaret). Each agent's output feeds the next in an unbroken chain of equity intelligence.
---

# AlphaEire Capital — Agentic Investment Pipeline

Five specialised AI agents collaborate sequentially to produce end-to-end Irish stock market intelligence.

## The Agents

| File | Agent | Role |
|------|-------|------|
| `researcher.md` | Aoife | Senior Equity Analyst — produces ISEQ research brief with stock picks and signals |
| `designer.md` | Ciarán | Product Designer — produces dashboard design specification and alert rules |
| `maker.md` | Siobhán | Full-Stack Developer — builds a working self-contained HTML stock dashboard |
| `communicator.md` | Declan | Head of Investor Relations — produces investor email and LinkedIn posts |
| `manager.md` | Margaret | Chief Investment Officer — produces executive summary, 90-day plan, and compliance review |

## Pipeline Flow

```
Aoife (Researcher) → Ciarán (Designer) → Siobhán (Maker) → Declan (Communicator) → Margaret (Manager)
```

Each agent's full output is passed as structured context to the next agent using `--- SECTION HEADER ---` delimiters.

## Live Demo

GitHub Pages: https://vinayakcsnci.github.io/alphaeire-capital/

Supports Anthropic Claude, OpenAI GPT-4o, and Groq Llama 3.3 in the browser Live Mode.
