
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 max-w-sm w-full space-y-6">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
               <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Something went wrong</h1>
              <p className="text-sm text-gray-500">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold space-x-2 active:scale-95 transition-transform"
            >
              <RefreshCcw className="w-5 h-5 transition-transform group-hover:rotate-180" />
              <span>Reload Application</span>
            </button>
            <p className="text-[10px] text-gray-300 font-mono break-all line-clamp-2">
              {this.state.error?.message}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
