import { Vibration } from 'react-native';
import { createAudioPlayer, AudioModule } from 'expo-audio';

class RingtoneService {
  private player: any = null;
  private isRinging: boolean = false;

  public async configureVoipAudioMode() {
    try {
      // allowsRecording DEVE ser false para que a gravação nativa não retenha o hardware do microfone,
      // deixando-o 100% liberado para o WebView capturar o áudio da chamada WebRTC
      await AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        defaultToSpeaker: true,
      } as any);
      console.log('[RingtoneService] VoIP audio mode configurado: allowsRecording=false (microfone liberado para WebView).');
    } catch (e) {
      console.warn('[RingtoneService] Error setting audio mode:', e);
    }
  }

  public async startIncomingRingtone() {
    if (this.isRinging) return;
    this.isRinging = true;

    try {
      await AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        defaultToSpeaker: true,
      } as any);
    } catch (e) {
      console.warn('[RingtoneService] Error setting audio mode for incoming ringtone:', e);
    }

    if (!this.isRinging) return;

    // Start vibration pattern: wait 0ms, vibrate 1000ms, pause 1000ms, repeat
    try {
      Vibration.vibrate([0, 1000, 1000], true);
    } catch (e) {
      console.warn('[RingtoneService] Vibration error:', e);
    }

    // Play ringtone audio loop
    try {
      if (this.player) {
        try { this.player.pause(); this.player.release(); } catch (_) {}
        this.player = null;
      }
      const source = require('../assets/sounds/ruash.wav');
      this.player = createAudioPlayer(source);
      this.player.loop = true;
      if (this.isRinging) {
        this.player.play();
      }
    } catch (e) {
      console.warn('[RingtoneService] Error playing incoming ringtone sound:', e);
    }
  }

  public async startOutgoingRingtone() {
    if (this.isRinging) return;
    this.isRinging = true;

    try {
      await AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        defaultToSpeaker: true,
      } as any);
    } catch (e) {
      console.warn('[RingtoneService] Error setting audio mode for outgoing ringtone:', e);
    }

    if (!this.isRinging) return;

    try {
      if (this.player) {
        try { this.player.pause(); this.player.release(); } catch (_) {}
        this.player = null;
      }
      const source = require('../assets/sounds/ruash.wav');
      this.player = createAudioPlayer(source);
      this.player.loop = true;
      if (this.isRinging) {
        this.player.play();
      }
    } catch (e) {
      console.warn('[RingtoneService] Error playing outgoing ringtone sound:', e);
    }
  }

  public stopRingtone() {
    this.isRinging = false;
    try {
      Vibration.cancel();
    } catch (e) {}

    try {
      if (this.player) {
        this.player.pause();
        this.player.release();
        this.player = null;
      }
    } catch (e) {
      console.warn('[RingtoneService] Error stopping ringtone sound:', e);
    }

    // Libera a gravação nativa imediatamente para desobstruir o microfone para o WebView
    this.configureVoipAudioMode();
  }
}

export const ringtoneService = new RingtoneService();
