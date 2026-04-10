import api from './api';

export interface MessagePayload {
  recipientId: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE';
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
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

const getMimeType = (type: 'IMAGE' | 'VIDEO' | 'AUDIO', uri: string): string => {
  const ext = uri.split('.').pop()?.toLowerCase() || '';
  if (type === 'IMAGE') {
    const map: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic' };
    return map[ext] || 'image/jpeg';
  }
  if (type === 'VIDEO') {
    const map: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp' };
    return map[ext] || 'video/mp4';
  }
  // AUDIO
  const map: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/m4a', wav: 'audio/wav', ogg: 'audio/ogg' };
  return map[ext] || 'audio/m4a';
};

export const sendMessage = async (payload: MessagePayload, mediaUri?: string): Promise<SendMessageResponse> => {
  if ((payload.type === 'AUDIO' || payload.type === 'IMAGE' || payload.type === 'VIDEO') && mediaUri) {
    const formData = new FormData();
    formData.append('recipientId', payload.recipientId);
    formData.append('type', payload.type);
    formData.append('content', payload.content || '');
    if (payload.scheduledAt) {
      formData.append('scheduledAt', payload.scheduledAt);
    }

    const mime = getMimeType(payload.type, mediaUri);
    const ext = mediaUri.split('.').pop() || 'm4a';
    formData.append('media', {
      uri: mediaUri,
      type: mime,
      name: `media_${Date.now()}.${ext}`
    } as any);

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
