# 💰 Regras de Transações Financeiras - Atos2

## 1. Moeda Global (G)

### Definição
A moeda **Global** é a moeda padrão do Atos2, calculada como a média aritmética de 5 moedas internacionais principais.

### Fórmula de Cálculo
```
Valor Global = (USD + EUR + JPY + CNY + BRL) / 5
```

### Componentes
| Moeda | Código | Peso | Descrição |
|-------|--------|------|-----------|
| Dólar Americano | USD | 20% | Moeda de referência internacional |
| Euro | EUR | 20% | Moeda da União Europeia |
| Iene Japonês | JPY | 20% | Moeda do Japão |
| Yuan Chinês | CNY | 20% | Moeda da China |
| Real Brasileiro | BRL | 20% | Moeda do Brasil |

### Atualização
- **Frequência:** Diária
- **Horário:** 00:00 (meia-noite) horário de Brasília, DF, Brasil
- **Timezone:** UTC-3 (Brasília)
- **Fonte:** API de câmbio pública (exchangerate-api.com)
- **Fallback:** Valores padrão em caso de indisponibilidade

### Exemplo de Cálculo
```
Data: 24/10/2025 00:00 (Brasília)

USD: 1.00
EUR: 0.92
JPY: 149.50
CNY: 7.24
BRL: 4.97

Global = (1.00 + 0.92 + 149.50 + 7.24 + 4.97) / 5
Global = 163.63 / 5
Global = 32.73 (valor da moeda Global em relação ao USD)
```

### Histórico
- Todas as atualizações são registradas no banco de dados
- Usuários podem consultar o histórico de valores
- Transações sempre usam a taxa do momento da execução

---

## 2. Taxas de Transação

### 2.1 Transferências Entre Usuários Atos2
**Taxa: 0% (Sem Taxa)**

#### Características
- ✅ Transferências instantâneas
- ✅ Sem custo adicional
- ✅ Sem limite de valor
- ✅ Sem limite de frequência
- ✅ Saldo atualizado em tempo real

#### Exemplo
```
João envia 1.000 Global para Maria

Valor: 1.000,00 G
Taxa: 0,00 G
Total Debitado: 1.000,00 G
Total Creditado: 1.000,00 G
```

---

### 2.2 Transferências para Fora do App
**Taxa: Progressiva conforme valor**

#### Faixas de Taxa

| Faixa de Valor | Taxa | Exemplo |
|---|---|---|
| 0,01 a 999,99 | 1% | 500 G → Taxa: 5 G |
| 1.000,00 a 4.999,99 | 2% | 2.000 G → Taxa: 40 G |
| Acima de 5.000,00 | 5% | 10.000 G → Taxa: 500 G |

#### Detalhes
- Aplicável a transferências bancárias
- Aplicável a saques
- Aplicável a pagamentos para terceiros
- Taxa é debitada do saldo do usuário
- Taxa é exibida antes da confirmação

#### Exemplos Detalhados

**Exemplo 1: Transferência de 500 Global (Taxa 1%)**
```
Valor da Transferência: 500,00 G
Taxa (1%): 5,00 G
Total Debitado: 505,00 G
Total Transferido: 500,00 G

Saldo Anterior: 1.000,00 G
Saldo Posterior: 495,00 G
```

**Exemplo 2: Transferência de 2.500 Global (Taxa 2%)**
```
Valor da Transferência: 2.500,00 G
Taxa (2%): 50,00 G
Total Debitado: 2.550,00 G
Total Transferido: 2.500,00 G

Saldo Anterior: 5.000,00 G
Saldo Posterior: 2.450,00 G
```

**Exemplo 3: Transferência de 10.000 Global (Taxa 5%)**
```
Valor da Transferência: 10.000,00 G
Taxa (5%): 500,00 G
Total Debitado: 10.500,00 G
Total Transferido: 10.000,00 G

Saldo Anterior: 15.000,00 G
Saldo Posterior: 4.500,00 G
```

---

## 3. Tipos de Transação

### 3.1 TRANSFER (Transferência)
- **Descrição:** Transferência entre usuários Atos2
- **Taxa:** 0%
- **Status:** COMPLETED (imediato)
- **Reversível:** Não
- **Notificação:** Ambas as partes

### 3.2 DEPOSIT (Depósito)
- **Descrição:** Adição de saldo via banco
- **Taxa:** Conforme instituição financeira
- **Status:** PENDING → COMPLETED (1-2 dias úteis)
- **Reversível:** Sim (até 30 dias)
- **Notificação:** Usuário

### 3.3 WITHDRAWAL (Saque)
- **Descrição:** Retirada de saldo para banco
- **Taxa:** 2% (padrão bancário)
- **Status:** PENDING → COMPLETED (1-2 dias úteis)
- **Reversível:** Sim (até 48h)
- **Notificação:** Usuário

### 3.4 PAYMENT (Pagamento)
- **Descrição:** Pagamento para fora do app
- **Taxa:** Progressiva (1%, 2% ou 5%)
- **Status:** PENDING → COMPLETED (1-2 dias úteis)
- **Reversível:** Sim (até 7 dias)
- **Notificação:** Usuário

