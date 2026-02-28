import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import './UserSearch.css';

interface User {
  id: string;
  nickname: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
  city: string;
  state: string;
  personType: 'PF' | 'PJ';
  status: 'online' | 'offline';
  isConnected: boolean;
}

export const UserSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'nickname' | 'name' | 'email' | 'phone' | 'city'>('all');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Dados de exemplo
  const mockUsers: User[] = [
    {
      id: 'user-1',
      nickname: 'emily_s',
      name: 'Emily Smith',
      email: 'emily@example.com',
      phone: '+1 (555) 123-4567',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
      city: 'São Francisco',
      state: 'CA',
      personType: 'PF',
      status: 'online',
      isConnected: true,
    },
    {
      id: 'user-2',
      nickname: 'john_dev',
      name: 'John Developer',
      email: 'john@example.com',
      phone: '+1 (555) 234-5678',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
      city: 'Nova York',
      state: 'NY',
      personType: 'PF',
      status: 'offline',
      isConnected: false,
    },
    {
      id: 'user-3',
      nickname: 'tech_corp',
      name: 'Tech Corporation',
      email: 'contact@techcorp.com',
      phone: '+1 (555) 345-6789',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
      city: 'Seattle',
      state: 'WA',
      personType: 'PJ',
      status: 'online',
      isConnected: false,
    },
    {
      id: 'user-4',
      nickname: 'sarah_design',
      name: 'Sarah Designer',
      email: 'sarah@example.com',
      phone: '+1 (555) 456-7890',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      city: 'Los Angeles',
      state: 'CA',
      personType: 'PF',
      status: 'online',
      isConnected: true,
    },
    {
      id: 'user-5',
      nickname: 'alex_marketing',
      name: 'Alex Marketing',
      email: 'alex@example.com',
      phone: '+1 (555) 567-8901',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      city: 'Chicago',
      state: 'IL',
      personType: 'PF',
      status: 'offline',
      isConnected: false,
    },
  ];

  // Realizar busca
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);

      // Simular delay de busca
      await new Promise((resolve) => setTimeout(resolve, 500));

      const query = searchQuery.toLowerCase();
      let filtered = mockUsers;

      if (searchType !== 'all') {
        filtered = filtered.filter((user) => {
          switch (searchType) {
            case 'nickname':
              return user.nickname.toLowerCase().includes(query);
            case 'name':
              return user.name.toLowerCase().includes(query);
            case 'email':
              return user.email.toLowerCase().includes(query);
            case 'phone':
              return user.phone.includes(query);
            case 'city':
              return user.city.toLowerCase().includes(query);
            default:
              return true;
          }
        });
      } else {
        filtered = filtered.filter(
          (user) =>
            user.nickname.toLowerCase().includes(query) ||
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.city.toLowerCase().includes(query)
        );
      }

      setResults(filtered);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Conectar com usuário
  const handleConnect = async (user: User) => {
    try {
      alert(`Conectado com ${user.name}!`);
      // Aqui você faria uma chamada à API
    } catch (error) {
      console.error('Erro ao conectar:', error);
    }
  };

  // Enviar mensagem
  const handleSendMessage = (user: User) => {
    alert(`Abrindo chat com ${user.name}...`);
    // Aqui você navegaria para a página de chat
  };

  return (
    <div className="user-search-container">
      <div className="search-header">
        <h1>🔍 Buscar Usuários</h1>
        <p>Encontre e conecte-se com outros usuários</p>
      </div>

      <div className="search-content">
        {/* Formulário de Busca */}
        <Card variant="elevated" className="search-card">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-group">
              <Input
                label="Buscar"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite um nome, email, telefone ou cidade..."
              />
            </div>

            <div className="search-filters">
              <label>Filtrar por:</label>
              <div className="filter-buttons">
                {['all', 'nickname', 'name', 'email', 'phone', 'city'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`filter-btn ${searchType === type ? 'active' : ''}`}
                    onClick={() => setSearchType(type as any)}
                  >
                    {type === 'all' && 'Todos'}
                    {type === 'nickname' && 'Apelido'}
                    {type === 'name' && 'Nome'}
                    {type === 'email' && 'Email'}
                    {type === 'phone' && 'Telefone'}
                    {type === 'city' && 'Cidade'}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="primary" type="submit" disabled={isSearching}>
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
          </form>
        </Card>

        {/* Resultados */}
        {results.length > 0 && (
          <Card variant="elevated" className="search-card">
            <h2 className="search-results-title">
              Resultados ({results.length})
            </h2>

            <div className="results-list">
              {results.map((user) => (
                <div
                  key={user.id}
                  className={`result-item ${selectedUser?.id === user.id ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="result-avatar-container">
                    <img src={user.profileImage} alt={user.name} className="result-avatar" />
                    <span className={`status-badge ${user.status}`}>
                      {user.status === 'online' ? '●' : '○'}
                    </span>
                  </div>

                  <div className="result-info">
                    <div className="result-header">
                      <h3>{user.nickname}</h3>
                      <span className="person-type">
                        {user.personType === 'PF' ? '👤' : '🏢'}
                      </span>
                    </div>
                    <p className="result-name">{user.name}</p>
                    <p className="result-location">📍 {user.city}, {user.state}</p>
                    <div className="result-contact">
                      <span>📧 {user.email}</span>
                      <span>📱 {user.phone}</span>
                    </div>
                  </div>

                  <div className="result-actions">
                    {user.isConnected ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendMessage(user)}
                      >
                        💬 Mensagem
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConnect(user)}
                      >
                        ➕ Conectar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Sem Resultados */}
        {searchQuery && results.length === 0 && !isSearching && (
          <Card variant="elevated" className="search-card empty">
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>Nenhum usuário encontrado</h3>
              <p>Tente buscar com outros termos ou use o QR Code para conectar</p>
            </div>
          </Card>
        )}

        {/* Sugestões Iniciais */}
        {!searchQuery && results.length === 0 && (
          <Card variant="elevated" className="search-card">
            <h2 className="search-results-title">Usuários Sugeridos</h2>

            <div className="suggestions-list">
              {mockUsers.slice(0, 3).map((user) => (
                <div key={user.id} className="suggestion-item">
                  <img src={user.profileImage} alt={user.name} className="suggestion-avatar" />
                  <div className="suggestion-info">
                    <h4>{user.nickname}</h4>
                    <p>{user.name}</p>
                    <span className="suggestion-location">📍 {user.city}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleConnect(user)}
                  >
                    ➕
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Detalhes do Usuário Selecionado */}
        {selectedUser && (
          <Card variant="elevated" className="search-card detail-card">
            <h2 className="search-results-title">Detalhes do Usuário</h2>

            <div className="user-detail">
              <div className="detail-header">
                <img src={selectedUser.profileImage} alt={selectedUser.name} className="detail-avatar" />
                <div>
                  <h3>{selectedUser.name}</h3>
                  <p className="detail-nickname">@{selectedUser.nickname}</p>
                  <span className={`detail-status ${selectedUser.status}`}>
                    {selectedUser.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                  </span>
                </div>
              </div>

              <div className="detail-info">
                <div className="detail-row">
                  <span className="detail-label">Tipo:</span>
                  <span className="detail-value">
                    {selectedUser.personType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedUser.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Telefone:</span>
                  <span className="detail-value">{selectedUser.phone}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Localização:</span>
                  <span className="detail-value">{selectedUser.city}, {selectedUser.state}</span>
                </div>
              </div>

              <div className="detail-actions">
                {selectedUser.isConnected ? (
                  <Button variant="secondary" onClick={() => handleSendMessage(selectedUser)}>
                    💬 Enviar Mensagem
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => handleConnect(selectedUser)}>
                    ➕ Conectar
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setSelectedUser(null)}>
                  ✕ Fechar
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UserSearch;

