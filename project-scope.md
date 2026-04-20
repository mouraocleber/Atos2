# Escopo do Projeto (Project Scope) - Atos2

## Visão Geral do Sistema
O Atos2 é uma plataforma digital que vai além das interações sociais. Trata-se de um super-app em que usuários (Pessoa Física e Pessoa Jurídica) conectam-se ativamente por meio de **Mensagens (Chat, Mídias, WebRTC voice)**, ao mesmo tempo em que administram um hub financeiro e comercial em tempo real. A essência do Atos2 é impulsionar comunidades através de uma carteira transacional nativa lastreada por uma moeda autoral flexível, combinada com uma vitrine de produtos de ponta a ponta (Marketplace).

## Arquitetura Fundamental
A solução Atos2 é concebida sobre fortes princípios de escalabilidade e micro serviços de retaguarda:
1.  **Backend (Monolito API RESTful + WebSockets):**
    *   **Linguagem & Ambiente:** `Node.js` + `TypeScript`.
    *   **Bancos de Dados:** `PostgreSQL 12+` para transações ACID essenciais (Financeiro, Usuários, Contatos) manipulado frequentemente de forma direta e otimizada (via script SQL puro ou ORM estruturado). `Redis` para engrenar mensageria WebSocket imediata e cache.
    *   **Localização de Retaguarda:** Conteineirizado (via `Docker`) e em fase de produção gerida em Droplets dedicados via **DigitalOcean**.
2.  **App Mobile Client (`atos2-antigravity`):**
    *   **Framework:** `React Native` via ecossistema `Expo` (EAS Build para Android APK / iOS nativo).
    *   **Funcionalidades de Interface:** Desenvolvido no modelo "Mobile-first" abraçando Expo Router. Validações avançadas matemáticas front-end (CPF, CNPJ) e persistência de dados.
3.  **App Web Legado (`frontend`):**
    *   **Framework:** `React` (Next.js/Vite) outrora testado mas hoje desprioritizado frente a versão Nativa Android.

## Módulos Principais Finalizados no Escopo
1.  **Autenticação e Perfil Completo**
    *   Registro duplo (PF/PJ) com API do ViaCEP integrada e verificação RegEx.
    *   O AuthContext gerencia tokens JWT de durabilidade limitada providos por backend e salva em SecureStorage.
    *   **Integração Nativa Google OAuth:** Sign-in "One Tap" na tela de Auth para agilizar a entrada.
    *   Gestão de Senha Forte, Upload de Fotografia com cache e definição de Idioma Local nativo (PT-BR, EN, ES, etc).
2.  **Sistema Financeiro Atos2 (Wallet)**
    *   Câmbio com flutuação programada: as transações processam o uso da "Moeda Global (G)": (USD + EUR + JPY + CNY + BRL) / 5.
    *   Tipos de Transação processada ACID: Saque, Depósito e Transferência sem taxas para P2P interno (0%).
    *   Regras Restritivas aplicáveis nos repasses, impedindo saldos virtuais inflados.
3.  **Marketplace e Catálogo de Usuário (Products)**
    *   Criar listagens e visualização geral P2P. Interações com estoque e contatos diretamente conectados à função "chat".
4.  **Ecossistema Social**
    *   Conexão via QR Códice inter-usuários com Leitor por Câmera em Tempo Real (Expo Camera/Scanner).
    *   Chat de mensagens nativas.

## Roadmap & Próximos Passos (Engavetados e Em Fila)
*   **Armazenamento Físico de Mídias Offline:** Migration em curso do streaming direto do `/uploads` DigitalOcean para download ativo ao `expo-file-system`, reproduzindo os arquivos de áudio (Ruash) e fotos de perfil de dentro da pasta Documentos do dispositivo Android.
*   **VOIP (WebRTC / Twilio Proxy):** Consolidar a conectividade proxy entre clientes para Ligações e Áudio persistente (Em fase de teste Alpha nativo).
*   **Gateways Ativos (Stripe/Pix):** Retomar o desenvolvimento interrompido por testes de firewall para finalização de pontes financeiras externas (Pix Brasil e Stripe Internacional) baseadas nas regras de taxa em `FINANCIAL_RULES.md`.
