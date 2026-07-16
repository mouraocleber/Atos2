import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import { query } from '../config/database';
import { Translation } from '../types';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEEPL_SUPPORTED_CODES = new Set([
  'AR', 'BG', 'CS', 'DA', 'DE', 'EL', 'EN', 'EN-US', 'EN-GB', 'ES', 'ET',
  'FI', 'FR', 'HU', 'ID', 'IT', 'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL',
  'PT', 'PT-BR', 'PT-PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TR', 'UK', 'ZH',
  'HE', 'VI', 'TH'
]);

function isDeepLSupported(langCode: string): boolean {
  const upper = langCode.toUpperCase();
  if (DEEPL_SUPPORTED_CODES.has(upper)) {
    return true;
  }
  const base = upper.split('-')[0];
  return DEEPL_SUPPORTED_CODES.has(base);
}

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
    ['hi-IN', 'Hindi'],
    ['tr-TR', 'Turkish'],
    ['pl-PL', 'Polish'],
    ['nl-NL', 'Dutch'],
    ['sv-SE', 'Swedish'],
    ['da-DK', 'Danish'],
    ['fi-FI', 'Finnish'],
    ['nb-NO', 'Norwegian'],
    ['uk-UA', 'Ukrainian'],
    ['id-ID', 'Indonesian'],
    ['ms-MY', 'Malay'],
    ['th-TH', 'Thai'],
    ['vi-VN', 'Vietnamese'],
    ['he-IL', 'Hebrew'],
    ['cs-CZ', 'Czech'],
    ['ro-RO', 'Romanian'],
    ['hu-HU', 'Hungarian'],
    ['el-GR', 'Greek'],
  ]);

  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    const useDeepL = isDeepLSupported(sourceLanguage) && isDeepLSupported(targetLanguage);

    if (useDeepL && process.env.DEEPL_API_KEY) {
      try {
        const targetLangParts = targetLanguage.split('-');
        let deeplTargetLang = targetLangParts[0].toUpperCase();
        const validDeepLRegions = ['PT-BR', 'PT-PT', 'EN-US', 'EN-GB'];
        const combinedTarget = targetLangParts.length > 1 ? `${deeplTargetLang}-${targetLangParts[1].toUpperCase()}` : deeplTargetLang;
        
        if (validDeepLRegions.includes(combinedTarget)) {
          deeplTargetLang = combinedTarget;
        }

        const sourceLangParts = sourceLanguage.split('-');
        const deeplSourceLang = sourceLangParts[0].toUpperCase();

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
        console.warn('Erro na tradução DeepL, tentando fallback OpenAI:', error.response?.data || error.message);
        return this.translateWithOpenAI(text, sourceLanguage, targetLanguage);
      }
    } else {
      // Se não for suportado pelo DeepL ou chave do DeepL não estiver configurada, tenta OpenAI diretamente
      return this.translateWithOpenAI(text, sourceLanguage, targetLanguage);
    }
  }

  async translateWithOpenAI(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY não configurada. Retornando texto original.');
        return text;
      }

      const sourceName = this.supportedLanguages.get(sourceLanguage) || sourceLanguage;
      const targetName = this.supportedLanguages.get(targetLanguage) || targetLanguage;

      console.log(`[OpenAI Translate] Traduzindo de ${sourceName} para ${targetName}...`);

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator for the Atos2 messaging app. Translate the message from "${sourceName}" to "${targetName}". Keep the original formatting, style, punctuation, emojis, and slang. Output ONLY the translated text without quotes or explanations.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
      });

      const translated = response.choices[0]?.message?.content?.trim();
      if (!translated) {
        throw new Error('Empty response from OpenAI');
      }
      return translated;
    } catch (err: any) {
      console.error('Erro na tradução OpenAI:', err.message);
      return text; // fallback final seguro
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

