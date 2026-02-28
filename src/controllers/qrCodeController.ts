import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import qrCodeService from '../services/qrCodeService';
import userService from '../services/userService';
import { AppError } from '../middleware/errorHandler';

export class QRCodeController {
  async generateQRCode(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      // Obter dados do usuário
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
      }

      // Gerar QR Code
      const { qrCodeImage, qrCodeId, expiresAt } = await qrCodeService.generateQRCode(
        user.id,
        user.nickname,
        user.name,
        user.profileImage
      );

      res.json({
        success: true,
        message: 'QR Code gerado com sucesso',
        data: {
          qrCodeId,
          qrCodeImage,
          expiresAt,
          user: {
            id: user.id,
            nickname: user.nickname,
            name: user.name,
            profileImage: user.profileImage,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async scanQRCode(req: AuthenticatedRequest, res: Response) {
    try {
      const { qrCodeString } = req.body;
      const scannedByUserId = req.userId!;

      if (!qrCodeString) {
        throw new AppError(400, 'QR Code é obrigatório', 'MISSING_QR_CODE');
      }

      // Escanear QR Code
      const qrData = await qrCodeService.scanQRCode(qrCodeString, scannedByUserId);

      // Obter dados completos do usuário
      const user = await userService.getUserById(qrData.userId);
      if (!user) {
        throw new AppError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'QR Code escaneado com sucesso. Contato adicionado!',
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            nickname: user.nickname,
            name: user.name,
            personType: user.personType,
            cep: user.cep,
            address: user.address,
            city: user.city,
            state: user.state,
            profileImage: user.profileImage,
            status: user.status,
            preferredLanguage: user.preferredLanguage,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getQRCodeHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const history = await qrCodeService.getQRCodeHistory(userId);

      res.json({
        success: true,
        message: 'Histórico de QR Codes',
        data: history,
      });
    } catch (error) {
      throw error;
    }
  }

  async getQRCode(req: AuthenticatedRequest, res: Response) {
    try {
      const { qrCodeId } = req.params;

      if (!qrCodeId) {
        throw new AppError(400, 'ID do QR Code é obrigatório', 'MISSING_QR_CODE_ID');
      }

      const qrCode = await qrCodeService.getQRCodeById(qrCodeId);
      if (!qrCode) {
        throw new AppError(404, 'QR Code não encontrado', 'QR_CODE_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'QR Code encontrado',
        data: qrCode,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new QRCodeController();

