import { useState } from 'react';
import './App.css';
import Landing from './Landing';
import Room from './Room';

function App() {
  const [entered, setEntered] = useState(false);

  return (
    <div className="main-container">
      {!entered ? (
        <Landing onEnter={() => setEntered(true)} />
      ) : (
        <Room />
      )}
    </div>
  );
}

export default App;