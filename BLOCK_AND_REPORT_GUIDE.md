# Guia de Bloqueio e Denúncia - Atos2

## 🛡️ Sistema de Bloqueio de Mensagens

### Visão Geral

O sistema de bloqueio permite que usuários se protejam contra mensagens indesejadas de pessoas que não estão em sua lista de contatos. Quando um usuário bloqueia outro, não receberá mais mensagens daquele usuário.

### Funcionalidades

✅ **Bloquear Usuários**
- Bloquear qualquer usuário
- Adicionar motivo do bloqueio (opcional)
- Histórico de bloqueios

✅ **Desbloquear Usuários**
- Remover bloqueio a qualquer momento
- Voltar a receber mensagens

✅ **Gerenciar Bloqueios**
- Ver lista de usuários bloqueados
- Verificar se um usuário está bloqueado
- Contar total de bloqueios

### Fluxo de Bloqueio

```
Usuário A recebe mensagem indesejada de B
            ↓
    Clica em "Bloquear"
            ↓
    Seleciona motivo (opcional)
            ↓
    B é adicionado à lista de bloqueados
            ↓
    A não recebe mais mensagens de B
            ↓
    B não sabe que foi bloqueado
```

## 📡 Endpoints de Bloqueio

### Bloquear Usuário

```http
POST /api/block
Authorization: Bearer <token>
Content-Type: application/json

{
  "blockedUserId": "uuid-do-usuario",
  "reason": "Mensagens indesejadas"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Usuário bloqueado com sucesso",
  "data": {
    "id": "uuid",
    "blockedUserId": "uuid",
    "reason": "Mensagens indesejadas",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Desbloquear Usuário

```http
DELETE /api/block
Authorization: Bearer <token>
Content-Type: application/json

{
  "blockedUserId": "uuid-do-usuario"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Usuário desbloqueado com sucesso"
}
```

### Obter Lista de Bloqueados

```http
GET /api/block
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Usuários bloqueados",
  "data": {
    "blockedUsers": [
      {
        "id": "uuid",
        "blockedUserId": "uuid",
        "reason": "Mensagens indesejadas",
        "createdAt": "2024-01-15T10:30:00Z",
        "user": {
          "id": "uuid",
          "email": "user@example.com",
          "phone": "+5511999999999",
          "nickname": "usuario123",
          "name": "João Silva",
          "profileImage": "url-da-foto",
          "city": "São Paulo",
          "state": "SP"
        }
      }
    ],
    "count": 1
  }
}
```

### Verificar se Usuário está Bloqueado

```http
GET /api/block/:blockedUserId
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Status de bloqueio",
  "data": {
    "isBlocked": true
  }
}
```

### Contar Usuários Bloqueados

```http
GET /api/block/count
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Total de usuários bloqueados",
  "data": {
    "count": 5
  }
}
```

---

## 🚨 Sistema de Denúncia de Conteúdo

### Visão Geral

O sistema de denúncia permite que usuários reportem conteúdo ofensivo, golpes, assédio e spam. As denúncias são analisadas pela equipe de moderação.

### Tipos de Denúncia

| Tipo | Descrição | Ação Automática |
|------|-----------|-----------------|
| **OFFENSIVE** | Conteúdo ofensivo ou discriminatório | Nenhuma |
| **SCAM** | Tentativa de golpe ou fraude | Bloqueio automático |
| **HARASSMENT** | Assédio ou intimidação | Nenhuma |
| **SPAM** | Mensagens spam ou publicidade | Nenhuma |
| **OTHER** | Outro tipo de violação | Nenhuma |

### Status de Denúncia

- **PENDING** - Aguardando revisão
- **REVIEWING** - Sendo analisada
- **RESOLVED** - Resolvida (ação tomada)
- **DISMISSED** - Descartada (sem violação)

### Fluxo de Denúncia

```
Usuário A recebe mensagem ofensiva de B
            ↓
    Clica em "Denunciar"
            ↓
    Seleciona tipo de denúncia
            ↓
    Descreve o problema
            ↓
    Denúncia é enviada
            ↓
    Equipe de moderação analisa
            ↓
    Ação é tomada (se necessário)
            ↓
    Usuário A é notificado
