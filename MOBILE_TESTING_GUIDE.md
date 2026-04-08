# 📱 Guia de Testes em Celular - Atos2

## Visão Geral

Este guia fornece instruções para testar o app Atos2 em celulares Android e iOS.

---

## 1. Opções de Teste

### Opção 1: Teste Local (Recomendado para Desenvolvimento)

#### Requisitos
- Node.js 18+
- npm ou yarn
- Expo CLI: `npm install -g expo-cli`
- Celular com Expo Go instalado

#### Passos

1. **Instalar Expo Go no celular**
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [Apple App Store](https://apps.apple.com/us/app/expo-go/id982107779)

2. **Iniciar servidor Expo**
   ```bash
   cd /home/ubuntu/atos2/frontend
   npm start
   ```

3. **Conectar celular**
   - Escanear QR code com câmera (iOS) ou Expo Go (Android)
   - Ou digitar IP manualmente

4. **Testar app**
   - App carregará em tempo real
   - Alterações aparecem instantaneamente

---

### Opção 2: Build APK para Android

#### Requisitos
- Conta Expo (gratuita)
- Expo CLI instalado
- Android SDK (opcional)

#### Passos

1. **Fazer login no Expo**
   ```bash
   expo login
   ```

2. **Gerar APK**
   ```bash
   cd /home/ubuntu/atos2
   eas build --platform android --type apk
   ```

3. **Baixar APK**
   - Após build completar, baixar link do APK
   - Ou usar: `eas build:list`

4. **Instalar no celular**
   - Transferir APK para celular
   - Abrir arquivo e instalar
   - Ou usar `adb install app.apk`

---

### Opção 3: Build IPA para iOS

#### Requisitos
- Conta Expo
- Apple Developer Account
- Expo CLI

#### Passos

1. **Gerar IPA**
   ```bash
   cd /home/ubuntu/atos2
   eas build --platform ios
   ```

2. **Instalar via TestFlight**
   - Usar Apple TestFlight
   - Compartilhar link com testadores

---

### Opção 4: Teste Web Responsivo

#### Passos

1. **Iniciar servidor**
   ```bash
   cd /home/ubuntu/atos2/frontend
   npm run dev
   ```

2. **Abrir no navegador**
   - URL: `http://localhost:5173`

3. **Modo responsivo**
   - F12 → Device Toolbar
   - Selecionar "iPhone" ou "Android"

---

## 2. Configuração do Backend para Testes

### Teste Local (Mesma Rede)

1. **Obter IP local**
   ```bash
   hostname -I
   ```

2. **Atualizar URL da API**
   - Editar `frontend/src/config/api.ts`
   - Mudar `http://localhost:3000` para `http://SEU_IP:3000`

3. **Iniciar backend**
   ```bash
   cd /home/ubuntu/atos2
   npm run dev
   ```

### Teste Remoto (Internet)

1. **Usar ngrok para expor backend**
   ```bash
   ngrok http 3000
   ```

2. **Copiar URL pública**
   - Exemplo: `https://abc123.ngrok.io`

3. **Atualizar configuração**
   - Editar `frontend/src/config/api.ts`
   - Usar URL do ngrok

---

## 3. Checklist de Testes

### Autenticação
- [ ] Registrar novo usuário via SMS
- [ ] Registrar novo usuário via Email
- [ ] Verificar código de 6 dígitos
- [ ] Completar perfil (nome, apelido, CPF, CEP)
- [ ] Fazer login

### Mensagens
- [ ] Enviar mensagem de texto
- [ ] Enviar imagem
- [ ] Enviar áudio
- [ ] Enviar vídeo
- [ ] Receber mensagem
- [ ] Mensagem traduzida automaticamente
- [ ] Status de mensagem (enviada, entregue, lida)

### QR Code
- [ ] Gerar QR Code pessoal
- [ ] Escanear QR Code de outro usuário
- [ ] Conectar com novo usuário
- [ ] Visualizar histórico de conexões

### Busca de Usuários
- [ ] Buscar por nickname
- [ ] Buscar por nome
- [ ] Buscar por email
- [ ] Buscar por telefone
- [ ] Buscar por cidade
- [ ] Adicionar resultado como contato

### Carteira Digital
- [ ] Ver saldo
- [ ] Transferir para outro usuário (0% taxa)
- [ ] Pagar para fora do app (1%, 2%, 5% taxa)
- [ ] Converter moeda
- [ ] Ver histórico de transações
- [ ] Ver estatísticas

### Produtos
- [ ] Criar grupo de produtos
- [ ] Criar produto
- [ ] Editar produto
- [ ] Ativar/desativar produto
- [ ] Ver lista de produtos

### Configurações
- [ ] Mudar tema (claro/escuro)
- [ ] Selecionar fundo personalizado
- [ ] Editar perfil
- [ ] Alterar idioma

### Segurança
- [ ] Bloquear usuário
- [ ] Denunciar mensagem
- [ ] Ver lista de bloqueados
- [ ] Desbloquear usuário

### Backup
- [ ] Criar backup via dispositivo
- [ ] Criar backup via email
- [ ] Ver histórico de backups
- [ ] Deletar backup

---

## 4. Testes de Performance

### Velocidade
- [ ] App abre em menos de 3 segundos
- [ ] Mensagens enviam em menos de 1 segundo
- [ ] Busca de usuários retorna em menos de 2 segundos
- [ ] Transações processam em menos de 2 segundos

### Consumo de Dados
- [ ] Usar WiFi para medir consumo
- [ ] Verificar se está otimizado

### Bateria
- [ ] Usar app por 1 hora
- [ ] Verificar consumo de bateria

### Armazenamento
- [ ] Verificar tamanho do APK
- [ ] Verificar espaço usado no celular

---

## 5. Testes de Compatibilidade

### Android
- [ ] Android 8.0+
- [ ] Android 10
- [ ] Android 12
- [ ] Android 13
- [ ] Android 14

### iOS
- [ ] iOS 14+
- [ ] iOS 15
- [ ] iOS 16
- [ ] iOS 17

### Dispositivos
- [ ] Smartphone pequeno (5")
- [ ] Smartphone médio (6")
- [ ] Smartphone grande (6.5"+)
- [ ] Tablet

---

## 6. Testes de Conectividade

### WiFi
- [ ] Conectar e desconectar WiFi
- [ ] Mudar de WiFi
- [ ] WiFi lento (simular)

### Dados Móveis
- [ ] Conectar com 4G
- [ ] Conectar com 5G
- [ ] Mudar de rede

### Modo Offline
- [ ] Ativar modo avião
- [ ] Tentar usar app
- [ ] Desativar modo avião
- [ ] Sincronizar dados

---

## 7. Testes de Permissões

### Câmera
- [ ] Permitir acesso à câmera
- [ ] Negar acesso à câmera
- [ ] Revogar permissão depois

### Microfone
- [ ] Permitir acesso ao microfone
- [ ] Negar acesso ao microfone
- [ ] Gravar áudio

### Galeria
- [ ] Permitir acesso à galeria
- [ ] Negar acesso à galeria
- [ ] Enviar foto

### Localização
- [ ] Permitir acesso à localização
- [ ] Negar acesso à localização

### Contatos
- [ ] Permitir acesso aos contatos
- [ ] Negar acesso aos contatos

---

## 8. Testes de Idioma

### Tradução de Mensagens
- [ ] Enviar mensagem em português
- [ ] Receber em inglês (se configurado)
- [ ] Enviar mensagem em inglês
- [ ] Receber em português

### Suporte a Idiomas
- [ ] Português
- [ ] Inglês
- [ ] Espanhol
- [ ] Francês
- [ ] Alemão

---

## 9. Testes de Segurança

### Autenticação
- [ ] Tentar login com senha errada
- [ ] Tentar código de verificação errado
- [ ] Limite de 3 tentativas

### Dados Sensíveis
- [ ] CPF não é exibido completo
- [ ] Saldo é protegido
- [ ] Transações requerem confirmação

### Bloqueio
- [ ] Mensagens bloqueadas não aparecem
- [ ] Usuário bloqueado não pode enviar mensagens

---

## 10. Relatório de Testes

### Template

```
# Relatório de Testes - Atos2

**Data:** DD/MM/YYYY
**Testador:** Nome
**Dispositivo:** Modelo, Android/iOS X.X
**Versão do App:** 1.0.0

## Testes Passados
- ✓ Item 1
- ✓ Item 2

## Testes Falhados
- ✗ Item 1
  - Descrição do erro
  - Passos para reproduzir

## Observações
- Observação 1
- Observação 2

## Recomendações
- Recomendação 1
- Recomendação 2
```

---

## 11. Troubleshooting

### App não conecta ao backend
- Verificar IP local
- Verificar firewall
- Verificar se backend está rodando
- Usar ngrok se em rede diferente

### Mensagens não traduzem
- Verificar API key OpenAI
- Verificar idioma configurado
- Verificar conexão com internet

### QR Code não funciona
- Verificar câmera
- Verificar permissão de câmera
- Testar com QR code válido

### Transações falhando
- Verificar saldo
- Verificar limite de transação
- Verificar conexão com banco de dados

### App lento
- Verificar conexão de internet
- Fechar outros apps
- Reiniciar celular
- Limpar cache do app

---

## 12. Ferramentas Úteis

### Desenvolvimento
- **Expo CLI:** `npm install -g expo-cli`
- **React Native Debugger:** [Download](https://github.com/jhen0409/react-native-debugger)
- **Flipper:** [Download](https://fbflipper.com/)

### Teste
- **ngrok:** `npm install -g ngrok`
- **Charles Proxy:** Monitorar requisições
- **Android Studio:** Emulador Android
- **Xcode:** Emulador iOS

### Monitoramento
- **Sentry:** Rastreamento de erros
- **Firebase Analytics:** Análise de uso
- **Mixpanel:** Eventos de usuário

---

## 13. Próximas Etapas

1. ✅ Testar em celular real
2. ✅ Coletar feedback
3. ✅ Corrigir bugs encontrados
4. ✅ Otimizar performance
5. ✅ Publicar em app stores

---

**Versão:** 1.0  
**Data:** 24/10/2025  
**Status:** ✅ Pronto para Testes

