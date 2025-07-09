import './App.css';
import Hero from './components/Hero';
import RoomEntry from './components/RoomEntry';
import Room from './components/Room';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';

function RoomWithParams() {
  const { roomId } = useParams();
  return <Room roomId={roomId || ''} />;
}

function App() {
  return (
    <Router>
      <div className="main-container">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/room" element={<RoomEntry />} />
          <Route path="/room/:roomId" element={<RoomWithParams />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;