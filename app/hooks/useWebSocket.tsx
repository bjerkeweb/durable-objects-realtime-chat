import { useEffect, useRef, useState } from 'react';
import type { ClientMessage } from 'types/types';

interface Opts {
  room: string;
  handleMessage: (event: any) => void;
  onConnect?: () => void;
  onClose?: () => void;
}

const useWebSocket = ({ room, handleMessage, onClose, onConnect }: Opts) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socketRef.current = new WebSocket(
      `${protocol}//${window.location.host}/api/ws/${room}`,
    );

    const socket = socketRef.current;

    console.log('useWebSocket effect', socket);

    if (socket) {
      socket.onmessage = (e) => {
        handleMessage(JSON.parse(e.data));
      };

      socket.onopen = () => {
        setIsConnected(true);
        onConnect?.();
        console.log('websocket opened');
      };

      socket.onclose = () => {
        onClose?.();
        setIsConnected(false);
      };
    }

    return () => {
      if (socket) {
        onClose?.();
        console.log('socket closing');
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      onClose?.();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const sendEvent = (event: ClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };

  return { sendEvent, isConnected };
};

export default useWebSocket;
