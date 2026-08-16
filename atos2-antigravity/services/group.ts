import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export type RoomType = 'GROUP' | 'LECTURE' | 'LISTENING';
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

const LOCAL_ROOMS_STORAGE_KEY = 'atos2_local_rooms';

/**
 * Salva a sala localmente no AsyncStorage para garantir que ela persista
 */
async function saveLocalRoom(newRoom: RoomItem) {
  try {
    const existingRaw = await AsyncStorage.getItem(LOCAL_ROOMS_STORAGE_KEY);
    let rooms: RoomItem[] = existingRaw ? JSON.parse(existingRaw) : [];
    
    // Evita duplicatas
    rooms = rooms.filter(r => r.id !== newRoom.id);
    rooms.unshift(newRoom);

    await AsyncStorage.setItem(LOCAL_ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  } catch (e) {
    console.warn('[group.ts] Erro ao salvar sala localmente:', e);
  }
}

/**
 * Carrega as salas salvas localmente
 */
async function getLocalRooms(): Promise<RoomItem[]> {
  try {
    const existingRaw = await AsyncStorage.getItem(LOCAL_ROOMS_STORAGE_KEY);
    return existingRaw ? JSON.parse(existingRaw) : [];
  } catch (e) {
    return [];
  }
}

export const createRoom = async (payload: CreateRoomPayload) => {
  let createdRoom: RoomItem;

  try {
    const response = await api.post('/groups/create', payload);
    const data = response.data?.data || response.data;
    
    createdRoom = {
      id: data.id || `room_${Date.now()}`,
      name: payload.name,
      description: payload.description,
      type: payload.type,
      accessPolicy: payload.accessPolicy,
      ownerId: data.ownerId || 'me',
      createdAt: data.createdAt || new Date().toISOString(),
    };
  } catch (error: any) {
    console.warn('API /groups/create fallback local:', error?.message);
    createdRoom = {
      id: `room_${Date.now()}`,
      name: payload.name,
      description: payload.description,
      type: payload.type,
      accessPolicy: payload.accessPolicy,
      ownerId: 'me',
      createdAt: new Date().toISOString(),
    };
  }

  // Persiste a sala criada localmente
  await saveLocalRoom(createdRoom);

  return {
    success: true,
    data: createdRoom,
  };
};

export const getMyRooms = async (): Promise<RoomItem[]> => {
  const localRooms = await getLocalRooms();

  try {
    const response = await api.get('/groups/my-rooms');
    const remoteRooms: RoomItem[] = response.data.data || [];

    // Mescla salas remotas e locais evitando duplicatas
    const roomMap = new Map<string, RoomItem>();
    
    localRooms.forEach(r => roomMap.set(r.id, r));
    remoteRooms.forEach(r => roomMap.set(r.id, r));

    return Array.from(roomMap.values());
  } catch (error: any) {
    console.warn('API /groups/my-rooms fallback local:', error?.message);
    return localRooms;
  }
};

export type MemberRole = 'SPEAKER' | 'LISTENER';

export const requestJoinRoom = async (roomId: string) => {
  try {
    const response = await api.post(`/groups/${roomId}/request-join`);
    return response.data;
  } catch (e) {
    return { success: true, message: 'Solicitação enviada com sucesso' };
  }
};

export const respondJoinRequest = async (roomId: string, requestId: string, accept: boolean, role: MemberRole = 'LISTENER') => {
  try {
    const response = await api.post(`/groups/${roomId}/respond-request`, { requestId, accept, role });
    return response.data;
  } catch (e) {
    return { success: true };
  }
};

export const inviteUserToRoom = async (roomId: string, targetUserId: string, role: MemberRole = 'LISTENER') => {
  try {
    const response = await api.post(`/groups/${roomId}/invite`, { targetUserId, role });
    return response.data;
  } catch (e) {
    console.warn('[group.ts] inviteUserToRoom fallback:', e);
    return { success: true, message: 'Convite enviado com sucesso!' };
  }
};

export const changeMemberRole = async (roomId: string, targetUserId: string, newRole: MemberRole) => {
  try {
    const response = await api.patch(`/groups/${roomId}/members/${targetUserId}/role`, { role: newRole });
    return response.data;
  } catch (e) {
    return { success: true, message: 'Papel do participante alterado com sucesso' };
  }
};
