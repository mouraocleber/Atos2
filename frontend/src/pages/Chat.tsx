import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../utils/api';
import './Chat.css';

interface Message {
  id: string;
  senderId: string;
  content: string;
  translatedContent?: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO';
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: Date;
  originalLanguage?: string;
  translatedLanguage?: string;
}

interface User {
  id: string;
  nickname: string;
  name: string;
  profileImage?: string;
  status: 'online' | 'offline';
  lastSeen?: Date;
}

export const Chat: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll para o final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar usuário e mensagens
  useEffect(() => {
    const loadChat = async () => {
      if (!userId) return;
      try {
        setIsLoading(true);
        
        // Buscar dados do usuário
        const userRes = await api.get(`/users/${userId}`);
        setUser(userRes.data.data);

        // Buscar mensagens
        const messagesRes = await api.get(`/messages/${userId}`);
        setMessages(messagesRes.data.data);
      } catch (error) {
        console.error('Erro ao carregar chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChat();

    // Socket.io Real-time connection e Sons
    const socket = io('http://localhost:3000'); // Assume o servidor backend local
    socket.on('message', (incomingMessage: Message) => {
       setMessages((prevMessages) => {
         // Evitar duplicações caso a API e o socket choquem (não inserimos repetidas)
         if (!prevMessages.find(m => m.id === incomingMessage.id)) {
           // Tocar o som maravilhoso 'Ruash' caso a msg seja recebida
           if (incomingMessage.senderId === userId || incomingMessage.senderId === 'other') {
              const ring = new Audio('/ruash.wav');
              ring.play().catch(e => console.warn('Bloqueio do navegador para Autoplay:', e));
           }
           return [...prevMessages, incomingMessage];
         }
         return prevMessages;
       });
    });

    return () => {
       socket.disconnect();
    };
  }, [userId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !userId) return;

    try {
      const response = await api.post('/messages', {
        recipientId: userId,
        content: inputValue,
        type: 'TEXT'
      });

      setMessages([...messages, response.data.data]);
      setInputValue('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="chat-loading">Carregando...</div>;
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-back">
          <button className="back-button">←</button>
        </div>

        <div className="chat-header-info">
          {user && (
            <>
              <div className="chat-header-user">
                <img src={user.profileImage} alt={user.name} className="chat-avatar" />
                <div>
                  <h2>{user.name}</h2>
                  <span className={`status ${user.status}`}>
                    {user.status === 'online' ? '● Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="chat-header-actions">
          <button className="header-action-btn" title="Chamar">
            📞
          </button>
          <button className="header-action-btn" title="Vídeo">
            📹
          </button>
          <button className="header-action-btn" title="Mais">
            ⋮
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="chat-messages">
        {messages.map((message, index) => {
          const showDate =
            index === 0 ||
            formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);

          return (
            <div key={message.id}>
              {showDate && (
                <div className="message-date-separator">
                  {formatDate(message.createdAt)}
                </div>
              )}

              <div
                className={`message-group ${message.senderId === 'me' ? 'sent' : 'received'}`}
                onMouseEnter={() => setSelectedMessage(message.id)}
                onMouseLeave={() => setSelectedMessage(null)}
              >
                {message.senderId === 'other' && (
                  <img src={user?.profileImage} alt="Avatar" className="message-avatar" />
                )}

                <div className="message-bubble">
                  <div className="message-content">
                    <p>{message.content}</p>

                    {message.translatedContent && showTranslation && (
                      <div className="message-translation">
                        <span className="translation-label">
                          Tradução ({message.translatedLanguage}):
                        </span>
                        <p>{message.translatedContent}</p>
                      </div>
                    )}
                  </div>

                  <div className="message-footer">
                    <span className="message-time">{formatTime(message.createdAt)}</span>
                    {message.senderId === 'me' && (
                      <span className="message-status">
                        {message.status === 'SENT' && '✓'}
                        {message.status === 'DELIVERED' && '✓✓'}
                        {message.status === 'READ' && '✓✓'}
                      </span>
                    )}
                  </div>
                </div>

                {selectedMessage === message.id && (
                  <div className="message-actions">
                    {message.translatedContent && (
                      <button
                        className="action-btn"
                        onClick={() => setShowTranslation(!showTranslation)}
                        title="Ver tradução"
                      >
                        🌐
                      </button>
                    )}
                    <button className="action-btn" title="Reagir">
                      😊
                    </button>
                    {message.senderId === 'me' && (
                      <button className="action-btn" title="Editar">
                        ✏️
                      </button>
                    )}
                    <button className="action-btn" title="Denunciar">
                      🚩
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <div className="chat-input-container">
          <button type="button" className="input-action-btn" title="Emoji">
            😊
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="chat-input"
          />

          <button type="button" className="input-action-btn" title="Anexar">
            📎
          </button>

          <button type="button" className="input-action-btn" title="Áudio">
            🎤
          </button>

          <button type="submit" className="send-button" title="Enviar">
            ➤
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;

