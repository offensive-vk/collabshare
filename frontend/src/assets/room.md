## 🧩 How Room Creation & Joining Works (Under the Hood)

### 1. Room Creation (Frontend & Backend)
- **Frontend:**  
  - User clicks "Create Room" and enters a username.
  - The frontend sends a `POST` request to `/api/rooms` to create a new room.
  - The backend generates a unique room ID and returns it.
  - The frontend navigates the user to `/room/{room_id}/{username}`.

- **Backend:**  
  - Receives the `POST /api/rooms` request.
  - Creates a new room object in memory with a unique ID and empty participant list.
  - Returns the room ID and details to the frontend.

### 2. Joining a Room (Frontend & Backend)
- **Frontend:**  
  - User enters a username and room ID, or is redirected after creating a room.
  - The frontend establishes a WebSocket connection to `/ws/{client_id}` (where `client_id` is randomly generated).
  - The frontend sends a `join_room` message over the WebSocket with the room ID and username.

- **Backend:**  
  - Receives the `join_room` message.
  - Checks if the room exists and is not full.
  - Adds the client to the room’s participant list.
  - Notifies all participants in the room (including the new one) via WebSocket messages (`participant_joined`, `room_joined`).

### 3. Real-Time Communication
- After joining, all further signaling (WebRTC offers/answers, ICE candidates, chat messages) is relayed via the WebSocket server, which routes messages to the correct participants in the room.

### 4. Leaving a Room
- **Frontend:**  
  - User clicks "Leave Room" or closes the browser.
  - The frontend sends a `leave_room` message over WebSocket.
- **Backend:**  
  - Removes the client from the room.
  - Notifies remaining participants.
  - Cleans up empty rooms automatically.