```

## 📡 Endpoints de Denúncia

### Criar Denúncia

```http
POST /api/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "reportType": "SCAM",
  "description": "Usuário está tentando me enganar pedindo dados bancários",
  "reportedUserId": "uuid-do-usuario",
  "messageId": "uuid-da-mensagem"
}
```

**Parâmetros:**
- `reportType` (obrigatório): OFFENSIVE, SCAM, HARASSMENT, SPAM, OTHER
- `description` (obrigatório): Descrição detalhada (mín. 10 caracteres)
- `reportedUserId` (opcional): ID do usuário denunciado
- `messageId` (opcional): ID da mensagem denunciada
- Nota: Pelo menos um de `reportedUserId` ou `messageId` deve ser fornecido

**Resposta (200):**
```json
{
  "success": true,
  "message": "Denúncia criada com sucesso. Obrigado por ajudar a manter a comunidade segura!",
  "data": {
    "id": "uuid",
    "reportType": "SCAM",
    "status": "PENDING",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Obter Minhas Denúncias

```http
GET /api/reports/my-reports
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Denúncias do usuário",
  "data": {
    "reports": [
      {
        "id": "uuid",
        "reporterId": "uuid",
        "reportedUserId": "uuid",
        "messageId": "uuid",
        "reportType": "SCAM",
        "description": "Usuário está tentando me enganar",
        "status": "REVIEWING",
        "resolutionNotes": null,
        "createdAt": "2024-01-15T10:30:00Z",
        "resolvedAt": null
      }
    ],
    "count": 1
  }
}
```

### Obter Denúncia Específica

```http
GET /api/reports/:reportId
Authorization: Bearer <token>
```

### Obter Denúncias Pendentes (Admin)

```http
GET /api/reports/pending
Authorization: Bearer <token>
```

### Obter Denúncias sobre um Usuário

```http
GET /api/reports/user/:userId
Authorization: Bearer <token>
```

### Atualizar Status da Denúncia (Admin)

```http
PUT /api/reports/:reportId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "RESOLVED",
  "resolutionNotes": "Usuário foi suspenso por 7 dias"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Status da denúncia atualizado",
  "data": {
    "id": "uuid",
    "reportType": "SCAM",
    "status": "RESOLVED",
    "resolutionNotes": "Usuário foi suspenso por 7 dias",
    "resolvedAt": "2024-01-15T15:30:00Z"
  }
}
```

### Obter Estatísticas de Denúncias (Admin)

```http
GET /api/reports/statistics
Authorization: Bearer <token>
```

**Resposta (200):**
```json
{
  "success": true,
  "message": "Estatísticas de denúncias",
  "data": {
    "total": 150,
    "pending": 25,
    "reviewing": 10,
    "resolved": 100,
    "dismissed": 15,
    "offensive": 40,
    "scam": 60,
    "harassment": 30,
    "spam": 20
  }
}
```

---

## 🔒 Proteção de Privacidade

### Bloqueio

✅ **Informações Protegidas:**
- Usuário bloqueado não sabe que foi bloqueado
- Bloqueio é privado e não é compartilhado
- Histórico de bloqueios é confidencial

### Denúncia

✅ **Informações Protegidas:**
- Identidade do denunciante é protegida
- Denúncias são analisadas confidencialmente
- Resultado é comunicado apenas ao denunciante

---

## 📱 Integração Frontend

### Bloquear Usuário

```typescript
const blockUser = async (blockedUserId: string, reason: string, token: string) => {
  const response = await fetch('/api/block', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ blockedUserId, reason }),
  });
  
  const data = await response.json();
  return data.data;
};
```

### Denunciar Conteúdo

```typescript
const reportContent = async (
  reportType: string,
  description: string,
  reportedUserId?: string,
  messageId?: string,
  token?: string
) => {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reportType,
      description,
      reportedUserId,
      messageId,
    }),
  });
  
  const data = await response.json();
  return data.data;
};
```

---

## 🎯 Casos de Uso

### Caso 1: Usuário Recebe Mensagem de Golpe

1. Usuário A recebe mensagem de B pedindo dados bancários
2. Clica em "Denunciar" na mensagem
3. Seleciona "SCAM" como tipo
4. Descreve a tentativa de golpe
5. Sistema bloqueia automaticamente B
6. Denúncia é enviada para moderação
7. Equipe analisa e toma ação

### Caso 2: Bloqueio de Spam

1. Usuário A recebe muitas mensagens de B
2. Clica em "Bloquear" no perfil de B
3. B é adicionado à lista de bloqueados
4. A não recebe mais mensagens de B
5. A pode desbloquear a qualquer momento

### Caso 3: Denúncia de Assédio

1. Usuário A sofre assédio de B
2. Clica em "Denunciar" em uma mensagem
3. Seleciona "HARASSMENT"
4. Descreve o assédio em detalhes
5. Denúncia é enviada para moderação
6. Equipe toma ação apropriada
7. A é notificado do resultado

---

## 📊 Boas Práticas

### Para Usuários

✅ **Faça:**
- Denuncie conteúdo genuinamente ofensivo
- Bloqueie usuários que o incomodam
- Descreva claramente o problema

❌ **Não Faça:**
- Denuncie por discordância de opinião
- Abuse do sistema de bloqueio
- Faça denúncias falsas

### Para Moderadores

✅ **Faça:**
- Analise cada denúncia cuidadosamente
- Documente decisões
- Comunique resultados

❌ **Não Faça:**
- Tome decisões precipitadas
- Ignore denúncias
- Revele identidade de denunciantes

---

## 🚀 Melhorias Futuras

- [ ] Bloqueio automático por IA
- [ ] Detecção de padrões de golpe
- [ ] Notificações de denúncia
- [ ] Apelação de denúncias
- [ ] Histórico de ações
- [ ] Relatórios de moderação
- [ ] Integração com autoridades
- [ ] Sistema de reputação

