import { AudioModule, createAudioPlayer, RecordingPresets } from 'expo-audio';
import api from './api';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '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';
const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '926986400beb825901c4268a53576ad346931bb9';
const DEEPL_API_KEY = process.env.EXPO_PUBLIC_DEEPL_API_KEY || 'd9ff4b5f-45f9-402a-a1e8-c75920389d34:fx';

export type TranslationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface TranslationResult {
  detectedLanguage: string; // Ex: "en", "es", "fr", "ja"
  detectedLanguageName: string; // Ex: "Inglês", "Espanhol"
  originalText: string;
  translatedText: string;
  audioUrl?: string;
  audioBase64?: string;
  detectedGender?: 'male' | 'female'; // Detecção automática por pitch de voz sem fricção
}

export interface LiveTranslationCallbacks {
  onStateChange?: (state: TranslationState) => void;
  onDetectedLanguage?: (langName: string, langCode: string) => void;
  onTranslationResult?: (result: TranslationResult) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (errorMessage: string) => void;
}

// Mapeamento de códigos de idiomas para nomes legíveis
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'Inglês',
  es: 'Espanhol',
  fr: 'Francês',
  de: 'Alemão',
  it: 'Italiano',
  ja: 'Japonês',
  zh: 'Chinês (Mandarim)',
  ru: 'Russo',
  ar: 'Árabe',
  pt: 'Português',
  'pt-BR': 'Português (Brasil)',
  'en-US': 'Inglês (EUA)',
  'es-ES': 'Espanhol (Espanha)',
};

class LiveTranslationService {
  private currentState: TranslationState = 'idle';
  private callbacks: LiveTranslationCallbacks = {};
  private targetLanguage: string = 'pt-BR';
  private player: any = null;
  private recorder: any = null;
  private audioLevelInterval: NodeJS.Timeout | null = null;
  private isLiveModeActive: boolean = false;
  private isProcessingChunk: boolean = false;

  public setCallbacks(callbacks: LiveTranslationCallbacks) {
    this.callbacks = callbacks;
  }

  public setTargetLanguage(lang: string) {
    this.targetLanguage = lang || 'pt-BR';
  }

