// Create src/DebugApp.tsx - Use this temporarily to test if React is working

import React from 'react';

export default function DebugApp() {
  console.log('DebugApp is rendering');
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        🎯 React is Working!
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        If you can see this, React is mounting correctly.
      </p>
      
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h2>Debug Info:</h2>
        <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
          <li>Current time: {new Date().toLocaleTimeString()}</li>
          <li>Window width: {typeof window !== 'undefined' ? window.innerWidth : 'SSR'}</li>
          <li>User agent: {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'SSR'}</li>
        </ul>
      </div>
      
      <button 
        onClick={() => alert('Button clicked!')}
        style={{
          backgroundColor: '#FF6B35',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  );
}