export interface IndustryConfig {
  aiContext: {
    role: string;
    focus: string;
    tone: string;
  };
  terminology: {
    calendar: string;
    products: string;
    assets: string;
    ideas?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export const INDUSTRY_CONFIGS: { [key: string]: IndustryConfig } = {
  general: {
    aiContext: {
      role: 'Marketing Copywriter',
      focus: 'content calendars, product listings, and corporate saas campaigns',
      tone: 'professional, clean, and corporate',
    },
    terminology: {
      calendar: 'Content Calendar',
      products: 'Products',
      assets: 'Assets',
      ideas: 'Ideas',
    },
  },
};

// Add default alias to general to resolve compilation errors
(INDUSTRY_CONFIGS as any).default = INDUSTRY_CONFIGS.general;

export function getIndustryConfig(industry?: string): IndustryConfig {
  const ind = (industry || 'general').toLowerCase();
  return INDUSTRY_CONFIGS[ind] || INDUSTRY_CONFIGS.general;
}

export function getDbMode(): 'local' | 'firebase' {
  return 'firebase';
}
