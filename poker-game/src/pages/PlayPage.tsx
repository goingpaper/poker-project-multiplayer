import { Link, Navigate, useParams } from 'react-router-dom';
import Poker from '../poker';

export default function PlayPage() {
  const { roomId } = useParams();

  if (roomId == null || roomId === '') {
    return <Navigate to="/" replace />;
  }

  const id = decodeURIComponent(roomId);

  return (
    <>
      <nav className="play-nav">
        <Link to="/">← Lobby</Link>
      </nav>
      <Poker roomId={id} />
    </>
  );
}
