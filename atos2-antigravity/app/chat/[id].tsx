import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, Image, Modal, Alert, ActivityIndicator,
  Animated, Pressable, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioPlayer, useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { WebView } from 'react-native-webview';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Paths, File } from 'expo-file-system';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { getWebRtcHtml } from '../../services/webrtcHtml';
import { useVideoPlayer, VideoView } from 'expo-video';

import { getConversation, sendMessage, deleteMessage } from '../../services/chat';
import api, { SERVER_URL } from '../../services/api';

// Base da URL do servidor (sem /api) para exibir arquivos de mídia e sockets
const SERVER_MEDIA_BASE = SERVER_URL;

import { getCachedMedia } from '../../services/MediaCacheService';
import CachedImage from '../../components/CachedImage';

interface ChatVideoPlayerProps {
  url: string;
}

function ChatVideoPlayer({ url }: ChatVideoPlayerProps) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCachedMedia(url).then((cUrl) => {
      if (active) {
        setCachedUrl(cUrl || url);
      }
    });
    return () => {
      active = false;
    };
  }, [url]);

  if (!cachedUrl) {
    return (
      <View style={[styles.mediaVideo, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    );
  }

  return <ActualVideoPlayer videoUrl={cachedUrl} />;
}

function ActualVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.muted = true;
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      style={styles.mediaVideo}
      player={player}
      nativeControls={false}
    />
  );
}

function ActualFullscreenVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.muted = false;
    p.play();
  });

  return (
    <VideoView
      style={{ width: '100%', height: '80%' }}
      player={player}
      nativeControls={true}
      contentFit="contain"
    />
  );
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  translatedContent?: string;
  translatedLanguage?: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE' | 'LOCATION';
  status: 'SENT' | 'DELIVERED' | 'READ';
  mediaUrl?: string;
  media_url?: string;
  createdAt: string;
}

