import React from 'react';
import { BackgroundPaths } from './ui/background-paths';
import ThemeToggle from './ThemeToggle';
import HomeBtn from './HomeBtn';

const Hero: React.FC = () => {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100vw', overflow: 'hidden', background: '#000' }}>
      <HomeBtn />
      <ThemeToggle />
      <BackgroundPaths
        title='CollabShare - Open Source WebRTC'
        text='Try Now!'
      />
    </div>
  );
};

export default Hero; 