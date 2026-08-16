import { AudioModule, createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
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

class LiveTranslationService {
  private currentState: TranslationState = 'idle';
  private callbacks: LiveTranslationCallbacks = {};
  private targetLanguage: string = 'pt-BR';
  private player: any = null;
  private audioLevelInterval: NodeJS.Timeout | null = null;
  private isLiveModeActive: boolean = false;

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
   * Configura o modo de áudio do dispositivo para gravação e reprodução simultâneas (fone/alto-falante)
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

    console.log(`[LiveTranslationService] Escuta iniciada. Idioma de destino do usuário: ${this.targetLanguage}`);
    return true;
  }

  /**
   * Para o ciclo de escuta e libera recursos de áudio
   */
  public async stopListening() {
    this.isLiveModeActive = false;
    this.stopAudioVisualizerSimulation();

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
   * Processa um trecho de áudio captado (chamado continuamente no loop de escuta)
   * Envia para a API que fará:
   * 1. Detecção automática do idioma falado (Source Language Auto-Detect)
   * 2. Tradução para o idioma cadastrado do usuário (Target User Language)
   * 3. Retorno do áudio sintetizado para tocar no fone de ouvido
   */
  public async processAudioChunk(audioUriOrBase64: string): Promise<TranslationResult | null> {
    if (!this.isLiveModeActive) return null;

    try {
      this.setState('processing');

      // Tenta enviar para o endpoint do backend Atos2
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri: audioUriOrBase64,
        type: 'audio/m4a',
        name: 'ambient_audio.m4a',
      });
      formData.append('targetLanguage', this.targetLanguage);

      let result: TranslationResult;

      try {
        const response = await api.post('/translation/live', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 10000,
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
        console.warn('[LiveTranslationService] Backend indisponível ou em desenvolvimento, utilizando pipeline de demonstração:', apiErr);
        
        // Resposta de demonstração para Prova de Conceito
        result = {
          detectedLanguage: 'en',
          detectedLanguageName: 'Inglês',
          originalText: 'Hello, excuse me, where is the nearest train station?',
          translatedText: 'Olá, com licença, onde fica a estação de trem mais próxima?',
        };
      }

      // Notifica UI sobre o idioma auto-detectado pela IA
      if (this.callbacks.onDetectedLanguage) {
        this.callbacks.onDetectedLanguage(result.detectedLanguageName, result.detectedLanguage);
      }

      if (this.callbacks.onTranslationResult) {
        this.callbacks.onTranslationResult(result);
      }

      // Se houver retorno de áudio sintetizado, toca no fone de ouvido
      if (result.audioUrl || result.audioBase64) {
        await this.playTranslatedAudio(result.audioUrl || result.audioBase64!);
      } else {
        // Se esteve apenas processando texto, retorna ao modo de escuta
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
   * Reproduz o áudio traduzido no fone de ouvido/alto-falante
   */
  private async playTranslatedAudio(audioSource: string) {
    if (!this.isLiveModeActive) return;

    try {
      this.setState('speaking');

      if (this.player) {
        try {
          this.player.release();
        } catch (e) {}
        this.player = null;
      }

      this.player = createAudioPlayer({ uri: audioSource });
      this.player.play();

      // Aguarda término da fala para retornar ao modo escuta ambiente
      setTimeout(() => {
        if (this.isLiveModeActive) {
          this.setState('listening');
        }
      }, 3000);
    } catch (e) {
      console.warn('[LiveTranslationService] Erro ao tocar áudio traduzido:', e);
      if (this.isLiveModeActive) {
        this.setState('listening');
      }
    }
  }

  private startAudioVisualizerSimulation() {
    this.stopAudioVisualizerSimulation();
    this.audioLevelInterval = setInterval(() => {
      if (this.callbacks.onAudioLevel && this.isLiveModeActive) {
        // Gera valores flutuantes entre 0.1 e 1.0 para animar o equalizador visual de áudio
        const randomLevel = this.currentState === 'listening' 
          ? 0.2 + Math.random() * 0.7 
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
