import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { serializeError } from '../lib/utils';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SystemErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL_SYSTEM_FAILURE:', error, errorInfo);
    try {
      const details = serializeError(error);
      console.error('🔍 CRITICAL_SYSTEM_FAILURE_DETAILS:', JSON.stringify(details, null, 2));
    } catch (e) {
      console.error('🔍 CRITICAL_SYSTEM_FAILURE_OBJECT (Not Stringifiable):', error);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center text-on-background">
          <div className="w-20 h-20 bg-error/10 rounded-3xl flex items-center justify-center text-error border border-error/20 mb-8 animate-pulse">
            <AlertTriangle size={40} />
          </div>
          
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">
            System Interruption
          </h1>
          
          <p className="text-on-surface-variant text-sm font-medium max-w-xs mb-12 uppercase tracking-widest leading-relaxed">
            Wayta encountered a connection spike or runtime error. Your budget and tickets are securely stored locally.
          </p>

          <div className="w-full max-w-xs space-y-4">
            <button 
              onClick={this.handleReset}
              className="w-full h-16 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <RefreshCw size={20} />
              Re-Sync System
            </button>
            
            <button 
              onClick={() => window.location.href = import.meta.env.BASE_URL}
              className="w-full h-16 bg-surface-container text-on-surface-variant rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-outline active:scale-95 transition-all"
            >
              <Home size={20} />
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
