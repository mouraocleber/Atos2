# Regras e Arquitetura do Projeto Atos2

## 1. Diretriz Financeira e de Pagamentos (Definitiva e Inviolável)

### 1.1. Princípio de Risco Zero de Custódia (Zero Custody / Zero Rombo)
- O **Atos2 NUNCA mantém custódia de valores** de clientes ou estabelecimentos em seus servidores ou banco de dados.
- Não existem saldos fiduciários armazenados como saldo real em tabelas internas que possam ser inflados ou drenados em caso de invasão.
- Todo fluxo financeiro é **Pass-Through / Split Instantâneo** direto para a conta do recebedor.

### 1.2. Canais de Liquidação Definidos:
1. **Brasil (PIX Dinâmico)**:
   - Liquidação instantânea direta na conta corrente / chave PIX do estabelecimento/restaurante.
   - Split da taxa do Atos2 é retido na liquidação do gateway bancário.

2. **Internacional / Global (Stripe Connect)**:
   - **O BaaS Pomelo foi definitivamente substituído pela Stripe**.
   - Turistas estrangeiros pagam via Cartões Internacionais, Apple Pay e Google Pay.
   - O Stripe Connect realiza o split automático e deposita diretamente na conta bancária do restaurante no país de origem.

3. **Cripto (Solana Pay com Liquidação Automática na Conta Corrente)**:
   - O processamento de pagamentos em cripto é feito via **Solana Pay**.
   - A liquidação é **automática** e convertida diretamente em moeda fiduciária para ser creditada na **conta corrente bancária do restaurante**.
   - O Atos2 não custodia tokens nem chaves privadas de clientes/lojistas.

### 1.3. Cadastro de Usuário e Dados de Transferência:
- Usuários que atuam como estabelecimentos, recebedores ou atendentes comerciais devem ter no cadastro/perfil a configuração dos seus **Dados de Transferência / Repasse**:
  - Chave PIX (para liquidações no Brasil).
  - Dados bancários / Conta Corrente / Onboarding Stripe Connect (para crédito direto das vendas via cartão e Solana Pay off-ramp).
