import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AdminDashboard.css';

interface Stats {
  users: number;
  messages: number;
  transactions: number;
  totalVolume: number;
  pendingReports: number;
}

interface User {
  id: string;
  email: string;
  phone: string;
  nickname: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'reports'>('stats');

  
  

  

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data.users);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar usuários', error);
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      fetchUsers();
    } catch (error) {
      alert('Erro ao alterar status do usuário');
    }
  };

  const updateUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (error) {
      alert('Erro ao alterar papel do usuário');
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Painel Administrativo Atos2</h1>
        <nav className="admin-nav">
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>Estatísticas</button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>Usuários</button>
          <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>Denúncias</button>
        </nav>
      </header>

      <main className="admin-content">
        {activeTab === 'stats' && stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Usuários Totais</h3>
              <p className="stat-value">{stats.users}</p>
            </div>
            <div className="stat-card">
              <h3>Mensagens Enviadas</h3>
              <p className="stat-value">{stats.messages}</p>
            </div>
            <div className="stat-card">
              <h3>Transações</h3>
              <p className="stat-value">{stats.transactions}</p>
            </div>
            <div className="stat-card">
              <h3>Volume Total</h3>
              <p className="stat-value">R$ {stats.totalVolume.toFixed(2)}</p>
            </div>
            <div className="stat-card warning">
              <h3>Denúncias Pendentes</h3>
              <p className="stat-value">{stats.pendingReports}</p>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome / Nickname</th>
                  <th>Email / Telefone</th>
                  <th>Papel</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong><br />
                      <span className="subtext">@{user.nickname}</span>
                    </td>
                    <td>
                      {user.email}<br />
                      <span className="subtext">{user.phone}</span>
                    </td>
                    <td>
                      <span className={`badge ${user.role.toLowerCase()}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`}></span>
                      {user.is_active ? 'Ativo' : 'Bloqueado'}
                    </td>
                    <td>
                      <button className="btn-small" onClick={() => toggleUserStatus(user.id, user.is_active)}>
                        {user.is_active ? 'Bloquear' : 'Desbloquear'}
                      </button>
                      <button className="btn-small secondary" onClick={() => updateUserRole(user.id, user.role)}>
                        Tornar {user.role === 'ADMIN' ? 'Usuário' : 'Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="placeholder-content">
            <p>Módulo de denúncias em desenvolvimento...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
