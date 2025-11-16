import { useEffect } from 'react';
import useWebSocket from '~/hooks/useWebSocket';

export default function Chat() {
  const handleMessage = (e) => console.log(e);

  const sendEvent = useWebSocket(handleMessage);

  useEffect(() => {
    window.addEventListener('mousemove', (e) => {
      sendEvent({ x: e.clientX, y: e.clientY });
    });
  }, []);

  return <>Hello</>;
}
