/* Atos2 - Landing Page Script */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- Translations Dictionary ---
  const translations = {
    pt: {
      "page-title": "Atos2 - Mensagens, Carteira Digital e Marketplace P2P",
      "meta-desc": "Atos2 é uma plataforma integrada que une chat em tempo real, chamadas de voz e vídeo por WebRTC, carteira digital para transações instantâneas (BRL/USDC) e um marketplace P2P completo.",
      "link-features": "Recursos",
      "link-wallet": "Carteira",
      "link-marketplace": "Marketplace",
      "link-simulator": "Simulador",
      "link-faq": "FAQ",
      "btn-header-cta": "Baixar App",
      "badge-version": "Nova versão 2.0 liberada!",
      "hero-title-text": "Conecte sua <span class=\"text-gradient\">Comunidade</span>, Controle suas Finanças.",
      "hero-subtitle-text": "Atos2 une mensagens em tempo real com chamadas de alta definição (WebRTC), carteira digital segura e um marketplace P2P inovador. Tudo integrado em um ecossistema rápido e moderno.",
      "btn-hero-download": "Experimente Grátis",
      "btn-hero-learn": "Conhecer Recursos",
      "hero-badge-fee-text": "Sem taxas ocultas",
      "hero-badge-security-text": "Dados protegidos",
      "hero-badge-global-text": "Saldo Global USDC",
      "mock-tab-chat": "Conversas",
      "mock-tab-wallet": "Carteira",
      "mock-tab-store": "Vitrine",
      "mock-chat-in": "Acabei de enviar o PIX do produto!",
      "mock-chat-you": "Você",
      "mock-chat-out-1": "Confirmado! Seu pagamento",
      "mock-chat-out-2": "foi creditado em USDC.",
      "mock-card-label": "SALDO PRINCIPAL",
      "mock-card-btn": "Ver Cartão",
      "float-badge-chat-title": "+24 Mensagens",
      "float-badge-chat-subtitle": "Ativas hoje",
      "float-badge-wallet-title": "BRL ⇄ USDC",
      "float-badge-wallet-subtitle": "Taxa zero depósito",
      "features-title": "Um Ecossistema Completo no seu Bolso",
      "features-desc": "Chega de pular de aplicativo em aplicativo. Com o Atos2, você gerencia suas amizades, negocia seus produtos e efetua pagamentos rápidos sem sair da tela.",
      "feat-chat-card-title": "Mensagens & Voz",
      "feat-chat-card-desc": "Troque mensagens de texto, mídias e faça chamadas de vídeo ou voz de altíssima definição diretamente nas suas conversas via protocolo WebRTC.",
      "feat-wallet-card-title": "Carteira USDC e PIX",
      "feat-wallet-card-desc": "Deposite via PIX sem taxas e converta seu saldo para USDC com taxas justas e transparentes para proteção do seu patrimônio de maneira global.",
      "feat-market-card-title": "Marketplace Integrado",
      "feat-market-card-desc": "Crie sua loja P2P instantaneamente, anuncie seus produtos, gerencie seu estoque de maneira simples e venda para outros usuários da rede Atos2.",
      "card-front-type": "Cartão Virtual",
      "card-holder-label-text": "TITULAR",
      "card-holder-name-text": "SEU NOME AQUI",
      "card-expiry-label-text": "VALIDADE",
      "card-back-terms-text": "Uso exclusivo para membros Atos2. Transações protegidas e criptografadas de ponta a ponta.",
      "card-tip-text": "Passe o mouse ou toque no cartão para girá-lo.",
      "wallet-title": "Liberdade Financeira Sem Burocracia",
      "wallet-desc": "A carteira virtual do Atos2 foi projetada para que você realize saques e depósitos rápidos via PIX em BRL, ou compre saldo global indexado ao Dólar (USDC) para guardar riqueza.",
      "wallet-benefit-1-title": "Transferências Internas Gratuitas:",
      "wallet-benefit-1-desc": "Envie saldo instantaneamente para qualquer contato na sua agenda Atos2 com taxa zero.",
      "wallet-benefit-2-title": "Depósito de BRL Facilitado:",
      "wallet-benefit-2-desc": "Faça um PIX simples para sua carteira e comece a operar ou negociar no Marketplace em segundos.",
      "wallet-benefit-3-title": "Conversão Dinâmica:",
      "wallet-benefit-3-desc": "Compre e venda USDC com apenas um clique utilizando nossa integração otimizada de conversão direta.",
      "sim-section-title": "Simulador de Conversão BRL / USDC",
      "sim-section-desc": "Veja quanto você recebe ao converter BRL para USDC. Nossas taxas de conversão são atualizadas com base na cotação simulada e o spread de 2%.",
      "sim-label-send": "Você envia (BRL)",
      "sim-label-receive": "Você recebe (USDC)",
      "sim-rate-text": "Cotação de Referência (USD/BRL):",
      "sim-spread-text": "Spread de Conversão (2%):",
      "sim-total-text": "Total Líquido Convertido:",
      "btn-calc-cta": "Fazer Conversão no App",
      "market-section-title": "Negocie no Marketplace P2P",
      "market-section-desc": "O Atos2 facilita a negociação comercial direta entre pessoas físicas e jurídicas na sua rede social. Sem intermediários, sem comissões abusivas de plataformas terceiras.",
      "market-item-1-title": "Vitrine Digital Rápida",
      "market-item-1-desc": "Publique anúncios com fotos, descrição detalhada e preço diretamente do seu painel do usuário no app.",
      "market-item-2-title": "Negociação por Chat",
      "market-item-2-desc": "Seus clientes podem abrir conversas diretas a partir da sua vitrine de produtos para negociar preços e entregas.",
      "market-item-3-title": "Pagamento Facilitado",
      "market-item-3-desc": "Receba pagamentos instantâneos que vão direto para a sua carteira digital protegida do Atos2.",
      "storefront-status-text": "Vitrine Digital",
      "storefront-title-text": "Atos2 Marketplace",
      "product-1-title-text": "Smartphone X",
      "product-2-title-text": "Fones de Ouvido Pro",
      "storefront-footer-btn-text": "Ver Todos os Produtos",
      "faq-section-title": "Perguntas Frequentes",
      "faq-section-subtitle": "Dúvidas sobre o funcionamento do Atos2? Aqui estão as respostas mais rápidas para ajudar você.",
      "faq-q1-text": "Como faço para colocar saldo no Atos2?",
      "faq-a1-text": "Você pode depositar fundos em Reais (BRL) na sua carteira de forma rápida e segura gerando uma chave PIX diretamente na aba \"Carteira\" do aplicativo Atos2. O depósito é processado e creditado instantaneamente.",
      "faq-q2-text": "O que é a moeda USDC disponível no app?",
      "faq-a2-text": "A USD Coin (USDC) é uma stablecoin lastreada no dólar americano. Ela permite que você guarde o seu saldo em uma moeda forte e global, protegendo o seu capital contra flutuações e desvalorizações locais de forma muito simples.",
      "faq-q3-text": "Há tarifas cobradas pelo aplicativo?",
      "faq-a3-text": "Os depósitos PIX e transferências diretas entre usuários do Atos2 são 100% gratuitos. Existe uma taxa de apenas R$ 1,99 para retiradas externas via PIX e um spread de 2% sobre as conversões financeiras entre BRL e USDC.",
      "faq-q4-text": "Como funcionam as chamadas no chat?",
      "faq-a4-text": "As chamadas de áudio e vídeo utilizam a tecnologia WebRTC nativa de alto desempenho. Elas são iniciadas diretamente dentro da conversa com o seu contato e funcionam com qualidade HD.",
      "download-section-title": "Pronto para começar na Atos2?",
      "download-section-desc": "Baixe agora mesmo o aplicativo e comece a enviar mensagens e gerenciar suas finanças com estabilidade global.",
      "btn-download-apk-sub": "Download Direto",
      "btn-download-apk-main": "Arquivo APK",
      "btn-download-play-sub": "Baixar na",
      "btn-download-play-main": "Google Play",
      "btn-download-store-sub": "Baixar na",
      "btn-download-store-main": "App Store",
      "download-info-text": "Versão Recente: v2.0.2 (Android e iOS) • Tamanho: ~28MB",
      "footer-brand-desc-text": "A união inteligente de rede social, finanças globais descentralizadas e comércio P2P em um aplicativo único e veloz.",
      "footer-platform-title": "Plataforma",
      "footer-legal-title": "Legal",
      "footer-support-title": "Suporte",
      "footer-link-features": "Recursos",
      "footer-link-wallet": "Carteira USDC",
      "footer-link-marketplace": "Marketplace",
      "footer-link-simulator": "Simulador BRL",
      "footer-link-terms": "Termos de Serviço",
      "footer-link-privacy": "Política de Privacidade",
      "footer-link-security": "Segurança e LGPD",
      "footer-link-help": "Central de Ajuda",
      "footer-bottom-text": "&copy; 2026 Atos2. Todos os direitos reservados. atos2.online"
    },
    en: {
      "page-title": "Atos2 - Messaging, Digital Wallet and P2P Marketplace",
      "meta-desc": "Atos2 is an integrated platform combining real-time chat, high-definition voice and video calls via WebRTC, a digital wallet for instant transactions (BRL/USDC), and a complete P2P marketplace.",
      "link-features": "Features",
      "link-wallet": "Wallet",
      "link-marketplace": "Marketplace",
      "link-simulator": "Simulator",
      "link-faq": "FAQ",
      "btn-header-cta": "Download App",
      "badge-version": "New version 2.0 released!",
      "hero-title-text": "Connect your <span class=\"text-gradient\">Community</span>, Control your Finances.",
      "hero-subtitle-text": "Atos2 integrates real-time messaging with high-definition calls (WebRTC), a secure digital wallet, and an innovative P2P marketplace. All in one fast, modern ecosystem.",
      "btn-hero-download": "Try for Free",
      "btn-hero-learn": "Explore Features",
      "hero-badge-fee-text": "No hidden fees",
      "hero-badge-security-text": "Protected data",
      "hero-badge-global-text": "Global USDC Balance",
      "mock-tab-chat": "Chats",
      "mock-tab-wallet": "Wallet",
      "mock-tab-store": "Showcase",
      "mock-chat-in": "I just sent the PIX for the product!",
      "mock-chat-you": "You",
      "mock-chat-out-1": "Confirmed! Your payment",
      "mock-chat-out-2": "was credited in USDC.",
      "mock-card-label": "MAIN BALANCE",
      "mock-card-btn": "View Card",
      "float-badge-chat-title": "+24 Messages",
      "float-badge-chat-subtitle": "Active today",
      "float-badge-wallet-title": "BRL ⇄ USDC",
      "float-badge-wallet-subtitle": "Zero deposit fee",
      "features-title": "A Complete Ecosystem in Your Pocket",
      "features-desc": "No more jumping from app to app. With Atos2, you manage friendships, negotiate products, and make fast payments without leaving the screen.",
      "feat-chat-card-title": "Messages & Voice",
      "feat-chat-card-desc": "Exchange text messages, media, and make high-definition video or voice calls directly within your chats via the WebRTC protocol.",
      "feat-wallet-card-title": "USDC and PIX Wallet",
      "feat-wallet-card-desc": "Deposit via PIX without fees and convert your balance to USDC with fair and transparent rates to protect your wealth globally.",
      "feat-market-card-title": "Integrated Marketplace",
      "feat-market-card-desc": "Create your P2P store instantly, list your products, manage inventory easily, and sell directly to other Atos2 network users.",
      "card-front-type": "Virtual Card",
      "card-holder-label-text": "CARDHOLDER",
      "card-holder-name-text": "YOUR NAME HERE",
      "card-expiry-label-text": "EXPIRY",
      "card-back-terms-text": "Exclusive use for Atos2 members. Transactions protected and encrypted end-to-end.",
      "card-tip-text": "Hover or tap on the card to flip it.",
      "wallet-title": "Financial Freedom Without Bureaucracy",
      "wallet-desc": "The Atos2 virtual wallet is designed for quick BRL withdrawals and deposits via PIX, or to buy global balance pegged to the Dollar (USDC) to preserve wealth.",
      "wallet-benefit-1-title": "Free Internal Transfers:",
      "wallet-benefit-1-desc": "Send balance instantly to any contact in your Atos2 list with zero fees.",
      "wallet-benefit-2-title": "Easy BRL Deposits:",
      "wallet-benefit-2-desc": "Make a simple PIX deposit to your wallet and start trading or selling on the Marketplace in seconds.",
      "wallet-benefit-3-title": "Dynamic Conversion:",
      "wallet-benefit-3-desc": "Buy and sell USDC with just one click using our optimized direct conversion integration.",
      "sim-section-title": "BRL / USDC Conversion Simulator",
      "sim-section-desc": "See how much you receive when converting BRL to USDC. Our conversion rates are updated based on the simulated quote and the 2% spread.",
      "sim-label-send": "You send (BRL)",
      "sim-label-receive": "You receive (USDC)",
      "sim-rate-text": "Reference Quote (USD/BRL):",
      "sim-spread-text": "Conversion Spread (2%):",
      "sim-total-text": "Total Net Converted:",
      "btn-calc-cta": "Convert in the App",
      "market-section-title": "Trade in the P2P Marketplace",
      "market-section-desc": "Atos2 facilitates direct commercial trading between individuals and businesses in your social network. No intermediaries, no abusive third-party fees.",
      "market-item-1-title": "Fast Digital Showcase",
      "market-item-1-desc": "Publish listings with photos, detailed description, and price directly from your user panel in the app.",
      "market-item-2-title": "Negotiation via Chat",
      "market-item-2-desc": "Your customers can open direct chats from your product showcase to negotiate prices and deliveries.",
      "market-item-3-title": "Easy Payment",
      "market-item-3-desc": "Receive instant payments that go directly to your secure Atos2 digital wallet.",
      "storefront-status-text": "Digital Showcase",
      "storefront-title-text": "Atos2 Marketplace",
      "product-1-title-text": "Smartphone X",
      "product-2-title-text": "Pro Headphones",
      "storefront-footer-btn-text": "View All Products",
      "faq-section-title": "Frequently Asked Questions",
      "faq-section-subtitle": "Questions about how Atos2 works? Here are the quickest answers to help you.",
      "faq-q1-text": "How do I add balance to Atos2?",
      "faq-a1-text": "You can deposit funds in Brazilian Reais (BRL) to your wallet quickly and securely by generating a PIX key directly in the 'Wallet' tab of the Atos2 app. The deposit is processed and credited instantly.",
      "faq-q2-text": "What is the USDC coin available in the app?",
      "faq-a2-text": "USD Coin (USDC) is a stablecoin backed by the US dollar. It allows you to store your balance in a strong and global currency, protecting your capital against local fluctuations and devaluations in a very simple way.",
      "faq-q3-text": "Are there fees charged by the app?",
      "faq-a3-text": "PIX deposits and direct transfers between Atos2 users are 100% free. There is a flat R$ 1.99 fee for external PIX withdrawals and a 2% spread on financial conversions between BRL and USDC.",
      "faq-q4-text": "How do chat calls work?",
      "faq-a4-text": "Audio and video calls use high-performance native WebRTC technology. They are initiated directly within the chat with your contact and work in HD quality.",
      "download-section-title": "Ready to get started on Atos2?",
      "download-section-desc": "Download the app right now and start sending messages and managing your finances with global stability.",
      "btn-download-apk-sub": "Direct Download",
      "btn-download-apk-main": "APK File",
      "btn-download-play-sub": "Get it on",
      "btn-download-play-main": "Google Play",
      "btn-download-store-sub": "Download on the",
      "btn-download-store-main": "App Store",
      "download-info-text": "Recent Version: v2.0.2 (Android and iOS) • Size: ~28MB",
      "footer-brand-desc-text": "The smart union of social networking, global decentralized finance, and P2P commerce in a single, fast application.",
      "footer-platform-title": "Platform",
      "footer-legal-title": "Legal",
      "footer-support-title": "Support",
      "footer-link-features": "Features",
      "footer-link-wallet": "USDC Wallet",
      "footer-link-marketplace": "Marketplace",
      "footer-link-simulator": "BRL Simulator",
      "footer-link-terms": "Terms of Service",
      "footer-link-privacy": "Privacy Policy",
      "footer-link-security": "Security & LGPD",
      "footer-link-help": "Help Center",
      "footer-bottom-text": "&copy; 2026 Atos2. All rights reserved. atos2.online"
    }
  };

  // --- Change Language Function ---
  const langSelector = document.getElementById('lang-selector');

  function changeLanguage(lang) {
    if (!translations[lang]) return;
    
    // Set html lang attribute
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    
    const dictionary = translations[lang];
    
    for (const key in dictionary) {
      const element = document.getElementById(key);
      if (element) {
        // If the key is 'hero-title-text', we must use innerHTML to preserve span gradient
        if (key === 'hero-title-text') {
          element.innerHTML = dictionary[key];
        } else if (key === 'page-title') {
          document.title = dictionary[key];
        } else if (key === 'meta-desc') {
          const meta = document.getElementById('meta-desc');
          if (meta) meta.setAttribute('content', dictionary[key]);
        } else {
          element.textContent = dictionary[key];
        }
      }
    }
  }

  if (langSelector) {
    langSelector.addEventListener('change', (e) => {
      const selectedLang = e.target.value;
      changeLanguage(selectedLang);
      // Save user language preference
      localStorage.setItem('atos2_pref_lang', selectedLang);
      // Recalculate simulator amounts to update symbols
      calculateConversion();
    });

    // Load saved preference or fallback to browser language
    const savedLang = localStorage.getItem('atos2_pref_lang');
    if (savedLang && translations[savedLang]) {
      langSelector.value = savedLang;
      changeLanguage(savedLang);
    } else {
      const userLang = navigator.language || navigator.userLanguage;
      const defaultLang = userLang.startsWith('pt') ? 'pt' : 'en';
      langSelector.value = defaultLang;
      changeLanguage(defaultLang);
    }
  }

  // 1. Header Scroll Effect
  const header = document.getElementById('main-header');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 2. Mobile Menu Toggle
  const menuToggle = document.getElementById('menu-toggle-btn');
  const navMenu = document.getElementById('nav-menu-bar');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
      menuToggle.classList.toggle('active');
    });

    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 768) {
          navMenu.style.display = 'none';
          menuToggle.classList.remove('active');
        }
      });
    });
  }

  // 3. 3D Credit Card Touch Support for Mobile
  const virtualCard = document.getElementById('virtual-card');
  const cardArea = document.getElementById('card-3d-area');

  if (cardArea && virtualCard) {
    cardArea.addEventListener('click', (e) => {
      virtualCard.classList.toggle('flipped');
    });
  }

  // 4. BRL to USDC Conversion Simulator
  const brlInput = document.getElementById('brl-amount');
  const usdcInput = document.getElementById('usdc-amount');
  const usdRateEl = document.getElementById('usd-rate');
  const feeEl = document.getElementById('conversion-fee');
  const finalConvertedEl = document.getElementById('final-converted');

  const USD_BRL_RATE = 5.60; // Estimated exchange rate
  const CONVERSION_SPREAD = 0.02; // 2% spread fee

  function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function formatUSDC(value) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  function calculateConversion() {
    if (!brlInput || !usdcInput) return;
    
    let brlAmount = parseFloat(brlInput.value);
    
    if (isNaN(brlAmount) || brlAmount < 0) {
      usdcInput.value = "0.00";
      if (feeEl) feeEl.textContent = formatBRL(0);
      if (finalConvertedEl) finalConvertedEl.textContent = formatBRL(0);
      return;
    }

    const fee = brlAmount * CONVERSION_SPREAD;
    const netAmountBrl = brlAmount - fee;
    const usdcReceived = netAmountBrl / USD_BRL_RATE;

    usdcInput.value = formatUSDC(usdcReceived);
    if (usdRateEl) usdRateEl.textContent = formatBRL(USD_BRL_RATE);
    if (feeEl) feeEl.textContent = formatBRL(fee);
    if (finalConvertedEl) finalConvertedEl.textContent = formatBRL(netAmountBrl);
  }

  if (brlInput) {
    brlInput.addEventListener('input', calculateConversion);
    calculateConversion();
  }

  // 5. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const content = item.querySelector('.faq-content');

    if (trigger && content) {
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        
        faqItems.forEach(otherItem => {
          otherItem.classList.remove('active');
          const otherTrigger = otherItem.querySelector('.faq-trigger');
          const otherContent = otherItem.querySelector('.faq-content');
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          if (otherContent) otherContent.setAttribute('hidden', '');
        });

        if (!isOpen) {
          item.classList.add('active');
          trigger.setAttribute('aria-expanded', 'true');
          content.removeAttribute('hidden');
        }
      });
    }
  });

  // 6. Scroll Reveal Animation
  const revealElements = document.querySelectorAll('.feature-card, .benefit-item, .simulator-box, .storefront-card, .download-card');
  
  const revealOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, revealOptions);

  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    revealObserver.observe(el);
  });

  const style = document.createElement('style');
  style.textContent = `
    .feature-card.revealed, 
    .benefit-item.revealed, 
    .simulator-box.revealed, 
    .storefront-card.revealed, 
    .download-card.revealed {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);
});
