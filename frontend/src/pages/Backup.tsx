import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import './Backup.css';

interface Backup {
  id: string;
  backupType: 'MANUAL' | 'AUTOMATIC' | 'EMAIL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  fileUrl?: string;
  fileSize?: number;
  messagesCount: number;
  mediaCount: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export const BackupPage: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupMethod, setBackupMethod] = useState<'device' | 'email'>('device');
  const [deviceId, setDeviceId] = useState('');
  const [email, setEmail] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Dados de exemplo
  const mockBackups: Backup[] = [
    {
      id: '1',
      backupType: 'MANUAL',
      status: 'COMPLETED',
      fileUrl: 'https://backup.atos2.app/backups/1.zip',
      fileSize: 524288000,
      messagesCount: 1250,
      mediaCount: 350,
      createdAt: new Date(Date.now() - 86400000),
      completedAt: new Date(Date.now() - 86350000),
    },
    {
      id: '2',
      backupType: 'EMAIL',
      status: 'COMPLETED',
      fileUrl: 'https://backup.atos2.app/backups/2.zip',
      fileSize: 512000000,
      messagesCount: 1200,
      mediaCount: 340,
      createdAt: new Date(Date.now() - 172800000),
      completedAt: new Date(Date.now() - 172750000),
    },
    {
      id: '3',
      backupType: 'AUTOMATIC',
      status: 'IN_PROGRESS',
      messagesCount: 0,
      mediaCount: 0,
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: '4',
      backupType: 'EMAIL',
      status: 'FAILED',
      messagesCount: 0,
      mediaCount: 0,
      errorMessage: 'Email inválido ou não entregue',
      createdAt: new Date(Date.now() - 604800000),
    },
  ];

  useEffect(() => {
    setBackups(mockBackups);
  }, []);

  const handleCreateBackup = async () => {
    try {
      if (backupMethod === 'device' && !deviceId.trim()) {
        setBackupMessage({
          type: 'error',
          message: 'Por favor, insira o ID do dispositivo',
        });
        return;
      }

      if (backupMethod === 'email' && !email.trim()) {
        setBackupMessage({
          type: 'error',
          message: 'Por favor, insira um email válido',
        });
        return;
      }

      setIsCreatingBackup(true);

      // Simular criação de backup
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newBackup: Backup = {
        id: Date.now().toString(),
        backupType: backupMethod === 'device' ? 'MANUAL' : 'EMAIL',
        status: 'PENDING',
        messagesCount: 0,
        mediaCount: 0,
        createdAt: new Date(),
      };

      setBackups([newBackup, ...backups]);

      setBackupMessage({
        type: 'success',
        message: `Backup iniciado com sucesso! Você receberá uma notificação quando estiver pronto.`,
      });

      setDeviceId('');
      setEmail('');
    } catch (error) {
      setBackupMessage({
        type: 'error',
        message: 'Erro ao criar backup. Tente novamente.',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = (backup: Backup) => {
    if (backup.fileUrl) {
      window.open(backup.fileUrl, '_blank');
    }
  };

  const handleDeleteBackup = (backupId: string) => {
    if (confirm('Tem certeza que deseja deletar este backup?')) {
      setBackups(backups.filter((b) => b.id !== backupId));
      setBackupMessage({
        type: 'success',
        message: 'Backup deletado com sucesso',
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const completedBackups = backups.filter((b) => b.status === 'COMPLETED');
  const totalBackupSize = completedBackups.reduce((sum, b) => sum + (b.fileSize || 0), 0);

  return (
    <div className="backup-container">
      <div className="backup-header">
        <h1>💾 Backup de Dados</h1>
        <p>Faça backup de suas mensagens, fotos, vídeos e áudios</p>
      </div>

      <div className="backup-content">
        {/* Mensagem de Status */}
        {backupMessage && (
          <div className={`backup-message ${backupMessage.type}`}>
            <span>{backupMessage.type === 'success' ? '✓' : '✕'}</span>
            <p>{backupMessage.message}</p>
            <button onClick={() => setBackupMessage(null)}>✕</button>
          </div>
        )}

        {/* Criar Backup */}
        <Card variant="elevated" className="backup-create-card">
          <h2 className="backup-section-title">Criar Novo Backup</h2>

          <div className="backup-method-selector">
            <button
              className={`method-btn ${backupMethod === 'device' ? 'active' : ''}`}
              onClick={() => setBackupMethod('device')}
            >
              📱 Via Dispositivo
            </button>
            <button
              className={`method-btn ${backupMethod === 'email' ? 'active' : ''}`}
              onClick={() => setBackupMethod('email')}
            >
              📧 Via Email
            </button>
          </div>

          {backupMethod === 'device' ? (
            <div className="backup-form">
              <Input
                label="ID do Dispositivo"
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Digite o ID do seu dispositivo"
              />
              <p className="backup-help">
                O ID do dispositivo pode ser encontrado nas configurações do seu aparelho
              </p>
            </div>
          ) : (
            <div className="backup-form">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <p className="backup-help">
                Você receberá um link para baixar o backup no email fornecido
              </p>
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
          >
            {isCreatingBackup ? '⏳ Criando...' : '✓ Iniciar Backup'}
          </Button>
        </Card>

        {/* Estatísticas */}
        <Card variant="elevated" className="backup-stats-card">
          <h2 className="backup-section-title">Estatísticas</h2>

          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-icon">📦</span>
              <div>
                <p className="stat-label">Backups Completos</p>
                <p className="stat-value">{completedBackups.length}</p>
              </div>
            </div>

            <div className="stat-box">
              <span className="stat-icon">💾</span>
              <div>
                <p className="stat-label">Espaço Total</p>
                <p className="stat-value">{formatFileSize(totalBackupSize)}</p>
              </div>
            </div>

            <div className="stat-box">
              <span className="stat-icon">💬</span>
              <div>
                <p className="stat-label">Mensagens</p>
                <p className="stat-value">
                  {completedBackups.reduce((sum, b) => sum + b.messagesCount, 0)}
                </p>
              </div>
            </div>

            <div className="stat-box">
              <span className="stat-icon">🎬</span>
              <div>
                <p className="stat-label">Mídia</p>
                <p className="stat-value">
                  {completedBackups.reduce((sum, b) => sum + b.mediaCount, 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Histórico de Backups */}
        <Card variant="elevated" className="backup-history-card">
          <h2 className="backup-section-title">Histórico de Backups</h2>

          {backups.length > 0 ? (
            <div className="backups-list">
              {backups.map((backup) => (
                <div key={backup.id} className={`backup-item ${backup.status.toLowerCase()}`}>
                  <div className="backup-item-header">
                    <div className="backup-info">
                      <div className="backup-type">
                        {backup.backupType === 'MANUAL' && '📱 Manual'}
                        {backup.backupType === 'EMAIL' && '📧 Email'}
                        {backup.backupType === 'AUTOMATIC' && '⚙️ Automático'}
                      </div>
                      <div className="backup-date">{formatDate(backup.createdAt)}</div>
                    </div>

                    <div className={`backup-status ${backup.status.toLowerCase()}`}>
                      {backup.status === 'PENDING' && '⏳ Pendente'}
                      {backup.status === 'IN_PROGRESS' && '⏳ Em Progresso'}
                      {backup.status === 'COMPLETED' && '✓ Completo'}
                      {backup.status === 'FAILED' && '✕ Falhou'}
                    </div>
                  </div>

                  {backup.status === 'COMPLETED' && (
                    <div className="backup-details">
                      <div className="detail">
                        <span>Mensagens: {backup.messagesCount}</span>
                      </div>
                      <div className="detail">
                        <span>Mídia: {backup.mediaCount}</span>
                      </div>
                      <div className="detail">
                        <span>Tamanho: {formatFileSize(backup.fileSize)}</span>
                      </div>
                    </div>
                  )}

                  {backup.status === 'FAILED' && backup.errorMessage && (
                    <div className="backup-error">
                      <span>❌ {backup.errorMessage}</span>
                    </div>
                  )}

                  <div className="backup-actions">
                    {backup.status === 'COMPLETED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadBackup(backup)}
                      >
                        ⬇️ Baixar
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteBackup(backup.id)}
                    >
                      🗑️ Deletar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-backups">
              <p>Nenhum backup criado ainda</p>
            </div>
          )}
        </Card>

        {/* Informações Importantes */}
        <Card variant="elevated" className="backup-info-card">
          <h2 className="backup-section-title">ℹ️ Informações Importantes</h2>

          <div className="info-list">
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <div>
                <h4>Segurança</h4>
                <p>Seus backups são criptografados e armazenados com segurança</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">⏰</span>
              <div>
                <h4>Retenção</h4>
                <p>Backups são retidos por 30 dias. Após isso, você precisa criar um novo</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">📊</span>
              <div>
                <h4>Dados Inclusos</h4>
                <p>Mensagens, fotos, vídeos, áudios e metadados são inclusos no backup</p>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">🔄</span>
              <div>
                <h4>Restauração</h4>
                <p>Você pode restaurar seus dados a qualquer momento usando o arquivo de backup</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BackupPage;

