import React, { useRef, useState, useEffect } from 'react';
import { useWebRTC } from '../utils/useWebRTC';
import type { ChatMessage } from '../utils/types';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import RoomEntry from './RoomEntry';

interface RoomProps {
  roomId: string;
}

const Room: React.FC<RoomProps> = ({ roomId }) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [username, setUsername] = useState<string>('');
  const [roomIdInput, setRoomIdInput] = useState<string>('');
  const [joined, setJoined] = useState<boolean>(false);
  const [showChat, setShowChat] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ action: string, onConfirm: () => void } | null>(null);
  const [maximized, setMaximized] = useState(false);
  const navigate = useNavigate();
  const videoPanelRef = useRef<HTMLDivElement>(null);

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
  } = useWebRTC(localVideoRef as React.RefObject<HTMLVideoElement>);

  useEffect(() => {
    if (roomId && !isInRoom) {
      joinRoom('user', roomId);
    }
    // eslint-disable-next-line
  }, [roomId]);

  const handleStopScreenShare = () => setShowConfirm({ action: 'stop screen share', onConfirm: () => { stopScreenShare(); setShowConfirm(null); } });

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };

  // Fullscreen logic
  useEffect(() => {
    if (maximized && videoPanelRef.current) {
      if (videoPanelRef.current.requestFullscreen) {
        videoPanelRef.current.requestFullscreen();
      }
    } else if (!maximized && document.fullscreenElement) {
      document.exitFullscreen();
    }
    // Cleanup on unmount
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, [maximized]);

  // Join form (should not be shown in new routing, but kept for fallback)
  if (!isInRoom) {
    console.warn(`Looks like you are not in any room.`, error)
    return (
      <RoomEntry />
    );
  }

  // Main room UI
  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', minHeight: '90vh', position: 'relative' }}>
      <ThemeToggle />
      {/* Room Header */}
      {!maximized && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>Room: {roomId}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="room-control-btn" title="Copy Room ID" onClick={() => {navigator.clipboard.writeText(roomId)}}>📋<span>Copy ID</span></button>
            <button className="room-control-btn" title="Copy Room URL" onClick={() => {navigator.clipboard.writeText(window.location.href)}}>🔗<span>Copy URL</span></button>
            <button className="room-control-btn" title="Share Room" onClick={() => {if (navigator.share) navigator.share({ title: 'Join my room', url: window.location.href }); else navigator.clipboard.writeText(window.location.href);}}>📤<span>Share</span></button>
            <button className="room-control-btn" title="Leave Room" onClick={() => setShowConfirm({ action: 'leave', onConfirm: handleLeaveRoom })}>🚪<span>Leave</span></button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Main Video/Screen Panel */}
        <div ref={videoPanelRef} style={{ flex: maximized ? 1 : 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%', height: maximized ? '100vh' : 'auto', transition: 'all 0.3s', background: maximized ? '#000' : undefined, zIndex: maximized ? 1000 : undefined }}>
          <div className="room-controls" style={{ justifyContent: 'center' }}>
            <button className="room-control-btn" title="Toggle Mute" onClick={toggleAudio}>{isAudioOn ? '🔊' : '🔇'}<span>{isAudioOn ? 'Mute' : 'Unmute'}</span></button>
            <button className="room-control-btn" title="Toggle Video" onClick={isVideoOn ? stopVideo : startVideo}>{isVideoOn ? '📹' : '📷'}<span>{isVideoOn ? 'Stop Video' : 'Start Video'}</span></button>
            <button className="room-control-btn" title="Share Screen" onClick={isScreenSharing ? handleStopScreenShare : startScreenShare}>{isScreenSharing ? '🛑' : '🖥️'}<span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span></button>
            <button className="room-control-btn" title={maximized ? 'Minimize' : 'Maximize'} onClick={() => setMaximized(m => !m)}>{maximized ? '🗗' : '🗖'}<span>{maximized ? 'Minimize' : 'Maximize'}</span></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: maximized ? '2.5rem' : '1.5rem', marginBottom: '1rem', width: '100%', transition: 'all 0.3s' }}>
            <video ref={localVideoRef} autoPlay muted playsInline width={maximized ? 1280 : 640} height={maximized ? 720 : 480} title="Your Video" style={{ border: '2px solid #fff', borderRadius: 16, maxWidth: '100%' }} />
            {participants.filter(p => p !== clientId).map(pid => (
              <video
                key={pid}
                ref={el => { if (el) remoteVideosRef.current[pid] = el; }}
                autoPlay
                playsInline
                width={maximized ? 1280 : 640}
                height={maximized ? 720 : 480}
                title={`Participant ${pid}`}
                style={{ border: '2px solid #fff', borderRadius: 16, maxWidth: '100%' }}
              />
            ))}
          </div>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 8, display: maximized ? 'none' : 'block' }}>Room ID: {roomId}</div>
        </div>
        {/* Chat Sidebar */}
        {!maximized && (
          <div style={{ flex: 1, minWidth: 280, maxWidth: 340, marginLeft: 24, display: showChat ? 'flex' : 'none', flexDirection: 'column', background: '#111', borderRadius: 12, padding: 12, maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Chat</span>
              <button className="room-control-btn" title="Close Chat" onClick={() => setShowChat(false)}>❌<span>Close</span></button>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {messages.map((msg: ChatMessage, i: number) => {
                const isOwner = participants[0] === msg.from;
                const isSelf = msg.from === clientId;
                let role = isOwner ? 'room_owner' : 'room_user';
                return (
                  <div key={i} style={{ fontSize: 13, margin: '2px 0' }}>
                    <span style={{ color: '#fff' }}>{msg.username || msg.from} ({role}){isSelf ? ' (you)' : ''}:</span> <span style={{ color: '#aaa' }}>{msg.message}</span>
                  </div>
                );
              })}
            </div>
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} style={{ display: 'flex', marginTop: 4 }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                style={{ flex: 1, fontSize: 13 }}
              />
              <button className="room-control-btn" title="Send Message" type="submit">➡️<span>Send</span></button>
            </form>
          </div>
        )}
        {/* Chat Toggle Button */}
        {!showChat && !maximized && (
          <button className="room-control-btn" style={{ position: 'absolute', right: 12, top: 80, zIndex: 10 }} title="Open Chat" onClick={() => setShowChat(true)}>💬<span>Chat</span></button>
        )}
      </div>
      {/* Confirmation Dialog */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#222', padding: 32, borderRadius: 16, minWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 16 }}>Are you sure you want to {showConfirm.action === 'leave' ? 'leave the room?' : showConfirm.action === 'stop screen share' ? 'stop screen sharing?' : 'proceed?'}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button className="bw-btn" onClick={() => { showConfirm.onConfirm(); setShowConfirm(null); }}>OK</button>
              <button className="bw-btn" onClick={() => setShowConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room; 