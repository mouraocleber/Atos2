import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import './Login.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Implementar chamada à API
      console.log('Login:', { email, password });
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-header">
          <h1 className="login-title">Atos2</h1>
          <p className="login-subtitle">Mensagens com Tradução Automática</p>
        </div>

        <Card variant="elevated" className="login-card">
          <form onSubmit={handleLogin} className="login-form">
            <h2 className="form-title">Entrar</h2>

            {error && <div className="error-message">{error}</div>}

            <Input
              type="email"
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <Input
              type="password"
              label="Senha"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="login-footer">
              <p>Não tem conta? <a href="/register">Registre-se aqui</a></p>
            </div>
          </form>
        </Card>

        <div className="login-features">
          <div className="feature">
            <span className="feature-icon">💬</span>
            <h3>Mensagens</h3>
            <p>Envie mensagens de texto, áudio e vídeo</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🌍</span>
            <h3>Tradução Automática</h3>
            <p>Mensagens traduzidas automaticamente</p>
          </div>
          <div className="feature">
            <span className="feature-icon">💰</span>
            <h3>Transações</h3>
            <p>Gerencie seu saldo em cash</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

