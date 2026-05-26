import React, { createContext, useContext, useMemo } from 'react';
import { Business } from '../data';

export interface WorkspaceConfig {
  industry: string;
  modules: {
    showCalendar: boolean;
    showCreativeStudio: boolean;
    showAnalytics: boolean;
    showBrandKit: boolean;
    showInventory: boolean;
    showCampaigns: boolean;
  };
  aiContext: {
    systemInstruction: string;
    promptPrefix: string;
    suggestedFormats: string[];
  };
  uiTheme?: {
    primaryColor?: string;
    accentColor?: string;
  };
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  industry: 'General',
  modules: {
    showCalendar: true,
    showCreativeStudio: true,
    showAnalytics: true,
    showBrandKit: true,
    showInventory: false,
    showCampaigns: true,
  },
  aiContext: {
    systemInstruction: "You are a versatile content strategist and creative assistant.",
    promptPrefix: "Create engaging content that resonates with a broad audience.",
    suggestedFormats: ['Post', 'Reel', 'Story'],
  },
};

const INDUSTRY_PROFILES: Record<string, WorkspaceConfig> = {
  'Retail': {
    industry: 'Retail',
    modules: {
      showCalendar: true,
      showCreativeStudio: true,
      showAnalytics: true,
      showBrandKit: true,
      showInventory: true,
      showCampaigns: true,
    },
    aiContext: {
      systemInstruction: "You are a retail marketing expert focused on product sales and seasonal promotions.",
      promptPrefix: "Focus on product benefits, pricing, and limited-time offers to drive foot traffic and online sales.",
      suggestedFormats: ['Product Showcase', 'Sale Announcement', 'Customer Review'],
    },
  },
  'Banking': {
    industry: 'Banking',
    modules: {
      showCalendar: true,
      showCreativeStudio: false,
      showAnalytics: true,
      showBrandKit: true,
      showInventory: false,
      showCampaigns: true,
    },
    aiContext: {
      systemInstruction: "You are a financial communications specialist focused on trust, security, and educational content.",
      promptPrefix: "Prioritize clarity, compliance, and value-driven financial tips. Avoid overly casual language.",
      suggestedFormats: ['Financial Tip', 'Security Update', 'Service Spotlight'],
    },
  },
  'Technology': {
    industry: 'Technology',
    modules: {
      showCalendar: true,
      showCreativeStudio: true,
      showAnalytics: true,
      showBrandKit: true,
      showInventory: false,
      showCampaigns: true,
    },
    aiContext: {
      systemInstruction: "You are a tech-savvy content creator focused on innovation, features, and developer relations.",
      promptPrefix: "Highlight technical specs, innovation milestones, and future-forward solutions.",
      suggestedFormats: ['Feature Deep-dive', 'Tech News', 'Tutorial'],
    },
  },
};

interface WorkspaceContextType {
  config: WorkspaceConfig;
  activeBusiness: Business | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ 
  children, 
  activeBusiness 
}: { 
  children: React.ReactNode; 
  activeBusiness: Business | null;
}) {
  const config = useMemo(() => {
    if (!activeBusiness || !activeBusiness.industry) return DEFAULT_CONFIG;
    
    // Try to find a matching profile, or return default
    const profile = Object.entries(INDUSTRY_PROFILES).find(([key]) => 
      activeBusiness.industry?.toLowerCase().includes(key.toLowerCase())
    );
    
    return profile ? profile[1] : DEFAULT_CONFIG;
  }, [activeBusiness]);

  return (
    <WorkspaceContext.Provider value={{ config, activeBusiness }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceConfig() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspaceConfig must be used within a WorkspaceProvider');
  }
  return context;
}
