import OpenAI from 'openai';
import dotenv from 'dotenv';
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
      const sourceLangName = this.supportedLanguages.get(sourceLanguage) || sourceLanguage;
      const targetLangName = this.supportedLanguages.get(targetLanguage) || targetLanguage;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Translate the following text from ${sourceLangName} to ${targetLangName}. 
Only return the translated text, nothing else.

Text: "${text}"`,
          },
        ],
      });

      const translatedText = completion.choices[0].message.content || text;
      return translatedText.trim();
    } catch (error) {
      console.error('Erro na tradução:', error);
      throw new Error('Falha ao traduzir mensagem');
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: `Detect the language of the following text and respond with only the language code (e.g., en-US, pt-BR, es-ES).

Text: "${text}"`,
          },
        ],
      });

      const detectedLanguage = completion.choices[0].message.content?.trim() || 'pt-BR';
      return detectedLanguage;
    } catch (error) {
      console.error('Erro ao detectar idioma:', error);
      return 'pt-BR'; // Padrão
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
    translatedLanguage: string
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
        'openai',
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

