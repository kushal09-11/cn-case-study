import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Application Error Encountered</h2>
              <p className="text-xs text-slate-400 mt-1">
                A component threw a runtime exception. Details below:
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-left font-mono text-[11px] text-rose-300 max-h-36 overflow-auto">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all shadow-lg shadow-sky-600/20"
            >
              <RotateCcw className="w-4 h-4" /> Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
