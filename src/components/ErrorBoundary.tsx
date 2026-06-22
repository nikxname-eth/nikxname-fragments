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
    // In production we swallow — the gate must never strand the user.
    // You can send to a lightweight logger here if desired.
    console.warn('[Nikxart] Recovered from error to protect the experience', error, info);
  }

  handleForceEnter = () => {
    this.setState({ hasError: false });
    // Best effort: tell the gate logic we want in
    try {
      sessionStorage.setItem('nikxart-entered', '1');
      document.documentElement.setAttribute('data-entered', '1');
      document.body.classList.add('site-entered');
    } catch {}
    if (this.props.onRecover) this.props.onRecover();
    // Full reload is the ultimate safety net for corrupted React tree
    window.setTimeout(() => window.location.reload(), 80);
  };

  render() {
    if (this.state.hasError) {
      // Ultra-minimal recovery UI — keeps the artistic spirit but guarantees entry
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
              onClick={this.handleForceEnter}
              style={{
                background: 'none', border: '1px solid rgba(200,188,170,0.4)',
                color: 'inherit', padding: '14px 28px', borderRadius: 10,
                fontFamily: 'inherit', fontStyle: 'italic', letterSpacing: '0.1em',
                cursor: 'pointer'
              }}
            >
              Enter anyway
            </button>
            <p style={{ marginTop: 18, fontSize: 11, opacity: 0.45 }}>
              The work is still here — we forced the gate for you.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
