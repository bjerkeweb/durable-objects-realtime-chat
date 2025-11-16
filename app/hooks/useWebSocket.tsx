import { useEffect, useRef } from 'react';

const useWebSocket = (handleMessage: (event: any) => void) => {
  const socketRef = useRef<WebSocket>(null);

  useEffect(() => {
    socketRef.current = new WebSocket(`ws://localhost:5173/api/ws`);

    const socket = socketRef.current;

    console.log('useWebSocket effect', socket);

    if (socket) {
      socket.onmessage = (e) => {
        handleMessage(JSON.parse(e.data));
      };

      socket.onopen = () => {
        console.log('websocket opened');
      };
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const sendEvent = (event: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };

  return sendEvent;
};

export default useWebSocket;
