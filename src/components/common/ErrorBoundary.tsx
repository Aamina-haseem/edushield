import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('EduShield UI error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 p-6 dark:bg-slate-950">
          <section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">Application error</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">EduShield could not render this view.</h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">Refresh the page. If the issue continues, review the browser console for the captured error.</p>
            <button className="mt-6 rounded-xl bg-[#003152] px-5 py-3 font-semibold text-white" onClick={() => window.location.reload()}>Reload application</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
