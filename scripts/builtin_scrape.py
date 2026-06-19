#!/usr/bin/env python3
"""Built-in scrape providers: crawl4ai and llm-reader."""
from __future__ import annotations

import asyncio
import json
import sys


def emit(payload: dict, exit_code: int = 0) -> None:
    print(json.dumps(payload))
    sys.exit(exit_code)


async def crawl4ai_scrape(url: str, wait_ms: int) -> dict:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

    browser_conf = BrowserConfig(headless=True, verbose=False)
    run_conf = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        page_timeout=min(max(wait_ms + 15_000, 20_000), 60_000),
        wait_until="domcontentloaded",
        delay_before_return_html=max(0, wait_ms) / 1000,
        remove_overlay_elements=True,
        process_iframes=True,
    )

    async with AsyncWebCrawler(config=browser_conf) as crawler:
        result = await crawler.arun(url=url, config=run_conf)
        if not result.success:
            return {"ok": False, "error": result.error_message or "crawl4ai scrape failed"}

        markdown_obj = result.markdown
        text = ""
        if markdown_obj is not None:
            if hasattr(markdown_obj, "fit_markdown") and markdown_obj.fit_markdown:
                text = markdown_obj.fit_markdown
            elif hasattr(markdown_obj, "raw_markdown") and markdown_obj.raw_markdown:
                text = markdown_obj.raw_markdown
            elif isinstance(markdown_obj, str):
                text = markdown_obj
            else:
                text = str(markdown_obj)

        title = None
        metadata = getattr(result, "metadata", None)
        if isinstance(metadata, dict):
            title = metadata.get("title")
        if not title:
            title = getattr(result, "title", None)

        text = (text or "").strip()
        if not text:
            return {"ok": False, "error": "crawl4ai returned empty markdown"}

        return {
            "ok": True,
            "markdown": text[:500_000],
            "title": title,
            "final_url": getattr(result, "redirected_url", None) or url,
        }


async def llm_reader_scrape(url: str) -> dict:
    from url_to_llm_text.get_html_text import get_page_source
    from url_to_llm_text.get_llm_input_text import get_processed_text

    page_source = await get_page_source(url)
    llm_text = await get_processed_text(page_source, url)
    text = (llm_text or "").strip()
    if not text:
        return {"ok": False, "error": "llm-reader returned empty text"}

    return {
        "ok": True,
        "markdown": text[:500_000],
        "final_url": url,
    }


async def main() -> None:
    if len(sys.argv) < 3:
        emit({"ok": False, "error": "Usage: builtin_scrape.py <crawl4ai|llm-reader> <url> [wait_ms]"}, 1)

    provider = sys.argv[1].strip().lower()
    url = sys.argv[2].strip()
    wait_ms = int(sys.argv[3]) if len(sys.argv) > 3 else 5000

    if provider not in {"crawl4ai", "llm-reader"}:
        emit({"ok": False, "error": f"Unknown provider: {provider}"}, 1)

    try:
        if provider == "crawl4ai":
            result = await crawl4ai_scrape(url, wait_ms)
        else:
            result = await llm_reader_scrape(url)
        emit(result, 0 if result.get("ok") else 3)
    except ImportError as exc:
        emit({"ok": False, "error": f"Missing dependency: {exc}"}, 2)
    except Exception as exc:
        emit({"ok": False, "error": str(exc)}, 3)


if __name__ == "__main__":
    asyncio.run(main())
