import React, { useEffect, useState } from 'react';

const THEME_KEY = 'collabshare-theme';

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });
  const opposite = theme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <button
      aria-label={`Switch to ${opposite} mode`}
      onClick={toggleTheme}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 2000,
        background: theme === 'dark' ? '#222' : '#fff',
        color: theme === 'dark' ? '#ffd700' : '#222',
        border: '1px solid #888',
        borderRadius: '2rem',
        fontSize: 18,
        fontWeight: 600,
        padding: '0.5rem 1.2rem',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        transition: 'background 0.2s, color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      onMouseOver={e => {
        (e.currentTarget as HTMLButtonElement).style.background = theme === 'dark' ? '#fff' : '#222';
        (e.currentTarget as HTMLButtonElement).style.color = theme === 'dark' ? '#222' : '#ffd700';
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLButtonElement).style.background = theme === 'dark' ? '#222' : '#fff';
        (e.currentTarget as HTMLButtonElement).style.color = theme === 'dark' ? '#ffd700' : '#222';
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
      <span style={{ fontSize: 15 }}>
        Switch to {opposite.charAt(0).toUpperCase() + opposite.slice(1)} Theme
      </span>
    </button>
  );
};

export default ThemeToggle; 