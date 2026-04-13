import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, Image, Modal, Alert, ActivityIndicator,
  Animated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { useAudioPlayer, useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { io, Socket } from 'socket.io-client';
import { WebView } from 'react-native-webview';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';

import { getConversation, sendMessage } from '../../services/chat';
import api, { SERVER_URL } from '../../services/api';

// Base da URL do servidor (sem /api) para exibir arquivos de mídia e sockets
const SERVER_MEDIA_BASE = SERVER_URL;

import { getCachedMedia } from '../../services/MediaCacheService';
import CachedImage from '../../components/CachedImage';

interface Message {
  id: string;
  senderId: string;
  content: string;
  translatedContent?: string;
  translatedLanguage?: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO';
  status: 'SENT' | 'DELIVERED' | 'READ';
  mediaUrl?: string;
  media_url?: string;
  createdAt: string;
}

export default function ChatRoomScreen() {
  const { id, name, status } = useLocalSearchParams();
  const { user } = useAuth();

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Call / VoIP Modal & Moderation
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [videoCallMode, setVideoCallMode] = useState<'video' | 'audio' | null>(null);

  // Schedule Message
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduleDateObj, setScheduleDateObj] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Áudio
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const soundRef = useRef<any | null>(null);

  // Som nativo de RUASH
  const ruashPlayer = useAudioPlayer(require('../../assets/sounds/ruash.wav'));
  const prevMessagesLength = useRef(0);

  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  const loadLiveMessages = useCallback(async (forceScroll = false) => {
    try {
      const data = await getConversation(id as string, 50, 0);
      const newMessages = data.data || [];
      setMessages(prev => {
        if (forceScroll || prev.length !== newMessages.length) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300);
        }
        return newMessages;
      });
    } catch (err) {
      console.log('Error loading messages', err);
    }
  }, [id]);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    loadLiveMessages(true);
    
    // Conecta ao Socket.io nativo
    const socket = io(SERVER_MEDIA_BASE, {
      transports: ['websocket'],
      query: { userId: user?.id }
    });
    
    socketRef.current = socket;

    socket.on('newMessage', (newMsg: Message) => {
      // Adiciona mensagem instantânea em milissegundos
      setMessages(prev => {
        const out = [...prev, newMsg];
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        return out;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [loadLiveMessages, user?.id, id]);

  // ─── LIGAÇÕES (WEBVIEW WEBRTC) E MODERAÇÃO ────────────────────────────────
  const handleStartCall = (mode: 'video' | 'audio') => {
    setHeaderMenuVisible(false);
    setVideoCallMode(mode);
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

  // ─── SEND TEXT ───────────────────────────────────────────────────────────────
  const handleSendText = async () => {
    const textToSend = inputValue.trim();
    if (!textToSend || isSending) return;
    setInputValue('');
    setIsSending(true);

    let scheduledIso: string | undefined;
    if (scheduleDateObj) {
       scheduledIso = scheduleDateObj.toISOString();
    }

    try {
      await sendMessage({ recipientId: id as string, type: 'TEXT', content: textToSend, scheduledAt: scheduledIso });
      setScheduleDateObj(null);
      loadLiveMessages(true);
    } catch (err) {
      console.log('Error sending text', err);
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
          Alert.alert('Erro', 'Não foi possível enviar a imagem.');
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
          Alert.alert('Erro', 'Não foi possível enviar o vídeo. Verifique o tamanho (máx. 50MB).');
        } finally {
          setIsSending(false);
        }
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria de vídeos.');
    }
  };

  // ─── AUDIO RECORDING ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Aviso', 'Permissão de microfone necessária.');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível iniciar o microfone.');
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
    } catch (e) {
      console.error(e);
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
        const fileUri = FileSystem.cacheDirectory + 'playback_' + msgId + '.m4a';
        await FileSystem.downloadAsync(finalUrl, fileUri);
        finalUrl = fileUri;
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
            <Text style={styles.messageAvatarText}>{(name as string)?.charAt(0) || 'U'}</Text>
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
              <View style={styles.mediaVideo}>
                 <Text style={{color: 'white', textAlign: 'center', marginTop: 50}}>Vídeo (Temporariamente Indisponível)</Text>
              </View>
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

            {/* TEXT */}
            {(item.type === 'TEXT' || (!item.type && item.content)) && (
              <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                {item.content}
              </Text>
            )}

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
              {transContent && (
                <TouchableOpacity style={styles.actionBtn}>
                  <Feather name="globe" size={16} color={Colors.light.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtn}><Feather name="smile" size={16} color={Colors.light.text} /></TouchableOpacity>
              {isMe && <TouchableOpacity style={styles.actionBtn}><Feather name="edit-2" size={16} color={Colors.light.text} /></TouchableOpacity>}
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
          <Feather name="arrow-left" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
          <Text style={[styles.headerStatus, status === 'online' && styles.headerStatusOnline]}>
            {status === 'online' ? '● Online' : 'Offline'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => handleStartCall('audio')}><Feather name="phone" size={20} color={Colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => handleStartCall('video')}><Feather name="video" size={20} color={Colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setHeaderMenuVisible(true)}>
             <Feather name="more-vertical" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {headerMenuVisible && (
          <Modal transparent visible animationType="fade" onRequestClose={() => setHeaderMenuVisible(false)}>
             <Pressable style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.1)'}} onPress={() => setHeaderMenuVisible(false)}>
                 <View style={{position: 'absolute', top: 60, right: 10, backgroundColor: Colors.light.surface, borderRadius: 8, elevation: 4, width: 180, overflow: 'hidden'}}>
                     <TouchableOpacity style={{padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border}} onPress={handleBlockUser}>
                         <Text style={{color: Colors.error, fontWeight: 'bold'}}>Bloquear Usuário</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={{padding: 16}} onPress={handleReportUser}>
                         <Text style={{color: Colors.error, fontWeight: 'bold'}}>Denunciar Usuário</Text>
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

      {/* Media Menu Bottom Sheet */}
      <Modal visible={showMediaMenu} transparent animationType="slide">
        <Pressable style={styles.mediaMenuOverlay} onPress={() => setShowMediaMenu(false)}>
          <View style={styles.mediaMenuSheet}>
            <Text style={styles.mediaMenuTitle}>Enviar mídia</Text>
            <View style={styles.mediaMenuGrid}>
              <TouchableOpacity style={styles.mediaMenuOption} onPress={() => handlePickImage(false)}>
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#6366f1' }]}>
                  <Feather name="image" size={26} color="#fff" />
                </View>
                <Text style={styles.mediaMenuLabel}>Galeria</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaMenuOption} onPress={() => handlePickImage(true)}>
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#10b981' }]}>
                  <Feather name="camera" size={26} color="#fff" />
                </View>
                <Text style={styles.mediaMenuLabel}>Câmera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaMenuOption} onPress={handlePickVideo}>
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#f59e0b' }]}>
                  <Feather name="film" size={26} color="#fff" />
                </View>
                <Text style={styles.mediaMenuLabel}>Vídeo</Text>
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

      {/* WebView Call Screen (Jitsi) */}
      <Modal visible={!!videoCallMode} animationType="slide" transparent>
        <SafeAreaView style={{flex: 1, backgroundColor: '#000'}}>
          <View style={{height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#111'}}>
             <Text style={{color: '#fff', fontWeight: 'bold'}}>Chamada Segura (Atos2)</Text>
             <TouchableOpacity onPress={() => setVideoCallMode(null)}>
                <Feather name="x" size={24} color={Colors.error} />
             </TouchableOpacity>
          </View>
          {!!videoCallMode && (
             <WebView
               source={{ uri: `https://meet.jit.si/Atos2Call_${id}?config.startWithVideoMuted=${videoCallMode==='audio'}` }}
               allowsInlineMediaPlayback={true}
               mediaPlaybackRequiresUserAction={false}
               style={{flex: 1}}
               javaScriptEnabled={true}
               domStorageEnabled={true}
             />
          )}
        </SafeAreaView>
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
  container: { flex: 1, backgroundColor: Colors.light.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, backgroundColor: Colors.light.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  backButton: { padding: Spacing.sm, marginRight: Spacing.xs },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.light.text, fontSize: FontSize.lg, fontWeight: '700' },
  headerStatus: { color: Colors.light.textMuted, fontSize: FontSize.xs, marginTop: 2 },
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
  messageBubbleMe: { backgroundColor: '#0ea5e9', borderBottomRightRadius: 4 },
  messageBubbleOther: {
    backgroundColor: '#ffffff', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
  },

  // Media
  mediaImage: { width: 220, height: 180, borderRadius: BorderRadius.md },
  mediaVideo: { width: 220, height: 160, borderRadius: BorderRadius.md },

  // Audio
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 4 },
  audioIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  audioIconCirclePlaying: { backgroundColor: Colors.accent },
  audioWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 },
  audioBar: { width: 3, borderRadius: 2 },
  audioLabel: { fontSize: FontSize.xs, maxWidth: 80 },

  messageText: { fontSize: FontSize.md, lineHeight: 22 },
  messageTextMe: { color: '#ffffff' },
  messageTextOther: { color: '#1e293b' },

  translationBox: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1 },
  translationBoxMe: { borderTopColor: 'rgba(255,255,255,0.2)' },
  translationBoxOther: { borderTopColor: Colors.light.border },
  translationLabel: { fontSize: FontSize.xs, opacity: 0.8, marginBottom: 2, fontWeight: '600' },

  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
  messageTime: { fontSize: 10 },
  messageTimeMe: { color: 'rgba(255,255,255,0.7)' },
  messageTimeOther: { color: Colors.light.textMuted },
  messageStatus: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 'bold' },

  actionPopover: {
    flexDirection: 'row', backgroundColor: Colors.light.surface,
    padding: Spacing.xs, borderRadius: BorderRadius.full,
    marginTop: 4, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: Colors.light.border,
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
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1, borderTopColor: Colors.light.border, gap: Spacing.sm,
  },
  inputAction: { padding: Spacing.sm, paddingBottom: 10 },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingTop: 12, paddingBottom: 12,
    color: Colors.light.text, fontSize: FontSize.md,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullscreenImage: { width: '100%', height: '85%' },
  fullscreenClose: {
    position: 'absolute', top: 50, right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20, padding: 8,
  },

  // Media Menu Sheet
  mediaMenuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  mediaMenuSheet: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: Spacing.xl, paddingBottom: 40,
  },
  mediaMenuTitle: {
    color: Colors.light.text, fontSize: FontSize.lg, fontWeight: '700',
    marginBottom: Spacing.xl, textAlign: 'center',
  },
  mediaMenuGrid: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl },
  mediaMenuOption: { alignItems: 'center', gap: Spacing.sm },
  mediaMenuIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  mediaMenuLabel: { color: Colors.light.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
});
