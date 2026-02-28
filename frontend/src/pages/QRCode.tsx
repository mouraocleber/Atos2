import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import './QRCode.css';

interface QRCodeData {
  id: string;
  userId: string;
  nickname: string;
  name: string;
  profileImage?: string;
  code: string;
  createdAt: Date;
}

export const QRCodePage: React.FC = () => {
  const [qrCode, setQRCode] = useState<QRCodeData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Gerar QR Code
  const handleGenerateQR = async () => {
    try {
      setIsGenerating(true);

      // Simulação de geração de QR Code
      const mockQRCode: QRCodeData = {
        id: 'qr-' + Date.now(),
        userId: 'user-123',
        nickname: 'atos2',
        name: 'Atos Silva',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=atos',
        code: 'https://atos2.app/connect/user-123',
        createdAt: new Date(),
      };

      setQRCode(mockQRCode);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Compartilhar QR Code
  const handleShareQR = async () => {
    if (!qrCode) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Conecte-se comigo no Atos2',
          text: `Escaneie meu QR Code para se conectar: ${qrCode.code}`,
          url: qrCode.code,
        });
      } else {
        // Fallback: copiar para clipboard
        await navigator.clipboard.writeText(qrCode.code);
        alert('Link copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  // Baixar QR Code
  const handleDownloadQR = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL();
    link.download = `atos2-qrcode-${Date.now()}.png`;
    link.click();
  };

  // Iniciar modo de câmera
  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanMode(true);
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Não foi possível acessar a câmera');
    }
  };

  // Parar câmera
  const handleStopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setScanMode(false);
    }
  };

  // Simular leitura de QR Code
  const handleSimulateScan = () => {
    const mockScannedData = {
      userId: 'user-456',
      nickname: 'emily_s',
      name: 'Emily Smith',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
    };

    setScannedData(mockScannedData);
    handleStopCamera();
  };

  // Conectar com usuário escaneado
  const handleConnectUser = async () => {
    if (!scannedData) return;

    try {
      // Aqui você faria uma chamada à API para conectar
      alert(`Conectado com ${scannedData.name}!`);
      setScannedData(null);
    } catch (error) {
      console.error('Erro ao conectar:', error);
    }
  };

  useEffect(() => {
    // Gerar QR Code ao montar o componente
    handleGenerateQR();

    return () => {
      if (scanMode) {
        handleStopCamera();
      }
    };
  }, []);

  return (
    <div className="qrcode-container">
      <div className="qrcode-header">
        <h1>🔗 Conectar com QR Code</h1>
        <p>Compartilhe seu QR Code ou escaneie o de outro usuário</p>
      </div>

      <div className="qrcode-content">
        {/* Meu QR Code */}
        <Card variant="elevated" className="qrcode-card">
          <h2 className="qrcode-section-title">Meu QR Code</h2>

          {qrCode && (
            <div className="qrcode-display">
              <div className="qrcode-user-info">
                <img src={qrCode.profileImage} alt={qrCode.name} className="qrcode-avatar" />
                <div>
                  <h3>{qrCode.nickname}</h3>
                  <p>{qrCode.name}</p>
                </div>
              </div>

              <div className="qrcode-image-container">
                <canvas
                  ref={canvasRef}
                  className="qrcode-canvas"
                  style={{ display: 'none' }}
                />
                {/* Simulação de QR Code */}
                <div className="qrcode-placeholder">
                  <div className="qrcode-grid">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`qrcode-cell ${Math.random() > 0.5 ? 'filled' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="qrcode-actions">
                <Button variant="primary" onClick={handleShareQR}>
                  📤 Compartilhar
                </Button>
                <Button variant="secondary" onClick={handleDownloadQR}>
                  ⬇️ Baixar
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGenerateQR}
                  disabled={isGenerating}
                >
                  🔄 Gerar Novo
                </Button>
              </div>

              <div className="qrcode-info">
                <p>✓ Este QR Code nunca expira</p>
                <p>✓ Compartilhe com segurança</p>
                <p>✓ Cada novo código substitui o anterior</p>
              </div>
            </div>
          )}
        </Card>

        {/* Escanear QR Code */}
        <Card variant="elevated" className="qrcode-card">
          <h2 className="qrcode-section-title">Escanear QR Code</h2>

          {!scanMode ? (
            <div className="scan-placeholder">
              <div className="scan-icon">📱</div>
              <p>Clique no botão abaixo para escanear um QR Code</p>
              <Button variant="primary" onClick={handleStartCamera}>
                📷 Abrir Câmera
              </Button>
            </div>
          ) : (
            <div className="scan-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="scan-video"
              />
              <div className="scan-overlay">
                <div className="scan-frame" />
              </div>

              <div className="scan-actions">
                <Button variant="secondary" onClick={handleSimulateScan}>
                  ✓ Simular Leitura
                </Button>
                <Button variant="danger" onClick={handleStopCamera}>
                  ✕ Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Resultado da Leitura */}
          {scannedData && (
            <div className="scanned-result">
              <h3>Usuário Encontrado</h3>
              <div className="scanned-user-info">
                <img
                  src={scannedData.profileImage}
                  alt={scannedData.name}
                  className="scanned-avatar"
                />
                <div>
                  <h4>{scannedData.nickname}</h4>
                  <p>{scannedData.name}</p>
                </div>
              </div>

              <div className="scanned-actions">
                <Button variant="primary" onClick={handleConnectUser}>
                  ✓ Conectar
                </Button>
                <Button variant="secondary" onClick={() => setScannedData(null)}>
                  ✕ Cancelar
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Histórico de Conexões */}
        <Card variant="elevated" className="qrcode-card">
          <h2 className="qrcode-section-title">Histórico de Conexões</h2>

          <div className="connections-list">
            <div className="connection-item">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=emily"
                alt="Emily"
                className="connection-avatar"
              />
              <div className="connection-info">
                <h4>Emily Smith</h4>
                <p>Conectado há 2 dias</p>
              </div>
              <span className="connection-status">✓</span>
            </div>

            <div className="connection-item">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=john"
                alt="John"
                className="connection-avatar"
              />
              <div className="connection-info">
                <h4>John Doe</h4>
                <p>Conectado há 1 semana</p>
              </div>
              <span className="connection-status">✓</span>
            </div>

            <div className="connection-item">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=sarah"
                alt="Sarah"
                className="connection-avatar"
              />
              <div className="connection-info">
                <h4>Sarah Johnson</h4>
                <p>Conectado há 1 mês</p>
              </div>
              <span className="connection-status">✓</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default QRCodePage;

