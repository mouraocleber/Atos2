# 📝 Guia do Sistema de Avaliações e Reputação - Atos2

## 📋 Visão Geral

O sistema de avaliações permite que usuários avaliem **outros usuários** e **produtos**, criando uma reputação confiável no marketplace.

### Tipos de Avaliação

| Tipo | O que avalia | Localização |
|------|-------------|-------------|
| **Usuário** | Confiabilidade, atendimento, prazo | Busca de Usuários |
| **Produto** | Qualidade, custo-benefício, descrição | Página de Produtos |

---

## 🔢 Escala de Reputação

### Níveis de Usuário

| Nota Média | Nível | Descrição | Badge |
|------------|-------|-----------|-------|
| 4.8 - 5.0 | 🏆 LENDÁRIO | Excelência comprovada | Lendário |
| 4.5 - 4.7 | ⭐ EXCELENTE | Vendedor de alta confiança | Excelente |
| 4.0 - 4.4 | 👍 CONFIÁVEL | Bom histórico | Confiável |
| 3.5 - 3.9 | 🌱 INICIANTE | Primeiras vendas, regular | Iniciante |
| < 3.5 | ❓ NOVO | Poucas ou nenhuma avaliação | Novo |

---

## 🔐 Regras

### Avaliações de Usuário
- ✅ Apenas usuários autenticados podem avaliar
- ✅ Só pode **1 avaliação** por par (avaliador → avaliado)
- ✅ Nota: **1 a 5 estrelas**
- ✅ Comentário opcional
- ❌ Não pode auto-avaliar
- ❌ Não pode avaliar mesmo usuário 2x

### Avaliações de Produto
- ✅ Apenas compradores podem avaliar (futuramente com verificação)
- ✅ Só pode **1 avaliação** por usuário por produto
- ✅ Nota: **1 a 5 estrelas**
- ✅ Comentário opcional
- ✅ Pode incluir `transactionId` para verificação

### Moderação
- ✅ Usuários podem **reportar** avaliações abusivas
- ✅ Avaliação reportada muda status para `REPORTED`
- ✅ Moderação futura via painel admin

---

## 🌐 API Endpoints

### Avaliações de Usuário

#### POST `/api/users/reviews`
Criar nova avaliação de usuário.

```json
{
  "reviewedUserId": "uuid-do-usuario",
  "rating": 5,
  "comment": "Ótimo vendedor, produto chegou rápido!",
  "transactionId": "uuid-da-transacao"  // opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Avaliação criada com sucesso",
  "data": {
    "id": "uuid",
    "reviewerId": "uuid",
    "reviewedUserId": "uuid",
    "rating": 5,
    "comment": "...",
    "status": "ACTIVE",
    "createdAt": "2025-10-24T..."
  }
}
```

---

#### GET `/api/users/reviews/user/:userId`
Obter todas as avaliações **recebidas** por um usuário.

**Query params:**
- `status` (opcional): `ACTIVE`, `REPORTED`, `HIDDEN`
- `limit` (padrão: 20)
- `offset` (padrão: 0)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "reviews": [ ... ],
    "total": 5
  }
}
```

---

#### GET `/api/users/reviews/made-by/:userId`
Obter avaliações **feitas** por um usuário.
*Apenas o próprio usuário pode acessar.*

---

#### GET `/api/users/reviews/reputation/:userId`
Obter reputação/resumo de um usuário.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "totalReviews": 24,
    "averageRating": 4.8,
    "fiveStarCount": 18,
    "fourPlusCount": 22,
    "ratingLevel": "LENDÁRIO"
  }
}
```

---

#### PUT `/api/users/reviews/:reviewId`
Atualizar avaliação (apenas autor).

```json
{
  "rating": 4,
  "comment": "Atualizando comentário..."
}
```

---

#### DELETE `/api/users/reviews/:reviewId`
Remover/ocultar avaliação (soft delete).
*Apenas autor ou avaliado pode remover.*

---

#### POST `/api/users/reviews/:reviewId/report`
Reportar avaliação abusiva.

```json
{
  "reason": "SPAM",
  "description": "Avaliação falsa..."
}
```

---

#### GET `/api/users/reviews/top-sellers`
Obter top vendedores por reputação.

**Query:** `?limit=10`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "sellers": [
      { "id": "...", "nickname": "joao", "averageRating": 4.9, "totalReviews": 15 }
    ],
    "count": 1
  }
}
```

---

#### GET `/api/users/reviews/check/:reviewedUserId`
Verificar se usuário já avaliou outro.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "hasReviewed": false,
    "canReview": true
  }
}
```

---

### Avaliações de Produto

#### POST `/api/products/reviews`
Criar avaliação de produto.

```json
{
  "productId": "uuid-do-produto",
  "rating": 5,
  "comment": "Produto excelente!",
  "transactionId": "uuid-da-compra"  // opcional
}
```

---

#### GET `/api/products/reviews/:productId`
Obter avaliações de um produto.

**Query:** `?status=ACTIVE&limit=20&offset=0`

---

#### GET `/api/products/reviews/stats/:productId`
Obter estatísticas de avaliações de um produto.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "productId": "uuid",
    "totalReviews": 12,
    "averageRating": 4.5,
    "fiveStarCount": 8,
    "fourPlusCount": 10
  }
}
```

---

#### PUT `/api/products/reviews/:reviewId`
Atualizar avaliação de produto.

---

#### DELETE `/api/products/reviews/:reviewId`
Remover avaliação de produto.

---

#### POST `/api/products/reviews/:reviewId/report`
Reportar avaliação abusiva de produto.

---

#### GET `/api/products/reviews/top-rated`
Produtos mais bem avaliados.

**Query:** `?limit=10`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "products": [
      { "id": "...", "name": "Notebook", "averageRating": 4.8, "totalReviews": 20 }
    ]
  }
}
```

