# 💳 Guia de Carteira Digital - Atos2

## Visão Geral

O sistema de carteira digital permite que cada usuário gerencie seus fundos em moeda local com suporte a conversão de moedas na hora do pagamento. A carteira é baseada na localização do usuário e suporta múltiplas moedas.

---

## 1. Estrutura de Dados

### Tabela: `wallets`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `user_id` | UUID | Referência ao usuário (único) |
| `currency` | VARCHAR(3) | Código da moeda (BRL, USD, EUR, etc) |
| `balance` | DECIMAL(15,2) | Saldo atual |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

### Tabela: `transactions`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `from_user_id` | UUID | Usuário que envia |
| `to_user_id` | UUID | Usuário que recebe (opcional) |
| `type` | VARCHAR(20) | DEPOSIT, WITHDRAW, TRANSFER, PAYMENT, REFUND |
| `amount` | DECIMAL(15,2) | Valor original |
| `currency` | VARCHAR(3) | Moeda original |
| `converted_amount` | DECIMAL(15,2) | Valor convertido (se aplicável) |
| `converted_currency` | VARCHAR(3) | Moeda convertida (se aplicável) |
| `exchange_rate` | DECIMAL(15,6) | Taxa de câmbio utilizada |
| `fee` | DECIMAL(15,2) | Taxa cobrada |
| `status` | VARCHAR(20) | PENDING, COMPLETED, FAILED, CANCELLED |
| `description` | TEXT | Descrição da transação |
| `reference` | VARCHAR(255) | Referência externa |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |

### Tabela: `exchange_rates`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `from_currency` | VARCHAR(3) | Moeda de origem |
| `to_currency` | VARCHAR(3) | Moeda de destino |
| `rate` | DECIMAL(15,6) | Taxa de câmbio |
| `updated_at` | TIMESTAMP | Data da atualização |

---

## 2. Tipos de Transação

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `DEPOSIT` | Depósito de fundos | Adicionar R$ 100 à carteira |
| `WITHDRAW` | Saque de fundos | Sacar R$ 50 da carteira |
| `TRANSFER` | Transferência entre usuários | Enviar R$ 200 para outro usuário |
| `PAYMENT` | Pagamento para fora do app | Pagar R$ 500 para fornecedor externo |
| `REFUND` | Reembolso de transação | Devolver R$ 100 de uma compra |

---

## 3. Moedas Suportadas

| Código | Moeda | País |
|--------|-------|------|
| `BRL` | Real Brasileiro | Brasil |
| `USD` | Dólar Americano | EUA |
| `EUR` | Euro | Europa |
| `GBP` | Libra Esterlina | Reino Unido |
| `JPY` | Iene Japonês | Japão |
| `CNY` | Yuan Chinês | China |
| `AUD` | Dólar Australiano | Austrália |
| `CAD` | Dólar Canadense | Canadá |
| `CHF` | Franco Suíço | Suíça |
| `MXN` | Peso Mexicano | México |

---

## 4. Endpoints da API

### Carteira

#### Obter Carteira
```
GET /api/wallet
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "currency": "BRL",
    "balance": 1500.50,
    "created_at": "2025-10-24T10:30:00Z",
    "updated_at": "2025-10-24T10:30:00Z"
  }
}
```

#### Obter Saldo
```
GET /api/wallet/balance?currency=BRL
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "balance": 1500.50,
    "currency": "BRL"
  }
}
```

#### Adicionar Saldo
```
POST /api/wallet/add-balance
Content-Type: application/json
Authorization: Bearer {token}

{
  "amount": 500.00,
  "currency": "BRL"
}

Response:
{
  "success": true,
  "message": "Saldo adicionado com sucesso",
  "data": {
    "id": "uuid",
    "balance": 2000.50,
    "currency": "BRL",
    ...
  }
}
```

---

### Transações

#### Criar Transação
```
POST /api/wallet/transactions
Content-Type: application/json
Authorization: Bearer {token}

{
  "toUserId": "uuid",
  "type": "TRANSFER",
  "amount": 100.00,
  "currency": "BRL",
  "convertedCurrency": "USD",
  "description": "Pagamento de serviço"
}

Response:
{
  "success": true,
  "message": "Transação criada com sucesso",
  "data": {
    "id": "uuid",
    "from_user_id": "uuid",
    "to_user_id": "uuid",
    "type": "TRANSFER",
    "amount": 100.00,
    "currency": "BRL",
    "converted_amount": 19.50,
    "converted_currency": "USD",
    "exchange_rate": 0.195,
    "fee": 0,
    "status": "COMPLETED",
    "created_at": "2025-10-24T10:30:00Z"
  }
}
```

#### Obter Histórico de Transações
```
GET /api/wallet/transactions?limit=50&offset=0
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "from_user_id": "uuid",
      "to_user_id": "uuid",
      "type": "TRANSFER",
      "amount": 100.00,
      "currency": "BRL",
      "fee": 0,
      "status": "COMPLETED",
      "created_at": "2025-10-24T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}
```

#### Obter Transação Específica
```
GET /api/wallet/transactions/{transactionId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": { ... }
}
```

