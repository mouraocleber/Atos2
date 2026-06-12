import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import callService from '../services/callService';
import { AppError } from '../middleware/errorHandler';

export class CallController {
  
  /**
   * Endpoint for users to obtain a Twilio Access Token.
   * GET /api/calls/token
   */
  async getAccessToken(req: AuthenticatedRequest, res: Response) {
    try {
      const identity = req.userId!;
      const token = callService.generateToken(identity);

      return res.json({
        success: true,
        message: 'Voice Access Token gerado',
        data: { token },
      });
    } catch (error: any) {
      throw new AppError(500, error.message, 'TWILIO_TOKEN_ERROR');
    }
  }

  /**
   * Webhook called by Twilio whenever a call is initiated.
   * POST /api/calls/voice
   */
  async handleIncomingVoiceRequest(req: Request, res: Response) {
    try {
      // Twilio usually sends 'To' and 'From' inside req.body
      const to = req.body.To;
      const callerId = req.body.From || req.body.Caller;

      // Handle the routing and generate TwiML XML
      const twimlResponse = callService.handleVoiceRouting(to, callerId);

      // Return XML formatting explicitly
      res.type('text/xml');
      return res.send(twimlResponse);
    } catch (error: any) {
      console.error('Erro no roteamento de voz Twilio:', error);
      res.type('text/xml');
      return res.status(500).send('<Response><Say language="pt-BR">Ocorreu um erro interno de servidor de voz.</Say></Response>');
    }
  }

  /**
   * Endpoint for users to obtain ICE servers configuration.
   * GET /api/calls/ice-servers
   */
  async getIceServers(req: AuthenticatedRequest, res: Response) {
    try {
      const iceServers = await callService.getIceServers();
      return res.json({
        success: true,
        message: 'ICE Servers fetched successfully',
        data: { iceServers },
      });
    } catch (error: any) {
      throw new AppError(500, error.message, 'ICE_SERVERS_ERROR');
    }
  }
}

export default new CallController();
