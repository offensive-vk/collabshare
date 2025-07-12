import './App.css';
import Hero from './components/Hero';
import RoomEntry from './components/RoomEntry';
import Room from './components/Room';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';

function RoomWithParams() {
  const { roomId, username } = useParams();
  return <Room roomId={roomId || ''} username={username || ''} />;
}

function TestRoom() {
  return <Room roomId="TEST123" username="testuser" testMode={true} />;
}

function App() {
  return (
    <Router>
      <div className="main-container">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/room" element={<RoomEntry />} />
          <Route path="/room/:roomId/:username" element={<RoomWithParams />} />
          <Route path="/test-room" element={<TestRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;