export default function ChatRoomScreen() {
  const { id, name, status, autoAcceptCall, profileImage } = useLocalSearchParams();
  const { user } = useAuth();
  const { socket } = useSocket();   // Socket global — conectado desde o login

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Call / VoIP Modal & Moderation
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [videoCallMode, setVideoCallMode] = useState<'video' | 'audio' | null>(null);

  // Schedule Message
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleDateObj, setScheduleDateObj] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Áudio — hook no topo do componente (regra dos hooks)
  // A permissão só é pedida quando começar a gravar (requestRecordingPermissionsAsync)
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const soundRef = useRef<any | null>(null);

  // Call modal state — UI nativa em vez de Jitsi
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callStatus, setCallStatus] = useState<'calling' | 'in-call' | 'ended'>('calling');
  const [callDirection, setCallDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [callerName, setCallerName] = useState<string>('');

  // Som nativo de RUASH
  const ruashPlayer = useAudioPlayer(require('../../assets/sounds/ruash.wav'));
  const prevMessagesLength = useRef(0);

  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const webViewRef = useRef<WebView>(null);
  const [iceServers, setIceServers] = useState<any[]>([]);

  const requestCallPermissions = async (type: 'audio' | 'video') => {
    try {
      const audioPerm = await AudioModule.requestRecordingPermissionsAsync();
      if (!audioPerm.granted) {
        Alert.alert('Microfone necessário', 'Você precisa permitir o acesso ao microfone para fazer ligações.');
        return false;
      }
      if (type === 'video') {
        const cameraPerm = await Camera.requestCameraPermissionsAsync();
        if (!cameraPerm.granted) {
          Alert.alert('Câmera necessária', 'Você precisa permitir o acesso à câmera para fazer chamadas de vídeo.');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Erro ao pedir permissões de chamada:', error);
      return false;
    }
  };

  const fetchIceServers = async () => {
    try {
      const { data } = await api.get('/calls/ice-servers');
      if (data && data.success && data.data && data.data.iceServers) {
        setIceServers(data.data.iceServers);
        return data.data.iceServers;
      }
    } catch (e) {
      console.warn('Erro ao obter ICE servers, usando fallback:', e);
    }
    const fallback = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];
    setIceServers(fallback);
    return fallback;
  };

  // Lógica de disparo do SOM
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMsg = messages[messages.length - 1];
      const isMe = lastMsg?.senderId === user?.id || (lastMsg as any)?.sender_id === user?.id;
      
      if (!isMe && prevMessagesLength.current > 0) {
        try {
          ruashPlayer?.play();
        } catch(e) {
          console.log("Erro ao tocar ruash:", e);
        }
      }
      prevMessagesLength.current = messages.length;
    }
  }, [messages, user]);

  // Pulso animado no botão de gravação
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Normaliza campos snake_case do banco para camelCase
  const normalizeMessage = (msg: any): Message => ({
    id: msg.id,
    senderId: msg.senderId || msg.sender_id || '',
    content: msg.content || '',
    translatedContent: msg.translatedContent || msg.translated_content || undefined,
    translatedLanguage: msg.translatedLanguage || msg.translated_language || undefined,
    type: msg.type || 'TEXT',
    status: msg.status || 'SENT',
    mediaUrl: msg.mediaUrl || msg.media_url || undefined,
    createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
  });

  const loadLiveMessages = useCallback(async (forceScroll = false) => {
    try {
      const data = await getConversation(id as string, 200, 0);
      const raw: any[] = data.data || [];
      const newMessages: Message[] = raw.map(normalizeMessage);
      setMessages(prev => {
        const scrollNeeded = forceScroll || newMessages.length !== prev.filter(m => !m.id.startsWith('temp_')).length;
        if (scrollNeeded) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
        }
        return newMessages;
      });
    } catch (err) {
      console.log('Error loading messages', err);
    }
  }, [id]);

  const socketRef = useRef<any | null>(null);

  // Sincroniza socketRef com o socket global do SocketContext
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Auto-aceita chamada se recebeu o parâmetro (vindo do GlobalCallHandler)
  useEffect(() => {
    if (!autoAcceptCall || !socket || !id) return;
    const typeVal = autoAcceptCall as 'audio' | 'video';

    const autoAccept = async () => {
      const granted = await requestCallPermissions(typeVal);
      if (!granted) {
        // Envia hangUp se as permissões forem negadas para rejeitar a chamada
        socket.emit('hangUp', { to: id, from: user?.id });
        return;
      }
      await fetchIceServers();
      setCallDirection('incoming');
      setCallType(typeVal);
      setCallStatus('in-call');
      setCallModalVisible(true);
      socket.emit('callAccepted', { to: id, from: user?.id });
    };

    autoAccept();
  }, [autoAcceptCall, socket, id, user?.id]);

  useEffect(() => {
    loadLiveMessages(true);

    if (!socket) return;

    const handleNewMessage = (incoming: any) => {
      const newMsg = normalizeMessage(incoming);
      // Filtro preciso: mensagem do outro usuário OU minha mensagem para este usuário
      const isThisConversation =
        newMsg.senderId === (id as string) ||
        (newMsg.senderId === user?.id &&
          ((incoming.recipientId || incoming.recipient_id) === (id as string)));

      if (!isThisConversation) return;

      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        // Substitui temp message do próprio remetente pelo real
        if (newMsg.senderId === user?.id) {
          const tempIdx = prev.findIndex(
            m => m.id.startsWith('temp_') && m.content === newMsg.content
          );
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = newMsg;
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            return updated;
          }
        }
        const out = [...prev, newMsg];
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        return out;
      });
    };

    const handleStatusUpdate = (data: { messageId: string, status: 'DELIVERED' | 'READ' }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, status: data.status } : m));
    };

    const handleCallUser = (data: { from: string, fromName: string, type: 'audio'|'video' }) => {
      setCallDirection('incoming');
      setCallerName(data.fromName || 'Alguém');
      setCallType(data.type);
      setCallStatus('calling');
      setCallModalVisible(true);
    };

    const handleCallAccepted = async () => {
      await fetchIceServers();
      setCallStatus('in-call');
    };

    const handleHangUp = () => {
      setCallStatus('ended');
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'hangup'
        }));
      }
      setTimeout(() => setCallModalVisible(false), 2000);
    };

    const handleWebRtcSignal = (data: { from: string, signal: any }) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'signal',
          signal: data.signal
        }));
      }
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageStatusUpdate', handleStatusUpdate);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('callUser', handleCallUser);
    socket.on('callAccepted', handleCallAccepted);
    socket.on('hangUp', handleHangUp);
    socket.on('webrtcSignal', handleWebRtcSignal);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageStatusUpdate', handleStatusUpdate);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('callUser', handleCallUser);
      socket.off('callAccepted', handleCallAccepted);
      socket.off('hangUp', handleHangUp);
      socket.off('webrtcSignal', handleWebRtcSignal);
    };
  }, [loadLiveMessages, user?.id, id, socket]);

  const handleStartCall = async (mode: 'video' | 'audio') => {
    setHeaderMenuVisible(false);
    const granted = await requestCallPermissions(mode);
    if (!granted) return;

    await fetchIceServers();

    setCallDirection('outgoing');
    setCallType(mode);
    setCallStatus('calling');
    setCallModalVisible(true);
    // Enviar sinal de chamada para o outro usuário via socket
    socketRef.current?.emit('callUser', {
      to: id,
      from: user?.id,
      fromName: user?.name || user?.nickname,
      type: mode,
    });
    // Timeout de chamada não atendida
    setTimeout(() => {
      setCallStatus(prev => {
        if (prev === 'calling') {
          setCallModalVisible(false);
          Alert.alert('Chamada encerrada', `${name} não atendeu.`);
        }
        return prev;
      });
    }, 30000);
  };

  const handleAcceptCall = async () => {
    const granted = await requestCallPermissions(callType);
    if (!granted) {
      socketRef.current?.emit('hangUp', { to: id, from: user?.id });
      return;
    }
    await fetchIceServers();
    socketRef.current?.emit('callAccepted', { to: id, from: user?.id });
    setCallStatus('in-call');
  };

  const handleRejectCall = () => {
    socketRef.current?.emit('hangUp', { to: id, from: user?.id });
    setCallModalVisible(false);
    setCallStatus('ended');
  };

  const handleHangUp = () => {
    socketRef.current?.emit('hangUp', { to: id, from: user?.id });
    setCallModalVisible(false);
    setCallStatus('ended');
  };
  
  const handleBlockUser = async () => {
    setHeaderMenuVisible(false);
    Alert.alert('Bloquear', 'Impedir mensagens e ocultar atividades deste contato?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: async () => {
         try {
           await api.post('/block', { blockedUserId: id, reason: 'Manual' });
           Alert.alert('Sucesso', 'Usuário bloqueado.');
           router.back();
         } catch(e) { Alert.alert('Erro', 'Não foi possível bloquear.'); }
      }}
    ]);
  };

  const handleReportUser = async () => {
    setHeaderMenuVisible(false);
    Alert.alert('Denunciar', 'Acionar Tribunal Atos2 contra o usuário?', [
       { text: 'Cancelar', style: 'cancel' },
       { text: 'Denunciar Perfil', style: 'destructive', onPress: async () => {
         try {
           await api.post('/reports', { reportedUserId: id, reportType: 'HARASSMENT', description: 'Denúncia de chat' });
           Alert.alert('Denúncia Recebida', 'Equipe Atos2 avaliará esta conta.');
         } catch(e) { Alert.alert('Erro', 'Tente novamente depois.'); }
       }}
    ])
  };

  const handleDeleteMessage = async (messageId: string) => {
    setSelectedMessage(null);
    Alert.alert(
      'Apagar Mensagem',
      'Deseja realmente apagar esta mensagem para todos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteMessage(messageId);
              if (res.success) {
                // Remover localmente imediato
                setMessages(prev => prev.filter(m => m.id !== messageId));
              } else {
                Alert.alert('Erro', res.message || 'Não foi possível apagar a mensagem.');
              }
            } catch (err: any) {
              console.error('Erro ao apagar mensagem:', err);
              const errMsg = err.response?.data?.message || 'Não foi possível apagar a mensagem.';
              Alert.alert('Erro', errMsg);
            }
          }
        }
      ]
    );
  };

  // ─── SEND TEXT ───────────────────────────────────────────────────────────────
  const handleSendText = async () => {
    const textToSend = inputValue.trim();
    if (!textToSend || isSending) return;
    setInputValue('');
    setIsSending(true);

    // Adiciona mensagem localmente para feedback imediato (optimistic update)
    const tempId = 'temp_' + Date.now();
    const tempMsg: Message = {
      id: tempId,
      senderId: user?.id || '',
      content: textToSend,
      type: 'TEXT',
      status: 'SENT',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => {
      const out = [...prev, tempMsg];
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return out;
    });

    let scheduledIso: string | undefined;
    if (scheduleDateObj) {
       scheduledIso = scheduleDateObj.toISOString();
    }

    try {
      const result = await sendMessage({ recipientId: id as string, type: 'TEXT', content: textToSend, scheduledAt: scheduledIso });
      setScheduleDateObj(null);

      // Substitui a mensagem temp pela real da resposta REST (não depende do socket)
      const realMsg = result?.data ? normalizeMessage(result.data) : null;
      if (realMsg?.id && !realMsg.id.startsWith('temp_')) {
        setMessages(prev => {
          if (prev.some(m => m.id === realMsg.id)) return prev; // já existe (veio pelo socket)
          return prev.map(m => m.id === tempId ? realMsg : m);
        });
      }

      // Para mensagens agendadas (sem socket), recarregar após delay
      if (scheduledIso) {
        setTimeout(() => loadLiveMessages(false), 800);
      }
    } catch (err: any) {
      console.log('Error sending text', err);
      const errorMsg = err.response?.data?.message || 'Erro de conexão ou serviço indisponível.';
      Alert.alert('Não foi possível enviar', errorMsg);
      // Remove a mensagem temp para não enganar o usuário
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputValue(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  // ─── PICK IMAGE ───────────────────────────────────────────────────────────────
  const handlePickImage = async (fromCamera: boolean) => {
    setShowMediaMenu(false);
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert('Permissão negada', 'Precisamos de acesso para continuar.');
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsSending(true);
        try {
          await sendMessage({ recipientId: id as string, type: 'IMAGE', content: '' }, asset.uri);
          loadLiveMessages(true);
        } catch (err: any) {
          const errorMsg = err.response?.data?.message || 'Não foi possível enviar a imagem.';
          Alert.alert('Erro no Envio', errorMsg);
        } finally {
          setIsSending(false);
        }
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  };

  // ─── PICK VIDEO ───────────────────────────────────────────────────────────────
  const handlePickVideo = async () => {
    setShowMediaMenu(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão negada', 'Precisamos de acesso à galeria.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsSending(true);
        try {
          await sendMessage({ recipientId: id as string, type: 'VIDEO', content: '' }, asset.uri);
          loadLiveMessages(true);
        } catch (err: any) {
          const errorMsg = err.response?.data?.message || 'Não foi possível enviar o vídeo. Verifique o tamanho (máx. 50MB).';
          Alert.alert('Erro no Envio', errorMsg);
        } finally {
          setIsSending(false);
        }
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria de vídeos.');
    }
  };

  // ─── PICK FILE ────────────────────────────────────────────────────────────────
  const handlePickFile = async () => {
    setShowMediaMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || !result.assets[0]) return;

      const asset = result.assets[0];
      const fileName = asset.name || 'arquivo';
      const fileSize = asset.size || 0;

      // Formata o tamanho para exibir no content da mensagem
      const sizeLabel = fileSize < 1024
        ? `${fileSize} B`
        : fileSize < 1048576
        ? `${(fileSize / 1024).toFixed(1)} KB`
        : `${(fileSize / 1048576).toFixed(1)} MB`;

      setIsSending(true);
      try {
        await sendMessage(
          {
            recipientId: id as string,
            type: 'FILE',
            content: JSON.stringify({ fileName, fileSize, sizeLabel }),
          },
          asset.uri
        );
        loadLiveMessages(true);
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Não foi possível enviar o arquivo.';
        Alert.alert('Erro no Envio', errorMsg);
      } finally {
        setIsSending(false);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir o seletor de arquivos.');
    }
  };

  const handleSendLocation = async () => {
    setShowMediaMenu(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de permissão de localização para que você possa compartilhar onde está com seu contato.'
        );
        return;
      }

      setIsSending(true);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let addressStr = `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`;
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geocode && geocode.length > 0) {
          const item = geocode[0];
          const parts = [
            item.street,
            item.name,
            item.subregion,
            item.city,
            item.region,
          ].filter(Boolean);
          if (parts.length > 0) {
            addressStr = parts.join(', ');
          }
        }
      } catch (err) {
        console.warn('Erro ao obter geocode, enviando coordenadas:', err);
      }

      const locationPayload = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: addressStr,
      };

      await sendMessage({
        recipientId: id as string,
        type: 'LOCATION',
        content: JSON.stringify(locationPayload),
      });

      loadLiveMessages(true);
    } catch (e: any) {
      console.error('Erro ao compartilhar localização:', e);
      Alert.alert('Erro', 'Não foi possível obter a sua localização atual.');
    } finally {
      setIsSending(false);
    }
  };

  // ─── AUDIO RECORDING ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      // Pede permissão apenas ao pressionar o botão
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Aviso', 'Permissão de microfone necessária para enviar áudios.');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (e) {
      console.error('Erro ao iniciar gravação:', e);
      Alert.alert('Erro', 'Não foi possível iniciar o microfone. Verifique as permissões nas configurações do aparelho.');
    }
  };

  const stopRecordingAndSend = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setIsSending(true);
        await sendMessage({ recipientId: id as string, type: 'AUDIO', content: '' }, uri);
        loadLiveMessages(true);
      }
    } catch (e: any) {
      console.error('Erro ao processar gravação:', e);
      const errorMsg = e.response?.data?.message || 'Não foi possível enviar o áudio gravado.';
      Alert.alert('Falha no Envio', errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const playAudio = async (msgId: string, url: string) => {
    try {
      const cachedUrl = await getCachedMedia(url) || url;
      if (soundRef.current) {
        try { soundRef.current.remove(); } catch(_) {}
        if (playingAudioId === msgId) {
          setPlayingAudioId(null);
          soundRef.current = null;
          return;
        }
      }

      // Cria player de áudio compatível baixando para System FS
      const { createAudioPlayer } = await import('expo-audio');
      
      let finalUrl = cachedUrl;
      if (finalUrl.startsWith('http')) {
        if (typeof Paths !== 'undefined' && typeof File !== 'undefined') {
          try {
            const destinationFile = new File(Paths.cache, `playback_${msgId}.m4a`);
            const downloaded = await File.downloadFileAsync(finalUrl, destinationFile);
            finalUrl = downloaded.uri;
          } catch (err) {
            console.warn('[Chat] Failed to download audio for playback:', err);
          }
        }
      }
      
      const newPlayer = createAudioPlayer({ uri: finalUrl });
      soundRef.current = newPlayer;
      setPlayingAudioId(msgId);
      newPlayer.play();

      // Timeout fallback para parar indicador
      setTimeout(() => {
        if (playingAudioId === msgId) setPlayingAudioId(null);
      }, 30000);
    } catch(e) {
      console.warn('Erro ao tocar áudio:', e);
      Alert.alert('Erro', 'Formato de áudio não suportado no dispositivo.');
    }
  };

  // ─── RENDER MESSAGE ───────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const senderId = item.senderId || (item as any).sender_id;
    const isMe = senderId === user?.id;
    const isSelected = selectedMessage === item.id;
    const dateSrc = item.createdAt || (item as any).created_at;
    let formattedTime = '';
    if (dateSrc) {
      const d = new Date(dateSrc);
      formattedTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    const rawMediaUrl = item.mediaUrl || (item as any).media_url;
    const mediaUrl = rawMediaUrl
      ? (rawMediaUrl.startsWith('http') ? rawMediaUrl : `${SERVER_MEDIA_BASE}${rawMediaUrl}`)
      : null;
    const transContent = item.translatedContent || (item as any).translated_content;
    const transLanguage = item.translatedLanguage || (item as any).translated_language;

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
        {!isMe && (
          <View style={styles.messageAvatar}>
            {profileImage ? (
              <CachedImage url={profileImage as string} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : (
              <Text style={styles.messageAvatarText}>{(name as string)?.charAt(0) || 'U'}</Text>
            )}
          </View>
        )}

        <View style={styles.messageGroup}>
          <TouchableOpacity
            style={[
              styles.messageBubble,
              isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
              (item.type === 'IMAGE' || item.type === 'VIDEO') && styles.messageBubbleMedia,
            ]}
            activeOpacity={0.85}
            onLongPress={() => setSelectedMessage(isSelected ? null : item.id)}
            onPress={() => isSelected && setSelectedMessage(null)}
          >
            {/* IMAGE */}
            {item.type === 'IMAGE' && mediaUrl && (
              <TouchableOpacity onPress={async () => {
                 const cached = await getCachedMedia(mediaUrl);
                 setFullscreenImage(cached);
              }} activeOpacity={0.9}>
                <CachedImage url={mediaUrl} style={styles.mediaImage} resizeMode="cover" />
              </TouchableOpacity>
            )}

            {/* VIDEO */}
            {item.type === 'VIDEO' && mediaUrl && (
              <TouchableOpacity
                onPress={async () => {
                  const cached = await getCachedMedia(mediaUrl);
                  setFullscreenVideo(cached);
                }}
                activeOpacity={0.9}
                style={{ position: 'relative', width: 220, height: 160, borderRadius: 12, overflow: 'hidden' }}
              >
                <ChatVideoPlayer url={mediaUrl} />
                <View style={[StyleSheet.absoluteFillObject, {
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                }]}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Feather name="play" size={22} color="#fff" style={{ marginLeft: 3 }} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* AUDIO */}
            {item.type === 'AUDIO' && (
              <TouchableOpacity
                style={styles.audioBubble}
                onPress={() => playAudio(item.id, rawMediaUrl || '')}
              >
                <View style={[styles.audioIconCircle, playingAudioId === item.id && styles.audioIconCirclePlaying]}>
                  <Feather name={playingAudioId === item.id ? 'pause' : 'play'} size={18} color="#fff" />
                </View>
                <View style={styles.audioWaveform}>
                  {[4, 7, 12, 9, 14, 8, 5, 11, 7, 4, 9, 6].map((h, i) => (
                    <View
                      key={i}
                      style={[styles.audioBar, { height: h * 2, backgroundColor: isMe ? 'rgba(255,255,255,0.7)' : Colors.primary }]}
                    />
                  ))}
                </View>
                <Text style={[styles.audioLabel, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                  {item.content && item.content !== '[Áudio]' ? item.content : 'Áudio'}
                </Text>
              </TouchableOpacity>
            )}

            {/* FILE */}
            {item.type === 'FILE' && (() => {
              let fileData: any = null;
              try { fileData = JSON.parse(item.content); } catch (_) {}
              const fName = fileData?.fileName || item.content || 'Arquivo';
              const fSize = fileData?.sizeLabel || '';
              const ext = fName.split('.').pop()?.toLowerCase() || '';

              const iconMap: Record<string, string> = {
                pdf: 'book-open', doc: 'file-text', docx: 'file-text',
                xls: 'grid', xlsx: 'grid', ppt: 'monitor', pptx: 'monitor',
                txt: 'align-left', csv: 'grid', zip: 'archive', rar: 'archive',
              };
              const colorMap: Record<string, string> = {
                pdf: '#ef4444', doc: '#3b82f6', docx: '#3b82f6',
                xls: '#22c55e', xlsx: '#22c55e', ppt: '#f97316', pptx: '#f97316',
                txt: '#6b7280', csv: '#22c55e', zip: '#8b5cf6', rar: '#8b5cf6',
              };
              const iconName = iconMap[ext] || 'file';
              const iconColor = colorMap[ext] || '#6366f1';

              return (
                <TouchableOpacity
                  onPress={() => {
                    if (mediaUrl) {
                      Linking.openURL(mediaUrl).catch(() =>
                        Alert.alert('Erro', 'Não foi possível abrir o arquivo.')
                      );
                    }
                  }}
                  activeOpacity={0.8}
                  style={{
                    width: 230,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 12,
                      backgroundColor: iconColor + '20',
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <Feather name={iconName as any} size={22} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[{ fontSize: 13, fontWeight: '600' }, isMe ? styles.messageTextMe : styles.messageTextOther]}
                        numberOfLines={2}
                      >
                        {fName}
                      </Text>
                      {fSize ? (
                        <Text style={[{ fontSize: 11, marginTop: 2 }, isMe ? { color: 'rgba(255,255,255,0.6)' } : { color: Colors.light.textMuted }]}>
                          {fSize}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={[{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 6, borderTopWidth: 1,
                  }, isMe ? { borderTopColor: 'rgba(255,255,255,0.2)' } : { borderTopColor: Colors.light.border }]}>
                    <Text style={[{ fontSize: 13, fontWeight: '600' }, isMe ? { color: '#fff' } : { color: Colors.primary }]}>
                      Abrir Arquivo
                    </Text>
                    <Feather name="download" size={16} color={isMe ? 'rgba(255,255,255,0.8)' : Colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* TEXT */}
            {(item.type === 'TEXT' || (!item.type && item.content)) && (
              <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                {item.content}
              </Text>
            )}

            {/* LOCATION */}
            {item.type === 'LOCATION' && (() => {
              let locData = null;
              try {
                locData = JSON.parse(item.content);
              } catch (_) {}

              return (
                <TouchableOpacity
                  onPress={() => {
                    if (locData && locData.latitude && locData.longitude) {
                      const url = `https://www.google.com/maps/search/?api=1&query=${locData.latitude},${locData.longitude}`;
                      Linking.openURL(url).catch((err) => console.error('Erro ao abrir mapa', err));
                    }
                  }}
                  style={styles.locationContainer}
                  activeOpacity={0.8}
                >
                  <View style={styles.locationHeader}>
                    <View style={[styles.locationIconCircle, isMe ? styles.locationIconCircleMe : styles.locationIconCircleOther]}>
                      <Feather name="map-pin" size={20} color="#fff" />
                    </View>
                    <View style={styles.locationTextContainer}>
                      <Text style={[styles.locationTitle, isMe ? styles.locationTextMe : styles.locationTextOther]}>
                        Localização
                      </Text>
                      <Text style={[styles.locationAddress, isMe ? styles.locationSubtextMe : styles.locationSubtextOther]} numberOfLines={2}>
                        {locData ? locData.address : 'Ver no mapa'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.locationActionLine, isMe ? styles.locationActionLineMe : styles.locationActionLineOther]}>
                    <Text style={[styles.locationActionText, isMe ? styles.locationActionTextMe : styles.locationActionTextOther]}>
                      Visualizar no Mapa
                    </Text>
                    <Feather name="chevron-right" size={16} color={isMe ? 'rgba(255,255,255,0.8)' : Colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* Caption para imagem/vídeo */}
            {(item.type === 'IMAGE' || item.type === 'VIDEO') && item.content && (
              <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther, { marginTop: 4 }]}>
                {item.content}
              </Text>
            )}

            {/* Tradução */}
            {transContent && (
              <View style={[styles.translationBox, isMe ? styles.translationBoxMe : styles.translationBoxOther]}>
                <Text style={[styles.translationLabel, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                  Tradução ({transLanguage}):
                </Text>
                <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                  {transContent}
                </Text>
              </View>
            )}

            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeOther]}>
                {formattedTime}
              </Text>
              {isMe && (
                <Text style={styles.messageStatus}>
                  {item.status === 'SENT' && <Feather name="check" size={10} color="rgba(255,255,255,0.9)" />}
                  {item.status === 'DELIVERED' && <Feather name="check-circle" size={10} color="rgba(255,255,255,0.9)" />}
                  {item.status === 'READ' && <Feather name="check-circle" size={10} color={Colors.accent} />}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {isSelected && (
            <View style={[styles.actionPopover, isMe ? styles.actionPopoverMe : styles.actionPopoverOther]}>
              {/* Traduzir manualmente — aparece quando não há tradução automática */}
              {(item.type === 'TEXT' || item.type === 'AUDIO') && !transContent && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={async () => {
                    try {
                      const r = await api.post('/messages/translate', {
                        messageId: item.id,
                        targetLanguage: user?.preferredLanguage || 'pt-BR',
                      });
                      const tContent = r.data?.data?.translated_content;
                      const tLang = r.data?.data?.translated_language;
                      if (tContent) {
                        setMessages(prev =>
                          prev.map(m =>
                            m.id === item.id
                              ? { ...m, translatedContent: tContent, translatedLanguage: tLang }
                              : m
                          )
                        );
                      }
                    } catch {
                      Alert.alert('Tradução', 'Não foi possível traduzir a mensagem.');
                    }
                    setSelectedMessage(null);
                  }}
                >
                  <Feather name="globe" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
              {/* Exibir/ocultar tradução existente */}
              {transContent && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedMessage(null)}>
                  <Feather name="globe" size={16} color={Colors.light.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtn}><Feather name="smile" size={16} color={Colors.light.text} /></TouchableOpacity>
              {isMe && <TouchableOpacity style={styles.actionBtn}><Feather name="edit-2" size={16} color={Colors.light.text} /></TouchableOpacity>}
              {isMe && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteMessage(item.id)}>
                  <Feather name="trash-2" size={16} color={Colors.error} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtn}><Feather name="flag" size={16} color={Colors.light.text} /></TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Contact Profile Image in Header */}
        <View style={styles.headerAvatarContainer}>
          {profileImage ? (
            <CachedImage url={profileImage as string} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarText}>{(name as string)?.charAt(0) || '?'}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
          <Text style={[styles.headerStatus, status === 'online' && styles.headerStatusOnline]}>
            {status === 'online' ? '● Online' : 'Offline'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => handleStartCall('audio')}><Feather name="phone" size={20} color="#00F2FE" /></TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => handleStartCall('video')}><Feather name="video" size={20} color="#00F2FE" /></TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setHeaderMenuVisible(true)}>
             <Feather name="more-vertical" size={20} color="#00F2FE" />
          </TouchableOpacity>
        </View>

        {headerMenuVisible && (
          <Modal transparent visible animationType="fade" onRequestClose={() => setHeaderMenuVisible(false)}>
            <Pressable style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.1)'}} onPress={() => setHeaderMenuVisible(false)}>
              <View style={{position: 'absolute', top: 60, right: 10, backgroundColor: '#0B2039', borderRadius: 10, elevation: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.18, shadowRadius: 8, width: 210, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)'}}>

                {/* Vitrine do Usuário */}
                <TouchableOpacity
                  style={{padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)', flexDirection: 'row', alignItems: 'center', gap: 10}}
                  onPress={() => {
                    setHeaderMenuVisible(false);
                    router.push({
                      pathname: '/(tabs)/products',
                      params: { sellerId: id as string, sellerName: name as string },
                    });
                  }}
                >
                  <Feather name="shopping-bag" size={16} color="#00F2FE" />
                  <Text style={{color: '#00F2FE', fontWeight: '700', fontSize: 14}}>Vitrine do Usuário</Text>
                </TouchableOpacity>

                {/* Bloquear */}
                <TouchableOpacity
                  style={{padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)', flexDirection: 'row', alignItems: 'center', gap: 10}}
                  onPress={handleBlockUser}
                >
                  <Feather name="slash" size={16} color={Colors.error} />
                  <Text style={{color: Colors.error, fontWeight: 'bold', fontSize: 14}}>Bloquear Usuário</Text>
                </TouchableOpacity>

                {/* Denunciar */}
                <TouchableOpacity
                  style={{padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10}}
                  onPress={handleReportUser}
                >
                  <Feather name="alert-triangle" size={16} color={Colors.error} />
                  <Text style={{color: Colors.error, fontWeight: 'bold', fontSize: 14}}>Denunciar Usuário</Text>
                </TouchableOpacity>

              </View>
            </Pressable>
          </Modal>
        )}
      </View>

      {/* Fullscreen Image Modal */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade">
        <Pressable style={styles.fullscreenModal} onPress={() => setFullscreenImage(null)}>
          {fullscreenImage && (
            <Image source={{ uri: fullscreenImage }} style={styles.fullscreenImage} resizeMode="contain" />
          )}
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenImage(null)}>
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* Fullscreen Video Modal */}
      <Modal visible={!!fullscreenVideo} transparent animationType="fade" onRequestClose={() => setFullscreenVideo(null)}>
        <View style={styles.fullscreenModal}>
          {fullscreenVideo && (
            <ActualFullscreenVideoPlayer videoUrl={fullscreenVideo} />
          )}
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenVideo(null)}>
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Media Menu Bottom Sheet */}
      <Modal visible={showMediaMenu} transparent animationType="slide">
        <Pressable style={styles.mediaMenuOverlay} onPress={() => setShowMediaMenu(false)}>
          <View style={styles.mediaMenuSheet}>
            <Text style={styles.mediaMenuTitle}>Enviar mídia</Text>
            <View style={styles.mediaMenuGrid}>
              <TouchableOpacity style={styles.mediaMenuOption} onPress={() => handlePickImage(false)}>
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#6366f1' }]}>
                  <Feather name="image" size={20} color="#fff" />
                </View>
                <Text style={styles.mediaMenuLabel}>Galeria</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaMenuOption} onPress={() => handlePickImage(true)}>
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#10b981' }]}>
                  <Feather name="camera" size={20} color="#fff" />
                </View>
                <Text style={styles.mediaMenuLabel}>Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaMenuOption} onPress={handlePickVideo}>
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#f59e0b' }]}>
                  <Feather name="film" size={20} color="#fff" />
                </View>
                <Text style={styles.mediaMenuLabel}>Vídeo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaMenuOption} onPress={handleSendLocation}>
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#3b82f6' }]}>
                  <Feather name="map-pin" size={20} color="#fff" />
                </View>
                <Text style={styles.mediaMenuLabel}>Localização</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaMenuOption} onPress={handlePickFile}>
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#8b5cf6' }]}>
                  <Feather name="file-text" size={20} color="#fff" />
                </View>
                <Text style={styles.mediaMenuLabel}>Arquivo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputAction} onPress={() => setShowMediaMenu(true)}>
            <Feather name="paperclip" size={24} color={showMediaMenu ? Colors.primary : Colors.light.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.inputAction} onPress={() => setScheduleModalVisible(true)}>
            <Feather name="clock" size={24} color={(scheduleDateObj) ? Colors.secondaryDark : Colors.light.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={Colors.light.textMuted}
            multiline
          />

          {isSending ? (
            <View style={styles.sendButton}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : inputValue.trim() ? (
            <TouchableOpacity style={styles.sendButton} onPress={handleSendText}>
              <Feather name="send" size={20} color="#fff" style={{ marginLeft: -2, marginTop: 2 }} />
            </TouchableOpacity>
          ) : (
            <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
              <TouchableOpacity
                style={[styles.sendButton, isRecording && styles.sendButtonRecording]}
                onPress={isRecording ? stopRecordingAndSend : startRecording}
              >
                <Feather name="mic" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {isRecording && (
          <View style={styles.recordingBanner}>
            <Feather name="mic" size={14} color="#ef4444" />
            <Text style={styles.recordingBannerText}>Gravando... Toque para enviar</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modal Nativo de Chamada */}
      <Modal visible={callModalVisible} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.callModal}>
          {callStatus === 'in-call' ? (
            <View style={{ width: '100%', height: '100%', flex: 1 }}>
              <WebView
                ref={webViewRef}
                style={{ flex: 1 }}
                source={{ html: getWebRtcHtml() }}
                originWhitelist={['*']}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                domStorageEnabled
                javaScriptEnabled
                {...({ onPermissionRequest: (request: any) => request.grant(request.resources) } as any)}
                injectedJavaScriptBeforeContentLoaded={`
                  window.webRtcConfig = {
                    iceServers: ${JSON.stringify(iceServers)},
                    isCaller: ${callDirection === 'outgoing'},
                    callType: '${callType}',
                    targetName: '${(callDirection === 'incoming' ? callerName : name) || 'Usuário'}',
                    userId: '${user?.id || 'temp_user'}',
                    targetId: '${id || ''}'
                  };
                  true;
                `}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'signal') {
                      // Send signaling message to peer via sockets
                      socketRef.current?.emit('webrtcSignal', {
                        to: id,
                        signal: data.signal
                      });
                    } else if (data.type === 'hangup') {
                      // User clicked hang up in WebView
                      handleHangUp();
                    } else if (data.type === 'log') {
                      console.log('[WebView Log]', data.message);
                    }
                  } catch (e) {
                    console.error('Error parsing message from WebView:', e);
                  }
                }}
              />
            </View>
          ) : (
            <>
              {/* Avatar */}
              <View style={styles.callAvatar}>
                {profileImage ? (
                  <CachedImage url={profileImage as string} style={{ width: 112, height: 112, borderRadius: 56 }} />
                ) : (
                  <Text style={styles.callAvatarText}>
                    {callDirection === 'incoming'
                      ? callerName?.charAt(0)?.toUpperCase() || '?'
                      : (name as string)?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                )}
              </View>
              <Text style={styles.callName}>
                {callDirection === 'incoming' ? callerName : name}
              </Text>
              <Text style={styles.callStatus}>
                {callStatus === 'calling'
                  ? callDirection === 'incoming'
                    ? (callType === 'video' ? '📹 Chamada de vídeo recebida' : '📞 Chamada recebida')
                    : (callType === 'video' ? '📹 Chamada de vídeo...' : '📞 Ligando...')
                  : 'Chamada encerrada'}
              </Text>

              {/* Botões de controle */}
              {callDirection === 'incoming' && callStatus === 'calling' ? (
                // Chamada de entrada: Atender e Rejeitar
                <View style={styles.callControls}>
                  <TouchableOpacity style={[styles.callBtnMute, { backgroundColor: '#22c55e' }]} onPress={handleAcceptCall}>
                    <Feather name="phone" size={28} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.callBtnHangup} onPress={handleRejectCall}>
                    <Feather name="phone-off" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                // Chamada de saída ou em andamento
                <View style={styles.callControls}>
                  <TouchableOpacity style={styles.callBtnMute}>
                    <Feather name="mic-off" size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.callBtnHangup} onPress={handleHangUp}>
                    <Feather name="phone-off" size={28} color="#fff" />
                  </TouchableOpacity>
                  {callType === 'video' && (
                    <TouchableOpacity style={styles.callBtnMute}>
                      <Feather name="camera-off" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Schedule Message Modal */}
      <Modal visible={scheduleModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mediaMenuOverlay}>
          <View style={styles.mediaMenuSheet}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
               <Feather name="clock" size={24} color={Colors.primary} style={{marginRight: 12}} />
               <Text style={styles.mediaMenuTitle}>Agendar Mensagem</Text>
            </View>
            <Text style={{color: Colors.light.textMuted, marginBottom: 16}}>
               A próxima mensagem que você enviar neste cofre sairá exatamente no horário configurado.
            </Text>

            <TouchableOpacity style={{backgroundColor: Colors.light.surfaceLight, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: Colors.light.border, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between'}} onPress={() => setShowDatePicker(true)}>
               <Text style={{color: scheduleDateObj ? Colors.light.text : Colors.light.textMuted}}>
                  {scheduleDateObj ? scheduleDateObj.toLocaleDateString() : 'Escolher Data...'}
               </Text>
               <Feather name="calendar" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={{backgroundColor: Colors.light.surfaceLight, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: Colors.light.border, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between'}} onPress={() => setShowTimePicker(true)}>
               <Text style={{color: scheduleDateObj ? Colors.light.text : Colors.light.textMuted}}>
                  {scheduleDateObj ? scheduleDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Escolher Horário...'}
               </Text>
               <Feather name="clock" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
            
            {(showDatePicker || showTimePicker) && (
               <DateTimePicker
                 value={scheduleDateObj || new Date()}
                 mode={showDatePicker ? 'date' : 'time'}
                 is24Hour={true}
                 onChange={(event: any, date?: Date) => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                    if (date) setScheduleDateObj(date);
                 }}
               />
            )}

            <View style={{flexDirection: 'row', gap: 12}}>
               <TouchableOpacity style={{flex: 1, padding: 16, borderRadius: 8, backgroundColor: Colors.light.surfaceLight, alignItems: 'center', borderWidth: 1, borderColor: Colors.light.border}} onPress={() => { setScheduleDateObj(null); setScheduleModalVisible(false); }}>
                  <Text style={{color: Colors.error, fontWeight: 'bold'}}>Remover</Text>
               </TouchableOpacity>

               <TouchableOpacity style={{flex: 1, padding: 16, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center'}} onPress={() => {
                  if(!scheduleDateObj) return Alert.alert('Atenção', 'Preencha Data e Hora');
                  setScheduleModalVisible(false);
               }}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Confirmar</Text>
               </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, backgroundColor: '#060814',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: { padding: Spacing.sm, marginRight: Spacing.xs },
  headerAvatarContainer: {
    marginRight: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  headerInfo: { flex: 1 },
  headerName: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  headerStatus: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  headerStatusOnline: { color: Colors.success },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerActionBtn: { padding: Spacing.sm },

  chatArea: { flex: 1 },
  messageList: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg },

  messageWrapper: { flexDirection: 'row', marginBottom: Spacing.sm },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  messageGroup: { maxWidth: '80%' },

  messageAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.secondary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.sm, alignSelf: 'flex-end',
  },
  messageAvatarText: { color: '#fff', fontSize: FontSize.sm, fontWeight: 'bold' },

  messageBubble: { padding: Spacing.md, borderRadius: BorderRadius.lg },
  messageBubbleMedia: { padding: 4, overflow: 'hidden' },
  messageBubbleMe: { backgroundColor: '#00F2FE', borderBottomRightRadius: 4 },
  messageBubbleOther: {
    backgroundColor: Colors.dark.surface, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.dark.border,
  },

  // Location card styling
  locationContainer: {
    width: 220,
    gap: Spacing.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconCircleMe: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  locationIconCircleOther: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  locationTextContainer: {
    flex: 1,
    gap: 2,
  },
  locationTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  locationAddress: {
    fontSize: FontSize.xs,
  },
  locationTextMe: {
    color: '#000',
  },
  locationTextOther: {
    color: '#fff',
  },
  locationSubtextMe: {
    color: 'rgba(0,0,0,0.6)',
  },
  locationSubtextOther: {
    color: Colors.dark.textSecondary,
  },
  locationActionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  locationActionLineMe: {
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  locationActionLineOther: {
    borderTopColor: Colors.dark.border,
  },
  locationActionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  locationActionTextMe: {
    color: '#000',
  },
  locationActionTextOther: {
    color: '#00F2FE',
  },

  // Media
  mediaImage: { width: 220, height: 180, borderRadius: BorderRadius.md },
  mediaVideo: { width: 220, height: 160, borderRadius: BorderRadius.md },

  // Audio
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 4 },
  audioIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0, 242, 254, 0.25)', justifyContent: 'center', alignItems: 'center',
  },
  audioIconCirclePlaying: { backgroundColor: Colors.accent },
  audioWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 },
  audioBar: { width: 3, borderRadius: 2 },
  audioLabel: { fontSize: FontSize.xs, maxWidth: 80 },

  messageText: { fontSize: FontSize.md, lineHeight: 22 },
  messageTextMe: { color: '#000000' },
  messageTextOther: { color: '#ffffff' },

  translationBox: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1 },
  translationBoxMe: { borderTopColor: 'rgba(0,0,0,0.1)' },
  translationBoxOther: { borderTopColor: Colors.dark.border },
  translationLabel: { fontSize: FontSize.xs, opacity: 0.8, marginBottom: 2, fontWeight: '600' },

  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
  messageTime: { fontSize: 10 },
  messageTimeMe: { color: 'rgba(0,0,0,0.5)' },
  messageTimeOther: { color: Colors.dark.textMuted },
  messageStatus: { color: 'rgba(0,0,0,0.6)', fontSize: 10, fontWeight: 'bold' },

  actionPopover: {
    flexDirection: 'row', backgroundColor: '#0B2039',
    padding: Spacing.xs, borderRadius: BorderRadius.full,
    marginTop: 4, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: Colors.dark.border,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  actionPopoverMe: { alignSelf: 'flex-end' },
  actionPopoverOther: {},
  actionBtn: { padding: Spacing.sm },

  // Input bar
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    backgroundColor: '#060814',
    borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', gap: Spacing.sm,
  },
  inputAction: { padding: Spacing.sm, paddingBottom: 10 },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingTop: 12, paddingBottom: 12,
    color: '#fff', fontSize: FontSize.md,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#00F2FE',
    justifyContent: 'center', alignItems: 'center',
  },
  sendButtonRecording: { backgroundColor: '#ef4444' },

  recordingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1f0000', paddingVertical: 6, paddingHorizontal: 16,
  },
  recordingBannerText: { color: '#ef4444', fontSize: FontSize.sm, fontWeight: '600' },

  // Fullscreen image
  fullscreenModal: {
    flex: 1, backgroundColor: 'rgba(6,8,20,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullscreenImage: { width: '100%', height: '85%' },
  fullscreenClose: {
    position: 'absolute', top: 50, right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20, padding: 8,
  },

  // Media Menu Sheet
  mediaMenuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6,8,20,0.7)' },
  mediaMenuSheet: {
    backgroundColor: '#0B2039',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.xl, paddingBottom: 40,
    borderWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  mediaMenuTitle: {
    color: '#fff', fontSize: FontSize.lg, fontWeight: '700',
    marginBottom: Spacing.xl, textAlign: 'center',
  },
  mediaMenuGrid: { flexDirection: 'row', justifyContent: 'space-around', gap: Spacing.sm, flexWrap: 'wrap' },
  mediaMenuOption: { alignItems: 'center', gap: 6, minWidth: 60 },
  mediaMenuIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mediaMenuLabel: { color: Colors.dark.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Native call modal
  callModal: {
    flex: 1, backgroundColor: '#060814',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  callAvatar: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  callAvatarText: { color: '#fff', fontSize: 52, fontWeight: '800' },
  callName: { color: '#fff', fontSize: 28, fontWeight: '700' },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 16, letterSpacing: 0.5 },
  callControls: {
    flexDirection: 'row', gap: 32, marginTop: 40,
    alignItems: 'center',
  },
  callBtnMute: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  callBtnHangup: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center', alignItems: 'center',
  },
});
