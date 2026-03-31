import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-surface-primary p-8">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-danger-surface flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-danger-text-soft" />
            </div>
            <h2 className="text-lg font-semibold text-ink mb-2">Something went wrong</h2>
            <p className="text-sm text-ink-secondary mb-4 leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface-inverse text-ink-inverse text-sm font-medium rounded-lg hover:bg-hover-surface-inverse transition-colors">
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
