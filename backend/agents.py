from crewai import Agent, Task, Crew, Process, LLM
from tools import company_web_search, company_financial_data
from config import Config
import json
import re


def get_llm():
    return LLM(
        model="groq/meta-llama/llama-4-scout-17b-16e-instruct",
        api_key=Config.GROQ_API_KEY,
        temperature=0.3,
    )


LENGTH_INSTRUCTIONS = {
    "short": "For each section, write 2-3 concise bullet points only. Be extremely brief.",
    "medium": "For each section, write a short paragraph (3-5 sentences). Clear and professional.",
    "long": "For each section, provide a detailed analysis with supporting evidence, multiple angles, and specific examples where possible.",
}


def build_crew(company_name: str, length: str, sections: list, custom_prompt: str = "") -> Crew:
    llm = get_llm()
    length_instruction = LENGTH_INSTRUCTIONS.get(length, LENGTH_INSTRUCTIONS["medium"])
    sections_str = ", ".join(sections)
    if custom_prompt:
        if "custom_focus" not in sections:
            sections = sections + ["custom_focus"]
        sections_str = ", ".join(sections)

    # ── AGENT 1: Researcher ──────────────────────────────────────────────────
    researcher = Agent(
        role="Company Intelligence Researcher",
        goal=(
            f"Find comprehensive, up-to-date information about {company_name}. "
            f"Focus on: recent news, product launches, leadership changes, "
            f"funding rounds, and public sentiment."
        ),
        backstory=(
            "You are a seasoned business intelligence analyst who knows how to "
            "find signal in noise. You run targeted searches, cross-reference sources, "
            "and never report stale or irrelevant data. You always note the source URL "
            "for every fact you find."
        ),
        tools=[company_web_search, company_financial_data],
        llm=llm,
        verbose=False,
        allow_delegation=False,
        max_iter=8,
    )

    # ── AGENT 2: Analyst ─────────────────────────────────────────────────────
    analyst = Agent(
        role="Strategic Business Analyst",
        goal=(
            f"Analyze the raw research about {company_name} and extract the most "
            f"strategically relevant insights for a sales meeting. "
            f"Identify pain points, opportunities, and conversation angles."
        ),
        backstory=(
            "You are a former McKinsey consultant turned sales enablement specialist. "
            "You read between the lines, spot what matters to a B2B buyer, and translate "
            "noisy data into sharp strategic insights. You never use tools — you think."
        ),
        tools=[],
        llm=llm,
        verbose=False,
        allow_delegation=False,
        max_iter=3,
    )

    # ── AGENT 3: Briefing Writer ──────────────────────────────────────────────
    briefing_writer = Agent(
        role="Pre-Meeting Brief Specialist",
        goal=(
            f"Format all research and analysis about {company_name} into a clean, "
            f"structured JSON brief ready for a sales rep to read 5 minutes before "
            f"walking into a meeting."
        ),
        backstory=(
            "You are a meticulous technical writer who produces battle-tested sales briefs. "
            "Your output is always valid JSON. You never add commentary outside the JSON. "
            "Every section includes a confidence field and a sources list."
        ),
        tools=[],
        llm=llm,
        verbose=False,
        allow_delegation=False,
        max_iter=2,
    )

    # ── TASK 1: Research ──────────────────────────────────────────────────────
    research_task = Task(
        description=(
            f"Research {company_name} thoroughly using targeted web searches.\n\n"
            f"IMPORTANT: You MUST run searches ONE AT A TIME. Do NOT call multiple "
            f"tools simultaneously. Run one search, wait for the results, read them, "
            f"then run the next search. This is critical to avoid overloading the model.\n\n"
            f"Execute these searches sequentially, one after another:\n"
            f"  Step 1: Search for '{company_name} latest news 2024 2025' — wait for results.\n"
            f"  Step 2: Search for '{company_name} products services revenue' — wait for results.\n"
            f"  Step 3: Search for '{company_name} leadership CEO strategy' — wait for results.\n"
            f"  Step 4: Search for '{company_name} competitors market position' — wait for results.\n"
            f"  Step 5: Fetch financial stub data for {company_name}.\n\n"
            f"After ALL searches are complete, compile ALL findings into a structured "
            f"research summary. For every fact, note the source URL. "
            f"Note how many search results were returned total.\n\n"
            f"Once all searches are complete, write a summary of maximum 200 words as plain "
            f"sentences only. No markdown, no headers, no bullet points, no lists. Just plain "
            f"prose. Do not call any more tools."
        ),
        expected_output=(
            "A detailed research summary including: company overview, recent news items "
            "(with dates and URLs), financial snapshot, key leadership, products/services, "
            "and competitive landscape. Include a 'sources' list of all URLs cited. "
            "Include a 'total_results_found' integer."
        ),
        agent=researcher,
    )

    # ── TASK 2: Analysis ──────────────────────────────────────────────────────
    analysis_task = Task(
        description=(
            f"Review the research summary about {company_name}. "
            f"Produce a strategic analysis covering:\n"
            f"- Key business challenges and pain points\n"
            f"- Recent strategic shifts or pivots\n"
            f"- Social/market sentiment (positive or negative)\n"
            f"- 3-5 strong talking points for a sales rep entering this meeting\n"
            f"- 2-3 potential risks or sensitive topics to avoid or address carefully\n\n"
            f"Sections requested: {sections_str}. "
            f"Length style: {length_instruction}"
            + (f"\n\nADDITIONAL FOCUS FROM USER: {custom_prompt}\nMake sure your analysis specifically addresses this angle. Weave it into the relevant sections." if custom_prompt else "")
        ),
        expected_output=(
            "A structured analysis with: talking_points (list), watch_out_for (list), "
            "social_sentiment summary, and key strategic insights per requested section."
        ),
        agent=analyst,
        context=[research_task],
    )

    # ── TASK 3: Brief Generation ──────────────────────────────────────────────
    briefing_task = Task(
        description=(
            f"Using all research and analysis, generate a structured pre-meeting brief "
            f"for {company_name} as a single valid JSON object.\n\n"
            f"The JSON must have these top-level keys: "
            f"summary, news, financials, social_sentiment, talking_points, watch_out_for"
            + (f", custom_focus" if custom_prompt else "") + ".\n\n"
            f"Each section object must have:\n"
            f"  - 'content': the actual brief content ({length_instruction})\n"
            f"  - 'confidence': one of 'high', 'medium', or 'low'\n"
            f"  - 'sources': list of URLs used for this section (empty list if none)\n\n"
            + (f"\n\nCRITICAL REQUIREMENT: You MUST include a 'custom_focus' key in your JSON output. This is mandatory, not optional. The user has specifically asked: '{custom_prompt}'\n\nThe 'custom_focus' section must:\n- Directly and specifically answer the user's question\n- Give actionable, specific advice based on the research\n- NOT be generic — reference actual facts found about the company\n- Have this exact structure:\n  \"custom_focus\": {{\n    \"content\": \"[specific answer to the user's question]\",\n    \"confidence\": \"high\" or \"medium\" or \"low\",\n    \"sources\": [list of relevant URLs]\n  }}\n\nIf you omit custom_focus from the JSON, your output will be rejected. It must appear as a top-level key.\n\n" if custom_prompt else "") +
            f"Only include sections from this list: {sections_str}. "
            f"If a section is not in the list, omit it entirely.\n\n"
            f"CRITICAL: Your ENTIRE response must be ONLY the JSON object. "
            f"No explanation before or after. No markdown code fences. Pure JSON only."
            + (f"\n\nUSER-SPECIFIED FOCUS: {custom_prompt}\nEnsure this perspective is reflected in the brief content." if custom_prompt else "")
        ),
        expected_output=(
            "A single valid JSON object with the brief sections. "
            "Each section has 'content', 'confidence', and 'sources' keys. "
            "Output must be parseable by json.loads() with zero modification."
            + (f" MUST include 'custom_focus' key with specific answer to: {custom_prompt}" if custom_prompt else "")
        ),
        agent=briefing_writer,
        context=[research_task, analysis_task],
    )

    crew = Crew(
        agents=[researcher, analyst, briefing_writer],
        tasks=[research_task, analysis_task, briefing_task],
        process=Process.sequential,
        verbose=True,
    )

    return crew