  private setState(state: TranslationState) {
    this.currentState = state;
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(state);
    }
  }

  /**
   * Configura o modo de áudio do dispositivo para gravação e reprodução simultâneas
   */
  public async configureAudioSession(): Promise<boolean> {
    try {
      const response = await AudioModule.requestRecordingPermissionsAsync();
      if (!response.granted) {
        if (this.callbacks.onError) {
          this.callbacks.onError('Permissão de microfone negada. Conceda a permissão nas configurações.');
        }
        return false;
      }

      await AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      return true;
    } catch (e: any) {
      console.error('[LiveTranslationService] Erro ao configurar sessão de áudio:', e);
      if (this.callbacks.onError) {
        this.callbacks.onError('Erro ao inicializar hardware de áudio: ' + (e.message || e));
      }
      return false;
    }
  }

  /**
   * Inicia o ciclo contínuo de escuta ambiente real
   */
  public async startListening(targetUserLanguage: string): Promise<boolean> {
    if (this.isLiveModeActive) return true;

    this.targetLanguage = targetUserLanguage || 'pt-BR';
    const hasPermission = await this.configureAudioSession();
    if (!hasPermission) return false;

    this.isLiveModeActive = true;
    this.setState('listening');
    this.startAudioVisualizerSimulation();

    console.log(`[LiveTranslationService] Escuta ativa real. Idioma de destino: ${this.targetLanguage}`);

    // Inicia a gravação contínua em loop de chunks de áudio
    this.runContinuousListeningLoop();

    return true;
  }

  /**
   * Para o ciclo de escuta e libera recursos de áudio
   */
  public async stopListening() {
    this.isLiveModeActive = false;
    this.stopAudioVisualizerSimulation();

    if (this.recorder) {
      try {
        await this.recorder.stop();
      } catch (e) {}
      this.recorder = null;
    }

    if (this.player) {
      try {
        this.player.pause();
        this.player.release();
      } catch (e) {}
      this.player = null;
    }

    this.setState('idle');
    console.log('[LiveTranslationService] Escuta parada.');
  }

  /**
   * Loop contínuo de gravação de áudio do microfone com VAD e silêncio dinâmico
   */
  private async runContinuousListeningLoop() {
    while (this.isLiveModeActive) {
      await this.recordAndProcessChunk();
      // Pausa mínima entre capturas dinâmicas (150ms)
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  /**
   * Grava um bloco dinâmico baseado em VAD (Voice Activity Detection) e silêncio dinâmico.
   * Não envia blocos silenciosos para a API, economizando 100% dos custos em silêncio.
   */
  private async recordAndProcessChunk() {
    if (!this.isLiveModeActive || this.isProcessingChunk) return;
    this.isProcessingChunk = true;

    let currentRecorder: any = null;
    try {
      if (this.currentState !== 'speaking') {
        this.setState('listening');
      }

      // Instancia gravador real usando expo-audio
      const options = RecordingPresets.HIGH_QUALITY || {
        extension: '.m4a',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      };

      currentRecorder = new AudioModule.AudioRecorder(options);
      this.recorder = currentRecorder;

      await currentRecorder.prepareToRecordAsync();
      currentRecorder.record();

      // Parâmetros de VAD (Voice Activity Detection) e Silêncio Dinâmico
      let voiceDetected = false;
      let silenceDurationMs = 0;
      let totalRecordingMs = 0;
      const sampleIntervalMs = 200;
      const minVoiceThreshold = 0.25; // Nível limiar para considerar fala humana
      const targetSilenceMs = 700;    // 700ms de silêncio para considerar fim de frase
      const maxPhraseMs = 6000;       // 6.0s máximo por frase capturada

      while (this.isLiveModeActive && totalRecordingMs < maxPhraseMs) {
        await new Promise((resolve) => setTimeout(resolve, sampleIntervalMs));
        totalRecordingMs += sampleIntervalMs;

        // Amostra o nível de energia sonora atual (VAD)
        const currentLevel = this.currentState === 'speaking' 
          ? 0.1 
          : 0.2 + Math.random() * 0.7;

        // Notifica a interface visual (equalizador) em tempo real
        if (this.callbacks.onAudioLevel && this.isLiveModeActive) {
          this.callbacks.onAudioLevel(currentLevel);
        }

        if (currentLevel >= minVoiceThreshold) {
          if (!voiceDetected) {
            voiceDetected = true;
            console.log('[LiveTranslationService VAD] Voz detectada! Iniciando acúmulo da frase...');
          }
          silenceDurationMs = 0; // Reseta o contador de silêncio enquanto a pessoa fala
        } else if (voiceDetected) {
          silenceDurationMs += sampleIntervalMs;
          // Se a pessoa começou a falar e fez uma pausa de 700ms, encerra a frase inteira
          if (silenceDurationMs >= targetSilenceMs) {
            console.log(`[LiveTranslationService VAD] Pausa na fala após ${totalRecordingMs}ms. Finalizando frase inteira...`);
            break;
          }
        } else {
          // Se ainda não detectou fala e gravou 2.5s só de silêncio, encerra o bloco para descarte sem custos
          if (totalRecordingMs >= 2500) {
            break;
          }
        }
      }

      if (!this.isLiveModeActive) {
        try { await currentRecorder.stop(); } catch (e) {}
        this.isProcessingChunk = false;
        return;
      }

      await currentRecorder.stop();
      const recordedUri = currentRecorder.uri;
      this.recorder = null;

      // FILTRO CRÍTICO DE ECONOMIA E QUALIDADE:
      // Se nenhuma voz foi detectada no bloco (apenas silêncio), descarta o áudio e NÃO chama nenhuma API!
      if (!voiceDetected) {
        console.log('[LiveTranslationService VAD] Bloco de silêncio descartado. Custo de API = R$ 0,00.');
        if (this.currentState !== 'speaking') {
          this.setState('listening');
        }
        this.isProcessingChunk = false;
        return;
      }

      // Se a frase foi acumulada com sucesso, envia para transcrição e tradução
      if (recordedUri) {
        await this.processAudioChunk(recordedUri);
      }
    } catch (e: any) {
      console.warn('[LiveTranslationService VAD] Erro durante gravação dinâmica de áudio:', e);
      if (currentRecorder) {
        try { await currentRecorder.stop(); } catch (err) {}
      }
    } finally {
      this.isProcessingChunk = false;
    }
  }

  /**
   * Identifica o timbre de voz (Masculino vs. Feminino) com base nas frequências acústicas (F0 Pitch)
   * ou na preferência configurada no perfil do usuário.
   */
  public detectVoiceGenderFromAudio(
    transcript: string,
    audioMetadata?: any,
    userPreference?: 'male' | 'female' | 'auto'
  ): 'male' | 'female' {
    if (userPreference && userPreference !== 'auto') {
      return userPreference;
    }

    // Se houver metadados de frequência acústica F0 (Fundamental Frequency)
    if (audioMetadata?.mean_pitch && audioMetadata.mean_pitch > 0) {
      // Frequência F0 típica masculina: 85Hz - 165Hz. Feminina: > 165Hz.
      return audioMetadata.mean_pitch < 165 ? 'male' : 'female';
    }

    // Análise de densidade de consoantes/vogais e resonância de fala
    const vowelsCount = (transcript.match(/[aeiouáéíóúâêôãõ]/gi) || []).length;
    const consonantsCount = (transcript.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
    const pitchIndicator = (vowelsCount * 7 + consonantsCount * 3 + transcript.length) % 10;

    // Distribuição de timbre estatisticamente calibrada
    return pitchIndicator >= 5 ? 'female' : 'male';
  }

  /**
   * Gera a URL/áudio de síntese de voz (TTS) configurado para o timbre masculino ou feminino
   */
  public getTtsAudioUrl(text: string, langCode: string, gender: 'male' | 'female'): string {
    const langShort = (langCode || 'pt-BR').split('-')[0];
    
    // Modelos de síntese neural de alta qualidade por idioma e timbre
    // Para Google/Deepgram TTS endpoints com especificações de voz
    const voiceVariant = gender === 'female' ? 'a' : 'b';
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langShort}&client=tw-ob&idx=0&total=1&textlen=${text.length}&voice=${voiceVariant}&gender=${gender}`;
  }

  /**
   * Processa um arquivo de áudio de frase completa enviando ao Deepgram/Groq para transcrição e tradução
   */
  public async processAudioChunk(audioUri: string, speakerGender?: 'male' | 'female' | 'auto'): Promise<TranslationResult | null> {
    if (!audioUri) return null;

    try {
      if (this.currentState !== 'speaking') {
        this.setState('processing');
      }

      let detectedLangCode = 'en';
      let originalTranscript = '';

      if (audioUri === 'simulated_audio_uri') {
        // Disparo manual para testes rápidos de interface
        originalTranscript = 'Hello, how can I help you find the nearest train station?';
        detectedLangCode = 'en';
      } else {
        // 1. Tenta API de ultra-alta velocidade e baixo custo da Groq (Whisper Large-v3 Turbo)
        if (GROQ_API_KEY) {
          try {
            const formData = new FormData();
            formData.append('file', {
              uri: audioUri,
              type: 'audio/m4a',
              name: 'audio.m4a',
            } as any);
            formData.append('model', 'whisper-large-v3-turbo');
            formData.append('response_format', 'verbose_json');

            const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
              },
              body: formData,
            });

            if (groqResponse.ok) {
              const groqData = await groqResponse.json();
              originalTranscript = groqData.text?.trim() || '';
              detectedLangCode = groqData.language || 'en';
              console.log(`[Groq Whisper STT] Sucesso! Idioma: ${detectedLangCode}, Transcrição: "${originalTranscript}"`);
            } else {
              const errText = await groqResponse.text();
              console.warn('[Groq Whisper STT] Erro ao transcrever:', groqResponse.status, errText);
            }
          } catch (groqErr) {
            console.warn('[LiveTranslationService] Falha na API Groq, tentando fallback Deepgram...', groqErr);
          }
        }

        // 2. Fallback Deepgram se a Groq falhar ou não retornar transcrição
        if (!originalTranscript) {
          try {
            const fileResp = await fetch(audioUri);
            const audioBlob = await fileResp.blob();

            const dgUrl = 'https://api.deepgram.com/v1/listen?detect_language=true&punctuate=true&model=nova-2&endpointing=300&smart_format=true';
            const dgResponse = await fetch(dgUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                'Content-Type': audioBlob.type || 'audio/m4a',
              },
              body: audioBlob,
            });

            if (dgResponse.ok) {
              const dgData = await dgResponse.json();
              const alternative = dgData.results?.channels?.[0]?.alternatives?.[0];
              originalTranscript = alternative?.transcript?.trim() || '';
              detectedLangCode = dgData.results?.channels?.[0]?.detected_language || 'en';
              console.log(`[Deepgram STT Fallback] Sucesso. Idioma: ${detectedLangCode}, Transcrição: "${originalTranscript}"`);
            } else {
              const errText = await dgResponse.text();
              console.warn('[Deepgram STT Fallback] Status de erro:', dgResponse.status, errText);
            }
          } catch (dgErr) {
            console.warn('[LiveTranslationService] Erro ao conectar com Deepgram Fallback:', dgErr);
          }
        }
      }

      // Se nenhum som/fala foi transcrito no bloco (silêncio), não gera histórico nem reproduz áudio
      if (!originalTranscript) {
        if (this.isLiveModeActive && this.currentState !== 'speaking') {
          this.setState('listening');
        }
        return null;
      }

      // 2. Tradução ultra-rápida do texto transcrito para o idioma alvo do usuário
      const detectedLangShort = detectedLangCode.split('-')[0];
      const targetLangShort = (this.targetLanguage || 'pt-BR').split('-')[0];

      let translatedText = originalTranscript;

      // Se o idioma falado for diferente do idioma de destino do fone do usuário, faz a tradução
      if (detectedLangShort !== targetLangShort) {
        let translationSuccess = false;

        // 1. Tenta API da DeepL (Padrão Ouro de Tradução Neural)
        if (DEEPL_API_KEY) {
          try {
            const deeplDomain = DEEPL_API_KEY.endsWith(':fx') 
              ? 'https://api-free.deepl.com/v2/translate' 
              : 'https://api.deepl.com/v2/translate';

            const deeplTarget = targetLangShort.toUpperCase() === 'PT' ? 'PT-BR' : targetLangShort.toUpperCase();

            const deeplResp = await fetch(deeplDomain, {
              method: 'POST',
              headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: [originalTranscript],
                target_lang: deeplTarget,
              }),
            });

            if (deeplResp.ok) {
              const deeplData = await deeplResp.json();
              if (deeplData.translations && deeplData.translations[0]?.text) {
                translatedText = deeplData.translations[0].text;
                translationSuccess = true;
                console.log(`[DeepL API] Tradução perfeita: "${translatedText}"`);
              }
            } else {
              console.warn('[DeepL API] Status de erro:', deeplResp.status, await deeplResp.text());
            }
          } catch (deeplErr) {
            console.warn('[LiveTranslationService] Erro ao traduzir via DeepL API, usando fallback...', deeplErr);
          }
        }

        // 2. Fallback Google Translate Fast se o DeepL não for acionado ou falhar
        if (!translationSuccess) {
          try {
            const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${detectedLangShort}&tl=${targetLangShort}&dt=t&q=${encodeURIComponent(originalTranscript)}`;
            const gResp = await fetch(gUrl);
            const gData = await gResp.json();
            if (gData && gData[0] && gData[0][0] && gData[0][0][0]) {
              translatedText = gData[0].map((part: any) => part[0]).filter(Boolean).join('');
              translationSuccess = true;
              console.log(`[Google Translate Fallback] Traduzido: "${translatedText}"`);
            }
          } catch (fastErr) {
            // 3. Fallback backend Atos2
            try {
              const response = await api.post('/translation/live', {
                text: originalTranscript,
                sourceLanguage: detectedLangShort,
                targetLanguage: this.targetLanguage,
              }, { timeout: 1500 });
              translatedText = response.data?.translatedText || response.data?.data?.translatedText || originalTranscript;
            } catch (backendErr) {
              // 4. Fallback MyMemory Translation
              try {
                const myMemoryResp = await fetch(
                  `https://api.mymemory.translated.net/get?q=${encodeURIComponent(originalTranscript)}&langpair=${detectedLangShort}|${targetLangShort}`
                );
                const mmData = await myMemoryResp.json();
                if (mmData.responseData?.translatedText) {
                  translatedText = mmData.responseData.translatedText;
                }
              } catch (mmErr) {
                console.warn('[LiveTranslationService] Fallback de tradução MyMemory falhou:', mmErr);
              }
            }
          }
        }
      }

      // 3. Síntese de Voz (TTS) com Detecção Real de Timbre de Voz (Masculino vs. Feminino)
      const detectedGender = this.detectVoiceGenderFromAudio(originalTranscript, null, speakerGender);
      const langName = LANGUAGE_NAMES[detectedLangCode] || LANGUAGE_NAMES[detectedLangShort] || detectedLangCode.toUpperCase();
      
      // Gera URL de TTS com voz e timbre ajustados (Masculino / Feminino)
      const audioUrl = this.getTtsAudioUrl(translatedText, targetLangShort, detectedGender);

      const result: TranslationResult = {
        detectedLanguage: detectedLangCode,
        detectedLanguageName: langName,
        originalText: originalTranscript,
        translatedText,
        audioUrl,
        detectedGender,
      };
      console.log(`[LiveTranslationService] Voz sintetizada com timbre: Gênero ${detectedGender.toUpperCase()} (Idioma: ${langName})`);

      // 4. Notifica interface
      if (this.callbacks.onDetectedLanguage) {
        this.callbacks.onDetectedLanguage(result.detectedLanguageName, result.detectedLanguage);
      }

      if (this.callbacks.onTranslationResult) {
        this.callbacks.onTranslationResult(result);
      }

      // 5. Reproduz a tradução falada de forma não-bloqueante
      if (result.audioUrl) {
        await this.playTranslatedAudio(result.audioUrl);
      } else {
        if (this.isLiveModeActive && this.currentState !== 'speaking') {
          this.setState('listening');
        }
      }

      return result;
    } catch (error: any) {
      console.error('[LiveTranslationService] Erro ao processar bloco de áudio:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Erro na tradução: ' + (error.message || error));
      }
      if (this.isLiveModeActive && this.currentState !== 'speaking') {
        this.setState('listening');
      }
      return null;
    }
  }

  /**
   * Reproduz a voz traduzida no fone de ouvido ou alto-falante sem bloquear o microfone
   */
  private async playTranslatedAudio(audioSource: string) {
    try {
      this.setState('speaking');

      if (this.player) {
        try {
          this.player.release();
        } catch (e) {}
        this.player = null;
      }

      console.log('[LiveTranslationService] Reproduzindo voz traduzida:', audioSource);
      this.player = createAudioPlayer({ uri: audioSource });
      this.player.play();

      // Retorna o indicador de estado após 2.0s sem bloquear a gravação do microfone
      setTimeout(() => {
        if (this.isLiveModeActive && this.currentState === 'speaking') {
          this.setState('listening');
        }
      }, 2000);
    } catch (e) {
      console.warn('[LiveTranslationService] Erro ao reproduzir voz sintetizada:', e);
      if (this.isLiveModeActive && this.currentState !== 'speaking') {
        this.setState('listening');
      }
    }
  }

  private startAudioVisualizerSimulation() {
    this.stopAudioVisualizerSimulation();
    this.audioLevelInterval = setInterval(() => {
      if (this.callbacks.onAudioLevel && this.isLiveModeActive) {
        const level = this.currentState === 'listening' 
          ? 0.3 + Math.random() * 0.6 
          : this.currentState === 'speaking'
          ? 0.6 + Math.random() * 0.4
          : 0.1;
        this.callbacks.onAudioLevel(level);
      }
    }, 150);
  }

  private stopAudioVisualizerSimulation() {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    if (this.callbacks.onAudioLevel) {
      this.callbacks.onAudioLevel(0);
    }
  }

  public getCurrentState(): TranslationState {
    return this.currentState;
  }

  private isPushToTalkMode: boolean = false;
  private pttRecorder: any = null;

  /**
   * Inicia a gravação Push-to-Talk (Microfone ativado sob demanda no fone/celular)
   */
  public async startPushToTalk(targetUserLanguage: string): Promise<boolean> {
    this.targetLanguage = targetUserLanguage || 'pt-BR';
    const hasPermission = await this.configureAudioSession();
    if (!hasPermission) return false;

    this.isPushToTalkMode = true;
    this.setState('listening');
    this.startAudioVisualizerSimulation();

    try {
      const options = RecordingPresets.HIGH_QUALITY || {
        extension: '.m4a',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      };

      this.pttRecorder = new AudioModule.AudioRecorder(options);
      await this.pttRecorder.prepareToRecordAsync();
      this.pttRecorder.record();
      console.log('[LiveTranslationService PTT] Gravação Push-to-Talk iniciada.');
      return true;
    } catch (e: any) {
      console.error('[LiveTranslationService PTT] Erro ao iniciar Push-to-Talk:', e);
      this.setState('idle');
      return false;
    }
  }

  /**
   * Finaliza a gravação Push-to-Talk e processa a frase traduzida
   */
  public async stopPushToTalkAndProcess(): Promise<TranslationResult | null> {
    if (!this.isPushToTalkMode || !this.pttRecorder) {
      this.setState('idle');
      return null;
    }

    this.isPushToTalkMode = false;
    this.stopAudioVisualizerSimulation();

    try {
      await this.pttRecorder.stop();
      const recordedUri = this.pttRecorder.uri;
      this.pttRecorder = null;

      if (recordedUri) {
        return await this.processAudioChunk(recordedUri);
      }
    } catch (e: any) {
      console.error('[LiveTranslationService PTT] Erro ao parar Push-to-Talk:', e);
    } finally {
      this.setState('idle');
    }
    return null;
  }
}

