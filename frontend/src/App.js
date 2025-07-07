import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// STUN servers configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

function App() {
  const [websocket, setWebsocket] = useState(null);
  const [clientId, setClientId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const websocketRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const newClientId = generateClientId();
    setClientId(newClientId);
    
    const wsUrl = BACKEND_URL.replace('http', 'ws') + `/ws/${newClientId}`;
    const newWebSocket = new WebSocket(wsUrl);
    
    newWebSocket.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      setError('');
    };
    
    newWebSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    newWebSocket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
      setError('Connection lost. Please refresh the page.');
    };
    
    newWebSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
      setError('Connection failed. Please refresh the page.');
    };
    
    setWebsocket(newWebSocket);
    websocketRef.current = newWebSocket;
    
    return () => {
      if (newWebSocket.readyState === WebSocket.OPEN) {
        newWebSocket.close();
      }
    };
  }, []);

  // Generate unique client ID
  const generateClientId = () => {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    console.log('Received WebSocket message:', data);
    
    switch (data.type) {
      case 'room_joined':
        setIsInRoom(true);
        setParticipants(data.participants);
        setError('');
        break;
        
      case 'participant_joined':
        setParticipants(data.participants);
        createPeerConnection(data.client_id);
        break;
        
      case 'participant_left':
        setParticipants(prev => prev.filter(p => p !== data.client_id));
        if (peerConnectionsRef.current[data.client_id]) {
          peerConnectionsRef.current[data.client_id].close();
          delete peerConnectionsRef.current[data.client_id];
        }
        break;
        
      case 'webrtc_offer':
        handleWebRTCOffer(data);
        break;
        
      case 'webrtc_answer':
        handleWebRTCAnswer(data);
        break;
        
      case 'webrtc_ice_candidate':
        handleICECandidate(data);
        break;
        
      case 'chat_message':
        setMessages(prev => [...prev, data]);
        break;
        
      case 'error':
        setError(data.message);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  // Send WebSocket message
  const sendWebSocketMessage = (message) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    } else {
      setError('Connection not available');
    }
  };

  // Create room
  const createRoom = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_participants: 5 }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoomId(data.room_id);
        joinRoom(data.room_id);
      } else {
        setError('Failed to create room');
      }
    } catch (err) {
      setError('Failed to create room');
    }
  };

  // Join room
  const joinRoom = (targetRoomId = roomId) => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!targetRoomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    sendWebSocketMessage({
      type: 'join_room',
      room_id: targetRoomId,
      username: username
    });
  };

  // Leave room
  const leaveRoom = () => {
    sendWebSocketMessage({
      type: 'leave_room',
      room_id: roomId
    });
    
    setIsInRoom(false);
    setParticipants([]);
    setMessages([]);
    setRoomId('');
    
    // Stop local streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    
    setIsScreenSharing(false);
    setIsVideoOn(false);
    setIsAudioOn(false);
  };

  // Start screen sharing
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsScreenSharing(true);
      
      // Add stream to all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      });
      
      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError('Failed to start screen sharing');
    }
  };

  // Stop screen sharing
  const stopScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    setIsScreenSharing(false);
  };

  // Start video
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isAudioOn
      });
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setIsVideoOn(true);
      
      // Add stream to all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      });
      
    } catch (err) {
      console.error('Error starting video:', err);
      setError('Failed to start video');
    }
  };

  // Stop video
  const stopVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => track.stop());
    }
    setIsVideoOn(false);
  };

  // Toggle audio
  const toggleAudio = async () => {
    if (isAudioOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.stop());
      }
      setIsAudioOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoOn,
          audio: true
        });
        
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        setIsAudioOn(true);
        
        // Add stream to all peer connections
        Object.values(peerConnectionsRef.current).forEach(pc => {
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        });
        
      } catch (err) {
        console.error('Error starting audio:', err);
        setError('Failed to start audio');
      }
    }
  };

  // Create peer connection
  const createPeerConnection = (targetClientId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add ICE candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWebSocketMessage({
          type: 'webrtc_ice_candidate',
          target: targetClientId,
          candidate: event.candidate,
          room_id: roomId
        });
      }
    };
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote stream:', event);
      const remoteVideo = document.getElementById(`remote-${targetClientId}`);
      if (remoteVideo) {
        remoteVideo.srcObject = event.streams[0];
      }
    };
    
    // Add local stream if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    peerConnectionsRef.current[targetClientId] = pc;
    
    // Create offer
    createOffer(targetClientId);
  };

  // Create WebRTC offer
  const createOffer = async (targetClientId) => {
    try {
      const pc = peerConnectionsRef.current[targetClientId];
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      sendWebSocketMessage({
        type: 'webrtc_offer',
        target: targetClientId,
        offer: offer,
        room_id: roomId
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  // Handle WebRTC offer
  const handleWebRTCOffer = async (data) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      
      // Add ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebSocketMessage({
            type: 'webrtc_ice_candidate',
            target: data.from,
            candidate: event.candidate,
            room_id: roomId
          });
        }
      };
      
      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote stream:', event);
        const remoteVideo = document.getElementById(`remote-${data.from}`);
        if (remoteVideo) {
          remoteVideo.srcObject = event.streams[0];
        }
      };
      
      // Add local stream if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
      
      peerConnectionsRef.current[data.from] = pc;
      
      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      sendWebSocketMessage({
        type: 'webrtc_answer',
        target: data.from,
        answer: answer,
        room_id: roomId
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  // Handle WebRTC answer
  const handleWebRTCAnswer = async (data) => {
    try {
      const pc = peerConnectionsRef.current[data.from];
      await pc.setRemoteDescription(data.answer);
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  // Handle ICE candidate
  const handleICECandidate = async (data) => {
    try {
      const pc = peerConnectionsRef.current[data.from];
      await pc.addIceCandidate(data.candidate);
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  };

  // Send chat message
  const sendMessage = () => {
    if (newMessage.trim()) {
      sendWebSocketMessage({
        type: 'chat_message',
        room_id: roomId,
        message: newMessage,
        username: username
      });
      setNewMessage('');
    }
  };

  // Handle Enter key in chat
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="main-container">
      {!isInRoom ? (
        <>
          {!username && !roomId && (
            <>
              <button className="bw-btn" onClick={() => setError('') || setRoomId('')}>Create</button>
              <button className="bw-btn" onClick={() => setError('') || setRoomId('join')}>Join</button>
            </>
          )}
          {roomId === '' && (
            <form onSubmit={e => { e.preventDefault(); createRoom(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <button className="bw-btn" type="submit">Start</button>
            </form>
          )}
          {roomId === 'join' && (
            <form onSubmit={e => { e.preventDefault(); joinRoom(); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId !== 'join' ? roomId : ''}
                onChange={e => setRoomId(e.target.value)}
                required
              />
              <button className="bw-btn" type="submit">Join</button>
            </form>
          )}
          {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
        </>
      ) : (
        <div style={{ width: '100%', maxWidth: 900 }}>
          <div className="room-controls">
            <button className="room-control-btn" title="Toggle Mute" onClick={toggleAudio}>{isAudioOn ? '🔊' : '🔇'}</button>
            <button className="room-control-btn" title="Toggle Video" onClick={isVideoOn ? stopVideo : startVideo}>{isVideoOn ? '📹' : '📷'}</button>
            <button className="room-control-btn" title="Share Screen" onClick={isScreenSharing ? stopScreenShare : startScreenShare}>{isScreenSharing ? '🛑' : '🖥️'}</button>
            <button className="room-control-btn" title="Leave Room" onClick={leaveRoom}>🚪</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <video ref={localVideoRef} autoPlay muted playsInline width={160} height={120} title="Your Video" style={{ border: '2px solid #fff', borderRadius: 8 }} />
            {participants.filter(p => p !== clientId).map(pid => (
              <video key={pid} ref={el => remoteVideosRef.current[pid] = el} autoPlay playsInline width={160} height={120} title={`Participant ${pid}`} style={{ border: '2px solid #fff', borderRadius: 8 }} />
            ))}
          </div>
          <div style={{ background: '#111', borderRadius: 8, padding: 8, maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Chat</div>
            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
              {messages.map((msg, i) => (
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
      )}
    </div>
  );
}

export default App;