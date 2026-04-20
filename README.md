# Atos2 - Comunidade, Finanças e Marketplace 🚀

Plataforma nativa para troca de mensagens (textos e mídias), transações financeiras em tempo real e vitrine comercial P2P. A arquitetura foi desenvolvida priorizando o ecossistema Android nativo (React Native/Expo) consumindo um robusto Backend em nuvem.

> 📚 **[Acesse o Mapa Documental Completo (DOCUMENTATION_MAP.md)](DOCUMENTATION_MAP.md)** para encontrar todos os Manuais, Guias de Deploy, Regras Estruturais e Documentação Legal (Termos de Uso e LGPD).

## 🚀 Características

### Autenticação e Perfil
- ✅ Registro de usuários com validação completa
- ✅ Login seguro com JWT
- ✅ Suporte para Pessoa Física (PF) e Pessoa Jurídica (PJ)
- ✅ Integração com ViaCEP para endereçamento automático
- ✅ Armazenamento seguro de CPF/CNPJ
- ✅ Perfil de usuário completo

### Mensagens em Tempo Real
- ✅ Suporte para texto, imagens, áudios e vídeos
- ✅ WebSocket para comunicação em tempo real
- ✅ Status de mensagem (enviada, entregue, lida)
- ✅ Histórico de conversas
- ✅ Contadores de mensagens não lidas

### Sistema de Transações
- ✅ Carteira digital com saldo em cash
- ✅ Tipos de transação: depósito, saque, transferência, pagamento, reembolso
- ✅ Histórico completo de transações
- ✅ Auditoria de operações financeiras
- ✅ Transações ACID com rollback automático

### Produtos
- ✅ Catálogo de produtos por usuário
- ✅ Gerenciamento de estoque
- ✅ Categorização de produtos

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- npm ou pnpm

## 🔧 Instalação

### 1. Clonar o repositório
```bash
git clone <seu-repositorio>
cd app_mensagens_cash
```

### 2. Instalar dependências
```bash
npm install
# ou
pnpm install
```

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=app_mensagens_cash

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=sua_chave_secreta_aqui
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
```

### 4. Criar banco de dados
```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar banco de dados
CREATE DATABASE atos2;

# Sair
\q
```

### 5. Executar migrations
```bash
# Conectar ao banco de dados e executar o script SQL
psql -U postgres -d atos2 -f src/config/init-db.sql
```

### 6. Iniciar o servidor
```bash
# Modo desenvolvimento
npm run dev

# Ou compilar e rodar em produção
npm run build
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 📚 Documentação da API

### Autenticação

#### Registrar novo usuário
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "+5511999999999",
  "nickname": "usuario123",
  "name": "João Silva",
  "personType": "PF",
  "cpf": "12345678900",
  "cep": "01310100",
  "password": "Senha@123",
  "passwordConfirm": "Senha@123"
}
```

**Resposta (201):**
```json
{
  "success": true,
  "message": "Usuário registrado com sucesso",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "usuario123",
      "name": "João Silva",
      "personType": "PF",
      "cpf": "12345678900",
      "balance": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Senha@123"
}
```

#### Obter dados do usuário autenticado
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Renovar token
```http
POST /api/auth/refresh-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## 🏗️ Estrutura do Projeto

```
app_mensagens_cash/
├── src/
│   ├── config/
│   │   ├── database.ts       # Configuração PostgreSQL
│   │   ├── redis.ts          # Configuração Redis
│   │   └── init-db.sql       # Script de inicialização do banco
│   ├── controllers/
│   │   └── authController.ts # Lógica de autenticação
│   ├── middleware/
│   │   ├── auth.ts           # Middleware de autenticação JWT
│   │   └── errorHandler.ts   # Tratamento de erros
│   ├── routes/
│   │   └── auth.ts           # Rotas de autenticação
│   ├── services/
│   │   ├── userService.ts    # Serviço de usuários
│   │   ├── messageService.ts # Serviço de mensagens
│   │   └── transactionService.ts # Serviço de transações
│   ├── types/
│   │   └── index.ts          # Tipos TypeScript
│   ├── utils/
│   │   ├── jwt.ts            # Utilitários JWT
│   │   └── password.ts       # Utilitários de senha
│   └── index.ts              # Arquivo principal
├── public/                   # Arquivos estáticos
├── .env.example              # Exemplo de variáveis de ambiente
├── tsconfig.json             # Configuração TypeScript
├── package.json              # Dependências do projeto
└── README.md                 # Este arquivo
```

## 🔐 Segurança

### Implementado
- ✅ Senhas com hash bcrypt (10 rounds)
- ✅ JWT com expiração configurável
- ✅ CORS restritivo
- ✅ Helmet para headers de segurança
- ✅ Validação de entrada rigorosa
- ✅ Transações ACID para operações financeiras
- ✅ Auditoria de operações

### Recomendações para Produção
- ⚠️ Usar HTTPS obrigatoriamente
- ⚠️ Implementar rate limiting
- ⚠️ Adicionar 2FA (autenticação de dois fatores)
- ⚠️ Encriptação end-to-end para mensagens privadas
- ⚠️ Backup automático do banco de dados
- ⚠️ Monitoramento e alertas

## 🗄️ Banco de Dados

### Tabelas Principais

#### users
- Armazena dados de usuários (PF/PJ)
- Campos: id, email, phone, nickname, name, cpf, cep, address, balance, etc.

#### messages
- Armazena mensagens entre usuários
- Suporta: texto, imagem, áudio, vídeo
- Status: enviada, entregue, lida

#### transactions
- Histórico de todas as transações
- Tipos: depósito, saque, transferência, pagamento, reembolso
- Status: pendente, concluída, falha, cancelada

#### products
- Catálogo de produtos por usuário
- Campos: name, description, price, stock, category

#### contacts
- Lista de contatos de cada usuário

## 🔄 Roadmap & Escopo em Produção

Para consultar o status atual da arquitetura e as próximas fronteiras técnicas do back e front-end, por favor documente-se no Guia Prático Central:
* **[Escopo e Roadmap Arquitetural (PROJECT_SCOPE.md)](project-scope.md)**

Todos os próximos passos estão agora sendo versionados dentro da esteira de Documentação Principal para acompanhamento unificado.

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

## 📄 Licença

ISC

