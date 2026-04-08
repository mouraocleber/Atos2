# 📦 Guia de Grupos de Produtos - Atos2

## Visão Geral

O sistema de grupos de produtos permite que cada usuário organize seus produtos em categorias personalizadas. Cada produto possui campos expandidos como descrição, valor, quantidade e unidade, com opção de ativar/desativar para venda.

---

## 1. Estrutura de Dados

### Tabela: `product_groups`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `user_id` | UUID | Referência ao usuário |
| `name` | VARCHAR(255) | Nome do grupo |
| `description` | TEXT | Descrição do grupo |
| `icon` | VARCHAR(50) | Ícone do grupo (emoji ou nome) |
| `color` | VARCHAR(7) | Cor em hex (#FF8C00) |
| `position` | INT | Ordem de exibição |
| `is_active` | BOOLEAN | Ativo/Inativo |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

### Tabela: `products`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `user_id` | UUID | Referência ao usuário |
| `group_id` | UUID | Referência ao grupo (opcional) |
| `name` | VARCHAR(255) | Nome do produto |
| `description` | TEXT | Descrição do produto |
| `price` | DECIMAL(15,2) | Preço do produto |
| `quantity` | INTEGER | Quantidade em estoque |
| `unit` | VARCHAR(50) | Unidade (un, kg, l, etc) |
| `image` | VARCHAR(500) | URL da imagem |
| `status` | VARCHAR(20) | ACTIVE, INACTIVE, DISCONTINUED |
| `is_active` | BOOLEAN | Ativo/Inativo |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

---

## 2. Endpoints da API

### Grupos de Produtos

#### Criar Grupo
```
POST /api/product-groups/groups
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Eletrônicos",
  "description": "Produtos eletrônicos em geral",
  "icon": "📱",
  "color": "#FF8C00"
}

Response:
{
  "success": true,
  "message": "Grupo criado com sucesso",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Eletrônicos",
    "description": "Produtos eletrônicos em geral",
    "icon": "📱",
    "color": "#FF8C00",
    "position": 0,
    "is_active": true,
    "created_at": "2025-10-24T10:30:00Z",
    "updated_at": "2025-10-24T10:30:00Z"
  }
}
```

#### Obter Grupos
```
GET /api/product-groups/groups?includeInactive=false
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Eletrônicos",
      "description": "...",
      "icon": "📱",
      "color": "#FF8C00",
      "position": 0,
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

#### Obter Grupos com Produtos
```
GET /api/product-groups/groups/with-products
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Eletrônicos",
      "description": "...",
      "icon": "📱",
      "color": "#FF8C00",
      "position": 0,
      "is_active": true,
      "product_count": 5,
      "active_product_count": 3,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

#### Atualizar Grupo
```
PUT /api/product-groups/groups/{groupId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Eletrônicos Atualizados",
  "color": "#FFD700",
  "is_active": true
}

Response:
{
  "success": true,
  "message": "Grupo atualizado com sucesso",
  "data": { ... }
}
```

#### Deletar Grupo
```
DELETE /api/product-groups/groups/{groupId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Grupo deletado com sucesso"
}
```

#### Reordenar Grupos
```
POST /api/product-groups/groups/reorder
Content-Type: application/json
Authorization: Bearer {token}

{
  "groupOrder": [
    { "id": "uuid1", "position": 0 },
    { "id": "uuid2", "position": 1 },
    { "id": "uuid3", "position": 2 }
  ]
}

Response:
{
  "success": true,
  "message": "Grupos reordenados com sucesso"
}
```

---

### Produtos

#### Criar Produto
```
POST /api/product-groups/products
Content-Type: application/json
Authorization: Bearer {token}

{
  "group_id": "uuid",
  "name": "iPhone 15",
  "description": "Smartphone Apple iPhone 15",
  "price": 4999.99,
  "quantity": 10,
  "unit": "un",
  "image": "https://...",
  "status": "ACTIVE"
}

Response:
{
  "success": true,
  "message": "Produto criado com sucesso",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "group_id": "uuid",
    "name": "iPhone 15",
    "description": "Smartphone Apple iPhone 15",
    "price": 4999.99,
    "quantity": 10,
    "unit": "un",
    "image": "https://...",
    "status": "ACTIVE",
    "is_active": true,
    "created_at": "2025-10-24T10:30:00Z",
    "updated_at": "2025-10-24T10:30:00Z"
  }
}
```

#### Obter Produtos do Usuário
```
GET /api/product-groups/products?includeInactive=false
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "iPhone 15",
      "price": 4999.99,
      "quantity": 10,
      "unit": "un",
      "status": "ACTIVE",
      "is_active": true,
      ...
    }
  ]
}
```

#### Obter Produtos Ativos para Venda
```
GET /api/product-groups/products/active
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "iPhone 15",
      "price": 4999.99,
      "quantity": 10,
      "status": "ACTIVE",
      "is_active": true,
      ...
    }
  ]
}
```

#### Obter Produtos de um Grupo
```
GET /api/product-groups/groups/{groupId}/products?includeInactive=false
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [ ... ]
}
```

#### Atualizar Produto
```
PUT /api/product-groups/products/{productId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "iPhone 15 Pro",
  "price": 5999.99,
  "quantity": 5,
  "status": "ACTIVE",
  "is_active": true
}

Response:
{
  "success": true,
  "message": "Produto atualizado com sucesso",
  "data": { ... }
}
```

#### Deletar Produto
```
DELETE /api/product-groups/products/{productId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Produto deletado com sucesso"
}
```

#### Obter Estatísticas
```
GET /api/product-groups/products/statistics
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "total_products": 15,
    "active_products": 12,
    "available_for_sale": 10,
    "total_groups": 3,
    "total_quantity": 150,
    "average_price": 2500.50,
    "min_price": 99.99,
    "max_price": 9999.99
  }
}
```

---

## 3. Status de Produtos

| Status | Descrição |
|--------|-----------|
| `ACTIVE` | Produto ativo e disponível para venda |
| `INACTIVE` | Produto inativo, não aparece para venda |
| `DISCONTINUED` | Produto descontinuado |

---

## 4. Unidades Disponíveis

| Unidade | Descrição |
|---------|-----------|
| `un` | Unidade (padrão) |
| `kg` | Quilograma |
| `g` | Grama |
| `l` | Litro |
| `ml` | Mililitro |
| `m` | Metro |
| `cm` | Centímetro |
| `dz` | Dúzia |
| `cx` | Caixa |
| `pct` | Pacote |

---

## 5. Exemplos de Uso

### Criar um Catálogo Completo

```javascript
// 1. Criar grupos
const groupElectronics = await fetch('/api/product-groups/groups', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Eletrônicos',
    icon: '📱',
    color: '#FF8C00'
  })
});

const groupClothing = await fetch('/api/product-groups/groups', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Roupas',
    icon: '👕',
    color: '#FFD700'
  })
});

// 2. Criar produtos no grupo de eletrônicos
await fetch('/api/product-groups/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    group_id: groupElectronics.id,
    name: 'iPhone 15',
    description: 'Smartphone Apple',
    price: 4999.99,
    quantity: 10,
    unit: 'un',
    status: 'ACTIVE'
  })
});

// 3. Obter todos os grupos com produtos
const groups = await fetch('/api/product-groups/groups/with-products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 4. Obter apenas produtos ativos
const activeProducts = await fetch('/api/product-groups/products/active', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 5. Obter estatísticas
const stats = await fetch('/api/product-groups/products/statistics', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 6. Regras de Negócio

### Grupos
- ✅ Cada usuário pode ter múltiplos grupos
- ✅ Grupos podem ser ativados/desativados
- ✅ Grupos podem ser reordenados
- ✅ Deletar um grupo não deleta os produtos (apenas remove a referência)

### Produtos
- ✅ Cada produto pertence a um usuário
- ✅ Produtos podem pertencer a um grupo (opcional)
- ✅ Produtos podem ter status: ACTIVE, INACTIVE, DISCONTINUED
- ✅ Apenas produtos ACTIVE aparecem para venda
- ✅ Produtos podem ser ativados/desativados individualmente

---

## 7. Segurança

- ✅ Apenas usuários autenticados podem gerenciar produtos
- ✅ Usuários só podem ver/editar seus próprios produtos
- ✅ Validação de entrada em todos os campos
- ✅ Auditoria de todas as operações

---

## 8. Performance

- ✅ Índices em user_id, group_id, status, is_active
- ✅ Queries otimizadas para listar produtos
- ✅ Agregações eficientes para estatísticas
- ✅ Suporte a paginação (implementar se necessário)

---

## 9. Próximas Melhorias

- [ ] Importação/Exportação de produtos (CSV, Excel)
- [ ] Busca avançada de produtos
- [ ] Filtros por preço, quantidade, status
- [ ] Histórico de preços
- [ ] Alertas de estoque baixo
- [ ] Integração com sistema de vendas

---

**Versão:** 1.0
**Data:** 24/10/2025
**Status:** ✅ Pronto para Produção

