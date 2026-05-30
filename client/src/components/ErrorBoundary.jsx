import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 24, textAlign: 'center', color: 'var(--text)', background: 'var(--bg)'
        }}>
          <h2 style={{ marginBottom: 12 }}>Algo salió mal</h2>
          <p style={{ marginBottom: 24, color: 'var(--text-secondary)' }}>
            {this.state.error.message}
          </p>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600
            }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
