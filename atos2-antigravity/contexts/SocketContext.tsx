import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '../services/api';
import { useAuth } from './AuthContext';

interface SocketContextData {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextData>({ socket: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) {
      // Desconecta quando usuário faz logout
      setSocket(prev => {
        if (prev) prev.disconnect();
        return null;
      });
      return;
    }

    // Cria um único socket global para o usuário logado
    const newSocket = io(SERVER_URL, {
      transports: ['websocket'],
      query: { userId: user.id },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      console.log(`[Global Socket] Conectado: ${newSocket.id} (user: ${user.id})`);
      // Garante que o socket está na sala pessoal após (re)conexão
      newSocket.emit('joinRoom', `user_${user.id}`);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`[Global Socket] Desconectado: ${reason}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
