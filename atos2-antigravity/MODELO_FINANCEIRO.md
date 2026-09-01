# Modelo Financeiro & Precificação — AtoS2 App

Este documento detalha o modelo de negócios, custos operacionais por usuário (Unit Economics), estrutura oficial de precificação, receitas transacionais e projeções de margem de lucro para o **AtoS2**, cobrindo toda a cadeia do ecossistema turístico (hotéis, pousadas, receptivos, passeios, comércio, transporte, atrativos e serviços em geral).

---

## 1. Resumo do Modelo de Negócios

O **AtoS2** opera sob um modelo híbrido **SaaS Freemium (Assinatura Recorrente B2B/B2C)** + **Receitas Transacionais (Fintech/Marketplace)**:

1. **Assinaturas SaaS (Planos B2B & B2C)**: Licenciamento de inteligência artificial de tradução em tempo real para atendimento ao cliente, pontos de venda, recepção, guia de passeios, comércio e serviços turísticos. Todos os novos assinantes possuem **90 dias sem cobrança de assinatura (90 Days Free Trial)**.
2. **Receitas Transacionais FinTech**: Spreads sobre conversão de câmbio/cripto (BRL <-> USDC), taxas de saque PIX e emissão de cartões físicos.

---

## 2. Custos Operacionais por Usuário (COGS - Cost of Goods Sold)

Estimativa para um usuário ativo em uso regular consumindo em média **5 horas de áudio/mês** (~300 minutos de tradução viva) e **100.000 caracteres traduzidos**:

| Componente | Provedor / Tecnologia | Custo Estimado (BRL) | Custo Estimado (USD) |
| :--- | :--- | :--- | :--- |
| **Voz para Texto (STT)** | Groq (Whisper LPU) / Deepgram (~R$ 0,02/min) | R$ 6,00 | $1.20 |
| **Tradução Neural (NMT)** | DeepL API Neural (~R$ 25,00 / 1 milhão chars) | R$ 2,50 | $0.50 |
| **Infraestrutura Cloud & WebRTC** | WebSockets (Socket.io) + Servidores TURN/P2P + DB | R$ 1,50 | $0.30 |
| **Taxas de Cartão/Gateway** | Adquirente / Gateway de Pagamento (~4%) | R$ 1,20 | $0.24 |
| **CUSTO TOTAL MENSAL (COGS)** | **Custo Operacional Direto por Usuário Ativo** | **R$ 11,20** | **$2.24** |

---

## 3. Estrutura Oficial de Precificação (Pricing Tiers)

### 3.1. Planos de Assinatura Recorrente (SaaS)

> 💡 **Regra Geral de Degustação**: Todos os novos assinantes dos planos pagos contam com **90 dias sem cobrança de assinatura** (90 Dias Grátis) para facilitar a adesão de estabelecimentos, parceiros e usuários.

| Plano | Preço Brasil (BRL) | Preço Global (USD) | Escopo, Benefícios e Licenças |
| :--- | :--- | :--- | :--- |
| **Freemium (Degustação)** | **R$ 0,00** | **$0.00** | Chat em tempo real, Carteira PIX/Cripto, degustação de 15 min de tradução de voz. |
| **PRO 1 Usuário (Atendente)** | **R$ 99,90 /mês** | **$19.99 /mês** | 1 Licença de Usuário / Atendente, Push-to-Talk, Tradução em tempo real no balcão/ponto. ⭐ **90 Dias Grátis sem cobrança**. |
| **BUSINESS 5 Usuários** | **R$ 299,90 /mês** | **$59.99 /mês** | 5 Licenças de Usuários / Atendentes, QR Code de Cobrança / Ponto de Venda Dinâmico, Bloqueio de Carteira Master no Caixa. ⭐ **90 Dias Grátis sem cobrança**. |
| **ENTERPRISE 15 Usuários**| **R$ 499,90 /mês** | **$99.99 /mês** | 15 Licenças para equipes e estabelecimentos, Suporte VIP 24/7, Relatórios Analíticos de Vendas e Tradução. ⭐ **90 Dias Grátis sem cobrança**. |
| **CORPORATE (Redes/Hotéis)**| **Sob Consulta** | **Custom** | Para redes de hotéis, resorts, atrativos e grandes redes turísticas acima de 15 dispositivos. |

---

### 3.2. Receitas Transacionais Integradas (`constants/fees.ts`)

