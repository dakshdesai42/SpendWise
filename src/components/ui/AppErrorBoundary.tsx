import { Component, ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('App runtime error:', error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full bg-black text-white flex items-center justify-center px-6">
          <div className="max-w-sm w-full rounded-2xl border border-white/[0.08] bg-[#121214] p-6 text-center">
            <h2 className="text-lg font-semibold tracking-tight">Something went wrong</h2>
            <p className="text-sm text-white/60 mt-2">
              A runtime error occurred. Reload to continue.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 w-full rounded-xl bg-[#2D8CFF] py-2.5 text-sm font-semibold text-white"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
