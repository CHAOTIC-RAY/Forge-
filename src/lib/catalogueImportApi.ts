export async function mapSite(url: string, apiKey?: string, timeout?: number): Promise<{ success: boolean, links?: { url: string; title: string }[], error?: string }> {
  const links = [
    { url, title: 'Home Page' },
    { url: `${url}/product/classic-tee`, title: 'Classic Tee' },
    { url: `${url}/product/denim-jacket`, title: 'Denim Jacket' },
    { url: `${url}/collection/urban-style`, title: 'Urban Style' },
  ];
  return { success: true, links };
}

export async function scrapeUrlBatch(urls: string[], apiKey?: string, onProgress?: (done: number, total: number) => void): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    results.push({
      url,
      markdown: `# Featured Product\n\n- Premium Quality Tee\n\nAn elegant product designed for modern everyday style and built with durable, premium materials.`,
      metadata: { title: `Featured Product ${i + 1}` },
    });
    if (onProgress) {
      onProgress(i + 1, urls.length);
    }
  }
  return results;
}

export async function startCrawlJob(options: any): Promise<any> {
  const id = `job_${Math.random().toString(36).substring(2, 9)}`;
  return { success: true, id, jobId: id };
}

export async function pollCrawlJob(jobId: string, apiKey?: string): Promise<any> {
  const mockResults = [
    {
      url: 'https://example.com/product/1',
      markdown: '# Sample Product',
      metadata: { title: 'Excellent Product' }
    }
  ];
  return {
    success: true,
    status: 'completed',
    data: {
      results: mockResults
    },
    results: mockResults
  };
}
