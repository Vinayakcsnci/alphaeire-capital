import anthropic
import json
import os
import sys

API_KEY = os.environ.get("ANTHROPIC_API_KEY") or (sys.argv[1] if len(sys.argv) > 1 else "")
if not API_KEY:
    sys.exit("Usage: python pipeline.py <api-key>  OR  set ANTHROPIC_API_KEY env var")

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
