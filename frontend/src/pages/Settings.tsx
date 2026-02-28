import React, { useState } from 'react';
import { useTheme } from '../utils/themeContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import './Settings.css';

export const Settings: React.FC = () => {
  const { mode, backgroundType, backgroundImage, setMode, setBackground, toggleMode } = useTheme();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [showImageInput, setShowImageInput] = useState(false);

  const handleSetBackground = () => {
    if (imageUrl.trim()) {
      setBackground('image', imageUrl);
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  const handleRemoveBackground = () => {
    setBackground('solid');
  };

  const backgroundOptions = [
    {
      id: 'bg1',
      name: 'Montanhas',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop',
    },
    {
      id: 'bg2',
      name: 'Oceano',
      url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=800&fit=crop',
    },
    {
      id: 'bg3',
      name: 'Floresta',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop',
    },
    {
      id: 'bg4',
      name: 'Pôr do Sol',
      url: 'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?w=1200&h=800&fit=crop',
    },
    {
      id: 'bg5',
      name: 'Cidade',
      url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&h=800&fit=crop',
    },
    {
      id: 'bg6',
      name: 'Natureza',
      url: 'https://images.unsplash.com/photo-1469022563149-aa64dbd37dae?w=1200&h=800&fit=crop',
    },
  ];

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Configurações</h1>
      </div>

      <div className="settings-content">
        {/* Seção de Tema */}
        <Card variant="elevated" className="settings-card">
          <h2 className="settings-section-title">🎨 Tema</h2>

          <div className="settings-option">
            <div className="option-info">
              <h3>Modo Escuro / Claro</h3>
              <p>Escolha o tema visual do aplicativo</p>
            </div>
            <div className="theme-buttons">
              <Button
                variant={mode === 'dark' ? 'primary' : 'secondary'}
                onClick={() => setMode('dark')}
              >
                🌙 Escuro
              </Button>
              <Button
                variant={mode === 'light' ? 'primary' : 'secondary'}
                onClick={() => setMode('light')}
              >
                ☀️ Claro
              </Button>
            </div>
          </div>
        </Card>

        {/* Seção de Fundo */}
        <Card variant="elevated" className="settings-card">
          <h2 className="settings-section-title">📸 Fundo da Tela</h2>

          <div className="settings-option">
            <div className="option-info">
              <h3>Tipo de Fundo</h3>
              <p>Escolha entre fundo sólido ou imagem</p>
            </div>
            <div className="background-type-buttons">
              <Button
                variant={backgroundType === 'solid' ? 'primary' : 'secondary'}
                onClick={() => handleRemoveBackground()}
              >
                ⬜ Sólido
              </Button>
              <Button
                variant={backgroundType === 'image' ? 'primary' : 'secondary'}
                onClick={() => setShowImageInput(!showImageInput)}
              >
                🖼️ Imagem
              </Button>
            </div>
          </div>

          {/* Imagens Pré-selecionadas */}
          {backgroundType === 'image' && (
            <div className="background-gallery">
              <h3>Fundos Disponíveis</h3>
              <div className="gallery-grid">
                {backgroundOptions.map((bg) => (
                  <div
                    key={bg.id}
                    className={`gallery-item ${backgroundImage === bg.url ? 'active' : ''}`}
                    onClick={() => setBackground('image', bg.url)}
                  >
                    <img src={bg.url} alt={bg.name} />
                    <span className="gallery-label">{bg.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input de URL Customizada */}
          {showImageInput && (
            <div className="custom-image-input">
              <h3>URL de Imagem Customizada</h3>
              <div className="input-group">
                <input
                  type="url"
                  placeholder="Cole a URL da imagem aqui"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="custom-url-input"
                />
                <Button variant="primary" onClick={handleSetBackground}>
                  Aplicar
                </Button>
              </div>
            </div>
          )}

          {/* Preview do Fundo Atual */}
          {backgroundImage && (
            <div className="background-preview">
              <h3>Fundo Atual</h3>
              <div className="preview-image" style={{ backgroundImage: `url(${backgroundImage})` }} />
              <Button variant="danger" onClick={handleRemoveBackground}>
                ✕ Remover Fundo
              </Button>
            </div>
          )}
        </Card>

        {/* Seção de Privacidade */}
        <Card variant="elevated" className="settings-card">
          <h2 className="settings-section-title">🔒 Privacidade e Segurança</h2>

          <div className="settings-option">
            <div className="option-info">
              <h3>Bloqueio de Mensagens</h3>
              <p>Bloqueie usuários para não receber mensagens deles</p>
            </div>
            <Button variant="secondary">Gerenciar Bloqueios</Button>
          </div>

          <div className="settings-option">
            <div className="option-info">
              <h3>Denunciar Conteúdo</h3>
              <p>Denuncie mensagens ofensivas ou golpes</p>
            </div>
            <Button variant="secondary">Minhas Denúncias</Button>
          </div>
        </Card>

        {/* Seção de Conta */}
        <Card variant="elevated" className="settings-card">
          <h2 className="settings-section-title">👤 Conta</h2>

          <div className="settings-option">
            <div className="option-info">
              <h3>Editar Perfil</h3>
              <p>Atualize suas informações pessoais</p>
            </div>
            <Button variant="secondary">Editar</Button>
          </div>

          <div className="settings-option">
            <div className="option-info">
              <h3>Alterar Senha</h3>
              <p>Atualize sua senha de segurança</p>
            </div>
            <Button variant="secondary">Alterar</Button>
          </div>

          <div className="settings-option">
            <div className="option-info">
              <h3>Sair</h3>
              <p>Faça logout da sua conta</p>
            </div>
            <Button variant="danger">Sair</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

