import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  WebSocketMessage,
  ChatMessage,
  AppState,
  JoinRoomMessage,
  LeaveRoomMessage,
  SendWebRTCOfferMessage,
  SendWebRTCAnswerMessage,
  SendWebRTCIceCandidateMessage
} from './types';

export const BACKEND_URL = import.meta.env.BACKEND_URL || 'http://localhost:8001';
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

interface UseWebRTCResult {
  isInRoom: boolean;
  participants: string[];
  clientId: string;
  messages: ChatMessage[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  sendMessage: () => void;
  error: string;
  joinRoom: (username: string, roomIdInput: string) => void;
  leaveRoom: () => void;
  isScreenSharing: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  toggleAudio: () => void;
  startVideo: () => void;
  stopVideo: () => void;
  startScreenShare: () => void;
  stopScreenShare: () => void;
  remoteVideosRef: React.MutableRefObject<{ [key: string]: HTMLVideoElement }>;
  roomId: string;
}

export function useWebRTC(localVideoRef: React.RefObject<HTMLVideoElement>): UseWebRTCResult {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(false);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const websocketRef = useRef<WebSocket | null>(null);

  // Generate unique client ID
  const generateClientId = () => {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  };

  // WebSocket connection
  useEffect(() => {
    const newClientId = generateClientId();
    setClientId(newClientId);
    const wsUrl = BACKEND_URL.replace('http', 'ws') + `/ws/${newClientId}`;
    const newWebSocket = new WebSocket(wsUrl);

    newWebSocket.onopen = () => {
      setError('');
    };
    newWebSocket.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    newWebSocket.onclose = () => {
      setError('Connection lost. Please refresh the page.');
    };
    newWebSocket.onerror = () => {
      setError('Connection failed. Please refresh the page.');
    };
    setWebsocket(newWebSocket);
    websocketRef.current = newWebSocket;
    return () => {
      if (newWebSocket.readyState === WebSocket.OPEN) {
        newWebSocket.close();
      }
    };
    // eslint-disable-next-line
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: WebSocketMessage) => {
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
        // do nothing
        break;
    }
  };

  // Send WebSocket message
  const sendWebSocketMessage = (message: object) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    } else {
      setError('Connection not available');
    }
  };

  // Join or create room
  const joinRoom = (username: string, roomIdInput: string) => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    if (!roomIdInput.trim()) {
      // Create room
      fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_participants: 5 }),
      })
        .then(res => res.json())
        .then(data => {
          setRoomId(data.room_id);
          sendWebSocketMessage({
            type: 'join_room',
            room_id: data.room_id,
            username,
          } as JoinRoomMessage);
        })
        .catch(() => setError('Failed to create room'));
    } else {
      setRoomId(roomIdInput);
      sendWebSocketMessage({
        type: 'join_room',
        room_id: roomIdInput,
        username,
      } as JoinRoomMessage);
    }
  };

  // Leave room
  const leaveRoom = () => {
    sendWebSocketMessage({
      type: 'leave_room',
      room_id: roomId,
    } as LeaveRoomMessage);
    setIsInRoom(false);
    setParticipants([]);
    setMessages([]);
    setRoomId('');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    setIsScreenSharing(false);
    setIsVideoOn(false);
    setIsAudioOn(false);
  };

  // Screen sharing
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsScreenSharing(true);
      Object.values(peerConnectionsRef.current).forEach(pc => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      });
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch {
      setError('Failed to start screen sharing');
    }
  };
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

  // Video
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isAudioOn });
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsVideoOn(true);
      Object.values(peerConnectionsRef.current).forEach(pc => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      });
    } catch {
      setError('Failed to start video');
    }
  };
  const stopVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => track.stop());
    }
    setIsVideoOn(false);
  };

  // Audio
  const toggleAudio = async () => {
    if (isAudioOn) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => track.stop());
      }
      setIsAudioOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoOn, audio: true });
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsAudioOn(true);
        Object.values(peerConnectionsRef.current).forEach(pc => {
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        });
      } catch {
        setError('Failed to start audio');
      }
    }
  };

  // Peer connection
  const createPeerConnection = (targetClientId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWebSocketMessage({
          type: 'webrtc_ice_candidate',
          target: targetClientId,
          candidate: event.candidate,
          room_id: roomId,
        } as SendWebRTCIceCandidateMessage);
      }
    };
    pc.ontrack = (event) => {
      const remoteVideo = remoteVideosRef.current[targetClientId];
      if (remoteVideo) {
        remoteVideo.srcObject = event.streams[0];
      }
    };
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current as MediaStream);
      });
    }
    peerConnectionsRef.current[targetClientId] = pc;
    createOffer(targetClientId);
  };
  const createOffer = async (targetClientId: string) => {
    try {
      const pc = peerConnectionsRef.current[targetClientId];
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendWebSocketMessage({
        type: 'webrtc_offer',
        target: targetClientId,
        offer: offer,
        room_id: roomId,
      } as SendWebRTCOfferMessage);
    } catch {}
  };
  const handleWebRTCOffer = async (data: any) => {
    try {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebSocketMessage({
            type: 'webrtc_ice_candidate',
            target: data.from,
            candidate: event.candidate,
            room_id: roomId,
          } as SendWebRTCIceCandidateMessage);
        }
      };
      pc.ontrack = (event) => {
        const remoteVideo = remoteVideosRef.current[data.from];
        if (remoteVideo) {
          remoteVideo.srcObject = event.streams[0];
        }
      };
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current as MediaStream);
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
        room_id: roomId,
      } as SendWebRTCAnswerMessage);
    } catch {}
  };
  const handleWebRTCAnswer = async (data: any) => {
    try {
      const pc = peerConnectionsRef.current[data.from];
      await pc.setRemoteDescription(data.answer);
    } catch {}
  };
  const handleICECandidate = async (data: any) => {
    try {
      const pc = peerConnectionsRef.current[data.from];
      await pc.addIceCandidate(data.candidate);
    } catch {}
  };

  // Chat
  const sendMessage = useCallback(() => {
    if (newMessage.trim()) {
      sendWebSocketMessage({
        type: 'chat_message',
        room_id: roomId,
        message: newMessage,
        username: clientId,
      });
      setNewMessage('');
    }
  }, [newMessage, roomId, clientId]);

  return {
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
  };
} 