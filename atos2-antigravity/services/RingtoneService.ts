import { Vibration } from 'react-native';
import { createAudioPlayer, AudioModule } from 'expo-audio';

class RingtoneService {
  private player: any = null;
  private isRinging: boolean = false;

  public async configureVoipAudioMode() {
    try {
      await AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    } catch (e) {
      console.warn('[RingtoneService] Error setting audio mode:', e);
    }
  }

  public async startIncomingRingtone() {
    if (this.isRinging) return;
    this.isRinging = true;

    await this.configureVoipAudioMode();

    // Start vibration pattern: wait 0ms, vibrate 1000ms, pause 1000ms, repeat
    try {
      Vibration.vibrate([0, 1000, 1000], true);
    } catch (e) {
      console.warn('[RingtoneService] Vibration error:', e);
    }

    // Play ringtone audio loop
    try {
      if (this.player) {
        this.player.release();
        this.player = null;
      }
      const source = require('../assets/sounds/ruash.wav');
      this.player = createAudioPlayer(source);
      this.player.loop = true;
      this.player.play();
    } catch (e) {
      console.warn('[RingtoneService] Error playing incoming ringtone sound:', e);
    }
  }

  public async startOutgoingRingtone() {
    if (this.isRinging) return;
    this.isRinging = true;

    await this.configureVoipAudioMode();

    try {
      if (this.player) {
        this.player.release();
        this.player = null;
      }
      const source = require('../assets/sounds/ruash.wav');
      this.player = createAudioPlayer(source);
      this.player.loop = true;
      this.player.play();
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
  }
}

export const ringtoneService = new RingtoneService();
