from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid
import asyncio
from datetime import datetime
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create FastAPI app
app = FastAPI()

# Create API router
api_router = APIRouter(prefix="/api")

# In-memory storage for rooms (no database persistence needed)
rooms: Dict[str, Dict] = {}

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.room_connections: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        client_ip = websocket.client.host if hasattr(websocket, 'client') else 'unknown'
        logger.info(f"Client connected: {client_id} from IP {client_ip}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            logger.info(f"Client disconnected: {client_id}")
            del self.active_connections[client_id]
        
        # Remove from rooms
        for room_id, participants in self.room_connections.items():
            if client_id in participants:
                logger.info(f"Client {client_id} left room {room_id}")
                participants.remove(client_id)
                
        # Clean up empty rooms
        self.room_connections = {k: v for k, v in self.room_connections.items() if v}

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

    async def broadcast_to_room(self, message: str, room_id: str):
        if room_id in self.room_connections:
            for client_id in self.room_connections[room_id]:
                if client_id in self.active_connections:
                    await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

# Models
class Room(BaseModel):
    id: str
    participants: List[str]
    created_at: datetime
    max_participants: int = 5

class RoomCreate(BaseModel):
    max_participants: int = 5

# Utility functions
def generate_room_code() -> str:
    """Generate a 6-character room code"""
    return str(uuid.uuid4())[:8].upper()

def cleanup_empty_rooms():
    """Remove rooms with no participants"""
    empty_rooms = [room_id for room_id, room_data in rooms.items() if len(room_data["participants"]) == 0]
    for room_id in empty_rooms:
        del rooms[room_id]

# API Routes
@api_router.get("/")
async def root():
    return {"message": "WebRTC Collaboration Server"}

@api_router.post("/rooms")
async def create_room(room_data: RoomCreate):
    room_id = generate_room_code()
    room = {
        "id": room_id,
        "participants": [],
        "created_at": datetime.utcnow(),
        "max_participants": room_data.max_participants
    }
    rooms[room_id] = room
    return {"room_id": room_id, "room": room}

@api_router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    if room_id not in rooms:
        return {"error": "Room not found"}
    return {"room": rooms[room_id]}

@api_router.get("/rooms")
async def list_rooms():
    return {"rooms": list(rooms.keys())}

# WebSocket endpoint
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    client_ip = websocket.client.host if hasattr(websocket, 'client') else 'unknown'
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            logger.debug(f"Received message from {client_id} ({client_ip}): {message}")
            
            if message["type"] == "join_room":
                room_id = message["room_id"]
                username = message.get("username", f"User_{client_id[:8]}")
                logger.info(f"{username} ({client_id}) attempting to join room {room_id} from IP {client_ip}")
                
                if room_id not in rooms:
                    await manager.send_personal_message(json.dumps({
                        "type": "error",
                        "message": "Room not found"
                    }), client_id)
                    continue
                
                room = rooms[room_id]
                
                if len(room["participants"]) >= room["max_participants"]:
                    await manager.send_personal_message(json.dumps({
                        "type": "error",
                        "message": "Room is full"
                    }), client_id)
                    continue
                
                if client_id not in room["participants"]:
                    room["participants"].append(client_id)
                    
                    if room_id not in manager.room_connections:
                        manager.room_connections[room_id] = []
                    manager.room_connections[room_id].append(client_id)
                    
                    logger.info(f"{username} ({client_id}) joined room {room_id} from IP {client_ip}")
                    
                    # Notify all participants
                    await manager.broadcast_to_room(json.dumps({
                        "type": "participant_joined",
                        "client_id": client_id,
                        "username": username,
                        "participants": room["participants"]
                    }), room_id)
                    
                    # Send current participants to new user
                    await manager.send_personal_message(json.dumps({
                        "type": "room_joined",
                        "room_id": room_id,
                        "participants": room["participants"],
                        "username": username
                    }), client_id)

                    if len(room["participants"]) == 1:
                        await manager.send_personal_message(json.dumps({
                            "type": "room_ready",
                            "room_id": room_id,
                            "you_are_sender": True
                        }), client_id)
            
            elif message["type"] == "leave_room":
                room_id = message["room_id"]
                logger.info(f"Client {client_id} leaving room {room_id}")
                
                if room_id in rooms and client_id in rooms[room_id]["participants"]:
                    rooms[room_id]["participants"].remove(client_id)
                    
                    if room_id in manager.room_connections:
                        manager.room_connections[room_id].remove(client_id)
                    
                    await manager.broadcast_to_room(json.dumps({
                        "type": "participant_left",
                        "client_id": client_id
                    }), room_id)
                    
                    cleanup_empty_rooms()
            
            elif message["type"] == "chat_message":
                room_id = message["room_id"]
                chat_message = message["message"]
                username = message.get("username", f"User_{client_id[:8]}")
                logger.info(f"Chat in room {room_id} from {username} ({client_id}): {chat_message}")
                
                if room_id in rooms and client_id in rooms[room_id]["participants"]:
                    await manager.broadcast_to_room(json.dumps({
                        "type": "chat_message",
                        "message": chat_message,
                        "username": username,
                        "timestamp": datetime.utcnow().isoformat(),
                        "from": client_id
                    }), room_id)
            
            elif message["type"] == "webrtc_offer":
                target_id = message["target"]
                offer = message["offer"]
                room_id = message["room_id"]
                logger.info(f"WebRTC offer from {client_id} to {target_id} in room {room_id}")
                
                await manager.send_personal_message(json.dumps({
                    "type": "webrtc_offer",
                    "offer": offer,
                    "from": client_id,
                    "room_id": room_id
                }), target_id)
            
            elif message["type"] == "webrtc_answer":
                target_id = message["target"]
                answer = message["answer"]
                room_id = message["room_id"]
                logger.info(f"WebRTC answer from {client_id} to {target_id} in room {room_id}")
                
                await manager.send_personal_message(json.dumps({
                    "type": "webrtc_answer",
                    "answer": answer,
                    "from": client_id,
                    "room_id": room_id
                }), target_id)
            
            elif message["type"] == "webrtc_ice_candidate":
                target_id = message["target"]
                candidate = message["candidate"]
                room_id = message["room_id"]
                logger.info(f"ICE candidate from {client_id} to {target_id} in room {room_id}")
                
                await manager.send_personal_message(json.dumps({
                    "type": "webrtc_ice_candidate",
                    "candidate": candidate,
                    "from": client_id,
                    "room_id": room_id
                }), target_id)
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"WebSocketDisconnect: {client_id} from IP {client_ip}")
        cleanup_empty_rooms()

# Include API router
app.include_router(api_router)

# Add CORS middleware for deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)