import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1A1C1E] flex items-center justify-center p-4">
          <div className="bg-[#24262B] border border-red-500/20 p-8 rounded-[24px] text-center max-w-md ">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-[#909094] mb-6 text-sm">
              The application encountered an unexpected error. This might be due to a temporary issue or a bug.
            </p>
            <div className="bg-black/20 p-4 rounded-[12px] mb-6 text-left overflow-auto max-h-32">
              <code className="text-xs text-red-400 break-all">
                {this.state.error?.message || 'Unknown error'}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-[#2383E2] text-white rounded-[12px] font-medium hover:bg-[#1C6AB8] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
