# Guia de QR Code e Busca de Usuários - Atos2

## 🔐 Sistema de QR Code

### Visão Geral

O sistema de QR Code permite que usuários se conectem rapidamente compartilhando um código QR. Quando um usuário escaneia o QR Code de outro, ambos são automaticamente adicionados como contatos.

### Funcionalidades

✅ **Geração de QR Code**
- Cada usuário pode gerar seu próprio QR Code
- QR Code contém dados do usuário (ID, nickname, nome, foto)
- Nunca expira
- Pode ser regenerado a qualquer momento

✅ **Escanear QR Code**
- Ler QR Code de outro usuário
- Adicionar automaticamente como contato
- Registrar histórico de conexões

✅ **Histórico de Conexões**
- Ver todos os QR Codes gerados
- Ver quem escaneou seu QR Code
- Data e hora de cada interação

### Dados do QR Code

```json
{
  "userId": "uuid-do-usuario",
  "nickname": "usuario123",
  "name": "João Silva",
  "profileImage": "url-da-foto",
  "timestamp": 1705329600000
}
```

## 📡 Endpoints de QR Code

### Gerar QR Code

```http
POST /api/qrcode/generate
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "QR Code gerado com sucesso",
  "data": {
    "qrCodeId": "uuid",
    "qrCodeImage": "data:image/png;base64,...",
    "expiresAt": null,
    "user": {
      "id": "uuid",
      "nickname": "usuario123",
      "name": "João Silva",
      "profileImage": "url-da-foto"
    }
  }
}
```

### Escanear QR Code

```http
POST /api/qrcode/scan
Authorization: Bearer <token>
Content-Type: application/json

{
  "qrCodeString": "{\"userId\":\"...\",\"nickname\":\"...\",\"name\":\"...\",\"profileImage\":\"...\",\"timestamp\":...}"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "QR Code escaneado com sucesso. Contato adicionado!",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone": "+5511999999999",
      "nickname": "usuario123",
      "name": "João Silva",
      "personType": "PF",
      "cep": "01310100",
      "address": "Avenida Paulista",
      "city": "São Paulo",
      "state": "SP",
      "profileImage": "url-da-foto",
      "status": "Disponível",
      "preferredLanguage": "pt-BR"
    }
  }
}
```

### Obter Histórico de QR Codes

```http
GET /api/qrcode/history
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Histórico de QR Codes",
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "scanned_by": "uuid-do-usuario-que-escaneou",
      "scanned_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T09:30:00Z",
      "expires_at": "2024-01-16T09:30:00Z"
    }
  ]
}
```

### Obter QR Code Específico

```http
GET /api/qrcode/:qrCodeId
Authorization: Bearer <token>
```

---

## 🔍 Sistema de Busca de Usuários

### Visão Geral

O sistema de busca permite encontrar outros usuários por diversos critérios sem expor dados sensíveis como saldo e histórico de transações.

### Campos Pesquisáveis

✅ **Disponíveis para busca:**
- Nickname
- Nome
- Email
- Telefone
- Cidade
- Estado
- Tipo de Pessoa (PF/PJ)

❌ **NÃO disponíveis para busca:**
- Saldo em cash
- Histórico de transações
- CPF/CNPJ completo (apenas para próprio usuário)

### Tipos de Busca

#### 1. Busca Geral

```http
GET /api/users/search?nickname=usuario&name=João&city=São Paulo&limit=20&offset=0
Authorization: Bearer <token>
```

**Parâmetros:**
- `nickname` (opcional): Buscar por nickname
- `name` (opcional): Buscar por nome
- `email` (opcional): Buscar por email
- `phone` (opcional): Buscar por telefone
- `city` (opcional): Buscar por cidade
- `state` (opcional): Buscar por estado
- `personType` (opcional): Filtrar por PF ou PJ
- `limit` (opcional): Máximo de resultados (padrão: 20)
- `offset` (opcional): Deslocamento para paginação (padrão: 0)

#### 2. Busca por Nickname

```http
GET /api/users/search/nickname?nickname=usuario123&limit=20
Authorization: Bearer <token>
```

#### 3. Busca por Nome

```http
GET /api/users/search/name?name=João Silva&limit=20
Authorization: Bearer <token>
```

#### 4. Busca por Cidade

```http
GET /api/users/search/city?city=São Paulo&limit=20
Authorization: Bearer <token>
```

#### 5. Busca por Estado

```http
GET /api/users/search/state?state=SP&limit=20
Authorization: Bearer <token>
```

#### 6. Busca Avançada

```http
GET /api/users/search/advanced?nickname=usuario&name=João&city=São Paulo&state=SP&personType=PF&limit=20
Authorization: Bearer <token>
```

