# 📦 Guia de Build APK - Atos2

## Opção 1: Build com Expo (Recomendado)

### Requisitos

- Conta Expo (gratuita em [https://expo.dev](https://expo.dev))

- Expo CLI instalado

- Node.js 18+

### Passos

1. **Instalar Expo CLI**

1. **Fazer login no Expo**

1. **Navegar para o projeto**

1. **Gerar APK para Android**

1. **Aguardar build completar**
  - Pode levar 10-15 minutos
  - Você receberá um link para download

1. **Baixar APK**
  - Acessar link fornecido
  - Ou usar: `eas build:list`

### Instalar no Celular

**Via USB (Recomendado)**

```bash
# Conectar celular via USB
# Ativar "Depuração USB" nas configurações do desenvolvedor

adb install app.apk
```

**Via Email/WhatsApp**

- Enviar arquivo APK

- Abrir no celular

- Clicar em "Instalar"

**Via QR Code**

- Usar serviço como [https://qr-server.com](https://qr-server.com)

- Gerar QR code do link do APK

- Escanear com celular

---

## Opção 2: Build com Android Studio

### Requisitos

- Android Studio instalado

- Android SDK 21+

- Java Development Kit (JDK) 11+

- Mínimo 4GB RAM

### Passos

1. **Instalar dependências**

1. **Criar projeto React Native**

1. **Copiar código do frontend**

1. **Gerar APK**

---

## Opção 3: Build Manual com Gradle

### Passos

1. **Instalar Android SDK**

1. **Configurar ANDROID_HOME**

1. **Gerar APK**

1. **APK gerado em**

---

## Configuração Pré-Build

### 1. Atualizar app.json

```json
{
  "expo": {
    "name": "Atos2",
    "slug": "atos2",
    "version": "1.0.0",
    "android": {
      "package": "com.atos2.app",
      "versionCode": 1
    }
  }
}
```

### 2. Configurar Variáveis de Ambiente

Criar `.env.mobile`:

```
REACT_APP_API_URL=https://api.atos2.app
REACT_APP_WS_URL=wss://api.atos2.app
REACT_APP_OPENAI_KEY=sk-...
```

### 3. Atualizar Configuração de API

Editar `frontend/src/config/api.ts`:

```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

export const api = {
  baseURL: API_URL,
  wsURL: WS_URL,
  timeout: 30000
};
```

---

## Assinatura de APK

### Gerar Chave de Assinatura

```bash
# Gerar keystore
keytool -genkey -v -keystore atos2.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias atos2

# Informações solicitadas:
# - Senha do keystore
# - Nome e Sobrenome
# - Unidade Organizacional
# - Organização
# - Cidade
# - Estado
# - Código do País (BR)
```

### Assinar APK

```bash
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore atos2.keystore \
  app-unsigned.apk atos2

# Zipalign (otimizar)
zipalign -v 4 app-unsigned.apk app-signed.apk
```

---

## Testes Pré-Build

### 1. Validar Código

```bash
npm run lint
npm run type-check
```

### 2. Executar Testes

```bash
npm test
```

### 3. Testar Localmente

```bash
npm run dev
# Escanear QR code com Expo Go
```

---

## Troubleshooting

### Build Falha com "gradle not found"

```bash
# Instalar gradle
brew install gradle

# Ou definir GRADLE_HOME
export GRADLE_HOME=/path/to/gradle
```

### Erro "Android SDK not found"

```bash
# Instalar Android SDK
sdkmanager "platforms;android-34"
sdkmanager "build-tools;34.0.0"

# Definir ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk
```

### APK muito grande

```bash
# Habilitar ProGuard
# Em android/app/build.gradle:
# minifyEnabled true
# shrinkResources true
```

### App não inicia

```bash
# Verificar logs
adb logcat | grep atos2

# Ou via Android Studio
# Logcat → Filter: atos2
```

---

## Distribuição

### Google Play Store

1. Criar conta Google Play Developer ($25)

1. Preparar screenshots e descrição

1. Fazer upload do APK

1. Configurar preço (gratuito ou pago)

1. Submeter para revisão

### APK Direto

1. Fazer upload em servidor

1. Compartilhar link

1. Usuários baixam e instalam

### Beta Testing

1. Usar Google Play Beta

1. Ou usar TestFlight (iOS)

1. Convidar testadores

1. Coletar feedback

---

## Monitoramento Pós-Build

### Rastreamento de Erros

```bash
# Instalar Sentry
npm install @sentry/react-native

# Configurar em App.tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://...@sentry.io/...",
});
```

### Analytics

```bash
# Instalar Firebase
npm install firebase

# Configurar em App.tsx
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
```

---

## Checklist de Build

- [ ] Código testado e validado

- [ ] Versão atualizada em app.json

- [ ] Variáveis de ambiente configuradas

- [ ] API URL configurada

- [ ] Logo e splash screen prontos

- [ ] Permissões configuradas

- [ ] Keystore gerado e seguro

- [ ] APK assinado

- [ ] Tamanho do APK otimizado

- [ ] Testes em dispositivo real

- [ ] Documentação atualizada

---

## Próximas Etapas

1. ✅ Gerar APK

1. ✅ Testar em celular

1. ✅ Coletar feedback

1. ✅ Corrigir bugs

1. ✅ Publicar em Play Store

---

**Versão:** 1.0**Data:** 24/10/2025**Status:** ✅ Pronto para Build