### 3.5 REFUND (Reembolso)
- **Descrição:** Devolução de valor
- **Taxa:** 0%
- **Status:** COMPLETED (imediato)
- **Reversível:** Não
- **Notificação:** Ambas as partes

---

## 4. Limites de Transação

### Limites Diários
| Tipo | Limite | Observação |
|------|--------|-----------|
| Transferência | 50.000 G | Por usuário |
| Saque | 10.000 G | Por usuário |
| Depósito | 100.000 G | Por usuário |
| Pagamento | 25.000 G | Por transação |

### Limites por Transação
| Tipo | Mínimo | Máximo |
|------|--------|--------|
| Transferência | 0,01 G | Sem limite |
| Saque | 10 G | 10.000 G |
| Depósito | 1 G | 100.000 G |
| Pagamento | 0,01 G | 25.000 G |

---

## 5. Segurança e Validação

### Validações Obrigatórias
- ✅ Saldo suficiente
- ✅ Usuário/conta destinatária válida
- ✅ Valor positivo
- ✅ Dentro dos limites
- ✅ Autenticação do usuário

### Autenticação
- **Transferências até 1.000 G:** Senha ou biometria
- **Transferências acima de 1.000 G:** Senha + SMS/Email
- **Transferências acima de 10.000 G:** Senha + SMS + Email

### Auditoria
- Todas as transações são registradas
- Histórico completo mantido por 7 anos
- Logs de acesso e modificação
- Rastreamento de IP e dispositivo

---

## 6. Comprovante de Transação

### Informações Incluídas
```
COMPROVANTE DE TRANSAÇÃO ATOS2
================================

ID da Transação: [UUID]
Data: [Data/Hora em Brasília]
Tipo: [Tipo de Transação]

Remetente: [Nome/ID]
Destinatário: [Nome/ID ou Banco]

Valor: [Valor] G
Taxa: [Taxa] G
Total: [Total] G

Status: [Status]
Descrição: [Descrição opcional]

================================
Comprovante gerado em: [Data/Hora]
```

### Disponibilidade
- Imediato após transação
- Disponível em PDF
- Disponível por email
- Armazenado no histórico por 7 anos

---

## 7. Processamento de Transações

### Fluxo de Transferência Entre Usuários
```
1. Usuário A inicia transferência
2. Sistema valida dados
3. Sistema calcula taxa (0%)
4. Sistema verifica saldo
5. Sistema solicita autenticação
6. Sistema executa transferência (ACID)
7. Saldo de A reduzido
8. Saldo de B aumentado
9. Notificações enviadas
10. Comprovante gerado
```

### Fluxo de Transferência Externa
```
1. Usuário inicia transferência
2. Sistema valida dados
3. Sistema calcula taxa (1%, 2% ou 5%)
4. Sistema verifica saldo
5. Sistema solicita autenticação
6. Sistema registra como PENDING
7. Saldo debitado
8. Fila de processamento
9. Banco processa (1-2 dias)
10. Status atualizado para COMPLETED
11. Notificação enviada
12. Comprovante gerado
```

---

## 8. Tratamento de Erros

### Erros Comuns
| Erro | Mensagem | Ação |
|------|----------|------|
| Saldo Insuficiente | "Saldo insuficiente para esta transação" | Cancelar |
| Usuário Inválido | "Destinatário não encontrado" | Verificar dados |
| Limite Excedido | "Valor excede limite diário" | Reduzir valor |
| Conta Bloqueada | "Sua conta foi bloqueada" | Contatar suporte |
| Falha de Rede | "Erro ao processar. Tente novamente" | Retry automático |

### Retry Automático
- Máximo de 3 tentativas
- Intervalo de 5 segundos
- Notificação ao usuário em caso de falha

---

## 9. Relatórios e Análise

### Relatórios Disponíveis
- Extrato de transações
- Análise de gastos
- Comparativo mensal
- Estatísticas de transferências
- Relatório de taxas pagas

### Exportação
- Formato: PDF, CSV, Excel
- Período: Customizável
- Assinatura digital: Sim

---

## 10. Conformidade e Regulamentação

### Regulamentações
- ✅ LGPD (Lei Geral de Proteção de Dados)
- ✅ Resolução 4.893 (Banco Central)
- ✅ Portaria 3.560 (Banco Central)
- ✅ ISO 20022 (Padrão de Mensagens)

### Documentação
- Termos de Serviço
- Política de Privacidade
- Política de Segurança
- Contrato de Adesão

---

## 11. Suporte e Reclamações

### Canais de Suporte
- Email: support@atos2.com
- Chat: In-app
- Telefone: 0800 ATOS2
- WhatsApp: +55 11 9999-9999

### Prazo de Resposta
- Urgente: 1 hora
- Normal: 24 horas
- Não urgente: 48 horas

### Resolução de Disputas
- Análise em 5 dias úteis
- Reembolso em até 10 dias úteis
- Apelação disponível

---

## 12. Histórico de Atualizações

| Data | Versão | Mudança |
|------|--------|---------|
| 24/10/2025 | 1.0 | Versão inicial |
| - | - | - |

---

## Contato

Para dúvidas sobre as regras de transação, entre em contato com o suporte:
- **Email:** financial@atos2.com
- **Documentação:** docs.atos2.com/financial

