import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import LobbyPage from './pages/LobbyPage';
import PlayPage from './pages/PlayPage';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <header className="App-header">
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/play/:roomId" element={<PlayPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </header>
      </div>
    </BrowserRouter>
  );
}

export default App;
