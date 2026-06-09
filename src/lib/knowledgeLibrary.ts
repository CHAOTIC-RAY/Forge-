
export interface KnowledgeSnippet {
  category: 'strategy' | 'copywriting' | 'engagement' | 'technical';
  title: string;
  content: string;
}

export const SOCIAL_MEDIA_MASTERCLASS: KnowledgeSnippet[] = [
  {
    category: 'strategy',
    title: 'Content Pillar Balance',
    content: 'Balanced content ratio: 60% educational/valuable, 20% soft promotion, 20% direct promotion. This ensures maximum trust before sales.'
  },
  {
    category: 'copywriting',
    title: 'Psychological Hook',
    content: 'Write captions following: Grab Attention (Hook), Build Interest (Why now), Create Desire (Benefit list), Call to Action (Instructions).'
  },
  {
    category: 'copywriting',
    title: 'High-Engagement Hooks',
    content: 'Open captions with phrases like: "Everyone is looking at the wrong thing...", "the one secret to...", "Stop doing this if you want results."'
  },
  {
    category: 'engagement',
    title: 'Algorithmic Engagement',
    content: 'Prioritize community interaction. Active engagement in the comments section signals relevance to social algorithms, increasing overall post weight and organic distribution.'
  },
  {
    category: 'strategy',
    title: 'Successful Launch Cycle',
    content: 'A standard launch phase: Week 1 is Teasing, Week 2 is education on benefits, Week 3 is the announcement of availability, Week 4 is proof/reviews.'
  },
  {
    category: 'technical',
    title: 'Smart Hashtagging',
    content: 'Use exactly 3-5 tags. 2 very broad, 2 niche interests, 1 unique brand tag. Never use generic empty tags.'
  },
  {
    category: 'copywriting',
    title: 'Human-Centered Selling',
    content: 'Sell outcomes, not specifications. Instead of listing materials, tell a story about how the product changed a customer’s day.'
  }
];
