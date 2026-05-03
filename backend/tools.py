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
            max_results=7,
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
def company_financial_data(company_name: str) -> dict:
    """
    Fetches financial data for a company.
    NOTE: Currently returns placeholder/stub data.
    A real financial API (e.g. Alpha Vantage, FMP) will be wired here later.
    Use this tool to get stock price, revenue, market cap estimates.
    Input should be the company name as a plain string.
    """
    # TODO: Wire real financial API (Alpha Vantage or Financial Modeling Prep)
    return {
        "stub": True,
        "company": company_name,
        "note": "Financial data API not yet connected. Using placeholder.",
        "data": {
            "stock_price": "N/A",
            "market_cap": "N/A",
            "revenue_last_year": "N/A",
            "yoy_growth": "N/A",
            "pe_ratio": "N/A",
        }
    }
