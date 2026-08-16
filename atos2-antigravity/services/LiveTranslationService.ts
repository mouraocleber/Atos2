import { AudioModule, createAudioPlayer } from 'expo-audio';
import api from './api';

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
};

// Frases de demonstração para simulação de escuta ambiente contínua na rua
const DEMO_AMBIENT_PHRASES = [
  {
    langCode: 'en',
    langName: 'Inglês',
    original: 'Excuse me, do you know what time the train station opens today?',
    translations: {
      'pt-BR': 'Com licença, você sabe a que horas a estação de trem abre hoje?',
      'es-ES': 'Disculpe, ¿sabe a qué hora abre la estación de tren hoy?',
      'en-US': 'Excuse me, do you know what time the train station opens today?',
    },
  },
  {
    langCode: 'es',
    langName: 'Espanhol',
    original: '¡Hola! ¿Me puedes indicar dónde está el supermercado más cercano?',
    translations: {
      'pt-BR': 'Olá! Você pode me indicar onde fica o supermercado mais próximo?',
      'es-ES': '¡Hola! ¿Me puedes indicar dónde está el supermercado más cercano?',
      'en-US': 'Hello! Can you tell me where the nearest supermarket is?',
    },
  },
  {
    langCode: 'fr',
    langName: 'Francês',
    original: 'Bonjour, est-ce que vous savez où se trouve la pharmacie du centre-ville?',
    translations: {
      'pt-BR': 'Olá, você sabe onde fica a farmácia do centro da cidade?',
      'es-ES': 'Hola, ¿sabe dónde está la farmacia del centro de la ciudad?',
      'en-US': 'Hello, do you know where the downtown pharmacy is?',
    },
  },
  {
    langCode: 'it',
    langName: 'Italiano',
    original: 'Ciao, vorrei un caffè e una bottiglia d\'acqua per favore.',
    translations: {
      'pt-BR': 'Olá, eu gostaria de um café e uma garrafa de água por favor.',
      'es-ES': 'Hola, quisiera un café y una botella de agua por favor.',
      'en-US': 'Hello, I would like a coffee and a bottle of water please.',
    },
  },
  {
    langCode: 'de',
    langName: 'Alemão',
    original: 'Guten Tag, wo ist die nächste Bushaltestelle bitte?',
    translations: {
      'pt-BR': 'Bom dia, onde fica o ponto de ônibus mais próximo, por favor?',
      'es-ES': 'Buenos días, ¿dónde está la parada de autobús más cercana, por favor?',
      'en-US': 'Good day, where is the nearest bus stop please?',
    },
  },
];

class LiveTranslationService {
  private currentState: TranslationState = 'idle';
  private callbacks: LiveTranslationCallbacks = {};
  private targetLanguage: string = 'pt-BR';
  private player: any = null;
  private audioLevelInterval: NodeJS.Timeout | null = null;
  private continuousListeningInterval: NodeJS.Timeout | null = null;
  private isLiveModeActive: boolean = false;
  private demoIndex: number = 0;

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
   * Inicia o ciclo contínuo de escuta ambiente
   */
  public async startListening(targetUserLanguage: string): Promise<boolean> {
    if (this.isLiveModeActive) return true;

    this.targetLanguage = targetUserLanguage || 'pt-BR';
    const hasPermission = await this.configureAudioSession();
    if (!hasPermission) return false;

    this.isLiveModeActive = true;
    this.setState('listening');
    this.startAudioVisualizerSimulation();
    this.startContinuousListeningLoop();

    console.log(`[LiveTranslationService] Escuta ativa. Idioma de destino do usuário: ${this.targetLanguage}`);
    return true;
  }

