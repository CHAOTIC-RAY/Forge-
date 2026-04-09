import React, { createContext, useContext, useMemo } from 'react';
import { Business } from '../data';
import { getIndustryConfig, IndustryConfig } from '../lib/industryConfig';

interface WorkspaceContextType {
  activeBusiness: Business | null;
  config: IndustryConfig;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ 
  activeBusiness, 
  children 
}: { 
  activeBusiness: Business | null; 
  children: React.ReactNode;
}) {
  const config = useMemo(() => {
    return getIndustryConfig(activeBusiness?.industry);
  }, [activeBusiness?.industry]);

  return (
    <WorkspaceContext.Provider value={{ activeBusiness, config }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
