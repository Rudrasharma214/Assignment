import { useEffect, useCallback, useRef } from 'react';
import socket from '../services/socket';


export function useSocket() {
    const isConnectedRef = useRef(socket.connected);

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const handleConnect = () => {
            console.log('Socket connected:', socket.id);
            isConnectedRef.current = true;
        };

        const handleDisconnect = (reason: string) => {
            console.log('Socket disconnected:', reason);
            isConnectedRef.current = false;
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        isConnectedRef.current = socket.connected;

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, []);

    const requestPollState = useCallback(() => {
        if (socket.connected) {
            socket.emit('request_poll_state');
        }
    }, []);

    const safeEmit = useCallback((event: string, ...args: any[]) => {
        if (socket.connected) {
            socket.emit(event, ...args);
        } else {
            console.warn(`Cannot emit ${event}: socket not connected`);
        }
    }, []);

    return {
        socket,
        requestPollState,
        isConnected: () => isConnectedRef.current,
        safeEmit,
    };
}
