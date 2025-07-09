import React from 'react';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1.5rem', letterSpacing: 1 }}>Welcome to My WebRTC App</h1>
      <p style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '2.5rem', maxWidth: 400, textAlign: 'center' }}>
        Simple, private video chat and messaging. No sign up. No hassle. Just connect and collaborate.
      </p>
      <button
        className="bw-btn"
        style={{ minWidth: 180, padding: '1rem 2.5rem', fontSize: '1.3rem', borderRadius: 12 }}
        onClick={onEnter}
      >
        Enter
      </button>
    </div>
  );
};

export default Landing; 