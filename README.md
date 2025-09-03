# CollabShare - WebRTC Collaboration Platform

A full-stack web application for real-time screen sharing, video/audio communication, and chat using WebRTC.

## 🚀 Overview

CollabShare enables up to 5 participants per room to:

- Share screens in real-time
- Enable video and audio communication
- Chat with disposable messages (messages are not persisted and are deleted when the session ends)
- Create and join rooms with unique codes
- Auto-cleanup empty rooms when all participants leave

## 🏗️ Architecture

- **Frontend**: React 19, Tailwind CSS
- **Backend**: FastAPI, native WebSockets
- **Database**: MongoDB (future use)
- **Real-time**: WebSockets + WebRTC
- **Deployment**: Kubernetes-ready

## 📐 Application Layout

```
+-------------------+         +-------------------+
|    Frontend       | <-----> |     Backend       |
| (React, WebRTC)   |  HTTP   |  (FastAPI, WS)    |
+-------------------+         +-------------------+
         |                              |
         | WebSocket (Signaling, Chat)  |
         +------------------------------+
         |                              |
         v                              v
   [Browser: Video/Audio/Screen]   [In-memory Rooms]
```

- **Frontend**: Handles UI, WebRTC peer connections, and WebSocket signaling.
- **Backend**: Manages rooms, relays signaling and chat, enforces participant limits, and cleans up empty rooms.

## 📁 File Structure (see `treemap` for details)

- `frontend/src/components/Room.tsx` (Updated): Main room UI, video grid, chat, controls
- `frontend/src/utils/useWebRTC.ts` (Updated): WebRTC and WebSocket logic, connection handling
- `frontend/src/utils/types.ts` (Updated): WebSocket message types
- `test_api.py` (Updated): API and WebSocket integration tests, including enter/exit room flows

## ✅ Tests

- **What’s covered**:
  - Room creation via REST
  - WebSocket connect and join (enter room flow)
  - WebSocket leave (exit room flow) with API verification
  - Chat broadcast
  - WebRTC signaling relay (offer/answer/ICE)
  - Participant limit enforcement and room cleanup

- **Run tests**:

```bash
python test_api.py
```

Requires backend running at `http://localhost:8001`.

## 🧭 Frontend Flow Notes

- `RoomEntry` navigates to `\`/room/:roomId` with `state.username`.
- `Room` calls `joinRoom(username, roomId)` and shows the UI once `room_joined` is received.
- Self-target WebRTC signaling is avoided using a stable client ID reference.

## 🔒 Security Policy

See [SECURITY.md](./SECURITY.md) for details on current and recommended security practices.

## 🧩 Key Features & Flows

- **Room Creation/Joining**: POST `/api/rooms` to create, then join via WebSocket with a username and room code
- **Chat**: Disposable, not persisted, broadcast to all in room
- **WebRTC Signaling**: Offers, answers, and ICE candidates relayed via backend
- **Room Cleanup**: Empty rooms are deleted automatically
- **Error Handling**: Room full/not found errors are sent as WebSocket error messages

## 🛡️ Security Considerations

- CORS enabled for all origins (dev)
- No authentication by default
- See [SECURITY.md](./SECURITY.md) for production recommendations

## 📊 Monitoring & Health

- Health endpoints, WebSocket status, and room metrics

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

- Open a [issue](https://github.com/offensive-vk/collabshare/issues) on our github page.
- Check the troubleshooting section
- Review application logs
- Test API endpoints manually
- Verify WebSocket connections

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
