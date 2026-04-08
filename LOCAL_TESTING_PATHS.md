# 🖥️ Guia Completo: Testar Atos2 na Máquina Local

## 📋 Visão Geral

Existem **5 caminhos principais** para testar o Atos2 localmente. Escolha o que melhor se adequa ao seu caso.

---

## 🎯 5 Caminhos Possíveis

```
┌─────────────────────────────────────────────────────────┐
│                   TESTAR ATOS2 LOCALMENTE               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. APENAS FRONTEND (React Web)                        │
│     └─ npm run dev                                     │
│     └─ Acesso: http://localhost:5173                  │
│                                                         │
│  2. APENAS BACKEND (API REST)                          │
│     └─ npm run dev                                     │
│     └─ Acesso: http://localhost:3000                  │
│                                                         │
│  3. FRONTEND + BACKEND (Full Stack)                    │
│     └─ Terminal 1: npm run dev (backend)              │
│     └─ Terminal 2: npm run dev (frontend)             │
│     └─ Acesso: http://localhost:5173                  │
│                                                         │
│  4. COM BANCO DE DADOS (PostgreSQL + Redis)           │
│     └─ Terminal 1: PostgreSQL                          │
│     └─ Terminal 2: Redis                               │
│     └─ Terminal 3: Backend                             │
│     └─ Terminal 4: Frontend                            │
│                                                         │
│  5. MOBILE (Expo/React Native)                         │
│     └─ npm start (Expo)                               │
│     └─ Escanear QR Code com Expo Go                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Caminho 1: Apenas Frontend (React Web)

### Melhor para:
- Testar interface visual
- Testar componentes
- Testar responsividade
- Desenvolvimento rápido

### Requisitos
- Node.js 18+
- npm ou yarn

### Passos

```bash
# 1. Navegar para frontend
cd /home/ubuntu/atos2/frontend

# 2. Instalar dependências
npm install

# 3. Iniciar servidor
npm run dev

# 4. Abrir no navegador
# http://localhost:5173
```

### Funcionalidades Disponíveis
- ✅ Páginas (Login, Chat, QR Code, etc)
- ✅ Componentes (Button, Input, Card, etc)
- ✅ Tema (Claro/Escuro)
- ✅ Fundos personalizáveis
- ❌ Conexão com backend
- ❌ Autenticação real
- ❌ Banco de dados

### Modo Responsivo
```
Pressione F12 → Device Toolbar → Selecione iPhone/Android
```

---

## 🔌 Caminho 2: Apenas Backend (API REST)

### Melhor para:
- Testar endpoints
- Testar lógica de negócio
- Testar validações
- Testar segurança

### Requisitos
- Node.js 18+
- npm ou yarn
- PostgreSQL (opcional)
- Redis (opcional)

### Passos

```bash
# 1. Navegar para backend
cd /home/ubuntu/atos2

# 2. Instalar dependências
npm install

# 3. Copiar arquivo .env
cp .env.example .env

# 4. Iniciar servidor
npm run dev

# 5. Testar API
# GET http://localhost:3000/api/health
```

### Testar Endpoints com cURL

```bash
# Teste de saúde
curl http://localhost:3000/api/health

# Listar moedas
curl http://localhost:3000/api/wallet/currencies

# Enviar SMS
curl -X POST http://localhost:3000/api/auth/send-sms-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "+5511999999999"}'
```

### Testar com Postman/Insomnia
1. Baixar: https://www.postman.com/downloads/
2. Criar nova requisição
3. URL: `http://localhost:3000/api/...`
4. Testar endpoints

### Funcionalidades Disponíveis
- ✅ Endpoints da API
- ✅ Validações
- ✅ Lógica de negócio
- ✅ Tratamento de erros
- ❌ Interface visual
- ❌ Banco de dados (sem PostgreSQL)
- ❌ Cache (sem Redis)

---

## 🔄 Caminho 3: Frontend + Backend (Full Stack)

### Melhor para:
- Testar integração completa
- Testar fluxos de usuário
- Testar comunicação API
- Desenvolvimento completo

### Requisitos
- Node.js 18+
- npm ou yarn
- 2 terminais

### Passos

