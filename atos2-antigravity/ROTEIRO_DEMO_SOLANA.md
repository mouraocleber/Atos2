# 🎬 Roteiro de Demonstração em Vídeo: Atos2 no Hackathon Solana

**Tema:** Da Barreira Linguística à Liquidação Instantânea via Solana Pay  
**Duração Alvo:** 2 minutos a 2 minutos e 30 segundos (Tempo padrão de avaliação da Solana Foundation / Colosseum)  
**Público-alvo:** Jurados técnicos e investidores do Hackathon da Solana  

---

## 🧭 Visão Geral do Arco Narrativo

```
[ATO 1: A Barreira de Idioma] ➔ [ATO 2: Cardápio Inteligente Multilíngue] ➔ [ATO 3: O Pedido & Mesa] ➔ [ATO 4: A Barreira Financeira Tradicional] ➔ [ATO 5: Solana Pay & Zero Custody]
```

1. **O Problema Linguístico:** Turistas internacionais em bares, feiras e restaurantes não entendem os pratos locais nem os cardápios impressos, gerando atrito e perda de vendas.
2. **A Solução Multilíngue do Atos2:** A Vitrine e Cardápio Digital Inteligente (`/products`) traduz títulos, categorias, ingredientes e descrições em tempo real para a língua materna do visitante, formatando o preço na moeda local.
3. **O Pedido:** O prato é selecionado diretamente pelo visitante na comanda de sua mesa (ex: Mesa 04).
4. **O Gargalo Financeiro Tradicional:** Turista estrangeiro não tem PIX, cartões de crédito cobram 5% a 7% de spread/IOF e o restaurante espera até 30 dias para receber.
5. **A Solução Solana Pay:** Um clique, QR Code Solana Pay instantâneo (`solana:` URI + SPL Token USDC), pagamento em ~1s com Phantom/Solflare e liquidação imediata sem custódia (Zero Rombo / Zero Custody).

---

## ⏱️ Roteiro Cena a Cena (Storyboard com Fala & Ação de Tela)

### 📌 CENA 1: Introdução & O Cardápio Multilíngue em Tempo Real (0:00 - 0:40)
* **Visual na Tela / Câmera:**
  - Abre no app **Atos2**, navegando na aba **Produtos / Cardápio (`/products`)**.
  - Mostrar os itens com títulos, categorias e descrições traduzidos instantaneamente para a língua do turista estrangeiro (ex: Inglês ou Espanhol) e preços formatados na moeda local do usuário.
* **Ação:**
  - Rolar suavemente pelos pratos e bebidas.
  - Tocar em um prato (ex: Picanha na Brasa / Moqueca) para abrir o modal de detalhes do produto traduzido.
* **Voz / Narração (Português):**
  > "Viajar pelo mundo e frequentar estabelecimentos locais deveria ser simples, mas turistas e comerciantes enfrentam duas grandes barreiras: o idioma e o pagamento. No Atos2, resolvemos a primeira na própria mesa: nosso cardápio digital traduz pratos, ingredientes e categorias em tempo real para a língua nativa do visitante, com valores formatados na sua moeda."
* **Voiceover (Inglês - para jurados):**
  > *"Exploring local restaurants abroad should be effortless, but travelers and merchants face two major barriers: language and payments. At Atos2, we eliminate the first at the table: our smart digital catalog translates dishes, ingredients, and categories in real-time to the visitor's native language, with prices localized to their currency."*

---

### 📌 CENA 2: Escolhendo o Prato & Fechando a Conta (0:40 - 1:00)
* **Visual na Tela:**
  - Selecionar o item e a mesa de consumo (ex: Mesa 04).
  - Tocar em **"Fechar Conta / Pagar"** ou abrir a comanda da mesa.
  - Transição suave para a tela de **Checkout (`/checkout`)**.
* **Voz / Narração (Português):**
  > "Sem atrito de comunicação, o cliente faz o pedido e fecha a comanda da mesa diretamente pelo aplicativo."
* **Voiceover (Inglês):**
  > *"Zero communication friction: the guest places their order and closes the table check directly from the app."*

---

