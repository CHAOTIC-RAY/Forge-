#!/usr/bin/env python3
"""Fetch page HTML via cloudscraper (Cloudflare / bot protection bypass)."""
import json
import sys

def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "URL required"}))
        sys.exit(1)
    url = sys.argv[1]
    try:
        import cloudscraper
    except ImportError:
        print(json.dumps({"error": "cloudscraper not installed"}))
        sys.exit(2)
    try:
        scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False}
        )
        resp = scraper.get(url, timeout=45)
        print(
            json.dumps(
                {
                    "ok": resp.status_code < 400,
                    "status": resp.status_code,
                    "html": resp.text[:500_000],
                    "final_url": str(resp.url),
                }
            )
        )
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(3)

if __name__ == "__main__":
    main()
