# 🚀 Guia Rápido - Gerar APK Atos2

## ⚡ 5 Passos Simples

### Passo 1: Fazer Login no EAS

```bash
cd /home/ubuntu/atos2
eas login
```

**Instruções:**

- Digite seu email Expo

- Digite sua senha

- Pressione Enter

### Passo 2: Verificar Login

```bash
eas whoami
```

**Esperado:** Seu email/username deve aparecer

### Passo 3: Gerar APK

```bash
cd /home/ubuntu/atos2
eas build --platform android --type apk
```

**Informações:**

- Isso iniciará o build na nuvem Expo

- Levará 10-15 minutos

- Você receberá um link para download

### Passo 4: Acompanhar Build

```bash
# Ver status do build
eas build:list

# Ver logs em tempo real
eas build:view [BUILD_ID]
```

### Passo 5: Baixar e Instalar

**Opção A: Via Link Direto**

- Copiar link fornecido pelo EAS

- Abrir no navegador do celular

- Clicar em "Download"

- Abrir arquivo e instalar

**Opção B: Via USB**

```bash
# Conectar celular via USB
# Ativar "Depuração USB" nas configurações

# Baixar APK
eas build:list
# Copiar URL do APK

# Instalar
adb install app.apk
```

**Opção C: Via Email/WhatsApp**

- Copiar link do APK

- Enviar para seu email ou WhatsApp

- Abrir no celular

- Clicar em "Instalar"

---

## 📋 Comandos Úteis

```bash
# Login
eas login

# Ver usuário logado
eas whoami

# Logout
eas logout

# Gerar APK
eas build --platform android --type apk

# Ver builds anteriores
eas build:list

# Ver detalhes de um build
eas build:view [BUILD_ID]

# Cancelar build
eas build:cancel [BUILD_ID]

# Ver logs de um build
eas build:log [BUILD_ID]
```

---

## ✅ Checklist

- [ ] Conta Expo criada ([https://expo.dev](https://expo.dev))

- [ ] EAS CLI instalado (`npm install -g eas-cli`)

- [ ] Fazer login (`eas login`)

- [ ] Verificar login (`eas whoami`)

- [ ] Gerar APK (`eas build --platform android --type apk`)

- [ ] Aguardar 10-15 minutos

- [ ] Baixar APK

- [ ] Instalar no celular

- [ ] Testar app

---

## 🆘 Troubleshooting

### "Not logged in"

```bash
eas login
# Digite suas credenciais Expo
```

### "app.json not found"

```bash
cd /home/ubuntu/atos2
# Certifique-se de estar no diretório correto
```

### "Build failed"

```bash
# Ver logs
eas build:view [BUILD_ID]

# Verificar app.json
cat app.json

# Verificar dependências
npm install
```

### "APK muito grande"

- Isso é normal (50-100MB)

- Otimizações virão em versões futuras

### "Não consegue instalar"

- Verificar espaço em disco no celular

- Desinstalar versão anterior

- Ativar "Fontes desconhecidas" nas configurações

---

## 📱 Após Instalar

1. ✅ Abrir app Atos2

1. ✅ Registrar novo usuário (SMS ou Email)

1. ✅ Seguir guia de testes: `MOBILE_TESTING_GUIDE.md`

1. ✅ Coletar feedback

1. ✅ Reportar bugs

---

## 📚 Documentação Completa

- `MOBILE_TESTING_GUIDE.md` - Guia de testes completo

- `BUILD_APK.md` - Guia detalhado de build

- `README.md` - Documentação do projeto

---

## 🎯 Próximas Etapas

1. ✅ Gerar APK

1. ✅ Testar em celular

1. ✅ Coletar feedback

1. ✅ Corrigir bugs

1. ✅ Publicar em Play Store

---

**Versão:** 1.0**Data:** 24/10/2025**Status:** ✅ Pronto para Usar

