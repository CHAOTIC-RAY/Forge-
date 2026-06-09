import * as cheerio from 'cheerio';

/** Lightweight HTML → markdown for catalogue import fallbacks. */
export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, svg').remove();

  const main =
    $('main').first().length > 0
      ? $('main').first()
      : $('[role="main"]').first().length > 0
        ? $('[role="main"]').first()
        : $('article').first().length > 0
          ? $('article').first()
          : $('body');

  const lines: string[] = [];

  main.find('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (tag === 'h1') lines.push(`# ${text}`);
    else if (tag === 'h2') lines.push(`## ${text}`);
    else if (tag === 'h3') lines.push(`### ${text}`);
    else if (tag === 'h4') lines.push(`#### ${text}`);
    else if (tag === 'li') lines.push(`- ${text}`);
    else if (tag === 'pre' || tag === 'blockquote') lines.push(`> ${text}`);
    else lines.push(text);
  });

  if (lines.length === 0) {
    const fallback = main.text().replace(/\s+/g, ' ').trim();
    return fallback.slice(0, 120_000);
  }

  return lines.join('\n\n').slice(0, 120_000);
}
