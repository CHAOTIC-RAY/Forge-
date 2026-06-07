import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-6">
          <div className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 max-w-md w-full shadow-lg text-left">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Something went wrong</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-mono overflow-auto max-h-40 bg-zinc-50 dark:bg-zinc-850 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
              {this.state.error?.toString()}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#2665fd] text-white font-semibold text-xs py-2 rounded-xl transition cursor-pointer"
              type="button"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
