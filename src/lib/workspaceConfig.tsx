import React, { createContext, useContext } from 'react';

export const ConfigWorkspaceContext = createContext<any>(null);

export function WorkspaceProvider({ children, activeBusiness }: any) {
  return (
    <ConfigWorkspaceContext.Provider value={{ activeBusiness }}>
      {children}
    </ConfigWorkspaceContext.Provider>
  );
}

export function useConfigWorkspace() {
  return useContext(ConfigWorkspaceContext);
}
