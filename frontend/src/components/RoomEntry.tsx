import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BACKEND_URL } from '../utils/useWebRTC';
import ThemeToggle from './ThemeToggle';
import HomeBtn from './HomeBtn';

const RoomEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState<string>(searchParams.get('username') || '');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'none' | 'join' | 'create'>('none');
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomIdInput.trim()) {
      setError('Username and Room ID are required!');
      return;
    }
    setError('');
    // Try to join room by navigating, let Room handle error
    navigate(`/room/${roomIdInput.trim()}`, { state: { username: username.trim() } });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required!');
      return;
    }
    setError('Creating room...');
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_participants: 5 }),
      });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      navigate(`/room/${data.room_id}`, { state: { username: username.trim() } });
    } catch {
      setError('Failed to create room');
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background, #000)', color: 'var(--foreground, #fff)' }}>
      <HomeBtn />
      <ThemeToggle />
      <h2 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: 16 }}>Join or Create a Room</h2>
      {mode === 'none' && (
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          <button
            className="bw-btn"
            onClick={() => setMode('join')}
          >
            Join Room
          </button>
          <button
            className="bw-btn"
            onClick={() => setMode('create')}
          >
            Create Room
          </button>
        </div>
      )}
      {mode === 'join' && (
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 320, maxWidth: '90vw' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ fontSize: 16, width: '100%', marginBottom: 8, borderRadius: 8, padding: '0.75rem 1.2rem', border: '1px solid #fff', background: '#222', color: '#fff' }}
          />
          <input
            type="text"
            placeholder="Room ID"
            value={roomIdInput}
            onChange={e => setRoomIdInput(e.target.value)}
            required
            style={{ fontSize: 16, width: '100%', marginBottom: 8, borderRadius: 8, padding: '0.75rem 1.2rem', border: '1px solid #fff', background: '#222', color: '#fff' }}
          />
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              className="bw-btn"
              style={{ minWidth: 120, padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '1rem', background: '#fff', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              type="submit"
            >
              Join
            </button>
            <button
              className="bw-btn"
              style={{ minWidth: 120, padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '1rem', background: '#eee', color: '#333', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              type="button"
              onClick={() => setMode('none')}
            >
              Back
            </button>
          </div>
        </form>
      )}
      {mode === 'create' && (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 320, maxWidth: '90vw' }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ fontSize: 16, width: '100%', marginBottom: 8, borderRadius: 8, padding: '0.75rem 1.2rem', border: '1px solid #fff', background: '#222', color: '#fff' }}
          />
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              className="bw-btn"
              style={{ minWidth: 120, padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '1rem', background: '#fff', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              type="submit"
            >
              Create
            </button>
            <button
              className="bw-btn"
              style={{ minWidth: 120, padding: '0.8rem 2rem', fontSize: '1.1rem', borderRadius: '1rem', background: '#eee', color: '#333', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              type="button"
              onClick={() => setMode('none')}
            >
              Back
            </button>
          </div>
        </form>
      )}
      {error && <div style={{ color: 'red', marginTop: 18, fontWeight: 600 }}>{error}</div>}
    </div>
  );
};

export default RoomEntry; 