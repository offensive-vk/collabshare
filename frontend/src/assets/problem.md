### 1. **Username in URL / Room ID not in URL**
- **Current navigation in `RoomEntry.tsx`:**
  ```js
  navigate(`/room/${data.room_id}`, { state: { username: username.trim() } });
  ```
  This is correct and should result in a URL like `/room/46EA20E9`.
- **If you see the username in the URL or no roomId:**  
  - You may have a stale browser tab, or a navigation elsewhere in the app (e.g., from `/room` or `/room/:roomId/:username`).
  - Double-check that you are not navigating to `/room` or `/room/:username` anywhere else (e.g., in the Hero or HomeBtn or other navigation).

---

### 2. **WebSocket Not Ready / joinRoom Called Multiple Times**
- The logs show:
  ```
  joinRoom called with: {username: 'cvvvvvvvv', roomIdInput: '46EA20E9'}
  useWebRTC.ts:209 Joining existing room: 46EA20E9
  useWebRTC.ts:220 WebSocket not ready, retrying in 100ms...
  ```
- **Why?**
  - The `Room` component calls `joinRoom(username, roomId)` in a `useEffect` when it mounts.
  - If the WebSocket is not yet open, it retries every 100ms.
  - If you navigate to `/room/:roomId` before the WebSocket is ready, this retry loop is expected.
  - However, if you see `joinRoom` called twice, it may be because the `Room` component is mounting twice, or the effect dependencies are causing a re-run.

---

### 3. **No Room UI Loads / Room Not Created**
- Your logs show the backend returns a room ID, but the UI does not load.
- The logs also show `joinRoom` is called with the correct roomId and username, and the WebSocket eventually sends the join message.
- However, if the UI does not load, it may be because:
  - The `isInRoom` state is not being set to `true` (i.e., the `room_joined` message is not received or handled).
  - The `Room` component is unmounting/remounting, resetting state.
  - The `roomId` in the state is not being set correctly, or is empty when used for signaling.

---

## **Action Plan**

1. **Check for duplicate or incorrect navigation to `/room` or `/room/:username` elsewhere in the app.**
2. **Ensure the `Room` component is not mounting twice.**
   - Add a `console.log('Room mounted')` at the top of the `Room` component to check.
3. **Check the `useEffect` dependencies in `Room.tsx`:**
   - The effect that calls `joinRoom` should only run once per roomId/username, and not re-run unnecessarily.
   - Consider using only `[roomId, username]` as dependencies, and ensure `hasAttemptedJoin` is set correctly.
4. **Check if the `roomId` is being set in the state in `useWebRTC` before signaling.**
   - If `roomId` is empty when sending offers/answers, ensure `setRoomId` is called before any signaling.
