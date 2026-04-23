import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,color:'#fff',background:'#030712',minHeight:'100vh',fontFamily:'sans-serif'}}>
        <h2 style={{color:'#ef4444'}}>Something went wrong</h2>
        <pre style={{color:'#9ca3af',marginTop:16,fontSize:13}}>{this.state.error.message}</pre>
        <button onClick={() => window.location.href='/dashboard'} style={{marginTop:20,padding:'10px 20px',background:'#f59e0b',border:'none',borderRadius:8,cursor:'pointer',fontWeight:600}}>
          Go to Dashboard
        </button>
      </div>
    );
    return this.props.children;
  }
}
