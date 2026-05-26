export type IndustryType = 'retail' | 'real_estate' | 'restaurant' | 'software' | 'agency' | 'default';

export interface IndustryConfig {
  id: IndustryType;
  name: string;
  terminology: {
    products: string;
    ideas: string;
    calendar: string;
    assets: string;
    chat: string;
  };
  aiContext: {
    role: string;
    focus: string;
    tone: string;
  };
  ui: {
    primaryColor: string;
    iconStyle: string;
  };
}

export const INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
  retail: {
    id: 'retail',
    name: 'Retail & E-commerce',
    terminology: {
      products: 'Workspace Inventory',
      ideas: 'Ideas',
      calendar: 'Calendar',
      assets: 'Brand Kit',
      chat: 'AI Assistant',
    },
    aiContext: {
      role: 'expert retail marketer and merchandiser',
      focus: 'driving sales, highlighting product features, and seasonal promotions',
      tone: 'engaging, persuasive, and customer-centric',
    },
    ui: {
      primaryColor: 'blue',
      iconStyle: 'shopping',
    }
  },
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate',
    terminology: {
      products: 'Workspace Inventory',
      ideas: 'Ideas',
      calendar: 'Calendar',
      assets: 'Brand Kit',
      chat: 'AI Agent',
    },
    aiContext: {
      role: 'top-tier real estate agent and property marketer',
      focus: 'highlighting property features, neighborhood benefits, and driving viewings',
      tone: 'professional, trustworthy, and inviting',
    },
    ui: {
      primaryColor: 'emerald',
      iconStyle: 'building',
    }
  },
  restaurant: {
    id: 'restaurant',
    name: 'Food & Beverage',
    terminology: {
      products: 'Workspace Inventory',
      ideas: 'Ideas',
      calendar: 'Calendar',
      assets: 'Brand Kit',
      chat: 'Culinary AI',
    },
    aiContext: {
      role: 'expert restaurateur and food marketer',
      focus: 'appetizing descriptions, special events, and driving foot traffic',
      tone: 'mouth-watering, welcoming, and energetic',
    },
    ui: {
      primaryColor: 'orange',
      iconStyle: 'food',
    }
  },
  software: {
    id: 'software',
    name: 'Software & Tech',
    terminology: {
      products: 'Workspace Inventory',
      ideas: 'Ideas',
      calendar: 'Calendar',
      assets: 'Brand Kit',
      chat: 'Tech Copilot',
    },
    aiContext: {
      role: 'growth hacker and product marketer',
      focus: 'highlighting technical benefits, user acquisition, and feature adoption',
      tone: 'innovative, clear, and authoritative',
    },
    ui: {
      primaryColor: 'indigo',
      iconStyle: 'tech',
    }
  },
  agency: {
    id: 'agency',
    name: 'Marketing Agency',
    terminology: {
      products: 'Workspace Inventory',
      ideas: 'Ideas',
      calendar: 'Calendar',
      assets: 'Brand Kit',
      chat: 'Strategy AI',
    },
    aiContext: {
      role: 'senior marketing strategist and creative director',
      focus: 'ROI, creative differentiation, and comprehensive campaign planning',
      tone: 'strategic, creative, and results-oriented',
    },
    ui: {
      primaryColor: 'purple',
      iconStyle: 'briefcase',
    }
  },
  default: {
    id: 'default',
    name: 'General Business',
    terminology: {
      products: 'Workspace Inventory',
      ideas: 'Ideas',
      calendar: 'Calendar',
      assets: 'Brand Kit',
      chat: 'AI Assistant',
    },
    aiContext: {
      role: 'expert digital marketer',
      focus: 'general audience engagement and brand awareness',
      tone: 'professional and engaging',
    },
    ui: {
      primaryColor: 'blue',
      iconStyle: 'default',
    }
  }
};

export function getIndustryConfig(industryName: string | undefined): IndustryConfig {
  if (!industryName) return INDUSTRY_CONFIGS.default;
  
  const normalized = industryName.toLowerCase();
  if (normalized.includes('retail') || normalized.includes('commerce')) return INDUSTRY_CONFIGS.retail;
  if (normalized.includes('real estate') || normalized.includes('property')) return INDUSTRY_CONFIGS.real_estate;
  if (normalized.includes('restaurant') || normalized.includes('food')) return INDUSTRY_CONFIGS.restaurant;
  if (normalized.includes('software') || normalized.includes('tech')) return INDUSTRY_CONFIGS.software;
  if (normalized.includes('agency') || normalized.includes('marketing')) return INDUSTRY_CONFIGS.agency;
  
  return INDUSTRY_CONFIGS.default;
}

export function getDbMode(industryName: string | undefined): 'product' | 'info' {
  if (!industryName) return 'product';
  const normalized = industryName.toLowerCase();
  if (normalized.includes('software') || normalized.includes('tech') || normalized.includes('agency') || normalized.includes('consulting') || normalized.includes('marketing')) {
    return 'info';
  }
  return 'product';
}
