import { Platform } from 'react-native';
import api from './api';

export interface MessagePayload {
  recipientId: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | 'LOCATION';
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
  translatedContent?: string;
  translatedLanguage?: string;
  senderVoiceGender?: 'male' | 'female';
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  data: any;
}

export const getConversation = async (otherUserId: string, limit: number = 50, offset: number = 0) => {
  const response = await api.get(`/messages/conversation/${otherUserId}`, {
    params: { limit, offset }
  });
  return response.data;
};

const getMimeType = (type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE', uri: string): string => {
  const ext = uri.split('.').pop()?.toLowerCase() || '';
  if (type === 'IMAGE') {
    const map: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic' };
    return map[ext] || 'image/jpeg';
  }
  if (type === 'VIDEO') {
    const map: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp' };
    return map[ext] || 'video/mp4';
  }
  if (type === 'AUDIO') {
    const map: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/m4a', wav: 'audio/wav', ogg: 'audio/ogg', webm: 'audio/webm' };
    return map[ext] || 'audio/m4a';
  }
  // FILE — documentos genéricos
  const map: Record<string, string> = {
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain', csv: 'text/csv', zip: 'application/zip',
    rar: 'application/x-rar-compressed', json: 'application/json',
    xml: 'application/xml', html: 'text/html',
  };
  return map[ext] || 'application/octet-stream';
};

export const sendMessage = async (payload: MessagePayload, mediaUri?: string): Promise<SendMessageResponse> => {
  if ((payload.type === 'AUDIO' || payload.type === 'IMAGE' || payload.type === 'VIDEO' || payload.type === 'FILE') && mediaUri) {
    const formData = new FormData();
    formData.append('recipientId', payload.recipientId);
    formData.append('type', payload.type);
    formData.append('content', payload.content || '');
    if (payload.scheduledAt) {
      formData.append('scheduledAt', payload.scheduledAt);
    }
    if (payload.translatedContent) {
      formData.append('translatedContent', payload.translatedContent);
    }
    if (payload.translatedLanguage) {
      formData.append('translatedLanguage', payload.translatedLanguage);
    }
    if (payload.senderVoiceGender) {
      formData.append('senderVoiceGender', payload.senderVoiceGender);
    }

    const mime = getMimeType(payload.type, mediaUri);
    const ext = mediaUri.split('.').pop() || (payload.type === 'FILE' ? 'bin' : 'm4a');
    const filename = `media_${Date.now()}.${ext}`;

    if (Platform.OS === 'web') {
      try {
        const fetchRes = await fetch(mediaUri);
        const blob = await fetchRes.blob();
        formData.append('media', blob, filename);
      } catch (err) {
        console.warn('[chat.ts] Falha ao converter mediaUri em Blob no Web, usando fallback:', err);
        formData.append('media', {
          uri: mediaUri,
          type: mime,
          name: filename,
        } as any);
      }
    } else {
      formData.append('media', {
        uri: mediaUri,
        type: mime,
        name: filename,
      } as any);
    }

    const response = await api.post('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s para uploads grandes
    });
    return response.data;
  }

  // Texto Normal
  const response = await api.post('/messages', payload);
  return response.data;
};

export const deleteMessage = async (messageId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/messages/${messageId}`);
  return response.data;
};
