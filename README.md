# CollabShare - WebRTC Collaboration Platform

A full-stack web application that enables real-time screen sharing, video/audio communication, and chat between multiple participants using WebRTC technology.

## 🚀 Overview

CollabShare is a minimal, black-and-white themed collaboration platform that allows up to 5 participants per room to:

- Share screens in real-time
- Enable video and audio communication
- Chat with disposable messages
- Create and join rooms with unique codes
- Auto-cleanup empty rooms

## 🏗️ Architecture

- **Frontend**: React 19 with Tailwind CSS
- **Backend**: FastAPI with native WebSockets
- **Database**: MongoDB (for future extensions)
- **Real-time Communication**: Native WebSockets + WebRTC
- **Deployment**: Kubernetes container environment

## 📁 File Structure

Coming soon!

## 🔧 Environment Setup

### Prerequisites

- **Python 3.12+**: Backend server
- **Node.js 18+**: Frontend application
- **Yarn**: Package manager for frontend
- **MongoDB**: Database (configured via environment variables)

### Environment Variables

#### Backend (.env)

```bash
# Database Configuration
MONGO_URL=mongodb://localhost:27017/collabshare

# Server Configuration
PORT=8001
HOST=0.0.0.0
```

#### Frontend (.env)

```bash
# Backend API URL (configured for production)
REACT_APP_BACKEND_URL=https://your-domain.com
```

## 🛠️ Development Commands

#### Install Dependencies

```bash
cd backend/
pip install -r requirements.txt
```

#### Run Development Server

```bash
cd backend/
python server.py
```

#### Run Backend Tests

```bash
cd backend/
python -m pytest tests/ -v
```

#### Manual API Testing

```bash
# Health check
curl https://your-domain.com/api/

# Create room
curl -X POST https://your-domain.com/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"max_participants": 5}'

# Get room details
curl https://your-domain.com/api/rooms/{room_id}
```

### Frontend Development

#### Install Dependencies

```bash
cd frontend/
yarn install
```

#### Run Development Server

```bash
cd frontend/
yarn start
```

#### Build for Production

```bash
cd frontend/
yarn build
```

#### Run Frontend Tests

```bash
cd frontend/
yarn test
```

#### Linting and Formatting

```bash
cd frontend/
yarn lint
yarn format
```

<!-- ## 🚀 Production Deployment

### Using Supervisor (Current Setup)

#### Start All Services
```bash
sudo supervisorctl start all
```

#### Restart Services
```bash
sudo supervisorctl restart frontend
sudo supervisorctl restart backend
sudo supervisorctl restart all
```

#### Check Service Status
```bash
sudo supervisorctl status
```

#### View Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.*.log

# Frontend logs
tail -f /var/log/supervisor/frontend.*.log
```

### Manual Deployment

#### Backend
```bash
cd backend/
uvicorn server:app --host 0.0.0.0 --port 8001
```

#### Frontend
```bash
cd frontend/
yarn build
serve -s build -l 3000
```

## 🧪 Testing

### Backend Testing
```bash
cd backend/
python backend_test.py
``` -->

**Test Coverage:**

- ✅ API endpoints (health, room management)
- ✅ WebSocket connections
- ✅ Room joining/leaving
- ✅ WebRTC signaling
- ✅ Chat message broadcasting
- ✅ Participant limits
- ✅ Auto-cleanup functionality

**Manual Testing Checklist:**

- [ ] Room creation and unique code generation
- [ ] Room joining with valid/invalid codes
- [ ] WebSocket connection status
- [ ] Screen sharing functionality
- [ ] Video/audio streaming
- [ ] Chat messaging
- [ ] Participant management
- [ ] Room cleanup on exit

## 🔌 API Documentation

### REST API Endpoints

#### Health Check

```
GET /api/
Response: {"message": "WebRTC Collaboration Server"}
```

#### Create Room

```text
POST /api/rooms
Body: {"max_participants": 5}
Response: {"room_id": "ABC123", "room": {...}}
```

#### Get Room Details

```
GET /api/rooms/{room_id}
Response: {"room": {"id": "ABC123", "participants": [...], ...}}
```

#### List All Rooms

```
GET /api/rooms
Response: {"rooms": ["ABC123", "DEF456", ...]}
```

### WebSocket API

```text
WebSocket: /ws/{client_id}
```

#### Message Types

**Join Room**
```json
{
  "type": "join_room",
  "room_id": "ABC123",
  "username": "User123"
}
```

**Leave Room**
```json
{
  "type": "leave_room",
  "room_id": "ABC123"
}
```

**Chat Message**
```json
{
  "type": "chat_message",
  "room_id": "ABC123",
  "message": "Hello everyone!",
  "username": "User123"
}
```

**WebRTC Signaling**
```json
{
  "type": "webrtc_offer",
  "target": "target_client_id",
  "room_id": "ABC123",
  "offer": {"type": "offer", "sdp": "..."}
}
```

## ⚙️ Configuration

### WebRTC Configuration

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};
```

### Room Settings

- **Max Participants**: 5 (configurable)
- **Preferred Participants**: 2 (optimal performance)
- **Auto-cleanup**: Enabled for empty rooms
- **Chat**: Disposable (messages deleted on session end)

### Performance Optimization

#### Backend

- Use connection pooling for database
- Implement Redis for session management
- Add rate limiting for WebSocket connections

#### Frontend

- Implement lazy loading for components
- Optimize video rendering
- Add connection quality monitoring

## 📊 Monitoring

### Health Checks

```bash
# Backend health
curl https://your-domain.com/api/

# Frontend health
curl https://your-domain.com/

# WebSocket health
wscat -c wss://your-domain.com/ws/health_check
```

### Metrics to Monitor

- WebSocket connection count
- Active rooms count
- Message throughput
- Error rates
- Response times

## 🛡️ Security Considerations

### Current Implementation

- CORS enabled for all origins (development)
- No authentication required
- WebSocket connections are open

### Production Recommendations

- Implement user authentication
- Add rate limiting
- Use secure WebSocket (WSS)
- Implement room access controls
- Add input validation and sanitization

## 📝 Contributing

### Code Style

- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ESLint configuration
- **CSS**: Use Tailwind CSS classes

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push and create pull request
git push origin feature/new-feature
```

## 📞 Support

For technical support or questions:

- Open a [issue](https://github.com/offensive-vk/my-web-rtc/issue/new) on our github page.
- Check the troubleshooting section
- Review application logs
- Test API endpoints manually
- Verify WebSocket connections

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
