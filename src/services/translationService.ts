import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import { query } from '../config/database';
import { Translation } from '../types';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class TranslationService {
  private supportedLanguages: Map<string, string> = new Map([
    ['pt-BR', 'Portuguese (Brazil)'],
    ['pt-PT', 'Portuguese (Portugal)'],
    ['en-US', 'English (US)'],
    ['en-GB', 'English (UK)'],
    ['es-ES', 'Spanish (Spain)'],
    ['es-MX', 'Spanish (Mexico)'],
    ['fr-FR', 'French'],
    ['de-DE', 'German'],
    ['it-IT', 'Italian'],
    ['ja-JP', 'Japanese'],
    ['zh-CN', 'Chinese (Simplified)'],
    ['zh-TW', 'Chinese (Traditional)'],
    ['ru-RU', 'Russian'],
    ['ko-KR', 'Korean'],
    ['ar-SA', 'Arabic'],
  ]);



  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    try {
      // O DeepL usa um formato de target_lang ligeiramente diferente
      // Ele só aceita sub-regiões para PT e EN. Os demais (FR, ES, DE, IT) devem ter apenas 2 letras.
      const targetLangParts = targetLanguage.split('-');
      let deeplTargetLang = targetLangParts[0].toUpperCase();
      const validDeepLRegions = ['PT-BR', 'PT-PT', 'EN-US', 'EN-GB'];
      const combinedTarget = targetLangParts.length > 1 ? `${deeplTargetLang}-${targetLangParts[1].toUpperCase()}` : deeplTargetLang;
      
      if (validDeepLRegions.includes(combinedTarget)) {
        deeplTargetLang = combinedTarget;
      }

      const sourceLangParts = sourceLanguage.split('-');
      const deeplSourceLang = sourceLangParts[0].toUpperCase();

      // Verificar se há chave do DeepL
      if (!process.env.DEEPL_API_KEY) {
        console.warn('DEEPL_API_KEY não configurada. Usando retorno de fallback.');
        return `[Trans. Pending] ${text}`;
      }

      const response = await axios.post(
        'https://api-free.deepl.com/v2/translate',
        new URLSearchParams({
          text: text,
          source_lang: deeplSourceLang,
          target_lang: deeplTargetLang,
        }),
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data.translations[0].text;
    } catch (error: any) {
      console.error('Erro na tradução DeepL:', error.response?.data || error.message);
      throw new Error('Falha ao traduzir mensagem');
    }
  }

  async transcribeAudio(audioPath: string): Promise<string> {
    try {
      // Implementar transcrição de áudio com Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: require('fs').createReadStream(audioPath),
        model: 'whisper-1',
      });

      return transcription.text;
    } catch (error) {
      console.error('Erro na transcrição:', error);
      throw new Error('Falha ao transcrever áudio');
    }
  }

  async saveTranslation(
    messageId: string,
    originalContent: string,
    originalLanguage: string,
    translatedContent: string,
    translatedLanguage: string,
    providerOverride?: string
  ): Promise<Translation> {
    const result = await query(
      `INSERT INTO translations (
        message_id, original_content, original_language, 
        translated_content, translated_language, provider
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, message_id, original_content, original_language, 
                translated_content, translated_language, provider, created_at`,
      [
        messageId,
        originalContent,
        originalLanguage,
        translatedContent,
        translatedLanguage,
        providerOverride || 'deepl',
      ]
    );

    return result.rows[0];
  }

  async getTranslation(messageId: string, targetLanguage: string): Promise<Translation | null> {
    const result = await query(
      `SELECT id, message_id, original_content, original_language, 
              translated_content, translated_language, provider, created_at
       FROM translations 
       WHERE message_id = $1 AND translated_language = $2`,
      [messageId, targetLanguage]
    );

    return result.rows[0] || null;
  }

  async updateMessageWithTranslation(
    messageId: string,
    translatedContent: string,
    translatedLanguage: string,
    originalLanguage: string
  ): Promise<void> {
    await query(
      `UPDATE messages 
       SET translated_content = $1, translated_language = $2, original_language = $3
       WHERE id = $4`,
      [translatedContent, translatedLanguage, originalLanguage, messageId]
    );
  }

  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return Array.from(this.supportedLanguages.entries()).map(([code, name]) => ({
      code,
      name,
    }));
  }

  isLanguageSupported(languageCode: string): boolean {
    return this.supportedLanguages.has(languageCode);
  }
}

export default new TranslationService();

