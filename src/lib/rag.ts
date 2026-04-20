export interface DocumentChunk {
  id: string;
  source: string; 
  content: string;
  keywords: Set<string>;
}

// Global cached index for Live Data Sync (Phase 4)
let globalVectorDb: DocumentChunk[] | null = null;
let lastSyncTime = 0;

export function syncDatabase(activeBusiness: any, products: any[], posts: any[], brandKit: any) {
    globalVectorDb = buildLocalIndex(activeBusiness, products, posts, brandKit);
    lastSyncTime = Date.now();
    console.log(`[RAG ENGINE] Synchronized local vector db at ${new Date(lastSyncTime).toLocaleTimeString()}. Total chunks: ${globalVectorDb.length}`);
    return globalVectorDb;
}

export function getDatabase(): DocumentChunk[] {
    return globalVectorDb || [];
}

export function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  const matchResult = text.toLowerCase().match(/\b\w+\b/g);
  const words: string[] = matchResult ? Array.from(matchResult) : [];
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'of', 'this', 'that', 'it', 'can', 'will', 'what', 'how']);
  return new Set(words.filter(w => !stopWords.has(w) && w.length > 2));
}

export function chunkText(text: string, source: string, maxWords: number = 200): DocumentChunk[] {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).split(' ').length > maxWords) {
      if (currentChunk) {
        chunks.push({
          id: crypto.randomUUID(),
          source,
          content: currentChunk.trim(),
          keywords: tokenize(currentChunk)
        });
      }
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push({
      id: crypto.randomUUID(),
      source,
      content: currentChunk.trim(),
      keywords: tokenize(currentChunk)
    });
  }
  return chunks;
}

export function searchChunks(query: string, chunks: DocumentChunk[], topK: number = 3): DocumentChunk[] {
  const queryTokens = tokenize(query);
  if (queryTokens.size === 0) return chunks.slice(0, topK); // Fallback
  
  const scored = chunks.map(chunk => {
    let score = 0;
    for (const token of queryTokens) {
      if (chunk.keywords.has(token)) score += 1;
    }
    return { chunk, score };
  });
  
  // Also boost if query contains the source name
  for (const item of scored) {
    for(const token of queryTokens) {
        if (item.chunk.source.toLowerCase().includes(token)) item.score += 2;
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, topK).map(s => s.chunk);
}

export function buildLocalIndex(activeBusiness: any, products: any[], posts: any[], brandKit: any): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  
  if (activeBusiness) {
    chunks.push(...chunkText(`Business Name: ${activeBusiness.name}. Industry: ${activeBusiness.industry}. Position: ${activeBusiness.position}`, 'Business Info'));
  }
  if (brandKit?.brandProfile) {
    chunks.push(...chunkText(brandKit.brandProfile, 'Brand Profile'));
  }
  if (brandKit?.designGuide) {
    chunks.push(...chunkText(brandKit.designGuide, 'Design Guide'));
  }
  if (brandKit?.colors) {
    const colorStr = brandKit.colors.map((c: any) => `${c.name}: ${c.hex}`).join(', ');
    chunks.push(...chunkText(`Brand Colors: ${colorStr}`, 'Brand Colors', 50));
  }
  
  // Products
  if (products && products.length > 0) {
    // Instead of one huge string, chunk individually or grouped
    const categories = Array.from(new Set(products.map(p => p.type)));
    chunks.push(...chunkText(`Available Product Categories: ${categories.join(', ')}`, 'Product Categories', 100));
    
    // We sample a few products or summarize. If we embed every product description, we do it here.
    // For large DBs, RAG is perfect.
    products.forEach(p => {
        let pTxt = `Product: ${p.title}. Category: ${p.type}. `;
        if(p.description) pTxt += `Description: ${p.description}. `;
        if(p.price) pTxt += `Price: ${p.price}. `;
        chunks.push(...chunkText(pTxt, 'Product Inventory', 50));
    });
  }

  // Schedule summary
  if (posts && posts.length > 0) {
     const upcoming = posts.slice(0, 10).map(p => `- [${p.date}] ${p.title} (${p.outlet}): ${p.type}`).join('\n');
     chunks.push(...chunkText(`Upcoming Scheduled Posts:\n${upcoming}`, 'Content Schedule'));
  }

  return chunks;
}