def run_brief(company_name: str, length: str = "medium", sections: list = None, custom_prompt: str = "") -> dict:
    """
    Runs the CrewAI pipeline for a company and returns:
    {
        "brief": { ...sections... },
        "sources_used": [...],
        "limited_data": bool,
        "raw_output": str  (for debugging)
    }
    """
    if sections is None:
        sections = ["summary", "news", "financials", "social_sentiment",
                    "talking_points", "watch_out_for"]

    crew = build_crew(company_name, length, sections, custom_prompt)
    result = crew.kickoff()

    # result.raw is the final task output string
    raw_output = result.raw if hasattr(result, "raw") else str(result)

    # Parse JSON from the briefing agent's output
    brief_json = _extract_json(raw_output)

    # Collect all sources mentioned across sections
    sources_used = []
    if isinstance(brief_json, dict):
        for section_data in brief_json.values():
            if isinstance(section_data, dict):
                sources = section_data.get("sources", [])
                sources_used.extend(sources)
    sources_used = list(set(sources_used))  # deduplicate

    # Determine limited_data flag
    # We check research task output for total_results_found
    limited_data = False
    try:
        research_output = result.tasks_output[0].raw if result.tasks_output else ""
        if "total_results_found" in research_output:
            match = re.search(r"total_results_found['\"]?\s*[=:]\s*(\d+)", research_output)
            if match and int(match.group(1)) < 2:
                limited_data = True
        elif not sources_used or len(sources_used) < 2:
            limited_data = True
    except Exception:
        pass

    return {
        "brief": brief_json,
        "sources_used": sources_used,
        "limited_data": limited_data,
        "raw_output": raw_output,
    }


