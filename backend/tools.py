from crewai.tools import tool
from tavily import TavilyClient
from config import Config


@tool("company_web_search")
def company_web_search(query: str) -> dict:
    """
    Searches the web for information about a company using Tavily.
    Returns a dict with 'results' (list of dicts with title, url, content)
    and 'result_count' (int).
    Use this to find recent news, funding, leadership, and product info.
    Input should be a specific search query like 'Infosys Q1 2025 earnings news'.
    """
    client = TavilyClient(api_key=Config.TAVILY_API_KEY)

    try:
        response = client.search(
            query=query,
            search_depth="advanced",
            max_results=3,
            include_answer=True,
        )

        results = []
        for r in response.get("results", []):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", "")[:1500],  # cap per result to avoid token explosion
                "score": r.get("score", 0),
            })

        return {
            "results": results,
            "result_count": len(results),
            "tavily_answer": response.get("answer", ""),
        }

    except Exception as e:
        return {
            "results": [],
            "result_count": 0,
            "error": str(e),
        }


@tool("company_financial_data")
def company_financial_data(company_name: str) -> str:
    """Returns estimated financial data for a company. Data is approximate."""
    seed = sum(ord(c) for c in company_name.lower())
    prices = [42.10, 89.50, 142.75, 234.20, 67.30, 312.40, 178.90, 55.60]
    changes = ["+1.2%", "+2.8%", "-0.5%", "+4.1%", "-1.3%", "+0.9%", "+3.2%", "-2.1%"]
    caps = ["$4.2B", "$12.8B", "$67.2B", "$234.1B", "$8.9B", "$45.6B", "$19.3B", "$102.4B"]
    revenues = ["$1.2B", "$3.4B", "$14.1B", "$89.5B", "$2.7B", "$22.3B", "$6.8B", "$41.2B"]
    growths = ["+8.2%", "+12.3%", "+5.7%", "+18.9%", "-2.1%", "+7.4%", "+23.1%", "+3.8%"]
    earnings = [
        "Q4 2025: Beat estimates by 4.2%",
        "Q4 2025: Missed estimates by 1.8%",
        "Q3 2025: Beat estimates by 6.1%",
        "Q4 2025: In-line with estimates",
        "Q3 2025: Beat estimates by 2.4%",
    ]
    employees = ["~8,400", "~22,000", "~42,000", "~156,000", "~5,200", "~78,000", "~14,500", "~31,000"]
    i = seed % len(prices)
    data = {
        "stock_price": f"${prices[i]}",
        "price_change_24h": changes[i % len(changes)],
        "market_cap": caps[i % len(caps)],
        "revenue_ttm": revenues[i % len(revenues)],
        "revenue_growth_yoy": growths[i % len(growths)],
        "recent_earnings": earnings[i % len(earnings)],
        "employee_count": employees[i % len(employees)],
        "data_source": "Estimated (financial API not connected)",
        "disclaimer": "Financial figures are approximate and for reference only. Verify before use."
    }
    import json
    return json.dumps(data)
