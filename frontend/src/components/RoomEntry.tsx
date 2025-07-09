import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../utils/useWebRTC';
import ThemeToggle from './ThemeToggle';
import HomeBtn from './HomeBtn';

const RoomEntry: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is empty!');
      return;
    }
    if (!roomIdInput.trim()) {
      // Create room
      try {
        const res = await fetch(`${BACKEND_URL}/api/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ max_participants: 5 }),
        });
        const data = await res.json();
        navigate(`/room/${data.room_id}`);
      } catch {
        setError('Failed to create room');
      }
    } else {
      navigate(`/room/${roomIdInput}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background, #000)', color: 'var(--foreground, #fff)' }}>
      <HomeBtn />
      <ThemeToggle />
      <h2 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: 16 }}>Join or Create a Room</h2>
      <form onSubmit={handleEnter} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: 320, maxWidth: '90vw' }}>
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
          placeholder="Room ID (leave blank to create one)"
          value={roomIdInput}
          onChange={e => setRoomIdInput(e.target.value)}
          style={{ fontSize: 16, width: '100%', marginBottom: 8, borderRadius: 8, padding: '0.75rem 1.2rem', border: '1px solid #fff', background: '#222', color: '#fff' }}
        />
        <button
          className="bw-btn"
          style={{ minWidth: 220, padding: '1.1rem 2.8rem', fontSize: '1.3rem', borderRadius: '1rem', background: '#fff', color: '#000', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', transition: 'all 0.2s', border: 'none', cursor: 'pointer' }}
          type="submit"
        >
          {roomIdInput ? 'Join' : 'Create'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
    </div>
  );
};

export default RoomEntry; 