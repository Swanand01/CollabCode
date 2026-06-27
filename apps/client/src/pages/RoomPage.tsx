import { Navigate, useParams } from 'react-router-dom';
import AdmittedRoom from '../components/room/AdmittedRoom';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const displayName = sessionStorage.getItem('displayName') ?? '';
  const userId = sessionStorage.getItem(`participant:${roomId}`) ?? '';

  if (!roomId) return <Navigate to="/" replace />;
  if (!displayName || !userId) return <Navigate to={`/?join=${roomId}`} replace />;

  return <AdmittedRoom roomId={roomId} userId={userId} displayName={displayName} />;
}
