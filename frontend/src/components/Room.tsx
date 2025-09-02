import React, { useRef, useState, useEffect } from 'react';
import { useWebRTC } from '../utils/useWebRTC';
import type { ChatMessage } from '../utils/types';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

interface RoomProps {
  roomId: string;
  username?: string;
  testMode?: boolean;
}

const Room: React.FC<RoomProps> = ({ roomId, username: propUsername, testMode = false }) => {
  const location = useLocation();
  const username = propUsername || location.state?.username || '';
  console.log('Room mounted', { roomId, username });
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ action: string, onConfirm: () => void } | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [mainScreen, setMainScreen] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const joinAttemptedRef = useRef<{ roomId: string; username: string } | null>(null);

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
    if (testMode) {
      setMainScreen('testuser');
      return;
    }
    if (!roomId || !username || isInRoom) return;
    if (
      joinAttemptedRef.current &&
      joinAttemptedRef.current.roomId === roomId &&
      joinAttemptedRef.current.username === username
    ) {
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Joining room...');
    joinRoom(username, roomId);
    joinAttemptedRef.current = { roomId, username };
  }, [roomId, username, isInRoom, testMode]);

  useEffect(() => {
    if (shouldRedirect && !testMode) {
      navigate(`/room?username=${encodeURIComponent(username)}`);
      setShouldRedirect(false);
    }
  }, [shouldRedirect, username, navigate, testMode]);

  useEffect(() => {
    if (isInRoom) {
      setIsLoading(false);
      setLoadingMessage('');
      return;
    }
    if (error && (error.includes('Creating room') || error.includes('Joining room') || error.includes('not found') || error.includes('invalid'))) {
      setIsLoading(true);
      setLoadingMessage(error);
    } else if (error) {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [error, isInRoom]);

  useEffect(() => {
    if (isFullscreen && fullscreenVideoRef.current) {
      const video = fullscreenVideoRef.current;
      if (video.requestFullscreen) video.requestFullscreen();
      else if ((video as any).webkitRequestFullscreen) (video as any).webkitRequestFullscreen();
      else if ((video as any).msRequestFullscreen) (video as any).msRequestFullscreen();
      const exitHandler = () => {
        if (!document.fullscreenElement) setIsFullscreen(false);
      };
      document.addEventListener('fullscreenchange', exitHandler);
      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'q') {
          setIsFullscreen(false);
          if (document.exitFullscreen) document.exitFullscreen();
        }
      };
      window.addEventListener('keydown', keyHandler);
      return () => {
        document.removeEventListener('fullscreenchange', exitHandler);
        window.removeEventListener('keydown', keyHandler);
      };
    }
  }, [isFullscreen]);

  const handleStopScreenShare = () => setShowConfirm({ action: 'stop screen share', onConfirm: () => { stopScreenShare(); setShowConfirm(null); } });
  const handleLeaveRoom = () => {
    if (!testMode) {
      leaveRoom();
    }
    navigate('/');
  };
  const handleMaximizeUser = (clientId: string) => setMainScreen(clientId);

  // --- Layout logic ---
  const isInRoomOrTest = isInRoom || testMode;
  const displayParticipants = testMode ? ['testuser', 'otheruser'] : participants;
  const displayClientId = testMode ? 'testuser' : clientId;
  const displayMessages: ChatMessage[] = testMode ? [
    { from: 'testuser', username: 'testuser', message: 'Hello from test mode!', type: 'chat_message' as const, room_id: roomId },
    { from: 'otheruser', username: 'otheruser', message: 'Hi there!', type: 'chat_message' as const, room_id: roomId }
  ] : messages;
  const mainScreenParticipant = mainScreen || displayClientId;
  const otherParticipants = displayParticipants.filter(p => p !== mainScreenParticipant);

  // --- Show connecting state, then reveal UI once in room ---
  if (!isInRoom) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p>Connecting to room <strong>{roomId}</strong>...</p>
        </div>
      </div>
    );
  }
  
  if (!isInRoomOrTest && !isLoading) {
    // Only redirect if there is a real error
    if (error && (error.includes('not found') || error.includes('invalid') || error.includes('full'))) {
      if (!shouldRedirect) setShouldRedirect(true);
      return (
        <div style={{ color: 'red', textAlign: 'center', marginTop: 40, fontWeight: 600 }}>
          {error ? error : 'Redirecting...'}
        </div>
      );
    }
    // Otherwise, show a waiting state
    return (
      <div style={{ color: '#fff', textAlign: 'center', marginTop: 40, fontWeight: 600 }}>
        Waiting to join room...
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--background, #111)', color: 'var(--foreground, #fff)', overflowX: 'hidden' }}>
      {/* Header */}
      <header style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1.5rem',
        background: 'rgba(20,20,20,0.95)',
        borderBottom: '1px solid #222',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
          <span style={{ fontSize: 22, fontWeight: 700 }}>Room</span>
          <span style={{
            fontSize: 18,
            fontWeight: 600,
            background: '#222',
            color: '#fff',
            borderRadius: 6,
            padding: '4px 12px',
            letterSpacing: 1,
            border: '1px solid #444',
            userSelect: 'all',
            display: 'inline-block',
          }} title="Room ID">{roomId}</span>
          <button
            className="room-control-btn"
            title="Copy Room ID"
            style={{ padding: '4px 10px', fontSize: 16, borderRadius: 6, background: '#333', color: '#fff', border: 'none', cursor: 'pointer' }}
            onClick={() => {navigator.clipboard.writeText(roomId)}}
          >
            📋
          </button>
          {testMode && <span style={{ color: '#aaa', fontSize: 14, marginLeft: 8 }}>(TEST MODE)</span>}
        </div>
        {/* Show error if present */}
        {error && <div style={{ color: 'red', fontWeight: 600, marginLeft: 24 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 2, justifyContent: 'center' }}>
          <button className="room-control-btn" title="Copy Room URL" onClick={() => {navigator.clipboard.writeText(window.location.href)}}>🔗<span>Copy URL</span></button>
          <button className="room-control-btn" title="Share Room" onClick={() => {if (navigator.share) navigator.share({ title: 'Join my room', url: window.location.href }); else navigator.clipboard.writeText(window.location.href);}}>📤<span>Share</span></button>
          <button className="room-control-btn" title="Leave Room" onClick={() => setShowConfirm({ action: 'leave', onConfirm: handleLeaveRoom })}>🚪<span>Leave</span></button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        padding: '1.5rem 0',
        minHeight: '80vh',
        boxSizing: 'border-box',
        gap: 24
      }}>
        {/* Video Section */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
          {/* Main Screen */}
          <div style={{ width: '100%', maxWidth: 900, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 900, aspectRatio: '16/9', background: '#222', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
              {isFullscreen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video
                    ref={el => {
                      fullscreenVideoRef.current = el;
                      if (el) {
                        const stream = mainScreenParticipant === displayClientId ? localVideoRef.current?.srcObject : remoteVideosRef.current[mainScreenParticipant]?.srcObject;
                        if (stream && el.srcObject !== stream) el.srcObject = stream;
                      }
                    }}
                    autoPlay
                    muted={mainScreenParticipant === displayClientId}
                    playsInline
                    style={{ width: '100vw', height: '100vh', objectFit: 'contain', background: '#111' }}
                  />
                  <div style={{ position: 'absolute', top: 24, left: 0, width: '100vw', textAlign: 'center', color: '#fff', fontSize: 18, background: 'rgba(0,0,0,0.5)', padding: 8, zIndex: 10000 }}>
                    Press <b>Esc</b> or <b>Q</b> to exit full screen
                  </div>
                </div>
              )}
              {mainScreenParticipant === displayClientId ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#111' }}
                  title={`You (${username})`}
                />
              ) : (
                <video
                  ref={el => { if (el) remoteVideosRef.current[mainScreenParticipant] = el; }}
                  autoPlay
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#111' }}
                  title={`${mainScreenParticipant} (${username})`}
                />
              )}
              <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: 4, fontSize: 13, color: '#fff' }}>
                {mainScreenParticipant === displayClientId ? `You (${username})` : `${mainScreenParticipant} (${username})`}
              </div>
            </div>
          </div>
          {/* Thumbnails */}
          {otherParticipants.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', width: '100%', maxWidth: 900, overflowX: 'auto' }}>
              {otherParticipants.map(pid => (
                <div key={pid} style={{ position: 'relative', width: 160, height: 90, background: '#222', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.10)' }}>
                  {pid === displayClientId ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#111' }}
                      title={`You (${username})`}
                    />
                  ) : (
                    <video
                      ref={el => { if (el) remoteVideosRef.current[pid] = el; }}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#111' }}
                      title={`${pid} (${username})`}
                    />
                  )}
                  <button
                    className="room-control-btn"
                    style={{ position: 'absolute', top: 5, right: 5, padding: '4px 8px', fontSize: 12, borderRadius: 6 }}
                    title="Pin to Main Screen"
                    onClick={() => setMainScreen(pid)}
                  >
                    📌
                  </button>
                  <div style={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#fff' }}>
                    {pid === displayClientId ? `You (${username})` : `${pid} (${username})`}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Controls */}
          <div className="room-controls" style={{ justifyContent: 'center', margin: '1.5rem 0 0 0', display: 'flex', gap: 12 }}>
            <button className="room-control-btn" title="Toggle Mute" onClick={toggleAudio}>{isAudioOn ? '🔊' : '🔇'}<span>{isAudioOn ? 'Mute' : 'Unmute'}</span></button>
            <button className="room-control-btn" title="Toggle Video" onClick={isVideoOn ? stopVideo : startVideo}>{isVideoOn ? '📹' : '📷'}<span>{isVideoOn ? 'Stop Video' : 'Start Video'}</span></button>
            <button className="room-control-btn" title="Share Screen" onClick={isScreenSharing ? handleStopScreenShare : startScreenShare}>{isScreenSharing ? '🛑' : '🖥️'}<span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span></button>
            <button className="room-control-btn" title={isFullscreen ? 'Exit Fullscreen' : 'Maximize'} onClick={() => setIsFullscreen(f => !f)}>{isFullscreen ? '🗗' : '🗖'}<span>{isFullscreen ? 'Exit Fullscreen' : 'Maximize'}</span></button>
          </div>
        </div>
        {/* Chat Section */}
        {showChat ? (
          <div style={{ flex: 1, minWidth: 280, maxWidth: 340, marginLeft: 0, display: 'flex', flexDirection: 'column', background: '#111', borderRadius: 12, padding: 12, maxHeight: '70vh', overflow: 'auto', position: 'relative' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Chat</span>
              <button className="room-control-btn" title="Close Chat" onClick={() => setShowChat(false)}>❌<span>Close</span></button>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {displayMessages.map((msg: ChatMessage, i: number) => {
                const isOwner = displayParticipants[0] === msg.from;
                const isSelf = msg.from === displayClientId;
                let role = isOwner ? 'room_owner' : 'room_user';
                return (
                  <div key={i} style={{ fontSize: 13, margin: '2px 0' }}>
                    <span style={{ color: '#fff' }}>{msg.username || msg.from} ({role}){isSelf ? ' (you)' : ''}:</span> <span style={{ color: '#aaa' }}>{msg.message}</span>
                  </div>
                );
              })}
            </div>
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} style={{ display: 'flex', marginTop: 4, alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                style={{ flex: 1, fontSize: 13, borderRadius: 6, padding: '6px 10px', border: '1px solid #333', background: '#181818', color: '#fff' }}
              />
              <button className="room-control-btn" title="Send Message" type="submit" style={{ fontSize: 18, padding: '4px 8px', borderRadius: 6, marginLeft: 2, background: '#222', color: '#fff', border: '1px solid #444', minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📨
              </button>
            </form>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 280, maxWidth: 340, marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button className="room-control-btn" title="Open Chat" onClick={() => setShowChat(true)} style={{ fontSize: 18, padding: '1rem 2rem', borderRadius: 12, background: '#222', color: '#fff', border: '1px solid #444' }}>
              💬 Open Chat
            </button>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'rgba(34, 34, 34, 0.9)',
            padding: 32,
            borderRadius: 16,
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              width: 40,
              height: 40,
              border: '3px solid #fff',
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <div style={{ color: '#fff', fontSize: 16 }}>{loadingMessage}</div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog with Acrylic Effect */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'rgba(34, 34, 34, 0.95)',
            padding: 32,
            borderRadius: 16,
            minWidth: 320,
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ fontSize: 20, marginBottom: 16, color: '#fff' }}>
              Are you sure you want to {showConfirm.action === 'leave' ? 'leave the room?' : showConfirm.action === 'stop screen share' ? 'stop screen sharing?' : 'proceed?'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                className="bw-btn"
                onClick={() => {
                  showConfirm.onConfirm();
                  setShowConfirm(null);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  background: '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: 600
                }}
              >
                OK
              </button>
              <button
                className="bw-btn"
                onClick={() => setShowConfirm(null)}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  background: '#f44336',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Room; 