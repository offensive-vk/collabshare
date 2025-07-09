import React, { useRef, useState } from 'react';
import { useWebRTC } from './useWebRTC';
import type { ChatMessage } from './types';

const Room: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [username, setUsername] = useState<string>('');
  const [roomIdInput, setRoomIdInput] = useState<string>('');
  const [joined, setJoined] = useState<boolean>(false);

  // useWebRTC hook manages all state and logic
  const {
    isInRoom,
    participants,
    clientId,
    messages,
    newMessage,
    setNewMessage,
    sendMessage,
    error,
    joinRoom,
    leaveRoom,
    isScreenSharing,
    isVideoOn,
    isAudioOn,
    toggleAudio,
    startVideo,
    stopVideo,
    startScreenShare,
    stopScreenShare,
    remoteVideosRef,
    roomId,
  } = useWebRTC(localVideoRef as React.RefObject<HTMLVideoElement>);

  // Join form
  if (!isInRoom) {
    return (
      <div style={{ maxWidth: 340, width: '100%', margin: '0 auto', padding: '2rem 0' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 16 }}>Join a Room</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            joinRoom(username, roomIdInput);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ fontSize: 16 }}
          />
          <input
            type="text"
            placeholder="Room ID (leave blank to create)"
            value={roomIdInput}
            onChange={e => setRoomIdInput(e.target.value)}
            style={{ fontSize: 16 }}
          />
          <button className="bw-btn" type="submit">
            {roomIdInput ? 'Join Room' : 'Create Room'}
          </button>
        </form>
        {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      </div>
    );
  }

  // Main room UI
  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '1.5rem 0' }}>
      <div className="room-controls" style={{ justifyContent: 'center' }}>
        <button className="room-control-btn" title="Toggle Mute" onClick={toggleAudio}>{isAudioOn ? '🔊' : '🔇'}</button>
        <button className="room-control-btn" title="Toggle Video" onClick={isVideoOn ? stopVideo : startVideo}>{isVideoOn ? '📹' : '📷'}</button>
        <button className="room-control-btn" title="Share Screen" onClick={isScreenSharing ? stopScreenShare : startScreenShare}>{isScreenSharing ? '🛑' : '🖥️'}</button>
        <button className="room-control-btn" title="Leave Room" onClick={leaveRoom}>🚪</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <video ref={localVideoRef} autoPlay muted playsInline width={160} height={120} title="Your Video" style={{ border: '2px solid #fff', borderRadius: 8 }} />
        {participants.filter(p => p !== clientId).map(pid => (
          <video
            key={pid}
            ref={el => {
              if (el) remoteVideosRef.current[pid] = el;
            }}
            autoPlay
            playsInline
            width={160}
            height={120}
            title={`Participant ${pid}`}
            style={{ border: '2px solid #fff', borderRadius: 8 }}
          />
        ))}
      </div>
      <div style={{ background: '#111', borderRadius: 8, padding: 8, maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Chat</div>
        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          {messages.map((msg: ChatMessage, i: number) => (
            <div key={i} style={{ fontSize: 12, margin: '2px 0' }}>
              <span style={{ color: '#fff' }}>{msg.username || msg.from}:</span> <span style={{ color: '#aaa' }}>{msg.message}</span>
            </div>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); sendMessage(); }} style={{ display: 'flex', marginTop: 4 }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button className="room-control-btn" title="Send Message" type="submit">➡️</button>
        </form>
      </div>
      <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>Room ID: {roomId}</div>
    </div>
  );
};

export default Room; 