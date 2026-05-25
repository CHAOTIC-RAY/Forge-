import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { htmlToMarkdown } from './htmlToMarkdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '../../scripts/cloudscraper_fetch.py');

export async function cloudscraperScrapeMarkdown(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn('python3', [SCRIPT, url], {
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

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      console.warn('[cloudscraper] timeout');
      resolve(null);
    }, 50_000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        if (stderr) console.warn('[cloudscraper]', stderr.slice(0, 200));
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as {
          ok?: boolean;
          html?: string;
          error?: string;
        };
        if (!parsed.ok || !parsed.html) {
          resolve(null);
          return;
        }
        resolve(htmlToMarkdown(parsed.html));
      } catch {
        resolve(null);
      }
    });

    proc.on('error', () => resolve(null));
  });
}