def build_comparison_crew(company1: str, company2: str, length: str) -> Crew:
    llm = get_llm()
    length_instruction = LENGTH_INSTRUCTIONS.get(length, LENGTH_INSTRUCTIONS["medium"])

    researcher1 = Agent(
        role=f"Company Intelligence Researcher ({company1})",
        goal=f"Find comprehensive information about {company1}.",
        backstory="Expert business intelligence analyst.",
        tools=[company_web_search, company_financial_data],
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    researcher2 = Agent(
        role=f"Company Intelligence Researcher ({company2})",
        goal=f"Find comprehensive information about {company2}.",
        backstory="Expert business intelligence analyst.",
        tools=[company_web_search, company_financial_data],
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    analyst = Agent(
        role="Strategic Business Analyst",
        goal=f"Compare {company1} and {company2} across financials, market position, recent news, strengths/weaknesses, and recommend which is more favorable to sell to.",
        backstory="Former McKinsey consultant turned sales strategist.",
        tools=[],
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    formatter = Agent(
        role="Pre-Meeting Brief Specialist",
        goal="Format the comparison into strict JSON.",
        backstory="Meticulous technical writer. Always outputs valid JSON.",
        tools=[],
        llm=llm,
        verbose=False,
        allow_delegation=False,
    )

    task1 = Task(
        description=f"Research {company1} thoroughly using targeted web searches. Run searches sequentially. Compile a structured research summary.",
        expected_output="Detailed research summary including company overview, recent news items, financial snapshot, and competitive landscape. Include sources.",
        agent=researcher1,
    )

    task2 = Task(
        description=f"Research {company2} thoroughly using targeted web searches. Run searches sequentially. Compile a structured research summary.",
        expected_output="Detailed research summary including company overview, recent news items, financial snapshot, and competitive landscape. Include sources.",
        agent=researcher2,
    )

    task3 = Task(
        description=f"Compare {company1} and {company2} based on the research. {length_instruction}",
        expected_output="Strategic analysis comparing financials, market position, news, strengths/weaknesses, and a final recommendation.",
        agent=analyst,
        context=[task1, task2],
    )

    task4 = Task(
        description=(
            f"Format the comparison into a single valid JSON object.\n"
            f"Keys must be exactly: company1_summary, company2_summary, financial_comparison, market_position, recent_developments, strengths_weaknesses, recommendation.\n"
            f"Each section must have: 'content' ({length_instruction}), 'confidence' ('high', 'medium', or 'low'), and 'sources' (list of URLs).\n"
            f"CRITICAL: Output pure JSON only."
        ),
        expected_output="A single valid JSON object with the requested keys.",
        agent=formatter,
        context=[task3],
    )

    return Crew(
        agents=[researcher1, researcher2, analyst, formatter],
        tasks=[task1, task2, task3, task4],
        process=Process.sequential,
        verbose=True,
    )


def run_comparison(company1: str, company2: str, length: str = "medium") -> dict:
    crew = build_comparison_crew(company1, company2, length)
    result = crew.kickoff()

    raw_output = result.raw if hasattr(result, "raw") else str(result)
    brief_json = _extract_json(raw_output)

    sources_used = []
    if isinstance(brief_json, dict):
        for section_data in brief_json.values():
            if isinstance(section_data, dict):
                sources_used.extend(section_data.get("sources", []))
    sources_used = list(set(sources_used))

    limited_data = False
    if not sources_used or len(sources_used) < 2:
        limited_data = True

    return {
        "brief": brief_json,
        "sources_used": sources_used,
        "limited_data": limited_data,
        "raw_output": raw_output,
    }


def _extract_json(text: str) -> dict:
    """
    Extracts and parses JSON from agent output.
    Handles cases where the model wraps JSON in markdown code fences.
    """
    # Strip markdown fences if present
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    cleaned = cleaned.strip("`").strip()

    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try finding a JSON object substring
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Return error structure if parsing fails
    return {
        "parse_error": True,
        "raw": text[:500],
        "message": "Failed to parse agent output as JSON. See raw_output field for debugging."
    }