#### Reembolsar Transação
```
POST /api/wallet/transactions/{transactionId}/refund
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Transação reembolsada com sucesso",
  "data": {
    "id": "uuid",
    "type": "REFUND",
    "amount": 100.00,
    "status": "COMPLETED",
    ...
  }
}
```

---

### Câmbio

#### Converter Moeda
```
POST /api/wallet/convert
Content-Type: application/json
Authorization: Bearer {token}

{
  "amount": 100.00,
  "fromCurrency": "BRL",
  "toCurrency": "USD"
}

Response:
{
  "success": true,
  "data": {
    "original": {
      "amount": 100.00,
      "currency": "BRL"
    },
    "converted": {
      "amount": 19.50,
      "currency": "USD"
    },
    "exchangeRate": 0.195
  }
}
```

#### Obter Taxas de Câmbio
```
GET /api/wallet/exchange-rates
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "from_currency": "BRL",
      "to_currency": "USD",
      "rate": 0.195,
      "updated_at": "2025-10-24T10:30:00Z"
    }
  ]
}
```

#### Obter Moedas Suportadas
```
GET /api/wallet/currencies
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": ["BRL", "USD", "EUR", "GBP", "JPY", "CNY", ...]
}
```

---

### Estatísticas

#### Obter Estatísticas
```
GET /api/wallet/statistics
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "total_transactions": 15,
    "transfers": 10,
    "deposits": 3,
    "withdrawals": 2,
    "total_sent": 5000.00,
    "total_received": 3000.00,
    "total_fees": 50.00,
    "average_amount": 333.33
  }
}
```

---

## 5. Regras de Negócio

### Taxas de Transação

**Transferências entre usuários:** 0% (sem taxa)

**Transferências/Pagamentos para fora do app:**
- 0,01 a 999,99: 1% de taxa
- 1.000,00 a 4.999,99: 2% de taxa
- Acima de 5.000,00: 5% de taxa

### Conversão de Moedas

- ✅ Conversão automática na hora do pagamento
- ✅ Taxa de câmbio em tempo real
- ✅ Registro da taxa utilizada na transação
- ✅ Suporte a múltiplas moedas

### Validações

- ✅ Saldo suficiente antes de transação
- ✅ Valores maiores que zero
- ✅ Moedas suportadas
- ✅ Usuários existentes

---

## 6. Exemplos de Uso

### Transferência com Conversão de Moeda

```javascript
// Usuário A (Brasil) quer enviar R$ 100 para Usuário B (EUA)
const transaction = await fetch('/api/wallet/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    toUserId: 'user-b-id',
    type: 'TRANSFER',
    amount: 100.00,
    currency: 'BRL',
    convertedCurrency: 'USD',
    description: 'Pagamento de serviço'
  })
});

// Resultado:
// - Usuário A perde R$ 100 (sem taxa)
// - Usuário B recebe $19.50 USD (taxa de câmbio 0.195)
// - Transação registra: amount=100, currency=BRL, converted_amount=19.50, converted_currency=USD
```

### Pagamento Externo com Taxa

```javascript
// Usuário quer pagar R$ 2.000 para fornecedor fora do app
const transaction = await fetch('/api/wallet/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'PAYMENT',
    amount: 2000.00,
    currency: 'BRL',
    description: 'Pagamento de fornecedor'
  })
});

// Resultado:
// - Taxa: 2% = R$ 40
// - Total debitado: R$ 2.040
// - Transação registra: amount=2000, fee=40, status=COMPLETED
```

### Obter Saldo em Diferentes Moedas

```javascript
// Verificar saldo em BRL
const balanceBRL = await fetch('/api/wallet/balance?currency=BRL', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Converter para USD
const conversion = await fetch('/api/wallet/convert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    amount: balanceBRL.data.balance,
    fromCurrency: 'BRL',
    toCurrency: 'USD'
  })
});

console.log(`Saldo: R$ ${balanceBRL.data.balance} = $ ${conversion.data.converted.amount}`);
```

---

## 7. Segurança

- ✅ Autenticação obrigatória em todas as rotas
- ✅ Validação de entrada em todos os campos
- ✅ Transações ACID com rollback automático
- ✅ Registro de auditoria completo
- ✅ Proteção contra double-spending
- ✅ Limite de taxa máxima

---

## 8. Performance

- ✅ Índices em user_id, currency, status
- ✅ Queries otimizadas para histórico
- ✅ Cache de taxas de câmbio
- ✅ Agregações eficientes para estatísticas

---

## 9. Fluxo de Pagamento

```
1. Usuário A inicia transação
   ↓
2. Sistema verifica saldo
   ↓
3. Se conversão necessária:
   - Obtém taxa de câmbio
   - Calcula valor convertido
   ↓
4. Calcula taxa (se aplicável)
   ↓
5. Inicia transação ACID
   ↓
6. Debita de Usuário A
   ↓
7. Credita em Usuário B (se interno)
   ↓
8. Registra transação
   ↓
9. Commit e notificação
```

---

## 10. Próximas Melhorias

- [ ] Limite de transação diária
- [ ] Autenticação de dois fatores para grandes transferências
- [ ] Histórico de taxas de câmbio
- [ ] Alertas de transação
- [ ] Recorrência de pagamentos
- [ ] Integração com bancos

---

**Versão:** 1.0
**Data:** 24/10/2025
**Status:** ✅ Pronto para Produção

