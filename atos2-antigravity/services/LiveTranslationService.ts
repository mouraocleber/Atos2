import { AudioModule, createAudioPlayer, RecordingPresets } from 'expo-audio';
import api from './api';

const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '926986400beb825901c4268a53576ad346931bb9';

export type TranslationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface TranslationResult {
  detectedLanguage: string; // Ex: "en", "es", "fr", "ja"
  detectedLanguageName: string; // Ex: "Inglês", "Espanhol"
  originalText: string;
  translatedText: string;
  audioUrl?: string;
  audioBase64?: string;
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
   * Loop contínuo de gravação de áudio do microfone e envio ao Deepgram
   */
  private async runContinuousListeningLoop() {
    while (this.isLiveModeActive) {
      if (this.currentState === 'speaking') {
        // Aguarda a reprodução de áudio terminar antes de abrir o microfone novamente
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      await this.recordAndProcessChunk();

      // Pequena pausa entre capturas (300ms)
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  /**
   * Grava um bloco de 4 segundos e envia para a API do Deepgram (STT)
   */
  private async recordAndProcessChunk() {
    if (!this.isLiveModeActive || this.isProcessingChunk) return;
    this.isProcessingChunk = true;

    let currentRecorder: any = null;
    try {
      this.setState('listening');

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

      // Grava áudio do ambiente por 4 segundos
      await new Promise((resolve) => setTimeout(resolve, 4000));

      if (!this.isLiveModeActive) {
        try { await currentRecorder.stop(); } catch (e) {}
        this.isProcessingChunk = false;
        return;
      }

      await currentRecorder.stop();
      const recordedUri = currentRecorder.uri;
      this.recorder = null;

      if (recordedUri) {
        await this.processAudioChunk(recordedUri);
      }
    } catch (e: any) {
      console.warn('[LiveTranslationService] Erro durante gravação do bloco de áudio:', e);
      if (currentRecorder) {
        try { await currentRecorder.stop(); } catch (err) {}
      }
    } finally {
      this.isProcessingChunk = false;
    }
  }

  /**
   * Processa um arquivo de áudio gravado enviando ao Deepgram para transcrição e idioma auto-detectado
   */
  public async processAudioChunk(audioUri: string): Promise<TranslationResult | null> {
    if (!audioUri) return null;

    try {
      this.setState('processing');

      let detectedLangCode = 'en';
      let originalTranscript = '';

      if (audioUri === 'simulated_audio_uri') {
        // Disparo manual para testes rápidos de interface
        originalTranscript = 'Hello, how can I help you find the nearest train station?';
        detectedLangCode = 'en';
      } else {
        // 1. Envia o áudio gravado para o Deepgram STT API
        try {
          const fileResp = await fetch(audioUri);
          const audioBlob = await fileResp.blob();

          const dgUrl = 'https://api.deepgram.com/v1/listen?detect_language=true&punctuate=true&model=nova-2';
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
            console.log(`[Deepgram STT] Sucesso. Idioma: ${detectedLangCode}, Transcrição: "${originalTranscript}"`);
          } else {
            const errText = await dgResponse.text();
            console.warn('[Deepgram STT] Status de erro:', dgResponse.status, errText);
          }
        } catch (dgErr) {
          console.warn('[LiveTranslationService] Erro ao conectar com a API Deepgram:', dgErr);
        }
      }

      // Se nenhum som/fala foi transcrito no bloco (silêncio), não gera histórico nem reproduz áudio
      if (!originalTranscript) {
        if (this.isLiveModeActive) {
          this.setState('listening');
        }
        return null;
      }

      // 2. Tradução do texto transcrito para o idioma alvo do usuário
      const detectedLangShort = detectedLangCode.split('-')[0];
      const targetLangShort = (this.targetLanguage || 'pt-BR').split('-')[0];

      let translatedText = originalTranscript;

      // Se o idioma falado for diferente do idioma de destino do fone do usuário, faz a tradução
      if (detectedLangShort !== targetLangShort) {
        try {
          // Tenta primeiramente o backend Atos2
          const response = await api.post('/translation/live', {
            text: originalTranscript,
            sourceLanguage: detectedLangShort,
            targetLanguage: this.targetLanguage,
          }, { timeout: 4000 });

          translatedText = response.data?.translatedText || response.data?.data?.translatedText || originalTranscript;
        } catch (backendErr) {
          // Fallback para API pública MyMemory Translation
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

      // 3. Síntese de Voz (TTS)
      const langName = LANGUAGE_NAMES[detectedLangCode] || LANGUAGE_NAMES[detectedLangShort] || detectedLangCode.toUpperCase();
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translatedText)}&tl=${targetLangShort}&client=tw-ob`;

      const result: TranslationResult = {
        detectedLanguage: detectedLangCode,
        detectedLanguageName: langName,
        originalText: originalTranscript,
        translatedText,
        audioUrl,
      };

      // 4. Notifica interface
      if (this.callbacks.onDetectedLanguage) {
        this.callbacks.onDetectedLanguage(result.detectedLanguageName, result.detectedLanguage);
      }

      if (this.callbacks.onTranslationResult) {
        this.callbacks.onTranslationResult(result);
      }

      // 5. Reproduz a tradução falada
      if (result.audioUrl) {
        await this.playTranslatedAudio(result.audioUrl);
      } else {
        if (this.isLiveModeActive) {
          this.setState('listening');
        }
      }

      return result;
    } catch (error: any) {
      console.error('[LiveTranslationService] Erro ao processar bloco de áudio:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Erro na tradução: ' + (error.message || error));
      }
      if (this.isLiveModeActive) {
        this.setState('listening');
      }
      return null;
    }
  }

  /**
   * Reproduz a voz traduzida no fone de ouvido ou alto-falante
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

      // Aguarda 3.5 segundos para a fala ser concluída
      await new Promise((resolve) => setTimeout(resolve, 3500));

      if (this.isLiveModeActive) {
        this.setState('listening');
      }
    } catch (e) {
      console.warn('[LiveTranslationService] Erro ao reproduzir voz sintetizada:', e);
      if (this.isLiveModeActive) {
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
}

export const liveTranslationService = new LiveTranslationService();
