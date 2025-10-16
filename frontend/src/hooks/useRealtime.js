import { useEffect } from 'react';
import { io } from 'socket.io-client';

export function useRealtime(onEvent) {
  useEffect(() => {
    const socket = io('/', { transports: ['websocket'] });
    const events = ['attendance:update','payroll:update','performance:update','stats:delta'];
    events.forEach(evt => socket.on(evt, () => onEvent?.(evt)));
    return () => {
      events.forEach(evt => socket.off(evt));
      socket.close();
    };
  }, [onEvent]);
}
