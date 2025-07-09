import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
const THEME_KEY = 'collabshare-theme';

const HomeBtn: React.FC = () => {
    const navigate = useNavigate();
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark';
        }
        return 'dark';
    });
    return (
        <button
            onClick={() => navigate('/')}
            style={{
                position: 'fixed',
                top: '1rem',
                left: '1rem',
                zIndex: 2000,
                border: '1px solid #888',
                borderRadius: '2rem',
                fontSize: 18,
                fontWeight: 600,
                padding: '0.5rem 1.2rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                transition: 'background 0.2s, color 0.2s',
                background: theme === 'dark' ? '#222' : '#fff',
                color: theme === 'dark' ? '#ffd700' : '#222', display: 'flex',
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
            <span style={{ fontSize: 15 }}>
                Home
            </span>
        </button>
    );
};

export default HomeBtn; 