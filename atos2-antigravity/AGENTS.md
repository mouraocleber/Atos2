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

2. **Internacional / Global (Stripe Central da Plataforma Atos2 -> Repasse via PIX)**:
   - A conta Stripe pertence à plataforma central **Atos2**, que processa as cobranças internacionais dos turistas (Cartões Internacionais, Apple Pay, Google Pay).
   - O usuário/estabelecimento **NÃO possui e NÃO precisa criar conta Stripe**.
   - Todos os valores de vendas internacionais são repassados automaticamente pela plataforma para a **chave PIX cadastrada do estabelecimento**.

3. **Cripto (Solana Pay com Liquidação Automática na Conta Corrente via PIX)**:
   - O processamento de pagamentos em cripto é feito via **Solana Pay**.
   - A liquidação é **automática** e convertida em moeda fiduciária para ser creditada diretamente na **chave PIX / conta bancária do restaurante**.
   - O Atos2 não custodia tokens nem chaves privadas de clientes/lojistas.

### 1.3. Cadastro de Usuário e Dados de Transferência:
- Usuários que atuam como estabelecimentos, recebedores ou atendentes comerciais devem ter no cadastro/perfil a configuração exclusiva de seus **Dados de Transferência / Repasse**:
  - **Chave PIX de Recebimento** (CPF, CNPJ, E-mail, Telefone ou Chave Aleatória).
  - É nessa chave PIX que caem todos os recebimentos: pagamentos diretos em PIX, liquidações de vendas em cartão via Stripe e conversões de Solana Pay.
  - O aplicativo não deve exigir nem exibir configuração de conta Stripe Connect para o usuário final.
