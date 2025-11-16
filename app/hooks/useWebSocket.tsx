import { useEffect, useRef, useState } from 'react';

const useWebSocket = (room: string, handleMessage: (event: any) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket>(null);

  useEffect(() => {
    socketRef.current = new WebSocket(`ws://localhost:5173/api/ws/${room}`);

    const socket = socketRef.current;

    console.log('useWebSocket effect', socket);

    if (socket) {
      socket.onmessage = (e) => {
        handleMessage(JSON.parse(e.data));
      };

      socket.onopen = () => {
        setIsConnected(true);
        console.log('websocket opened');
      };

      socket.onclose = () => {
        setIsConnected(false);
      };
    }

    return () => {
      if (socket) {
        console.log('socket closing');
        socket.close();
      }
    };
  }, []);

  const sendEvent = (event: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };

  return { sendEvent, isConnected };
};

export default useWebSocket;