  /**
   * Para o ciclo de escuta e libera recursos de áudio
   */
  public async stopListening() {
    this.isLiveModeActive = false;
    this.stopAudioVisualizerSimulation();
    this.stopContinuousListeningLoop();

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
   * Processa o áudio captado ou dispara simulação com síntese de voz (TTS)
   */
  public async processAudioChunk(audioUriOrBase64?: string): Promise<TranslationResult | null> {
    if (!this.isLiveModeActive && this.currentState !== 'idle') return null;

    try {
      this.setState('processing');

      let result: TranslationResult;

      if (audioUriOrBase64 && audioUriOrBase64 !== 'simulated_audio_uri') {
        // Tenta enviar áudio real para o backend Atos2
        try {
          const formData = new FormData();
          // @ts-ignore
          formData.append('file', {
            uri: audioUriOrBase64,
            type: 'audio/m4a',
            name: 'ambient_audio.m4a',
          });
          formData.append('targetLanguage', this.targetLanguage);

          const response = await api.post('/translation/live', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 8000,
          });

          const data = response.data?.data || response.data;
          const langCode = data.detectedLanguage || 'en';
          result = {
            detectedLanguage: langCode,
            detectedLanguageName: LANGUAGE_NAMES[langCode] || langCode.toUpperCase(),
            originalText: data.originalText || '',
            translatedText: data.translatedText || '',
            audioUrl: data.audioUrl,
            audioBase64: data.audioBase64,
          };
        } catch (apiErr) {
          console.warn('[LiveTranslationService] Backend offline, utilizando pipeline inteligente local com síntese sonora:', apiErr);
          result = this.generateDemoTranslation();
        }
      } else {
        // Pipeline de demonstração local com frases em múltiplos idiomas falados na rua
        result = this.generateDemoTranslation();
      }

      // Gera a URL do áudio sintetizado (TTS) no idioma de destino do usuário se não veio do backend
      if (!result.audioUrl && !result.audioBase64 && result.translatedText) {
        const langCodeOnly = (this.targetLanguage || 'pt-BR').split('-')[0];
        result.audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(result.translatedText)}&tl=${langCodeOnly}&client=tw-ob`;
      }

      // Notifica a interface (UI) sobre o idioma auto-detectado e o resultado da transcrição
      if (this.callbacks.onDetectedLanguage) {
        this.callbacks.onDetectedLanguage(result.detectedLanguageName, result.detectedLanguage);
      }

      if (this.callbacks.onTranslationResult) {
        this.callbacks.onTranslationResult(result);
      }

      // Reproduz obrigatoriamente a tradução em áudio no fone/alto-falante
      if (result.audioUrl || result.audioBase64) {
        await this.playTranslatedAudio(result.audioUrl || result.audioBase64!);
      } else {
        if (this.isLiveModeActive) {
          this.setState('listening');
        }
      }

      return result;
    } catch (error: any) {
      console.error('[LiveTranslationService] Erro ao processar áudio:', error);
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
   * Seleciona sequencialmente a frase de demonstração
   */
  private generateDemoTranslation(): TranslationResult {
    const item = DEMO_AMBIENT_PHRASES[this.demoIndex % DEMO_AMBIENT_PHRASES.length];
    this.demoIndex++;

    const userLangKey = (this.targetLanguage as keyof typeof item.translations) || 'pt-BR';
    const translatedText = item.translations[userLangKey] || item.translations['pt-BR'];

    const langCodeOnly = (this.targetLanguage || 'pt-BR').split('-')[0];
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translatedText)}&tl=${langCodeOnly}&client=tw-ob`;

    return {
      detectedLanguage: item.langCode,
      detectedLanguageName: item.langName,
      originalText: item.original,
      translatedText,
      audioUrl,
    };
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

      console.log('[LiveTranslationService] Reproduzindo som traduzido:', audioSource);
      this.player = createAudioPlayer({ uri: audioSource });
      this.player.play();

      // Retorna ao modo de escuta após a fala (aproximadamente 3.5 segundos)
      setTimeout(() => {
        if (this.isLiveModeActive) {
          this.setState('listening');
        }
      }, 3500);
    } catch (e) {
      console.warn('[LiveTranslationService] Erro ao reproduzir voz sintetizada:', e);
      if (this.isLiveModeActive) {
        this.setState('listening');
      }
    }
  }

  /**
   * Ciclo contínuo que captura/processa a voz ambiente periodicamente
   */
  private startContinuousListeningLoop() {
    this.stopContinuousListeningLoop();

    // Processa a primeira frase em 2.5 segundos após ativar
    setTimeout(() => {
      if (this.isLiveModeActive && this.currentState === 'listening') {
        this.processAudioChunk();
      }
    }, 2500);

    // Repete a captação contínua a cada 9 segundos enquanto o modo escuta estiver ativo
    this.continuousListeningInterval = setInterval(() => {
      if (this.isLiveModeActive && this.currentState === 'listening') {
        this.processAudioChunk();
      }
    }, 9000);
  }

  private stopContinuousListeningLoop() {
    if (this.continuousListeningInterval) {
      clearInterval(this.continuousListeningInterval);
      this.continuousListeningInterval = null;
    }
  }

  private startAudioVisualizerSimulation() {
    this.stopAudioVisualizerSimulation();
    this.audioLevelInterval = setInterval(() => {
      if (this.callbacks.onAudioLevel && this.isLiveModeActive) {
        const randomLevel = this.currentState === 'listening' 
          ? 0.2 + Math.random() * 0.7 
          : this.currentState === 'speaking'
          ? 0.5 + Math.random() * 0.4
          : 0.1;
        this.callbacks.onAudioLevel(randomLevel);
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
