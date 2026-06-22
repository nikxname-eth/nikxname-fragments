import React from 'react';

type Props = { children: React.ReactNode; onRecover?: () => void };

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.warn('[Nikxart] Recovered from error to protect the experience', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (this.props.onRecover) this.props.onRecover();
    window.setTimeout(() => window.location.reload(), 80);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg, #06060a)', color: 'var(--cream, #f0e8dc)',
          fontFamily: 'var(--font, Georgia, serif)', textAlign: 'center', padding: 24
        }}>
          <div>
            <p style={{ opacity: 0.6, fontSize: 13, letterSpacing: '0.2em', marginBottom: 16 }}>
              A quiet hiccup in the experience
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: 'none', border: '1px solid rgba(200,188,170,0.4)',
                color: 'inherit', padding: '14px 28px', borderRadius: 10,
                fontFamily: 'inherit', fontStyle: 'italic', letterSpacing: '0.1em',
                cursor: 'pointer'
              }}
            >
              Reload
            </button>
            <p style={{ marginTop: 18, fontSize: 11, opacity: 0.45 }}>
              The work is still here — try refreshing the page.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
