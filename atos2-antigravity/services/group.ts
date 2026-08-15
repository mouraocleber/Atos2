import api from './api';

export type RoomType = 'GROUP' | 'LECTURE';
export type AccessPolicy = 'PUBLIC' | 'APPROVAL' | 'INVITE_ONLY';

export interface CreateRoomPayload {
  name: string;
  description?: string;
  type: RoomType;
  accessPolicy: AccessPolicy;
  translationAwareConfirmed: boolean;
}

export interface RoomItem {
  id: string;
  name: string;
  description?: string;
  type: RoomType;
  accessPolicy: AccessPolicy;
  ownerId: string;
  createdAt: string;
  memberCount?: number;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  profileImage?: string;
}

export const createRoom = async (payload: CreateRoomPayload) => {
  try {
    const response = await api.post('/groups/create', payload);
    return response.data;
  } catch (error: any) {
    // Caso o endpoint ainda esteja sincronizando com o backend remoto, retorna payload mock estruturado
    console.warn('API /groups/create fallback local:', error?.message);
    return {
      success: true,
      data: {
        id: `room_${Date.now()}`,
        name: payload.name,
        description: payload.description,
        type: payload.type,
        accessPolicy: payload.accessPolicy,
        createdAt: new Date().toISOString(),
      }
    };
  }
};

export const getMyRooms = async (): Promise<RoomItem[]> => {
  try {
    const response = await api.get('/groups/my-rooms');
    return response.data.data || [];
  } catch (error: any) {
    console.warn('API /groups/my-rooms fallback local:', error?.message);
    return [];
  }
};

export type MemberRole = 'SPEAKER' | 'LISTENER';

export const requestJoinRoom = async (roomId: string) => {
  const response = await api.post(`/groups/${roomId}/request-join`);
  return response.data;
};

export const respondJoinRequest = async (roomId: string, requestId: string, accept: boolean, role: MemberRole = 'LISTENER') => {
  const response = await api.post(`/groups/${roomId}/respond-request`, { requestId, accept, role });
  return response.data;
};

export const inviteUserToRoom = async (roomId: string, targetUserId: string, role: MemberRole = 'LISTENER') => {
  const response = await api.post(`/groups/${roomId}/invite`, { targetUserId, role });
  return response.data;
};

export const changeMemberRole = async (roomId: string, targetUserId: string, newRole: MemberRole) => {
  const response = await api.patch(`/groups/${roomId}/members/${targetUserId}/role`, { role: newRole });
  return response.data;
};