```bash
# TERMINAL 1: Backend
cd /home/ubuntu/atos2
npm install
npm run dev

# TERMINAL 2: Frontend
cd /home/ubuntu/atos2/frontend
npm install
npm run dev

# Abrir no navegador
# http://localhost:5173
```

### Fluxo de Teste

1. **Abrir Frontend**
   - http://localhost:5173

2. **Testar Registro**
   - Clicar em "Registrar"
   - Preencher dados
   - Enviar SMS/Email

3. **Testar Chat**
   - Enviar mensagem
   - Receber resposta

4. **Testar QR Code**
   - Gerar QR Code
   - Escanear

5. **Testar Transações**
   - Criar transação
   - Ver histórico

### Funcionalidades Disponíveis
- ✅ Interface visual
- ✅ Endpoints da API
- ✅ Integração completa
- ✅ Fluxos de usuário
- ❌ Banco de dados (sem PostgreSQL)
- ❌ Cache (sem Redis)
- ❌ Autenticação real (sem SMS/Email)

---

## 💾 Caminho 4: Com Banco de Dados (Full Stack + DB)

### Melhor para:
- Testar com dados reais
- Testar persistência
- Testar transações
- Testar performance
- Ambiente de produção

### Requisitos
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- 4 terminais

### Passos

```bash
# TERMINAL 1: PostgreSQL
# (Já deve estar rodando)
sudo service postgresql start
# ou
brew services start postgresql

# TERMINAL 2: Redis
redis-server

# TERMINAL 3: Backend
cd /home/ubuntu/atos2
npm install
npm run dev

# TERMINAL 4: Frontend
cd /home/ubuntu/atos2/frontend
npm install
npm run dev
```

### Configurar Banco de Dados

```bash
# Criar banco de dados
createdb atos2

# Executar migrations
psql atos2 < src/config/init-db.sql

# Verificar tabelas
psql atos2 -c "\dt"
```

### Testar Banco de Dados

```bash
# Conectar ao banco
psql atos2

# Ver usuários
SELECT * FROM users;

# Ver transações
SELECT * FROM transactions;

# Ver mensagens
SELECT * FROM messages;

# Sair
\q
```

### Funcionalidades Disponíveis
- ✅ Interface visual
- ✅ Endpoints da API
- ✅ Integração completa
- ✅ Banco de dados
- ✅ Cache com Redis
- ✅ Persistência de dados
- ✅ Transações ACID
- ❌ Autenticação real (sem SMS/Email)

---

## 📱 Caminho 5: Mobile (Expo/React Native)

### Melhor para:
- Testar em celular
- Testar responsividade mobile
- Testar gestos/touch
- Testar performance mobile

### Requisitos
- Node.js 18+
- npm ou yarn
- Expo CLI
- Expo Go instalado no celular

### Passos

```bash
# 1. Instalar Expo CLI
npm install -g expo-cli

# 2. Navegar para frontend
cd /home/ubuntu/atos2/frontend

# 3. Instalar dependências
npm install

# 4. Iniciar Expo
npm start

# 5. Escanear QR Code
# Android: Abrir Expo Go e escanear
# iOS: Abrir câmera e escanear
```

### Testar no Celular

1. **Instalar Expo Go**
   - Android: Google Play Store
   - iOS: Apple App Store

2. **Escanear QR Code**
   - Android: Abrir Expo Go → Escanear
   - iOS: Abrir câmera → Escanear

3. **App carrega no celular**
   - Alterações aparecem em tempo real

### Funcionalidades Disponíveis
- ✅ Interface mobile
- ✅ Responsividade
- ✅ Gestos/Touch
- ✅ Câmera
- ✅ Galeria
- ✅ Permissões
- ❌ Banco de dados (sem PostgreSQL)
- ❌ Autenticação real (sem SMS/Email)

---

## 📊 Comparação dos 5 Caminhos

| Caminho | Tempo | Complexidade | Funcionalidades | Melhor Para |
|---------|-------|-------------|-----------------|------------|
| **1. Frontend** | 5 min | ⭐ Fácil | UI/UX | Design |
| **2. Backend** | 5 min | ⭐ Fácil | API | Lógica |
| **3. Full Stack** | 10 min | ⭐⭐ Médio | Integração | Fluxos |
| **4. Full + DB** | 15 min | ⭐⭐⭐ Difícil | Tudo | Produção |
| **5. Mobile** | 10 min | ⭐⭐ Médio | Mobile | Celular |

