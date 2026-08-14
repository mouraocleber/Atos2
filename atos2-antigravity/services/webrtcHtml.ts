export const getWebRtcHtml = () => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Atos2 VoIP Call</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background: linear-gradient(135deg, #041527 0%, #06162A 100%);
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      position: relative;
    }

    /* Video Screens */
    .video-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      z-index: 1;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    #remoteVideo {
      width: 100%;
      height: 100%;
    }
    .local-video-wrapper {
      position: absolute;
      top: 40px;
      right: 20px;
      width: 110px;
      height: 160px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      border: 2px solid rgba(255,255,255,0.2);
      z-index: 10;
      background: #111;
      transition: all 0.3s ease;
    }
    #localVideo {
      transform: scaleX(-1); /* Mirror effect */
    }

    /* Floating Header Overlay */
    .header-overlay {
      position: absolute;
      top: 40px;
      left: 20px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.8);
    }
    .caller-name {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
    }
    .call-status {
      font-size: 14px;
      color: #06d6a0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .call-status::before {
      content: '';
      width: 8px;
      height: 8px;
      background-color: #06d6a0;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 8px #06d6a0;
    }

    /* Audio Call Mode UI */
    .audio-ui-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 5;
      background: radial-gradient(circle, #0B2039 0%, #041527 100%);
    }
    .avatar-circle {
      width: 140px;
      height: 140px;
      border-radius: 70px;
      background: #0D2C54;
      border: 4px solid rgba(255, 200, 87, 0.2);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 56px;
      font-weight: 800;
      color: #FFC857;
      margin-bottom: 24px;
      position: relative;
      box-shadow: 0 12px 30px rgba(0,0,0,0.4);
    }
    .avatar-circle::after {
      content: '';
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      border-radius: 50%;
      border: 2px solid #FFC857;
      opacity: 0.3;
      animation: pulse 2s infinite ease-in-out;
    }
    .audio-name {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #fff;
    }
    .audio-timer {
      font-size: 18px;
      color: #6889A9;
      letter-spacing: 1px;
    }

    /* Control Panel */
    .controls-overlay {
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      align-items: center;
      z-index: 10;
      background: rgba(11, 32, 57, 0.65);
      padding: 16px 24px;
      border-radius: 40px;
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .btn {
      width: 54px;
      height: 54px;
      border-radius: 27px;
      border: none;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      outline: none;
      transition: all 0.2s ease;
      color: white;
      background: rgba(255,255,255,0.15);
    }
    .btn:active {
      transform: scale(0.9);
    }
    .btn-hangup {
      background: #ef476f;
      width: 62px;
      height: 62px;
      border-radius: 31px;
      box-shadow: 0 6px 20px rgba(239, 71, 111, 0.4);
    }
    .btn-hangup:active {
      background: #d63f63;
    }
    .btn-translate {
      background: linear-gradient(135deg, #FFC857 0%, #E9A825 100%) !important;
      color: #041527 !important;
      font-weight: 700;
      box-shadow: 0 4px 15px rgba(255, 200, 87, 0.4);
    }
    .btn-translate.active {
      background: linear-gradient(135deg, #06d6a0 0%, #049a73 100%) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 15px rgba(6, 214, 160, 0.5);
    }
    
    /* Live Captions Overlay */
    .captions-container {
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 15;
      pointer-events: none;
    }
    .caption-bubble {
      background: rgba(4, 21, 39, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 200, 87, 0.3);
      border-radius: 16px;
      padding: 12px 16px;
      color: #ffffff;
      font-size: 14px;
      line-height: 1.4;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      animation: fadeInCaption 0.3s ease-out;
    }
    .caption-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #FFC857;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .caption-text-original {
      font-size: 12px;
      color: #94A3B8;
      font-style: italic;
      margin-bottom: 2px;
    }
    .caption-text-translated {
      font-size: 15px;
      color: #F8FAFC;
      font-weight: 600;
    }

    /* Language Selection Modal */
    .lang-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(11, 32, 57, 0.96);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 200, 87, 0.35);
      border-radius: 24px;
      padding: 20px;
      width: 88%;
      max-width: 360px;
      max-height: 82vh;
      z-index: 50;
      box-shadow: 0 20px 40px rgba(0,0,0,0.7);
      display: none;
      flex-direction: column;
      gap: 12px;
    }
    .lang-modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #FFC857;
      text-align: center;
    }
    .lang-search-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 200, 87, 0.25);
      border-radius: 12px;
      padding: 10px 14px;
      color: #ffffff;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .lang-search-input::placeholder {
      color: #64748B;
    }
    .lang-search-input:focus {
      border-color: #FFC857;
      background: rgba(255, 255, 255, 0.15);
      box-shadow: 0 0 10px rgba(255, 200, 87, 0.2);
    }
    .lang-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 240px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .lang-list::-webkit-scrollbar {
      width: 4px;
    }
    .lang-list::-webkit-scrollbar-thumb {
      background: rgba(255, 200, 87, 0.4);
      border-radius: 4px;
    }
    .lang-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255,255,255,0.08);
      padding: 10px 14px;
      border-radius: 12px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      color: #fff;
      font-size: 14px;
    }
    .lang-item:active, .lang-item.selected {
      border-color: #FFC857;
      background: rgba(255, 200, 87, 0.18);
      font-weight: 600;
    }

    @keyframes fadeInCaption {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

  <div id="logs"></div>

  <!-- Audio-only UI -->
  <div id="audioUi" class="audio-ui-container" style="display: none;">
    <div id="avatar" class="avatar-circle">?</div>
    <div id="audioName" class="audio-name">Usuário</div>
    <div id="timer" class="audio-timer">00:00</div>
  </div>

  <!-- Video Call Streams Container -->
  <div id="videoContainer" class="video-container" style="display: none;">
    <!-- Remote stream -->
    <video id="remoteVideo" autoplay playsinline></video>
    
    <!-- Local preview stream -->
    <div class="local-video-wrapper">
      <video id="localVideo" autoplay playsinline muted></video>
    </div>
  </div>

  <!-- Dedicated Remote Audio Element for VoIP audio playback -->
  <audio id="remoteAudio" autoplay playsinline style="display: none;"></audio>

  <!-- Floating Info Header -->
  <div class="header-overlay">
    <div id="headerName" class="caller-name">Conectando</div>
    <div id="headerStatus" class="call-status">Seguro P2P</div>
  </div>

  <!-- Captions Overlay Container -->
  <div id="captionsContainer" class="captions-container"></div>

  <!-- Informativo de Cobrança Modal -->
  <div id="billingModal" class="lang-modal" style="display: none;">
    <div class="lang-modal-title">✨ Tradução Simultânea IA</div>
    <div style="font-size: 13px; color: #94A3B8; text-align: center; margin-top: -6px;">Informativo de Tarifa de Chamada:</div>
    <div style="background: rgba(6, 214, 160, 0.1); border: 1px solid rgba(6, 214, 160, 0.35); border-radius: 16px; padding: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px;">
      <div style="font-size: 26px; font-weight: 800; color: #06d6a0; letter-spacing: -0.5px;">$ 0.30 USD <span style="font-size: 13px; font-weight: 600; color: #CBD5E1;">/ minuto</span></div>
      <div style="font-size: 12px; color: #CBD5E1; font-weight: 600;">Cobrança por minuto de ligação traduzida</div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">Idioma detectado automaticamente do seu cadastro:</div>
      <div id="billingLangText" style="font-size: 14px; font-weight: 700; color: #FFC857;">🇧🇷 Português (Brasil)</div>
    </div>
    <div style="display: flex; gap: 10px; margin-top: 4px;">
      <button class="btn" style="flex: 1; border-radius: 12px; background: rgba(255,255,255,0.15); color: #fff; font-size: 13px; font-weight: 600;" onclick="closeBillingModal()">Cancelar</button>
      <button id="btnConfirmBilling" class="btn" style="flex: 1.4; border-radius: 12px; background: linear-gradient(135deg, #FFC857 0%, #E9A825 100%); color: #041527; font-weight: 700; font-size: 13px;" onclick="confirmBillingToggle()">Ativar ($0.30/min)</button>
    </div>
  </div>

  <!-- Controls overlay -->
  <div class="controls-overlay">
    <!-- Mute mic -->
    <button id="btnMute" class="btn" onclick="toggleMute()">
      <svg viewBox="0 0 24 24">
        <!-- Mic Icon -->
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
      </svg>
    </button>

    <!-- AI Live Translation Toggle Button -->
    <button id="btnTranslate" class="btn btn-translate" onclick="openBillingModal()" title="Informativo de Cobrança Tradução IA ($0.30 USD/minuto)">
      ✨ IA
    </button>

    <!-- Toggle Camera (Only for video calls) -->
    <button id="btnVideo" class="btn" onclick="toggleVideo()" style="display: none;">
      <svg viewBox="0 0 24 24">
        <!-- Video Camera Icon -->
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
      </svg>
    </button>

    <!-- Flip Camera (Only for video calls) -->
    <button id="btnFlip" class="btn" onclick="flipCamera()" style="display: none;">
      <svg viewBox="0 0 24 24">
        <!-- Switch Camera Icon -->
        <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z"/>
      </svg>
    </button>

    <!-- Hang up -->
    <button class="btn btn-hangup" onclick="hangUp()">
      <svg viewBox="0 0 24 24">
        <!-- Phone Off Icon -->
        <path d="M12 9c-2.2 0-4.3.3-6.2.9v3c0 .4-.3.7-.6.8-1.5.3-3 .1-4.3-.3-.4-.1-.6-.5-.6-.9V8.6c0-.4.2-.8.5-1 2.7-1.7 5.8-2.6 9.2-2.6s6.5.9 9.2 2.6c.3.2.5.6.5 1v3.9c0 .4-.2.8-.6.9-1.3.4-2.8.6-4.3.3-.3-.1-.6-.4-.6-.8v-3c-1.9-.6-4-.9-6.2-.9z"/>
      </svg>
    </button>
  </div>

  <script>
    let localStream = null;
    let peerConnection = null;
    let iceServers = [];
    let isCaller = false;
    let callType = 'audio';
    let targetName = 'Usuário';
    let isMuted = false;
    let isVideoMuted = false;
    let facingMode = 'user';
    let durationTimer = null;
    let callDurationSeconds = 0;
    
    // Live AI Translation state variables
    let isTranslationActive = false;
    let selectedLangCode = 'pt';
    let selectedLangName = 'Português';
    let selectedLangFlag = '🇧🇷';
    let remoteAudioElement = null;

    // WebRTC connection state variables
    let candidateQueue = [];

    // Complete list of supported translation languages
    const AVAILABLE_LANGUAGES = [
      { code: 'pt', name: 'Português (Brasil)', flag: '🇧🇷' },
      { code: 'en', name: 'English (US)', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'it', name: 'Italiano', flag: '🇮🇹' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'zh', name: '中文 (简体)', flag: '🇨🇳' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: '한국어', flag: '🇰🇷' },
      { code: 'ar', name: 'العربية', flag: '🇸🇦' },
      { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
      { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
      { code: 'pl', name: 'Polski', flag: '🇵🇱' },
      { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
      { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
      { code: 'da', name: 'Dansk', flag: '🇩🇰' },
      { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
      { code: 'nb', name: 'Norsk', flag: '🇳🇴' },
      { code: 'uk', name: 'Українська', flag: '🇺🇦' },
      { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
      { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
      { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
      { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
      { code: 'he', name: 'עברית', flag: '🇮🇱' },
      { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
      { code: 'ro', name: 'Română', flag: '🇷🇴' },
      { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
      { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' }
    ];

    // Informativo de Cobrança e Alternador de Tradução IA ($0.30 USD)
    function openBillingModal() {
      const modal = document.getElementById('billingModal');
      const langText = document.getElementById('billingLangText');
      const btnConfirm = document.getElementById('btnConfirmBilling');

      if (langText) {
        langText.innerText = selectedLangFlag + ' ' + selectedLangName;
      }

      if (btnConfirm) {
        if (isTranslationActive) {
          btnConfirm.innerText = 'Desativar Tradução';
          btnConfirm.style.background = 'linear-gradient(135deg, #ef476f 0%, #d63f63 100%)';
          btnConfirm.style.color = '#ffffff';
        } else {
          btnConfirm.innerText = 'Confirmar ($0.30/min)';
          btnConfirm.style.background = 'linear-gradient(135deg, #FFC857 0%, #E9A825 100%)';
          btnConfirm.style.color = '#041527';
        }
      }

      if (modal) {
        modal.style.display = 'flex';
      }
    }

    function closeBillingModal() {
      const modal = document.getElementById('billingModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    function confirmBillingToggle() {
      closeBillingModal();
      toggleTranslation();
    }

    function toggleTranslation() {
      isTranslationActive = !isTranslationActive;
      const btn = document.getElementById('btnTranslate');
      if (btn) {
        if (isTranslationActive) {
          btn.classList.add('active');
          btn.innerText = selectedLangFlag + ' IA';
        } else {
          btn.classList.remove('active');
          btn.innerText = '✨ IA';
        }
      }

      log('Tradução Simultânea ' + (isTranslationActive ? 'ATIVADA ($0.30 USD/minuto)' : 'DESATIVADA') + ' para o idioma do cadastro: ' + selectedLangName + ' (' + selectedLangCode + ')');
      
      // Notify React Native WebView about language preference & billing rate per minute
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'translation_toggle',
        enabled: isTranslationActive,
        language: selectedLangCode,
        languageName: selectedLangName,
        rateUsdPerMin: 0.30
      }));

      if (isTranslationActive) {
        showLiveCaption('Sistema IA', 'Tradução IA Ativada ($0.30 USD/min)', 'Tarifa: $0.30 USD/minuto • Idioma do cadastro: ' + selectedLangName + ' ' + selectedLangFlag);
      } else {
        showLiveCaption('Sistema IA', 'Tradução IA Desativada', 'Tradução em tempo real pausada');
      }
    }

    function showLiveCaption(speakerName, originalText, translatedText, speakerFlag) {
      const container = document.getElementById('captionsContainer');
      const bubble = document.createElement('div');
      bubble.className = 'caption-bubble';
      var speakerFlagStr = speakerFlag ? (' ' + speakerFlag) : '';
      var headerHtml = '<div class="caption-header"><span>✨ ' + speakerName + speakerFlagStr + '</span><span>' + selectedLangFlag + ' ' + selectedLangCode.toUpperCase() + '</span></div>';
      var transHtml = '<div class="caption-text-translated">' + translatedText + '</div>';
      if (originalText) {
        transHtml = '<div class="caption-text-original">' + originalText + '</div>' + transHtml;
      }
      bubble.innerHTML = headerHtml + transHtml;
      
      container.appendChild(bubble);

      // Keep only last 2 captions
      while (container.children.length > 2) {
        container.removeChild(container.firstChild);
      }

      // Auto remove after 6 seconds
      setTimeout(() => {
        if (bubble.parentNode === container) {
          container.removeChild(bubble);
        }
      }, 6000);
    }

    // Map language code to name & flag
    function mapLangDetails(langCode) {
      const raw = (langCode || 'pt').toLowerCase();
      const base = raw.split('-')[0];
      const match = AVAILABLE_LANGUAGES.find(l => l.code === base || l.code === raw);
      if (match) {
        return { code: match.code, name: match.name, flag: match.flag };
      }
      return { code: 'pt', name: 'Português (Brasil)', flag: '🇧🇷' };
    }

    // Logger
    function log(msg) {
      console.log("[WebRTC-WebView] " + msg);
      const logs = document.getElementById('logs');
      logs.innerHTML += '<div>' + new Date().toLocaleTimeString() + ': ' + msg + '</div>';
      logs.scrollTop = logs.scrollHeight;
      
      // Post log message back to React Native
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'log',
        message: msg
      }));
    }

    // Initialize configuration from injected window object
    function init() {
      log('Initializing calling webview...');
      if (!window.webRtcConfig) {
        log('WARNING: window.webRtcConfig is missing! Using defaults.');
        window.webRtcConfig = {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          isCaller: false,
          callType: 'audio',
          targetName: 'Usuário Atos2',
          userId: 'test_a',
          targetId: 'test_b',
          userLanguage: 'pt'
        };
      }

      const config = window.webRtcConfig;
      iceServers = config.iceServers;
      isCaller = config.isCaller;
      callType = config.callType;
      targetName = config.targetName;

      // Auto-detect language from user registration profile (Zero manual pickers)
      const userLangInfo = mapLangDetails(config.userLanguage);
      selectedLangCode = userLangInfo.code;
      selectedLangName = userLangInfo.name;
      selectedLangFlag = userLangInfo.flag;

      // Comparação inteligente de idioma (Chamador vs Recebedor)
      const myLangBase = (config.userLanguage || 'pt').toLowerCase().split('-')[0];
      const remoteLangBase = (config.remoteLanguage || '').toLowerCase().split('-')[0];

      if (remoteLangBase && remoteLangBase !== myLangBase) {
        isTranslationActive = true;
        const btnTranslate = document.getElementById('btnTranslate');
        if (btnTranslate) {
          btnTranslate.classList.add('active');
          btnTranslate.innerText = selectedLangFlag + ' IA';
        }

        log('Idiomas diferentes identificados (' + myLangBase + ' vs ' + remoteLangBase + '). Tradução IA ativada automaticamente!');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'translation_toggle',
          enabled: true,
          language: selectedLangCode,
          languageName: selectedLangName,
          rateUsdPerMin: 0.30
        }));

        showLiveCaption('Sistema IA', 'Tradução IA Ativada ($0.30 USD/min)', 'Tarifa: $0.30 USD/minuto • Idiomas diferentes no cadastro (' + remoteLangBase.toUpperCase() + ' ➔ ' + selectedLangCode.toUpperCase() + ').');
      } else {
        isTranslationActive = false;
        const btnTranslate = document.getElementById('btnTranslate');
        if (btnTranslate) {
          btnTranslate.classList.remove('active');
          btnTranslate.innerText = '✨ IA';
        }

        log('Mesmo idioma ou idioma não divergente (' + myLangBase + '). Tradutor IA permanece DESATIVADO.');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'translation_toggle',
          enabled: false,
          language: selectedLangCode,
          languageName: selectedLangName
        }));
      }

      // Update UI texts
      document.getElementById('headerName').innerText = targetName;
      document.getElementById('audioName').innerText = targetName;
      document.getElementById('avatar').innerText = targetName.charAt(0).toUpperCase();

      // Show/Hide containers depending on call type
      if (callType === 'video') {
        document.getElementById('videoContainer').style.display = 'block';
        document.getElementById('btnVideo').style.display = 'flex';
        document.getElementById('btnFlip').style.display = 'flex';
      } else {
        document.getElementById('audioUi').style.display = 'flex';
      }

      startCall();
    }

    // Main setup
    async function startCall() {
      try {
        log('Requesting local media streams...');
        const constraints = {
          audio: true,
          video: callType === 'video' ? { facingMode: facingMode } : false
        };
        
        if (!navigator.mediaDevices) {
          throw new Error("navigator.mediaDevices is undefined. Origin is not secure (requires HTTPS or localhost baseUrl in WebView).");
        }
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        log('Acquired local media stream.');

        if (callType === 'video') {
          const localVideo = document.getElementById('localVideo');
          localVideo.srcObject = localStream;
        }

        // Initialize PeerConnection
        log('Creating RTCPeerConnection with ' + iceServers.length + ' ICE servers.');
        peerConnection = new RTCPeerConnection({ iceServers: iceServers });

        // Add local tracks to PeerConnection
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        // Setup handlers
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            log('Local ICE Candidate generated.');
            sendSignal({
              type: 'candidate',
              candidate: event.candidate
            });
          }
        };

        peerConnection.onconnectionstatechange = () => {
          log('Connection state: ' + peerConnection.connectionState);
          if (peerConnection.connectionState === 'connected') {
            document.getElementById('headerStatus').innerText = 'Chamada em andamento';
            document.getElementById('headerStatus').style.color = '#06d6a0';
            startTimer();
          } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
            document.getElementById('headerStatus').innerText = 'Conexão interrompida';
            document.getElementById('headerStatus').style.color = '#ef476f';
          }
        };

        peerConnection.ontrack = (event) => {
          log('Received remote track: ' + event.track.kind);
          const stream = event.streams[0];
          
          if (callType === 'video') {
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo && stream) {
              remoteVideo.srcObject = stream;
              remoteVideo.play().catch(e => log('Remote video play error: ' + e.message));
            }
          }
          
          const remoteAudio = document.getElementById('remoteAudio');
          if (remoteAudio && stream) {
            remoteAudio.srcObject = stream;
            remoteAudio.play().catch(e => log('Remote audio play error: ' + e.message));
          }
        };

        // Notify React Native that we are ready
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ready'
        }));

        // Process any queued signals that arrived before startCall completed
        await processQueuedSignals();

        if (isCaller) {
          log('Initiating call, generating SDP Offer...');
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          sendSignal(offer);
        } else {
          log('Waiting for SDP Offer from caller...');
        }

      } catch (err) {
        log('Error starting call: ' + err.message);
        alert('Falha ao acessar câmera/microfone: ' + err.message);
      }
    }

    // Signaling Bridge helper
    function sendSignal(signal) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'signal',
        signal: signal
      }));
    }

    // Queue of signaling messages received before peerConnection is ready
    let signalQueue = [];

    // Message listener for signals coming from React Native WebView bridge
    function handleNativeMessage(event) {
      try {
        let rawData = event.data;
        if (!rawData) return;
        var data = (typeof rawData === 'string') ? JSON.parse(rawData) : rawData;
        if (data.type === 'signal' && data.signal) {
          onSignalReceived(data.signal);
        } else if (data.type === 'hangup') {
          onHangUpReceived();
        }
      } catch (e) {
        log('Error parsing native message: ' + e.message);
      }
    }

    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('message', handleNativeMessage);

    async function onSignalReceived(signal) {
      if (!peerConnection) {
        log('PeerConnection not ready yet. Queuing signal: ' + (signal.type || 'unknown'));
        signalQueue.push(signal);
        return;
      }
      await processSignal(signal);
    }

    async function processQueuedSignals() {
      if (signalQueue.length > 0) {
        log('Processing ' + signalQueue.length + ' queued signaling messages...');
        const queue = [...signalQueue];
        signalQueue = [];
        for (const sig of queue) {
          await processSignal(sig);
        }
      }
    }

    // Received signal from React Native
    async function processSignal(signal) {
      try {
        if (signal.type === 'offer') {
          log('Received SDP Offer, applying to PeerConnection...');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
          
          log('Generating SDP Answer...');
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          sendSignal(answer);

          // Apply queued ICE candidates
          log('Applying ' + candidateQueue.length + ' queued ICE candidates...');
          for (const cand of candidateQueue) {
            await peerConnection.addIceCandidate(cand).catch(e => log('ICE candidate error: ' + e.message));
          }
          candidateQueue = [];

        } else if (signal.type === 'answer') {
          log('Received SDP Answer, applying to PeerConnection...');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));

          // Apply queued ICE candidates
          log('Applying ' + candidateQueue.length + ' queued ICE candidates...');
          for (const cand of candidateQueue) {
            await peerConnection.addIceCandidate(cand).catch(e => log('ICE candidate error: ' + e.message));
          }
          candidateQueue = [];

        } else if (signal.type === 'candidate') {
          if (signal.candidate) {
            const cand = new RTCIceCandidate(signal.candidate);
            if (peerConnection && peerConnection.remoteDescription) {
              await peerConnection.addIceCandidate(cand).catch(e => log('Error adding ICE candidate: ' + e.message));
            } else {
              candidateQueue.push(cand);
            }
          }
        } else if (signal.type === 'set_remote_language') {
          const remoteLangBase = (signal.remoteLanguage || '').toLowerCase().split('-')[0];
          const myLangBase = (selectedLangCode || 'pt').toLowerCase().split('-')[0];
          if (remoteLangBase && remoteLangBase !== myLangBase) {
            isTranslationActive = true;
            const btnTranslate = document.getElementById('btnTranslate');
            if (btnTranslate) {
              btnTranslate.classList.add('active');
              btnTranslate.innerText = selectedLangFlag + ' IA';
            }
            log('Idioma remoto atualizado (' + remoteLangBase + '). Tradução IA ativada!');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'translation_toggle',
              enabled: true,
              language: selectedLangCode,
              languageName: selectedLangName,
              rateUsdPerMin: 0.30
            }));
            showLiveCaption('Sistema IA', 'Tradução IA Ativada ($0.30 USD/min)', 'Tarifa: $0.30 USD/minuto • Idiomas diferentes no cadastro (' + remoteLangBase.toUpperCase() + ' ➔ ' + selectedLangCode.toUpperCase() + ').');
          }
        } else if (signal.type === 'translation_caption') {
          const spkName = signal.speakerName || targetName;
          const spkFlag = signal.speakerFlag || (signal.speakerLanguage ? mapLangDetails(signal.speakerLanguage).flag : '');
          log('Legenda recebida de ' + spkName + ' (' + (spkFlag || 'IA') + '): ' + signal.translatedText);
          showLiveCaption(spkName, signal.originalText, signal.translatedText, spkFlag);
        } else if (signal.type === 'play_translated_audio') {
          log('Áudio traduzido recebido para reprodução.');
          if (signal.audioUrl) {
            const translatedAudio = new Audio(signal.audioUrl);
            const remoteAudioEl = document.getElementById('remoteAudio');
            if (remoteAudioEl) remoteAudioEl.volume = 0.2;
            translatedAudio.onended = () => {
              if (remoteAudioEl) remoteAudioEl.volume = 1.0;
            };
            translatedAudio.play().catch(e => log('Erro ao tocar áudio traduzido: ' + e.message));
          }
        }
      } catch (err) {
        log('Error handling remote signal: ' + err.message);
      }
    }

    // Remote user hung up
    function onHangUpReceived() {
      log('Remote user hung up. Closing call...');
      document.getElementById('headerStatus').innerText = 'Chamada encerrada';
      document.getElementById('headerStatus').style.color = '#ef476f';
      stopTimer();
      setTimeout(() => {
        closeLocalStream();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'hangup'
        }));
      }, 1000);
    }

    // Local Hang Up action
    function hangUp() {
      log('Hanging up call...');
      stopTimer();
      closeLocalStream();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'hangup'
      }));
    }

    function closeLocalStream() {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
      }
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
      }
    }

    // Control toggles
    function toggleMute() {
      if (!localStream) return;
      isMuted = !isMuted;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      const btn = document.getElementById('btnMute');
      if (isMuted) {
        btn.classList.add('btn-muted');
      } else {
        btn.classList.remove('btn-muted');
      }
      log('Microphone muted state: ' + isMuted);
    }

    function toggleVideo() {
      if (!localStream || callType !== 'video') return;
      isVideoMuted = !isVideoMuted;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoMuted;
      });
      const btn = document.getElementById('btnVideo');
      if (isVideoMuted) {
        btn.classList.add('btn-muted');
      } else {
        btn.classList.remove('btn-muted');
      }
      log('Video camera muted state: ' + isVideoMuted);
    }

    async function flipCamera() {
      if (callType !== 'video' || !localStream || !peerConnection) return;
      facingMode = facingMode === 'user' ? 'environment' : 'user';
      log('Flipping camera to: ' + facingMode);
      
      try {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStream.removeTrack(videoTrack);
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        localStream.addTrack(newVideoTrack);

        // Replace track in peer connection
        const videoSender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }

        // Update local video element
        document.getElementById('localVideo').srcObject = newStream;
        log('Camera flipped successfully.');
      } catch (err) {
        log('Error flipping camera: ' + err.message);
      }
    }

    // Call duration timer
    function startTimer() {
      if (durationTimer) return;
      durationTimer = setInterval(() => {
        callDurationSeconds++;
        const mins = Math.floor(callDurationSeconds / 60).toString().padStart(2, '0');
        const secs = (callDurationSeconds % 60).toString().padStart(2, '0');
        const timerStr = mins + ':' + secs;
        document.getElementById('timer').innerText = timerStr;
        document.getElementById('headerStatus').innerText = 'Em chamada • ' + timerStr;
      }, 1000);
    }

    function stopTimer() {
      if (durationTimer) {
        clearInterval(durationTimer);
        durationTimer = null;
      }
    }

    // Run initialization on load
    window.onload = () => {
      init();
    };
  </script>
</body>
</html>
  `;
};
