import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('BrandGuard ErrorBoundary caught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-white border border-rose-200 rounded-2xl shadow-sm text-center max-w-lg mx-auto my-8 space-y-4 animate-in fade-in">
          <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#172033] font-heading">
              {this.props.fallbackTitle || 'Something went wrong in this module'}
            </h3>
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3 mt-2 font-mono text-left break-words">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-[#315C76] hover:bg-[#183B59] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