---

## 🔧 Instalação de Dependências

### PostgreSQL

**Windows:**
```bash
# Baixar: https://www.postgresql.org/download/windows/
# Ou usar Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

### Redis

**Windows:**
```bash
# Baixar: https://github.com/microsoftarchive/redis/releases
# Ou usar WSL:
wsl
sudo apt-get install redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo service redis-server start
```

---

## 🧪 Testes Automatizados

### Executar Testes

```bash
# Testes de validação
cd /home/ubuntu/atos2
bash test-validation.sh

# Testes de integração
bash quick-test.sh

# Testes com Jest
npm test

# Testes com coverage
npm test -- --coverage
```

---

## 🐛 Debugging

### Backend

```bash
# Com logs detalhados
DEBUG=* npm run dev

# Com Node Inspector
node --inspect src/index.ts

# Abrir em Chrome
chrome://inspect
```

### Frontend

```bash
# Abrir DevTools
F12

# Console
Ctrl + Shift + J

# Network
Ctrl + Shift + E

# React DevTools
# Extensão do Chrome
```

---

## 📝 Checklist de Testes

### Caminho 1 (Frontend)
- [ ] App abre sem erros
- [ ] Páginas carregam
- [ ] Tema claro/escuro funciona
- [ ] Fundos personalizáveis funcionam
- [ ] Responsividade OK

### Caminho 2 (Backend)
- [ ] Servidor inicia
- [ ] Endpoints respondem
- [ ] Validações funcionam
- [ ] Erros são tratados
- [ ] Logs aparecem

### Caminho 3 (Full Stack)
- [ ] Frontend conecta ao backend
- [ ] Dados são enviados/recebidos
- [ ] Fluxos funcionam
- [ ] Sem erros de CORS
- [ ] Performance OK

### Caminho 4 (Full + DB)
- [ ] Banco de dados conecta
- [ ] Dados são persistidos
- [ ] Transações funcionam
- [ ] Cache funciona
- [ ] Sem erros de conexão

### Caminho 5 (Mobile)
- [ ] App abre no celular
- [ ] Gestos funcionam
- [ ] Câmera funciona
- [ ] Galeria funciona
- [ ] Performance OK

---

## 🆘 Troubleshooting

### "Port 3000 already in use"
```bash
# Matar processo
lsof -i :3000
kill -9 PID

# Ou usar porta diferente
PORT=3001 npm run dev
```

### "Port 5173 already in use"
```bash
# Matar processo
lsof -i :5173
kill -9 PID
```

### "PostgreSQL connection refused"
```bash
# Verificar se está rodando
sudo service postgresql status

# Iniciar
sudo service postgresql start

# Ou criar banco
createdb atos2
```

### "Redis connection refused"
```bash
# Verificar se está rodando
redis-cli ping

# Iniciar
redis-server

# Ou em background
redis-server &
```

### "npm install fails"
```bash
# Limpar cache
npm cache clean --force

# Remover node_modules
rm -rf node_modules package-lock.json

# Instalar novamente
npm install
```

---

## 🎯 Recomendações

### Para Iniciantes
→ Comece com **Caminho 1** (Frontend)
→ Depois **Caminho 2** (Backend)
→ Depois **Caminho 3** (Full Stack)

### Para Desenvolvedores
→ Comece com **Caminho 3** (Full Stack)
→ Depois **Caminho 4** (Com Banco)
→ Depois **Caminho 5** (Mobile)

### Para Produção
→ Use **Caminho 4** (Full + DB)
→ Com todas as dependências
→ Com testes automatizados

---

## 📚 Documentação Relacionada

- `README.md` - Documentação principal
- `QUICK_START_APK.md` - Gerar APK
- `MOBILE_TESTING_GUIDE.md` - Testar em celular
- `TESTING_GUIDE.md` - Guia de testes

---

**Versão:** 1.0  
**Data:** 24/10/2025  
**Status:** ✅ Pronto para Usar

