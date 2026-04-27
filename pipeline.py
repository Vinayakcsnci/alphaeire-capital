import anthropic
import datetime
import json
import os
import sys

try:
    import yfinance as yf
    YF_AVAILABLE = True
except ImportError:
    YF_AVAILABLE = False

API_KEY = os.environ.get("ANTHROPIC_API_KEY") or (sys.argv[1] if len(sys.argv) > 1 else "")
if not API_KEY:
    sys.exit("Usage: python pipeline.py <api-key>  OR  set ANTHROPIC_API_KEY env var")

client = anthropic.Anthropic(api_key=API_KEY)

AGENT_MAX_TOKENS = {
    "researcher":   2000,
    "designer":     2500,
    "maker":        8000,
    "communicator": 2000,
    "manager":      3000,
}

AGENTS = {
    "researcher": {
        "label": "Aoife — Researcher",
        "system": (
            "You are Aoife, a senior equity analyst at AlphaEire Capital, an Irish investment firm "
            "focused on ISEQ-listed stocks. Live market data from Yahoo Finance will be provided at "
            "the top of the user message — treat it as ground truth for current prices and movements. "
            "Your role is to analyse this live ISEQ data, identify 3-5 stocks showing strong signals "
            "(momentum, undervaluation, or volatility opportunity), and produce a structured research "
            "brief. For each stock provide: ticker, sector, current price, signal type, key rationale "
            "(2-3 sentences grounded in the live data), and a risk flag. "
            "Close with an overall Irish market outlook paragraph. "
            "Be precise, data-driven, and professional."
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
            "just the raw HTML starting with <!DOCTYPE html> and ending with </html>."
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


def fetch_iseq_market_data() -> str:
    """Fetch live ISEQ data from Yahoo Finance via yfinance."""
    if not YF_AVAILABLE:
        return "(yfinance not installed — run: pip install yfinance)"

    symbols = [("^ISEQ", "ISEQ All Share Index"), ("AIBG.I", "AIB Group"),
               ("BIRG.I", "Bank of Ireland"), ("RYA.I", "Ryanair"),
               ("CRH.L", "CRH plc"), ("DCC.L", "DCC plc"), ("PTSB.I", "Permanent TSB")]
    today = datetime.date.today().strftime("%d %b %Y")
    lines = [f"LIVE MARKET DATA — Yahoo Finance — {today}", ""]

    for sym, name in symbols:
        try:
            t = yf.Ticker(sym)
            hist = t.history(period="5d")
            if hist.empty:
                lines.append(f"{name} ({sym}): no data available")
                lines.append("")
                continue

            price = float(hist["Close"].iloc[-1])
            prev  = float(hist["Close"].iloc[-2]) if len(hist) > 1 else price
            chg   = ((price - prev) / prev * 100) if prev else 0.0
            sign  = "+" if chg >= 0 else ""
            dhi   = float(hist["High"].iloc[-1])
            dlo   = float(hist["Low"].iloc[-1])

            hist_1y = t.history(period="1y")
            h52 = float(hist_1y["High"].max()) if not hist_1y.empty else None
            l52 = float(hist_1y["Low"].min())  if not hist_1y.empty else None

            if sym == "^ISEQ":
                lines.append(f"ISEQ All Share (^ISEQ): {price:.2f}  ({sign}{chg:.2f}% today)")
                lines.append(f"  Day range : {dlo:.2f} – {dhi:.2f}")
                if h52 and l52:
                    lines.append(f"  52-week   : {l52:.2f} – {h52:.2f}")
            else:
                vol = int(hist["Volume"].iloc[-1])
                lines.append(f"{name} ({sym}): {price:.4f}  ({sign}{chg:.2f}% today)")
                lines.append(f"  Day: {dlo:.4f} – {dhi:.4f}" +
                              (f"  |  52w: {l52:.4f} – {h52:.4f}" if h52 and l52 else ""))
                if vol > 0:
                    lines.append(f"  Volume: {vol:,}")
            lines.append("")
        except Exception as exc:
            lines.append(f"{name} ({sym}): fetch error — {exc}")
            lines.append("")

    return "\n".join(lines).strip()


def run_agent(agent_key: str, user_message: str) -> str:
    agent = AGENTS[agent_key]
    max_tok = AGENT_MAX_TOKENS.get(agent_key, 3000)
    print(f"\n{'='*60}")
    print(f"Running: {agent['label']}  (max_tokens={max_tok})")
    print(f"{'='*60}")
    try:
        response = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=max_tok,
            system=agent["system"],
            messages=[{"role": "user", "content": user_message}],
        )
    except Exception as e:
        sys.exit(f"Agent '{agent_key}' ({agent['label']}) failed: {e}")
    output = response.content[0].text
    print(output[:300] + "..." if len(output) > 300 else output)
    return output


def build_context(label: str, content: str) -> str:
    return f"\n\n--- {label} ---\n{content}"


def main():
    outputs = {}

    # Fetch live market data for Aoife
    print("\nFetching live ISEQ market data from Yahoo Finance…")
    market_data = fetch_iseq_market_data()
    print(market_data[:400] + "..." if len(market_data) > 400 else market_data)

    # Agent 1: Researcher — injected with live Yahoo Finance data
    researcher_prompt = (
        market_data
        + "\n\n---\n\n"
        "Using the live market data above, analyse the ISEQ stocks. "
        "Identify 3-5 stocks with strong signals and produce your full research brief now."
    )
    research_brief = run_agent("researcher", researcher_prompt)
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
        + "\n\nNow build the complete self-contained HTML dashboard. "
        "Output only the raw HTML — start with <!DOCTYPE html> and end with </html>. "
        "No markdown fences, no explanation."
    )
    dashboard_code = run_agent("maker", maker_context)
    # Strip markdown fences if the model wraps output despite instructions
    dashboard_code = dashboard_code.strip()
    if dashboard_code.startswith("```"):
        import re
        m = re.match(r"^```(?:html)?\s*([\s\S]*?)```\s*$", dashboard_code, re.IGNORECASE)
        if m:
            dashboard_code = m.group(1).strip()
    outputs["maker"] = dashboard_code

    # Agent 4: Communicator
    comms_context = (
        "Here is the context from our analyst and developer:"
        + build_context("RESEARCH BRIEF", research_brief)
        + build_context("DASHBOARD BUILT",
                        "A working HTML/JS dashboard has been built implementing the design spec. "
                        "Key features: stock cards with signal badges, Chart.js line chart, alert panel.")
        + "\n\nNow produce the investor alert email and two LinkedIn posts."
    )
    comms_pack = run_agent("communicator", comms_context)
    outputs["communicator"] = comms_pack

    # Agent 5: Manager
    manager_context = (
        "Here is the full pipeline output from your team:"
        + build_context("RESEARCH BRIEF (Aoife)", research_brief)
        + build_context("DESIGN SPECIFICATION (Ciarán)", design_spec)
        + build_context("WORKING PROTOTYPE (Siobhán)",
                        "Self-contained HTML dashboard built with Chart.js, stock signal cards, and alert panel.")
        + build_context("INVESTOR COMMUNICATIONS (Declan)", comms_pack)
        + "\n\nNow produce your executive summary, 90-day operational plan, and risk & compliance section."
    )
    executive_report = run_agent("manager", manager_context)
    outputs["manager"] = executive_report

    with open("demo_outputs.json", "w", encoding="utf-8") as f:
        json.dump(outputs, f, ensure_ascii=False, indent=2)

    print("\n\nPipeline complete. Outputs saved to demo_outputs.json")


if __name__ == "__main__":
    main()
