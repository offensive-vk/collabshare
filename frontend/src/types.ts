// WebSocket message types
export type WebSocketMessage =
  | RoomJoinedMessage
  | ParticipantJoinedMessage
  | ParticipantLeftMessage
  | WebRTCOfferMessage
  | WebRTCAnswerMessage
  | WebRTCIceCandidateMessage
  | ChatMessage
  | ErrorMessage;

export interface RoomJoinedMessage {
  type: 'room_joined';
  participants: string[];
}
export interface ParticipantJoinedMessage {
  type: 'participant_joined';
  participants: string[];
  client_id: string;
}
export interface ParticipantLeftMessage {
  type: 'participant_left';
  client_id: string;
}
export interface WebRTCOfferMessage {
  type: 'webrtc_offer';
  from: string;
  offer: RTCSessionDescriptionInit;
  room_id: string;
}
export interface WebRTCAnswerMessage {
  type: 'webrtc_answer';
  from: string;
  answer: RTCSessionDescriptionInit;
  room_id: string;
}
export interface WebRTCIceCandidateMessage {
  type: 'webrtc_ice_candidate';
  from: string;
  candidate: RTCIceCandidateInit;
  room_id: string;
}
export interface ChatMessage {
  type: 'chat_message';
  room_id: string;
  message: string;
  username: string;
  from?: string;
}
export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface JoinRoomMessage {
  type: 'join_room';
  room_id: string;
  username: string;
}
export interface LeaveRoomMessage {
  type: 'leave_room';
  room_id: string;
}

export interface SendWebRTCOfferMessage {
  type: 'webrtc_offer';
  target: string;
  offer: RTCSessionDescriptionInit;
  room_id: string;
}
export interface SendWebRTCAnswerMessage {
  type: 'webrtc_answer';
  target: string;
  answer: RTCSessionDescriptionInit;
  room_id: string;
}
export interface SendWebRTCIceCandidateMessage {
  type: 'webrtc_ice_candidate';
  target: string;
  candidate: RTCIceCandidateInit;
  room_id: string;
}

export interface AppState {
  clientId: string;
  roomId: string;
  username: string;
  isInRoom: boolean;
  participants: string[];
  messages: ChatMessage[];
  isScreenSharing: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  error: string;
  connectionStatus: string;
} 