### 📌 CENA 3: O Gargalo Financeiro Tradicional vs. Solana Pay (1:00 - 1:30)
* **Visual na Tela:**
  - Tela de **Checkout (`/checkout`)**.
  - Destacar visualmente as opções de pagamento:
    1. PIX Instantâneo (restrito a cidadãos com conta bancária brasileira).
    2. **Solana Pay (USDC / SOL)** (destaque neon roxo `#A855F7`).
    3. Cartão Internacional (taxas elevadas de 3.9% + IOF de câmbio).
* **Ação:**
  - Selecionar a opção **"2. Solana Pay (USDC / SOL)"**.
  - O app exibe a conversão instantânea (ex: `R$ 84,00 ➔ 15.00 USDC (~0.1000 SOL)`).
* **Voz / Narração (Português):**
  > "Mas na hora de pagar surge a segunda barreira: turistas estrangeiros não têm PIX. Cartões tradicionais cobram taxas de até 7% e o restaurante espera 30 dias para receber. É aqui que entra o poder da Solana."
* **Voiceover (Inglês):**
  > *"At checkout, the second barrier hits: foreign visitors cannot use local PIX. Legacy credit cards charge up to 7% in foreign exchange fees and merchants wait 30 days to receive funds. This is where Solana transforms the game."*

---

### 📌 CENA 4: Live Demo do Solana Pay em Ação (1:30 - 2:05)
* **Visual na Tela:**
  - O modal do **Solana Pay** se abre exibindo:
    - QR Code do protocolo `solana:`.
    - Valor exato em USDC (`amount=15.00&spl-token=...`).
    - Botão "Abrir Carteira" (Deep Link para Phantom / Solflare) e "Copiar Endereço".
* **Ação de Gravação:**
  - Apontar o celular com a **Phantom Wallet** escaneando o QR Code na tela ou clicar em confirmar.
  - A confirmação ocorre em ~1 segundo.
* **Visual da Tela de Sucesso:**
  - **"Pagamento Aprovado! Comprovante de Liquidação D+0"**.
  - Exibe: Estabelecimento, Mesa, Forma de Pagamento (`Solana Pay USDC`), Hash da Transação Solana e Split transparente de taxas.
* **Voz / Narração (Português):**
  > "Com o protocolo nativo Solana Pay, geramos a transação direta em USDC na Solana Mainnet. O turista escaneia com Phantom ou Solflare, confirma em menos de 1 segundo e paga frações de centavo de taxa."
* **Voiceover (Inglês):**
  > *"Using the native Solana Pay protocol, we generate a direct USDC payment on Solana Mainnet. The guest scans with Phantom or Solflare, confirms in 400 milliseconds, paying sub-cent fees with instant settlement."*

---

### 📌 CENA 5: Arquitetura Zero Custody & Conclusão (2:05 - 2:30)
* **Visual na Tela / Slide Final:**
  - Mostrar o comprovante detalhado e a logo do Atos2 integrada com Solana.
* **Voz / Narração (Português):**
  > "O Atos2 opera sob o princípio inviolável de Zero Custody: não retemos o dinheiro de ninguém. A liquidação é instantânea e direta para a conta do comerciante. Da tradução em tempo real ao checkout global, o Atos2 conecta o comércio físico à economia da Solana."
* **Voiceover (Inglês):**
  > *"Atos2 is built on a strict Zero-Custody architecture: we never custody merchant funds. Settlement is instant, direct, and pass-through. From real-time translation to borderless checkout, Atos2 bridges physical commerce to the Solana economy."*

---

## 💡 Dicas de Gravação para os Jurados

1. **Demonstração Fluida**: Mostre o cardápio traduzindo os pratos, avance para a mesa e finalize na leitura do QR Code do Solana Pay.
2. **Visual em Modo Mobile**: Abra `http://localhost:8081` no navegador (F12 -> modo iPhone 14 Pro) para garantir gravação em 1080p nítida.
3. **Escaneando com a Phantom**: Se tiver outro celular com Phantom Wallet, aponte a câmera para ler o QR Code da tela; isso comprova aos jurados que o protocolo `solana:` gerado é real e compatível.
