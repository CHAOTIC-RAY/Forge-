import React, { createContext, useContext } from 'react';

export const WorkspaceContext = createContext<any>(null);

export function WorkspaceProvider({ children, activeBusiness }: any) {
  return (
    <WorkspaceContext.Provider value={{ activeBusiness }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
