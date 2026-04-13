import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VoiceResponse = twilio.twiml.VoiceResponse;

export class CallService {
  /**
   * Generates a Twilio Access Token for Voice calls for a specific user identity.
   */
  generateToken(identity: string): string {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioApiKey = process.env.TWILIO_API_SID; // SK...
    const twilioApiSecret = process.env.TWILIO_API_KEY; // secret...
    const twilioTwiMLAppSid = process.env.TWILIO_TWIML_APP_SID || 'APa0000000000000000000000000000000'; // mockup se não houver APP SID no .env

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
      throw new Error('Chaves de ambiente do Twilio não configuradas no backend.');
    }

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twilioTwiMLAppSid,
      incomingAllow: true,
    });

    const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, {
      identity,
      ttl: 24 * 60 * 60, // 24 hours
    });

    token.addGrant(voiceGrant);
    return token.toJwt();
  }

  /**
   * Generates TwiML instructions to route the call to the callee.
   */
  handleVoiceRouting(to: string, callerId?: string): string {
    const twiml = new VoiceResponse();

    if (!to) {
      twiml.say({ language: 'pt-BR' }, 'Desculpe, não foi possível identificar o destinatário.');
      return twiml.toString();
    }

    // Dial the 'to' identity using Twilio Client (App-to-App VolP)
    const dial = twiml.dial({ callerId: callerId || 'anonymous' });
    dial.client(to);

    return twiml.toString();
  }
}

export default new CallService();