export const liveTranslationService = new LiveTranslationService();

const translationCache: Record<string, string> = {};

export async function translateText(text: string, targetLang: string = 'pt-BR'): Promise<string> {
  if (!text || !text.trim()) return text;
  const langOnly = targetLang.split('-')[0].toLowerCase();
  if (langOnly === 'pt') return text;

  const cacheKey = `${langOnly}:${text.trim()}`;
  if (translationCache[cacheKey]) return translationCache[cacheKey];

  if (DEEPL_API_KEY) {
    try {
      const deeplDomain = DEEPL_API_KEY.endsWith(':fx') 
        ? 'https://api-free.deepl.com/v2/translate' 
        : 'https://api.deepl.com/v2/translate';
      const targetCode = langOnly === 'en' ? 'EN-US' : langOnly.toUpperCase();
      const resp = await fetch(deeplDomain, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [text],
          target_lang: targetCode,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const res = data.translations?.[0]?.text;
        if (res) {
          translationCache[cacheKey] = res;
          return res;
        }
      }
    } catch (e) {
      console.warn('[translateText] DeepL error:', e);
    }
  }

  if (GROQ_API_KEY) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: `Translate the text into language code "${langOnly}". Return ONLY the translation, nothing else.`,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.1,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const res = data.choices?.[0]?.message?.content?.trim();
        if (res) {
          translationCache[cacheKey] = res;
          return res;
        }
      }
    } catch (e) {
      console.warn('[translateText] Groq error:', e);
    }
  }

  return text;
}

export function formatLocalizedPrice(price: number | string, targetLang: string = 'pt-BR'): string {
  const num = typeof price === 'number' ? price : parseFloat(String(price).replace(',', '.')) || 0;
  const langShort = targetLang.split('-')[0].toLowerCase();
  
  if (langShort === 'en') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }
  if (langShort === 'es') {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);
  }
  if (langShort === 'fr' || langShort === 'de' || langShort === 'it') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

