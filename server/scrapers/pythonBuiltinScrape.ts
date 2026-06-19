import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '../../scripts/builtin_scrape.py');

export type PythonBuiltinProvider = 'crawl4ai' | 'llm-reader';

export interface PythonBuiltinScrapeResult {
  markdown?: string;
  metadata?: { title?: string; sourceURL?: string };
}

function runPythonBuiltinScrape(
  provider: PythonBuiltinProvider,
  url: string,
  waitFor = 5000
): Promise<PythonBuiltinScrapeResult | null> {
  return new Promise((resolve) => {
    const proc = spawn('python3', [SCRIPT, provider, url, String(waitFor)], {
      cwd: path.resolve(__dirname, '../..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    const timeoutMs = provider === 'crawl4ai' ? 90_000 : 70_000;
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      console.warn(`[${provider}] timeout`);
      resolve(null);
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        if (stderr) console.warn(`[${provider}]`, stderr.slice(0, 300));
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as {
          ok?: boolean;
          markdown?: string;
          title?: string;
          final_url?: string;
          error?: string;
        };
        if (!parsed.ok || !parsed.markdown) {
          if (parsed.error) console.warn(`[${provider}]`, parsed.error.slice(0, 200));
          resolve(null);
          return;
        }
        resolve({
          markdown: parsed.markdown,
          metadata: {
            title: parsed.title,
            sourceURL: parsed.final_url || url,
          },
        });
      } catch {
        resolve(null);
      }
    });

    proc.on('error', () => resolve(null));
  });
}

export async function crawl4aiScrapeMarkdown(
  url: string,
  waitFor = 5000
): Promise<PythonBuiltinScrapeResult | null> {
  return runPythonBuiltinScrape('crawl4ai', url, waitFor);
}

export async function llmReaderScrapeMarkdown(
  url: string,
  waitFor = 5000
): Promise<PythonBuiltinScrapeResult | null> {
  return runPythonBuiltinScrape('llm-reader', url, waitFor);
}
