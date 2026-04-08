# 🚀 Guia Passo a Passo: Gerar APK no Expo.dev

## 📋 Visão Geral

Este guia mostra **exatamente o que copiar e onde colar** no site Expo.dev para gerar o APK do Atos2.

---

## 🔧 Pré-requisitos

1. ✅ Conta Expo criada (https://expo.dev)
2. ✅ Estar logado no Expo.dev
3. ✅ Projeto Atos2 no GitHub (recomendado) ou arquivo ZIP

---

## ⚡ Método 1: Usando GitHub (Recomendado)

### Passo 1: Fazer Upload do Projeto para GitHub

**1.1 Criar repositório no GitHub**
- Acesse: https://github.com/new
- Nome: `atos2`
- Descrição: `Atos2 - App de Mensagens com Carteira Digital`
- Selecione: "Public" ou "Private"
- Clique: "Create repository"

**1.2 Fazer upload do projeto**

```bash
cd /home/ubuntu/atos2

# Inicializar git
git init

# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Initial commit - Atos2 v1.0"

# Adicionar remote (substitua USERNAME e REPO)
git remote add origin https://github.com/USERNAME/atos2.git

# Fazer push
git branch -M main
git push -u origin main
```

### Passo 2: Acessar Expo.dev

1. Acesse: https://expo.dev
2. Clique em "Sign in" (canto superior direito)
3. Faça login com sua conta Expo

### Passo 3: Criar Novo Projeto

1. Clique em "New project" ou "Create"
2. Selecione: "Existing project"
3. Cole a URL do GitHub:
   ```
   https://github.com/USERNAME/atos2
   ```
4. Clique em "Continue"

### Passo 4: Configurar Build

1. Selecione: "Android"
2. Selecione: "APK" (não "AAB")
3. Clique em "Start build"

### Passo 5: Aguardar Build

- Status mudará para "Building..."
- Aguarde 10-15 minutos
- Quando terminar, clique em "Download"

---

## 🎯 Método 2: Usando ZIP (Se não tiver GitHub)

### Passo 1: Criar ZIP do Projeto

```bash
cd /home/ubuntu
zip -r atos2.zip atos2/ -x "atos2/node_modules/*" "atos2/.git/*"
```

### Passo 2: Fazer Upload no Expo

1. Acesse: https://expo.dev/dashboard
2. Clique em "New project"
3. Selecione: "Upload project"
4. Selecione o arquivo `atos2.zip`
5. Clique em "Upload"

### Passo 3: Configurar Build

1. Após upload, clique no projeto
2. Vá para "Builds"
3. Clique em "New build"
4. Selecione: "Android"
5. Selecione: "APK"
6. Clique em "Start build"

### Passo 4: Aguardar e Baixar

- Aguarde 10-15 minutos
- Clique em "Download" quando terminar

---

## 📱 Método 3: Usando CLI (Linha de Comando)

### Passo 1: Fazer Login

```bash
eas login
```

**O que fazer:**
- Digite seu email Expo
- Digite sua senha
- Pressione Enter

### Passo 2: Inicializar Projeto

```bash
cd /home/ubuntu/atos2
eas init
```

**O que fazer:**
- Escolha: "Use existing Expo project"
- Confirme o nome do projeto
- Pressione Enter

### Passo 3: Gerar APK

```bash
eas build --platform android --type apk
```

**O que fazer:**
- Aguarde o build completar (10-15 minutos)
- Você receberá um link para download

### Passo 4: Baixar APK

```bash
# Ver lista de builds
eas build:list

# Copiar o link do APK
# Colar em um navegador para baixar
```

---

## 🔍 Onde Encontrar o Link do APK

### No Site Expo.dev

1. Acesse: https://expo.dev/dashboard
2. Clique no seu projeto "atos2"
3. Vá para aba "Builds"
4. Procure pelo build mais recente (Android, APK)
5. Clique em "Download" ou copie o link

### No Terminal

```bash
eas build:list
```

**Procure por:**
```
┌─────────────────────────────────────────┐
│ Download URL: https://eas-builds.s3... │
└─────────────────────────────────────────┘
```

---

## 📋 Checklist: O Que Você Precisa

### Para GitHub:
- [ ] Conta GitHub criada
- [ ] Repositório criado
- [ ] Projeto feito upload
- [ ] URL do repositório: `https://github.com/USERNAME/atos2`

### Para ZIP:
- [ ] Arquivo `atos2.zip` criado
- [ ] Arquivo com menos de 500MB

### Para CLI:
- [ ] EAS CLI instalado
- [ ] Estar logado no Expo
- [ ] Estar no diretório `/home/ubuntu/atos2`

---

## 🆘 Troubleshooting

### "Build falhou"
**Solução:**
1. Verificar `app.json` está correto
2. Verificar se há erros em `package.json`
3. Tentar novamente

### "Arquivo muito grande"
**Solução:**
1. Remover pasta `node_modules`
2. Remover pasta `.git`
3. Remover pasta `frontend/node_modules`
4. Criar ZIP novamente

### "Não consigo fazer upload"
**Solução:**
1. Verificar conexão de internet
2. Tentar em outro navegador
3. Limpar cache do navegador

### "Build muito lento"
**Solução:**
1. Isso é normal (10-15 minutos)
2. Não feche a página
3. Você pode fechar e voltar depois

### "Link do APK expirou"
**Solução:**
1. Gerar novo build
2. Ou fazer download novamente

---

## 📊 Resumo dos 3 Métodos

| Método | Dificuldade | Tempo | Requer |
|--------|-----------|-------|---------|
| **GitHub** | ⭐ Fácil | 20 min | GitHub + Git |
| **ZIP** | ⭐⭐ Médio | 15 min | Arquivo ZIP |
| **CLI** | ⭐⭐⭐ Difícil | 20 min | Terminal |

---

## ✅ Após Gerar o APK

1. ✅ Copiar link do APK
2. ✅ Gerar QR Code
3. ✅ Escanear com celular
4. ✅ Instalar app
5. ✅ Testar funcionalidades

---

## 🎯 Próximas Etapas

1. Escolher método (GitHub recomendado)
2. Seguir passos acima
3. Gerar APK
4. Baixar APK
5. Instalar no celular

---

## 📚 Documentação Relacionada

- `QUICK_START_APK.md` - Guia rápido
- `QR_CODE_INSTALL.md` - Gerar QR Code
- `MOBILE_TESTING_GUIDE.md` - Testar app
- `BUILD_APK.md` - Guia detalhado

---

**Versão:** 1.0  
**Data:** 24/10/2025  
**Status:** ✅ Pronto para Usar