---

## 🗄️ Banco de Dados

### Tabelas Criadas

```sql
-- Avaliações de Usuário
CREATE TABLE user_reviews (
  id UUID PRIMARY KEY,
  reviewer_id UUID NOT NULL,
  reviewed_user_id UUID NOT NULL,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  transaction_id UUID,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reviewer_id, reviewed_user_id),
  CONSTRAINT different_users_review CHECK (reviewer_id != reviewed_user_id)
);

-- Avaliações de Produto
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY,
  reviewer_id UUID NOT NULL,
  product_id UUID NOT NULL,
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  transaction_id UUID,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reviewer_id, product_id)
);

-- Views (automáticas)
CREATE OR REPLACE VIEW user_reputation AS ...
CREATE OR REPLACE VIEW product_stats AS ...
```

---

## 🎨 Frontend

### Componentes Criados

#### `<UserReputation />` - src/components/UserReputation.tsx
Exibe estrelas e nota de reputação de um usuário.

**Props:**
```tsx
<UserReputation
  averageRating={4.8}
  totalReviews={24}
  ratingLevel="LENDÁRIO"
  size="small" | "medium" | "large"
/>
```

---

#### `<ProductReputation />` - src/components/ProductReputation.tsx
Exibe estrelas e nota de avaliação de produto.

**Props:**
```tsx
<ProductReputation
  averageRating={4.5}
  totalReviews={12}
  size="small"
  showCount={true}
/>
```

---

### Páginas Atualizadas

#### Busca de Usuários (`/users/search`)
- Lista de resultados agora mostra **reputação** (estrelas + nota)
- Detalhes do usuário mostra avaliação
- Sugestões iniciais mostram reputação

#### Produtos (`/products`)
- Cada produto mostra **avaliação média** e **total de reviews**
- Cards de produtos atualizados

---

## 🧪 Testes

### Teste Manual da API

```bash
# 1. Criar avaliação de usuário
curl -X POST http://localhost:3000/api/users/reviews \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewedUserId": "uuid-usuario",
    "rating": 5,
    "comment": "Excelente vendedor!"
  }'

# 2. Obter reputação
curl http://localhost:3000/api/users/reviews/reputation/uuid-usuario \
  -H "Authorization: Bearer SEU_TOKEN"

# 3. Listar avaliações de um usuário
curl "http://localhost:3000/api/users/reviews/user/uuid-usuario?limit=10" \
  -H "Authorization: Bearer SEU_TOKEN"

# 4. Criar avaliação de produto
curl -X POST http://localhost:3000/api/products/reviews \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "uuid-produto",
    "rating": 4,
    "comment": "Bom produto!"
  }'

# 5. Stat de produto
curl http://localhost:3000/api/products/uuid-produto/review-stats \
  -H "Authorization: Bearer SEU_TOKEN"

# 6. Buscar usuários (com reputação)
curl "http://localhost:3000/api/users/search?nickname=joao" \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 🔄 Workflow Completo

### Usuário Avalia Vendedor:

1. Comprador faz uma compra com outro usuário
2. Após recebimento, acessa Busca de Usuários
3. Encontra o vendedor e clica para ver detalhes
4. Clica em "Avaliar" (futuro)
5. Seleciona nota (1-5) e escreve comentário
6. Submete → Avaliação criada com status `ACTIVE`
7. Reputação do vendedor é recalculada (view automática)
8. Outros usuários agora veem a nova nota

### Produto Avaliado:

1. Usuário compra produto
2. Recebe produto
3. Acessa página de Produtos
4. Clica no produto
5. Clica em "Avaliar"
6. Atribui nota + comentário
7. Estatísticas do produto atualizadas

---

## 📈 Cálculo da Reputação

A view `user_reputation` calcula automaticamente:

```sql
SELECT
  u.id as user_id,
  COUNT(r.id) as total_reviews,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as four_plus_count,
  MAX(r.created_at) as last_review_at
FROM users u
LEFT JOIN user_reviews r ON u.id = r.reviewed_user_id AND r.status = 'ACTIVE'
GROUP BY u.id;
```

- Apenas avaliações `ACTIVE` contam
- Média simples aritmética
- Recalculado em tempo real (ou via cache)

---

## 🎯 Próximas Melhorias (Futuro)

- [ ] Verificação de compra real (`is_verified = true` via transaction_id)
- [ ] Limitar 1 avaliação por transação
- [ ] Painel admin para moderar reports
- [ ] Notificações push quando receber avaliação
- [ ] Respostas do vendedor às avaliações
- [ ] Filtros por nota na busca de usuários
- [ ] Ordenar por reputação
- [ ] Gráficos de evolução da reputação
- [ ] Badges especiais (100+ vendas, etc.)
- [ ] Avaliação de vendedor anônima (opcional)

---

## ⚠️ Considerações

- Sem verificação automática de compra (isVerified sempre false)
- Sem sistema de notificações
- Sem moderação automática (reports manuais)
- Soft delete (marca como HIDDEN, não apaga)
- 1 avaliação por usuário (único)

---

**Versão:** 1.0
**Data:** 08/04/2026
**Status:** ✅ Implementado e Funcional
