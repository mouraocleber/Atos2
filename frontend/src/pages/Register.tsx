import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import './Register.css';

type RegistrationStep = 'contact' | 'verification' | 'profile' | 'success';

export const Register: React.FC = () => {
  const [step, setStep] = useState<RegistrationStep>('contact');
  const [contactMethod, setContactMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    nickname: '',
    personType: 'PF' as 'PF' | 'PJ',
    cpf: '',
    cep: '',
    preferredLanguage: 'pt-BR',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendCode = async () => {
    try {
      setIsVerifying(true);

      if (contactMethod === 'phone' && !phone.trim()) {
        setMessage({ type: 'error', text: 'Por favor, insira um telefone válido' });
        return;
      }

      if (contactMethod === 'email' && !email.trim()) {
        setMessage({ type: 'error', text: 'Por favor, insira um email válido' });
        return;
      }

      // Simular envio de código
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setMessage({
        type: 'success',
        text: `Código enviado para ${contactMethod === 'phone' ? phone : email}`,
      });

      setStep('verification');
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao enviar código. Tente novamente.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setIsVerifying(true);

      if (!verificationCode.trim() || verificationCode.length !== 6) {
        setMessage({ type: 'error', text: 'Por favor, insira um código válido' });
        return;
      }

      // Simular verificação
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setMessage({ type: 'success', text: 'Código verificado com sucesso!' });
      setStep('profile');
    } catch (error) {
      setMessage({ type: 'error', text: 'Código inválido. Tente novamente.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCompleteProfile = async () => {
    try {
      setIsVerifying(true);

      if (!profileData.name || !profileData.nickname || !profileData.cpf || !profileData.cep) {
        setMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios' });
        return;
      }

      // Simular criação de conta
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setMessage({ type: 'success', text: 'Conta criada com sucesso!' });
      setStep('success');
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao criar conta. Tente novamente.' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-background">
        <div className="network-node"></div>
        <div className="network-node"></div>
        <div className="network-node"></div>
        <div className="network-node"></div>
        <div className="network-node"></div>
      </div>

      <div className="register-content">
        <Card variant="elevated" className="register-card">
          {/* Header */}
          <div className="register-header">
            <img src="/logo.svg" alt="Atos2" className="register-logo" />
            <h1>Atos2</h1>
            <p>Conecte-se com o mundo</p>
          </div>

          {/* Passo 1: Contato */}
          {step === 'contact' && (
            <div className="register-step">
              <h2>Vamos começar</h2>
              <p>Como você gostaria de se conectar?</p>

              <div className="contact-method-selector">
                <button
                  className={`method-btn ${contactMethod === 'phone' ? 'active' : ''}`}
                  onClick={() => setContactMethod('phone')}
                >
                  📱 Telefone
                </button>
                <button
                  className={`method-btn ${contactMethod === 'email' ? 'active' : ''}`}
                  onClick={() => setContactMethod('email')}
                >
                  📧 Email
                </button>
              </div>

              {contactMethod === 'phone' ? (
                <Input
                  label="Número de Telefone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 (11) 99999-9999"
                />
              ) : (
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              )}

              {message && (
                <div className={`message ${message.type}`}>
                  <span>{message.type === 'success' ? '✓' : '✕'}</span>
                  <p>{message.text}</p>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleSendCode}
                disabled={isVerifying}
              >
                {isVerifying ? '⏳ Enviando...' : '➤ Enviar Código'}
              </Button>
            </div>
          )}

          {/* Passo 2: Verificação */}
          {step === 'verification' && (
            <div className="register-step">
              <h2>Verifique seu código</h2>
              <p>
                Enviamos um código para{' '}
                <strong>{contactMethod === 'phone' ? phone : email}</strong>
              </p>

              <div className="verification-input">
                <Input
                  label="Código de Verificação"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                />
                <p className="verification-hint">Código de 6 dígitos</p>
              </div>

              {message && (
                <div className={`message ${message.type}`}>
                  <span>{message.type === 'success' ? '✓' : '✕'}</span>
                  <p>{message.text}</p>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleVerifyCode}
                disabled={isVerifying}
              >
                {isVerifying ? '⏳ Verificando...' : '✓ Verificar'}
              </Button>

              <button
                className="resend-btn"
                onClick={handleSendCode}
                disabled={isVerifying}
              >
                Reenviar código
              </button>
            </div>
          )}

          {/* Passo 3: Perfil */}
          {step === 'profile' && (
            <div className="register-step">
              <h2>Complete seu perfil</h2>
              <p>Nos conte um pouco mais sobre você</p>

              <div className="profile-form">
                <Input
                  label="Nome Completo"
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData({ ...profileData, name: e.target.value })
                  }
                  placeholder="João Silva"
                />

                <Input
                  label="Apelido"
                  type="text"
                  value={profileData.nickname}
                  onChange={(e) =>
                    setProfileData({ ...profileData, nickname: e.target.value })
                  }
                  placeholder="joao_silva"
                />

                <div className="form-row">
                  <div>
                    <label>Tipo de Pessoa</label>
                    <select
                      value={profileData.personType}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          personType: e.target.value as 'PF' | 'PJ',
                        })
                      }
                      className="select-input"
                    >
                      <option value="PF">Pessoa Física</option>
                      <option value="PJ">Pessoa Jurídica</option>
                    </select>
                  </div>

                  <Input
                    label="CPF/CNPJ"
                    type="text"
                    value={profileData.cpf}
                    onChange={(e) =>
                      setProfileData({ ...profileData, cpf: e.target.value })
                    }
                    placeholder="000.000.000-00"
                  />
                </div>

                <Input
                  label="CEP"
                  type="text"
                  value={profileData.cep}
                  onChange={(e) =>
                    setProfileData({ ...profileData, cep: e.target.value })
                  }
                  placeholder="00000-000"
                />

                <div>
                  <label>Idioma Preferido</label>
                  <select
                    value={profileData.preferredLanguage}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        preferredLanguage: e.target.value,
                      })
                    }
                    className="select-input"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (USA)</option>
                    <option value="es-ES">Español (España)</option>
                    <option value="fr-FR">Français (France)</option>
                  </select>
                </div>
              </div>

              {message && (
                <div className={`message ${message.type}`}>
                  <span>{message.type === 'success' ? '✓' : '✕'}</span>
                  <p>{message.text}</p>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleCompleteProfile}
                disabled={isVerifying}
              >
                {isVerifying ? '⏳ Criando conta...' : '✓ Criar Conta'}
              </Button>
            </div>
          )}

          {/* Passo 4: Sucesso */}
          {step === 'success' && (
            <div className="register-step success">
              <div className="success-icon">🎉</div>
              <h2>Bem-vindo ao Atos2!</h2>
              <p>Sua conta foi criada com sucesso</p>

              <div className="success-info">
                <p>
                  <strong>Nome:</strong> {profileData.name}
                </p>
                <p>
                  <strong>Apelido:</strong> @{profileData.nickname}
                </p>
                <p>
                  <strong>Contato:</strong> {contactMethod === 'phone' ? phone : email}
                </p>
              </div>

              <Button variant="primary" onClick={() => (window.location.href = '/')}>
                ➤ Ir para o App
              </Button>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="progress-indicator">
            <div className={`step ${step === 'contact' ? 'active' : step !== 'contact' ? 'completed' : ''}`}>
              1
            </div>
            <div className={`line ${step !== 'contact' ? 'active' : ''}`}></div>
            <div className={`step ${step === 'verification' ? 'active' : step !== 'verification' && step !== 'contact' ? 'completed' : ''}`}>
              2
            </div>
            <div className={`line ${step === 'profile' || step === 'success' ? 'active' : ''}`}></div>
            <div className={`step ${step === 'profile' || step === 'success' ? 'active' : ''}`}>
              3
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;

