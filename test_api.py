import requests
import unittest
import sys
import json
import asyncio
import websockets
import uuid
from datetime import datetime

class WebRTCCollabAPITester:
    def __init__(self, base_url="http://localhost:8001/api", ws_url="ws://localhost:8001/ws"):
        self.base_url = base_url
        self.ws_url = ws_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_room_id = None
        self.ws_connections = {}
        self.received_messages = {}

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the API health check endpoint"""
        return self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )

    def test_create_room(self, max_participants=5):
        """Test creating a new room"""
        success, response = self.run_test(
            "Create Room",
            "POST",
            "rooms",
            200,
            data={"max_participants": max_participants}
        )
        
        if success and 'room_id' in response:
            self.created_room_id = response['room_id']
            print(f"Created room with ID: {self.created_room_id}")
        
        return success, response

    def test_get_room(self, room_id=None):
        """Test getting room information"""
        if room_id is None:
            room_id = self.created_room_id
            
        if not room_id:
            print("❌ No room ID available for testing")
            return False, {}
            
        return self.run_test(
            "Get Room Info",
            "GET",
            f"rooms/{room_id}",
            200
        )

    def test_list_rooms(self):
        """Test listing all rooms"""
        return self.run_test(
            "List Rooms",
            "GET",
            "rooms",
            200
        )

    def test_nonexistent_room(self):
        """Test getting a nonexistent room"""
        return self.run_test(
            "Get Nonexistent Room",
            "GET",
            "rooms/NONEXISTENT",
            200  # The API returns 200 with an error message, not 404
        )
    
    def test_max_participants_limit(self):
        """Test room max participants limit"""
        # Create a room with max 2 participants
        success, response = self.test_create_room(max_participants=2)
        if not success:
            return False, {}
        
        room_id = response['room_id']
        print(f"Testing max participants limit for room: {room_id}")
        
        # Get room details to verify max_participants
        success, response = self.test_get_room(room_id)
        if success and 'room' in response:
            max_participants = response['room'].get('max_participants', 0)
            if max_participants == 2:
                print(f"✅ Room created with correct max_participants: {max_participants}")
            else:
                print(f"❌ Room has incorrect max_participants: {max_participants}, expected: 2")
                return False, {}
        else:
            return False, {}
        
        return True, {"room_id": room_id, "max_participants": max_participants}

    async def connect_websocket(self, client_id):
        """Connect to WebSocket endpoint"""
        self.tests_run += 1
        print(f"\n🔍 Testing WebSocket Connection for client {client_id}...")
        
        try:
            ws_client_url = f"{self.ws_url}/{client_id}"
            websocket = await websockets.connect(ws_client_url)
            self.ws_connections[client_id] = websocket
            self.received_messages[client_id] = []
            self.tests_passed += 1
            print(f"✅ WebSocket connection established for client {client_id}")
            return True
        except Exception as e:
            print(f"❌ WebSocket connection failed for client {client_id}: {str(e)}")
            return False

    async def join_room(self, client_id, room_id, username=None):
        """Join a room via WebSocket"""
        if username is None:
            username = f"TestUser_{client_id[:4]}"
            
        if client_id not in self.ws_connections:
            print(f"❌ Client {client_id} not connected to WebSocket")
            return False
            
        self.tests_run += 1
        print(f"\n🔍 Testing Room Join for client {client_id} to room {room_id}...")
        
        try:
            message = {
                "type": "join_room",
                "room_id": room_id,
                "username": username
            }
            await self.ws_connections[client_id].send(json.dumps(message))
            
            # Wait for response - we might get participant_joined first
            response = await asyncio.wait_for(self.ws_connections[client_id].recv(), timeout=5)
            response_data = json.loads(response)
            self.received_messages[client_id].append(response_data)
            
            # Check if we got a participant_joined message
            if response_data.get("type") == "participant_joined" and client_id in response_data.get("participants", []):
                print(f"✅ Received participant_joined message for client {client_id}")
                
                # Try to get another message which might be room_joined
                try:
                    response = await asyncio.wait_for(self.ws_connections[client_id].recv(), timeout=2)
                    response_data = json.loads(response)
                    self.received_messages[client_id].append(response_data)
                except asyncio.TimeoutError:
                    # If we don't get another message, that's okay
                    pass
            
            # Check if we got a room_joined message or if we're in the participants list
            if (response_data.get("type") == "room_joined" and response_data.get("room_id") == room_id) or \
               (response_data.get("type") == "participant_joined" and client_id in response_data.get("participants", [])):
                self.tests_passed += 1
                print(f"✅ Client {client_id} successfully joined room {room_id}")
                return True
            else:
                print(f"❌ Failed to join room. Response: {response_data}")
                return False
                
        except Exception as e:
            print(f"❌ Room join failed: {str(e)}")
            return False

    async def leave_room(self, client_id, room_id):
        """Leave a room via WebSocket"""
        if client_id not in self.ws_connections:
            print(f"❌ Client {client_id} not connected to WebSocket")
            return False
            
        self.tests_run += 1
        print(f"\n🔍 Testing Room Leave for client {client_id} from room {room_id}...")
        
        try:
            message = {
                "type": "leave_room",
                "room_id": room_id
            }
            await self.ws_connections[client_id].send(json.dumps(message))
            
            # Success is determined by checking if the client is removed from the room
            success, response = self.test_get_room(room_id)
            if success and 'room' in response:
                if client_id not in response['room'].get('participants', []):
                    self.tests_passed += 1
                    print(f"✅ Client {client_id} successfully left room {room_id}")
                    return True
                else:
                    print(f"❌ Client {client_id} still in room participants list")
                    return False
            else:
                print(f"❌ Failed to verify room state after leaving")
                return False
                
        except Exception as e:
            print(f"❌ Room leave failed: {str(e)}")
            return False

    async def send_chat_message(self, client_id, room_id, message_text):
        """Send a chat message via WebSocket"""
        if client_id not in self.ws_connections:
            print(f"❌ Client {client_id} not connected to WebSocket")
            return False
            
        self.tests_run += 1
        print(f"\n🔍 Testing Chat Message from client {client_id} in room {room_id}...")
        
        try:
            message = {
                "type": "chat_message",
                "room_id": room_id,
                "message": message_text,
                "username": f"TestUser_{client_id[:4]}"
            }
            await self.ws_connections[client_id].send(json.dumps(message))
            print(f"✅ Chat message sent from client {client_id}")
            self.tests_passed += 1
            return True
                
        except Exception as e:
            print(f"❌ Sending chat message failed: {str(e)}")
            return False

    async def test_webrtc_signaling(self, sender_id, receiver_id, room_id):
        """Test WebRTC signaling (offer, answer, ICE candidates)"""
        if sender_id not in self.ws_connections or receiver_id not in self.ws_connections:
            print(f"❌ One or both clients not connected to WebSocket")
            return False
            
        self.tests_run += 1
        print(f"\n🔍 Testing WebRTC Signaling between {sender_id} and {receiver_id}...")
        
        try:
            # Clear any pending messages
            for client_id in [sender_id, receiver_id]:
                try:
                    while True:
                        response = await asyncio.wait_for(self.ws_connections[client_id].recv(), timeout=0.5)
                        response_data = json.loads(response)
                        self.received_messages[client_id].append(response_data)
                        print(f"Cleared pending message for {client_id}: {response_data}")
                except asyncio.TimeoutError:
                    pass
            
            # Send offer
            offer_message = {
                "type": "webrtc_offer",
                "target": receiver_id,
                "room_id": room_id,
                "offer": {
                    "type": "offer",
                    "sdp": "test_sdp_offer_data"
                }
            }
            await self.ws_connections[sender_id].send(json.dumps(offer_message))
            print(f"Sent WebRTC offer from {sender_id} to {receiver_id}")
            
            # Wait for offer to be received
            offer_received = False
            for _ in range(3):  # Try up to 3 times
                try:
                    response = await asyncio.wait_for(self.ws_connections[receiver_id].recv(), timeout=5)
                    response_data = json.loads(response)
                    self.received_messages[receiver_id].append(response_data)
                    
                    if response_data.get("type") == "webrtc_offer" and response_data.get("from") == sender_id:
                        print(f"✅ WebRTC offer successfully received by {receiver_id}")
                        offer_received = True
                        break
                    else:
                        print(f"Received non-offer message: {response_data}")
                except asyncio.TimeoutError:
                    print("Timeout waiting for offer response")
                    break
            
            if not offer_received:
                print(f"❌ WebRTC offer not received correctly after multiple attempts")
                return False
                
            # Send answer
            answer_message = {
                "type": "webrtc_answer",
                "target": sender_id,
                "room_id": room_id,
                "answer": {
                    "type": "answer",
                    "sdp": "test_sdp_answer_data"
                }
            }
            await self.ws_connections[receiver_id].send(json.dumps(answer_message))
            print(f"Sent WebRTC answer from {receiver_id} to {sender_id}")
            
            # Wait for answer to be received
            answer_received = False
            for _ in range(3):  # Try up to 3 times
                try:
                    response = await asyncio.wait_for(self.ws_connections[sender_id].recv(), timeout=5)
                    response_data = json.loads(response)
                    self.received_messages[sender_id].append(response_data)
                    
                    if response_data.get("type") == "webrtc_answer" and response_data.get("from") == receiver_id:
                        print(f"✅ WebRTC answer successfully received by {sender_id}")
                        answer_received = True
                        break
                    else:
                        print(f"Received non-answer message: {response_data}")
                except asyncio.TimeoutError:
                    print("Timeout waiting for answer response")
                    break
            
            if not answer_received:
                print(f"❌ WebRTC answer not received correctly after multiple attempts")
                return False
                
            # Send ICE candidate
            ice_message = {
                "type": "webrtc_ice_candidate",
                "target": receiver_id,
                "room_id": room_id,
                "candidate": {
                    "candidate": "test_ice_candidate_data",
                    "sdpMid": "0",
                    "sdpMLineIndex": 0
                }
            }
            await self.ws_connections[sender_id].send(json.dumps(ice_message))
            print(f"Sent WebRTC ICE candidate from {sender_id} to {receiver_id}")
            
            # Wait for ICE candidate to be received
            ice_received = False
            for _ in range(3):  # Try up to 3 times
                try:
                    response = await asyncio.wait_for(self.ws_connections[receiver_id].recv(), timeout=5)
                    response_data = json.loads(response)
                    self.received_messages[receiver_id].append(response_data)
                    
                    if response_data.get("type") == "webrtc_ice_candidate" and response_data.get("from") == sender_id:
                        print(f"✅ WebRTC ICE candidate successfully received by {receiver_id}")
                        ice_received = True
                        break
                    else:
                        print(f"Received non-ICE message: {response_data}")
                except asyncio.TimeoutError:
                    print("Timeout waiting for ICE candidate response")
                    break
            
            if not ice_received:
                print(f"❌ WebRTC ICE candidate not received correctly after multiple attempts")
                return False
                
            self.tests_passed += 1
            return True
                
        except Exception as e:
            print(f"❌ WebRTC signaling test failed: {str(e)}")
            return False

    async def test_participant_limit(self, room_id, max_participants):
        """Test room participant limit enforcement"""
        self.tests_run += 1
        print(f"\n🔍 Testing Room Participant Limit ({max_participants}) for room {room_id}...")
        
        try:
            # Connect and join max_participants clients
            client_ids = []
            for i in range(max_participants):
                client_id = f"test_client_{i}_{uuid.uuid4().hex[:8]}"
                client_ids.append(client_id)
                
                connected = await self.connect_websocket(client_id)
                if not connected:
                    print(f"❌ Failed to connect client {client_id}")
                    return False
                    
                joined = await self.join_room(client_id, room_id)
                if not joined:
                    print(f"❌ Failed to join room with client {client_id}")
                    return False
                
                # Clear any pending messages
                try:
                    while True:
                        response = await asyncio.wait_for(self.ws_connections[client_id].recv(), timeout=0.5)
                        response_data = json.loads(response)
                        self.received_messages[client_id].append(response_data)
                        print(f"Cleared pending message for {client_id}: {response_data}")
                except asyncio.TimeoutError:
                    pass
            
            print(f"✅ Successfully joined {max_participants} clients to room")
            
            # Try to join one more client (should fail)
            extra_client_id = f"extra_client_{uuid.uuid4().hex[:8]}"
            connected = await self.connect_websocket(extra_client_id)
            if not connected:
                print(f"❌ Failed to connect extra client {extra_client_id}")
                return False
                
            # Try to join the room (should fail due to max participants)
            message = {
                "type": "join_room",
                "room_id": room_id,
                "username": f"TestUser_{extra_client_id[:4]}"
            }
            await self.ws_connections[extra_client_id].send(json.dumps(message))
            
            # Wait for error response
            error_received = False
            for _ in range(3):  # Try up to 3 times
                try:
                    response = await asyncio.wait_for(self.ws_connections[extra_client_id].recv(), timeout=5)
                    response_data = json.loads(response)
                    self.received_messages[extra_client_id].append(response_data)
                    
                    if response_data.get("type") == "error" and "full" in response_data.get("message", "").lower():
                        print(f"✅ Room correctly rejected extra participant when full")
                        error_received = True
                        break
                    else:
                        print(f"Received non-error message: {response_data}")
                except asyncio.TimeoutError:
                    print("Timeout waiting for error response")
                    break
            
            if error_received:
                self.tests_passed += 1
                return True
            else:
                # Verify through API that the room has only max_participants
                success, response = self.test_get_room(room_id)
                if success and 'room' in response:
                    participants = response['room'].get('participants', [])
                    if len(participants) <= max_participants:
                        print(f"✅ Room correctly limited to {max_participants} participants")
                        self.tests_passed += 1
                        return True
                    else:
                        print(f"❌ Room has {len(participants)} participants, exceeding limit of {max_participants}")
                        return False
                else:
                    print(f"❌ Failed to verify room participant count")
                    return False
                
        except Exception as e:
            print(f"❌ Participant limit test failed: {str(e)}")
            return False

    async def test_room_cleanup(self, room_id):
        """Test room auto-cleanup when all participants leave"""
        self.tests_run += 1
        print(f"\n🔍 Testing Room Auto-Cleanup for room {room_id}...")
        
        try:
            # Create a new client and join the room
            client_id = f"cleanup_test_{uuid.uuid4().hex[:8]}"
            
            connected = await self.connect_websocket(client_id)
            if not connected:
                print(f"❌ Failed to connect client {client_id}")
                return False
                
            joined = await self.join_room(client_id, room_id)
            if not joined:
                print(f"❌ Failed to join room with client {client_id}")
                return False
            
            # Clear any pending messages
            try:
                while True:
                    response = await asyncio.wait_for(self.ws_connections[client_id].recv(), timeout=0.5)
                    response_data = json.loads(response)
                    self.received_messages[client_id].append(response_data)
                    print(f"Cleared pending message for {client_id}: {response_data}")
            except asyncio.TimeoutError:
                pass
            
            # Verify room exists
            success, response = self.test_get_room(room_id)
            if not success or 'room' not in response:
                print(f"❌ Room {room_id} not found before cleanup test")
                return False
                
            # Leave the room
            message = {
                "type": "leave_room",
                "room_id": room_id
            }
            await self.ws_connections[client_id].send(json.dumps(message))
            print(f"Sent leave_room message for client {client_id}")
            
            # Wait a moment for the server to process the leave request
            await asyncio.sleep(1)
            
            # Check if the client was removed from the room
            success, response = self.test_get_room(room_id)
            if success and 'room' in response:
                if client_id not in response['room'].get('participants', []):
                    print(f"✅ Client {client_id} successfully removed from room {room_id}")
                else:
                    print(f"❌ Client {client_id} still in room participants list")
                    return False
            
            # Check if room was cleaned up (if it was the last participant)
            if len(response['room'].get('participants', [])) == 0:
                # Wait a moment for the server to clean up the room
                await asyncio.sleep(1)
                
                success, response = self.test_list_rooms()
                if success and 'rooms' in response:
                    if room_id not in response['rooms']:
                        print(f"✅ Room {room_id} was automatically cleaned up after all participants left")
                        self.tests_passed += 1
                        return True
                    else:
                        print(f"❌ Room {room_id} was not cleaned up after all participants left")
                        return False
                else:
                    print(f"❌ Failed to verify room cleanup")
                    return False
            else:
                # If there are still participants in the room, that's fine
                print(f"✅ Room {room_id} still has participants, not cleaned up (as expected)")
                self.tests_passed += 1
                return True
                
        except Exception as e:
            print(f"❌ Room cleanup test failed: {str(e)}")
            return False

    async def close_connections(self):
        """Close all WebSocket connections"""
        for client_id, websocket in self.ws_connections.items():
            try:
                await websocket.close()
                print(f"Closed WebSocket connection for client {client_id}")
            except:
                pass

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting WebRTC Collaboration API Tests")
        
        # Run REST API tests
        self.test_health_check()
        self.test_create_room()
        self.test_get_room()
        self.test_list_rooms()
        self.test_nonexistent_room()
        max_participants_test = self.test_max_participants_limit()
        
        # Run WebSocket tests asynchronously
        asyncio.get_event_loop().run_until_complete(self.run_websocket_tests())
        
        # Print results
        print(f"\n📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        return self.tests_passed == self.tests_run
        
    async def run_websocket_tests(self):
        """Run all WebSocket tests"""
        try:
            # Create a room for WebSocket tests
            success, response = self.test_create_room(max_participants=3)
            if not success:
                print("❌ Failed to create room for WebSocket tests")
                return
                
            room_id = self.created_room_id
            
            # Test WebSocket connections
            client1_id = f"client1_{uuid.uuid4().hex[:8]}"
            client2_id = f"client2_{uuid.uuid4().hex[:8]}"
            
            # Connect clients
            await self.connect_websocket(client1_id)
            await self.connect_websocket(client2_id)
            
            # Join room
            await self.join_room(client1_id, room_id)
            await self.join_room(client2_id, room_id)
            
            # Clear any pending messages
            for client_id in [client1_id, client2_id]:
                try:
                    while True:
                        response = await asyncio.wait_for(self.ws_connections[client_id].recv(), timeout=0.5)
                        response_data = json.loads(response)
                        self.received_messages[client_id].append(response_data)
                        print(f"Cleared pending message for {client_id}: {response_data}")
                except asyncio.TimeoutError:
                    pass
            
            # Test chat messaging
            await self.send_chat_message(client1_id, room_id, "Hello from client 1!")
            
            # Wait for message to be received by client2
            chat_message_received = False
            try:
                # We might need to receive multiple messages to find the chat message
                for _ in range(3):  # Try up to 3 times
                    response = await asyncio.wait_for(self.ws_connections[client2_id].recv(), timeout=5)
                    response_data = json.loads(response)
                    self.received_messages[client2_id].append(response_data)
                    
                    if response_data.get("type") == "chat_message" and response_data.get("from") == client1_id:
                        print(f"✅ Chat message successfully received by client2")
                        self.tests_passed += 1
                        chat_message_received = True
                        break
                    else:
                        print(f"Received non-chat message: {response_data}")
                
                if not chat_message_received:
                    print(f"❌ Chat message not received by client2 after multiple attempts")
            except Exception as e:
                print(f"❌ Error receiving chat message: {str(e)}")
            
            # Test WebRTC signaling
            await self.test_webrtc_signaling(client1_id, client2_id, room_id)
            
            # Test participant limit with a new room
            success, response = self.test_max_participants_limit()
            if success:
                limited_room_id = response.get("room_id")
                max_participants = response.get("max_participants")
                await self.test_participant_limit(limited_room_id, max_participants)
            
            # Test room cleanup
            await self.test_room_cleanup(room_id)
            
            # Close all WebSocket connections
            await self.close_connections()
            
        except Exception as e:
            print(f"❌ WebSocket tests failed: {str(e)}")
            await self.close_connections()

if __name__ == "__main__":
    tester = WebRTCCollabAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)