| Serviço / Operação | Valor / Taxa | Variável no Código (`constants/fees.ts`) |
| :--- | :--- | :--- |
| **Spread de Conversão BRL <-> USDC** | **2,0%** sobre o valor convertido | `CRYPTO_CONVERSION_SPREAD = 0.02` |
| **Taxa de Saque PIX Externo** | **R$ 1,99** por operação | `PIX_WITHDRAWAL = 1.99` |
| **Emissão de Cartão Físico** | **R$ 39,90** taxa única | `PHYSICAL_CARD_ISSUE = 39.90` |
| **Transferência Interna entre Usuários** | **GRÁTIS (R$ 0,00)** | `INTERNAL_TRANSFER = 0` |

---

## 4. Análise de Margem de Lucro Bruto

### 4.1. Plano PRO (Assinatura Individual - R$ 99,90)
* **Preço de Venda**: R$ 99,90 / mês
* **Custo Direto Operacional (COGS)**: R$ 11,20 / mês
* **Lucro Bruto por Assinante**: **R$ 88,70 / mês**
* **MARGEM BRUTA**: $$\frac{88,70}{99,90} \times 100 = \mathbf{88,8\%}$$

### 4.2. Plano BUSINESS (Empresarial 5 Usuários - R$ 299,90)
* *(Assumindo uso simultâneo de 5 usuários/atendentes com COGS médio combinado de R$ 35,00 / mês)*
* **Preço de Venda**: R$ 299,90 / mês
* **Custo Direto Operacional (COGS)**: R$ 35,00 / mês
* **Lucro Bruto por Assinatura**: **R$ 264,90 / mês**
* **MARGEM BRUTA**: $$\frac{264,90}{299,90} \times 100 = \mathbf{88,3\%}$$

### 4.3. Plano ENTERPRISE (Corporativo 15 Usuários - R$ 499,90)
* *(Assumindo uso de 15 usuários/atendentes com COGS médio combinado de R$ 75,00 / mês)*
* **Preço de Venda**: R$ 499,90 / mês
* **Custo Direto Operacional (COGS)**: R$ 75,00 / mês
* **Lucro Bruto por Assinatura**: **R$ 424,90 / mês**
* **MARGEM BRUTA**: $$\frac{424,90}{499,90} \times 100 = \mathbf{85,0\%}$$

---

## 5. Projeções Financeiras por Escala de Clientes Ativos (Planos PRO)

| Base de Clientes PRO | Receita Mensal (MRR) | Custo Operacional (COGS) | Lucro Bruto Mensal | Receita Anualizada (ARR) |
| :--- | :--- | :--- | :--- | :--- |
| **100 estabelecimentos / parceiros** | R$ 9.990,00 | R$ 1.120,00 | **R$ 8.870,00** | R$ 119.880,00 |
| **1.000 estabelecimentos / parceiros** | R$ 99.900,00 | R$ 11.200,00 | **R$ 88.700,00** | R$ 1.198.800,00 |
| **5.000 estabelecimentos / parceiros** | R$ 499.500,00 | R$ 56.000,00 | **R$ 443.500,00** | R$ 5.994.000,00 |
| **10.000 estabelecimentos / parceiros** | R$ 999.000,00 | R$ 112.000,00 | **R$ 887.000,00** | R$ 11.988.000,00 |

*Nota: As projeções acima não incluem o faturamento dos planos BUSINESS e ENTERPRISE, nem as receitas adicionais dos Spreads de Cripto, Saques PIX e Emissão de Cartão Físico.*

---

## 6. Métricas Principais para Pitch de Investidores (SaaS Metrics)

* **Período Gratuito de Experimentação**: **90 dias sem cobrança de assinatura**, acelerando o Funil de Conversão e Onboarding de parceiros do setor de turismo (hotéis, receptivos, passeios, comércio e serviços).
* **Payback de CAC (Custo de Aquisição de Cliente)**: Estimado em menos de 1 mês após o período grátis.
* **LTV Estimado (Lifetime Value - 12 meses de retenção no Plano PRO)**: 
  $$\text{LTV} = 12 \times \text{R\$ 88,70} = \mathbf{R\$ 1.064,40}$$
* **Escalabilidade Tecnológica**: Arquitetura P2P via WebRTC com STT/NMT ultrarrápido otimiza significativamente o custo operacional à medida que a base escala.