#### 7. Usuários Populares (Mais Recentes)

```http
GET /api/users/popular?limit=10
Authorization: Bearer <token>
```

#### 8. Contagem Total de Usuários

```http
GET /api/users/count
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Total de usuários",
  "data": {
    "count": 150
  }
}
```

### Resposta de Busca

```json
{
  "success": true,
  "message": "5 usuário(s) encontrado(s)",
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "phone": "+5511999999999",
        "nickname": "usuario123",
        "name": "João Silva",
        "personType": "PF",
        "cep": "01310100",
        "address": "Avenida Paulista",
        "city": "São Paulo",
        "state": "SP",
        "profileImage": "url-da-foto",
        "status": "Disponível",
        "preferredLanguage": "pt-BR",
        "createdAt": "2024-01-10T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

---

## 🔄 Fluxo de Conexão

### Via QR Code

```
Usuário A                          Usuário B
    |                                  |
    +---> Gera QR Code                 |
    |     (válido por 24h)             |
    |                                  |
    |     Compartilha QR Code          |
    |<------ (foto, link, etc)         |
    |                                  |
    |                            Escaneia QR Code
    |                                  |
    |                            Extrai dados
    |                                  |
    |                            Adiciona contato
    |                                  |
    |     Notificação de conexão       |
    |<------ (via WebSocket)           |
    |                                  |
    +---> Adiciona contato             |
    |                                  |
    +====== Conectados e prontos para conversar ======+
```

### Via Busca

```
Usuário A                          Usuário B
    |                                  |
    +---> Busca por nickname           |
    |     "usuario123"                 |
    |                                  |
    |     Recebe resultado             |
    |     (sem dados sensíveis)        |
    |                                  |
    +---> Clica em "Adicionar"         |
    |                                  |
    |     Adiciona como contato        |
    |                                  |
    |     Notificação de conexão       |
    |<------ (via WebSocket)           |
    |                                  |
    +====== Conectados e prontos para conversar ======+
```

---

## 🛡️ Segurança

### Dados Expostos na Busca

✅ Permitido:
- Nickname
- Nome completo
- Email
- Telefone
- Endereço
- Cidade
- Estado
- Tipo de pessoa (PF/PJ)
- Foto de perfil
- Status
- Idioma preferido
- Data de criação

❌ Nunca exposto:
- Saldo em cash
- Histórico de transações
- CPF/CNPJ completo
- Hash de senha
- Tokens

### Validações

- Apenas usuários autenticados podem buscar
- Busca requer pelo menos um critério
- Limite de 20 resultados por padrão
- Paginação com offset/limit
- Rate limiting recomendado

---

## 📱 Integração Frontend

### Gerar QR Code

```typescript
const generateQRCode = async (token: string) => {
  const response = await fetch('/api/qrcode/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const data = await response.json();
  return data.data.qrCodeImage; // Data URL da imagem
};
```

### Escanear QR Code

```typescript
const scanQRCode = async (qrCodeString: string, token: string) => {
  const response = await fetch('/api/qrcode/scan', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ qrCodeString }),
  });
  
  const data = await response.json();
  return data.data.user; // Dados do usuário
};
```

### Buscar Usuários

```typescript
const searchUsers = async (nickname: string, token: string) => {
  const response = await fetch(
    `/api/users/search/nickname?nickname=${nickname}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const data = await response.json();
  return data.data.users; // Array de usuários
};
```

---

## 📊 Casos de Uso

### Caso 1: Conexão Rápida via QR Code

1. Usuário A abre seu perfil
2. Clica em "Gerar QR Code"
3. Compartilha a imagem do QR Code
4. Usuário B escaneia com câmera
5. Sistema adiciona ambos como contatos
6. Podem iniciar conversa imediatamente

### Caso 2: Encontrar Amigos por Dados

1. Usuário A abre "Buscar Usuários"
2. Digita nome ou nickname de um amigo
3. Vê resultado com dados públicos
4. Clica em "Adicionar Contato"
5. Amigo recebe notificação
6. Podem conversar

### Caso 3: Descobrir Usuários na Mesma Cidade

1. Usuário A busca por cidade "São Paulo"
2. Vê lista de usuários na região
3. Pode adicionar múltiplos contatos
4. Expande sua rede de conexões

---

## 🚀 Melhorias Futuras

- [ ] Verificação de dois fatores para QR Code
- [ ] Limite de escanagens por QR Code
- [ ] Notificações em tempo real
- [ ] Recomendações de usuários
- [ ] Bloqueio de usuários
- [ ] Relatório de usuários
- [ ] Integração com redes sociais
- [ ] Compartilhamento de perfil via link

