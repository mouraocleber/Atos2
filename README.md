# AtoS2: Super-App de Turismo Sustentável & Fintech Powered by Solana & IA 🚀

> **Conectando Viajantes Internacionais a Negócios Locais com Tradução Simultânea por IA e Pagamentos Instantâneos via Solana Pay (USDC) e PIX.**

[![Solana](https://img.shields.io/badge/Solana-Solana_Pay-14F195?logo=solana&logoColor=black)](https://solana.com)
[![USDC](https://img.shields.io/badge/USDC-SPL_Token-2775CA?logo=circle&logoColor=white)](https://solana.com)
[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_55-61DAFB?logo=react&logoColor=black)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_15-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Licença](https://img.shields.io/badge/Licen%C3%A7a-Propriet%C3%A1ria-green.svg)](#)

---

## 🌐 Visão Geral & O Problema que Resolvemos

No setor global de turismo, viajantes internacionais e comércios locais enfrentam dois grandes atritos estruturais:

1. **A Barreira Linguística:** Dificuldade de comunicação direta com comerciantes locais, guias turísticos, garçons, motoristas e pousadas familiares.
2. **Fricção Financeira e Spreads Abusivos:** Taxas predatórias de conversão de câmbio (IOF, spreads de 5% a 15% em cartões de crédito e caixas eletrônicos) e demora de até 30 dias para os comerciantes locais receberem as vendas realizadas com cartões internacionais.

O **AtoS2** elimina essas barreiras ao integrar em uma única experiência mobile:
* **Tradução Neural por IA em Tempo Real (Speech-to-Text & Text-to-Speech):** Conversas por voz e texto traduzidas simultaneamente em mais de 15 idiomas com ultra-baixa latência (Deepgram, DeepL Neural e Whisper LPU).
* **Motor de Checkout com 4 Pilares de Pagamento:** Apresentação de valores na moeda de origem do turista com liquidação instantânea D+0.
* **Solana Pay (USDC):** Pagamentos em dólares digitais na rede Solana com confirmação em menos de 2 segundos e taxas de rede inferiores a $0.001.

---

## ⚡ Por que a Solana? (A Revolução do Web3 no Turismo)

A **Solana** é a espinha dorsal financeira do AtoS2 por entregar a única infraestrutura de blockchain capaz de replicar a velocidade e a simplicidade do PIX brasileiro em escala global:

* **Solana Pay:** O turista escaneia o QR Code dinâmico do AtoS2 na mesa do restaurante ou no balcão do hotel e realiza o pagamento via **USDC na Solana** diretamente da sua carteira digital (Phantom, Solflare, etc.).
* **Taxa de Rede Quase Zero (< $0.001):** Enquanto intermediários tradicionais de cartão cobram de 3.5% a 6% em compras internacionais, a rede Solana opera com frações de centavo.
* **Liquidação Instantânea D+0:** O estabelecimento recebe imediatamente em stablecoin dólar digital (USDC), protegido contra desvalorização cambial e sem esperar o ciclo de 30 dias das adquirentes tradicionais.

### 📍 Configuração Oficial na Rede Solana
* **Carteira Mestre Oficial AtoS2:** `26i1C86h7NHd3C6U1Mbpiuroo8NR3sjzmEtFrrX4WiBi`
* **Token USDC Oficial (Solana Mainnet):** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
* **Protocolo:** Solana Pay Standard (`solana:<recipient>?amount=<usdc>&spl-token=<mint>`)

---

## 💳 Os 4 Pilares do Checkout AtoS2

| Método de Pagamento | Público / Mercado | Taxa Comerciante | Taxa Turista | Liquidação |
| :--- | :--- | :--- | :--- | :--- |
| **Solana Pay (USDC)** | Turistas Internacionais & Usuários Web3 | 2,0% | +2,0% | Instantânea (~1.5s na Solana) |
| **PIX Instantâneo** | Clientes & Comerciantes no Brasil | 1,0% | 0,0% | Instantânea |
| **Cartão Internacional / Apple Pay** | Turistas Internacionais via Checkout | 2,0% | +3,9% (proc.) | Automatizada via Webhook |
| **Transferência P2P AtoS2** | Entre usuários cadastrados na plataforma | **0,0% (Grátis)** | **0,0%** | Imediata na carteira interna |

---

## 🛠️ Arquitetura do Projeto

```
atos2/
├── atos2-antigravity/        # App Mobile & Web (React Native / Expo SDK 55)
│   ├── app/                 # Rotas Expo Router (Auth, Chat, Wallet, Checkout, Tabs)
│   ├── components/          # Componentes visuais UI/UX premium
│   ├── contexts/            # Contextos globais (Auth, Socket, Onboarding, Localization)
│   ├── services/            # Serviços de integração (Solana, API, LiveTranslation, Binance)
│   └── constants/           # Regras de taxas (fees.ts), temas e traduções
├── src/                     # Backend Node.js / Express / TypeScript
│   ├── controllers/         # Regras de negócio (Auth, Wallet, Solana, Stripe, Pix, etc.)
│   ├── services/            # Integração com blockchain, IA e mensageria
│   ├── routes/              # Rotas REST da API
│   └── config/              # Banco PostgreSQL, Redis e inicialização
└── landing-page/            # Landing Page institucional e Apresentações de Pitch
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* Node.js 20+
* Docker e Docker Compose (para Banco de Dados e Redis)
* Expo CLI

### 1. Iniciar o App Mobile/Web (Expo)
```bash
cd atos2-antigravity
npm install
npm run start

# Para testar no navegador:
npm run web

# Para gerar o build de produção web:
npm run build
```

### 2. Iniciar o Backend (Docker)
```bash
docker compose up -d
```

---

## 🌍 Links Oficiais em Produção

* **Plataforma Web (Produção):** [https://atos2.online](https://atos2.online)
* **API Backend (Produção):** [https://api.atos2.online](https://api.atos2.online)
* **Health Check da API:** [https://api.atos2.online/health](https://api.atos2.online/health)
* **Apresentação em Inglês (Pitch Deck):** [PITCH_DECK_ATOS2_EN.md](PITCH_DECK_ATOS2_EN.md)
* **Modelo Financeiro & Unit Economics:** [MODELO_FINANCEIRO.md](atos2-antigravity/MODELO_FINANCEIRO.md)

---

## 🏆 Submissão: Colosseum Solana Hackathon

* **Track:** Consumer Apps / Payments & Commerce / AI
* **Equipe:** AtoS2 Team
* **Solana Pay Integration:** Checkout universal multi-moedas com conversão automática para USDC e liquidação instantânea via protocolo oficial da Solana.
