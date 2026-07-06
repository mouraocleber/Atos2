import React, { useState, useEffect, useCallback, Component, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView,
  Platform, ScrollView, Image, Dimensions, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import api, { SERVER_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import CoachMark from '../../components/CoachMark';
import CachedImage from '../../components/CachedImage';
import * as ImagePicker from 'expo-image-picker';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_PRODUCT_IMAGES = 3;

// ─── Tipagens ─────────────────────────────────────────────────────────────────
interface ProductUser {
  id: string;
  name: string;
  email?: string;
}

interface Product {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  price: number | string;
  category?: string | null;
  quantity?: number;
  stock?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  // imagem principal (legado)
  imageUrl?: string | null;
  // múltiplas imagens (novo)
  imageUrls?: string[] | null;
  // dados do vendedor
  user?: ProductUser | null;
  userName?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolveUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${SERVER_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Retorna array com até 3 URLs resolvidas para um produto */
function getProductImages(p: Product | null | undefined): string[] {
  if (!p) return [];
  const urls: string[] = [];

  // Prioridade: imageUrls (array)
  if (Array.isArray(p.imageUrls) && p.imageUrls.length > 0) {
    for (const u of p.imageUrls) {
      const resolved = resolveUrl(u);
      if (resolved) urls.push(resolved);
      if (urls.length >= MAX_PRODUCT_IMAGES) break;
    }
  }

  // Fallback: imageUrl singular
  if (urls.length === 0 && p.imageUrl) {
    const resolved = resolveUrl(p.imageUrl);
    if (resolved) urls.push(resolved);
  }

  return urls;
}

/** Nome do vendedor — tenta vários formatos */
function getSellerName(p: Product | null | undefined): string | null {
  if (!p) return null;
  return p.user?.name ?? p.userName ?? null;
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error?: string }
class ScreenErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any): EBState {
    return { hasError: true, error: String(error?.message ?? error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('[Vitrine] Render error caught by boundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Erro ao carregar a Vitrine</Text>
          <Text style={styles.errorMsg}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Miniatura simples (com fallback de ícone) ────────────────────────────────
function SafeImage({ uri, style, resizeMode = 'cover' }: {
  uri: string; style: any; resizeMode?: 'cover' | 'contain' | 'stretch';
}) {
  return (
    <CachedImage
      url={uri}
      style={style}
      resizeMode={resizeMode as any}
      fallbackIcon={<Feather name="image" size={24} color={Colors.light.textMuted} />}
    />
  );
}

// ─── Thumbnail do card (1ª foto + badge de quantidade) ────────────────────────
function ProductThumb({ product, size = 72 }: { product: Product; size?: number }) {
  const images = getProductImages(product);
  const br = BorderRadius.sm;

  if (images.length === 0) {
    return (
      <View style={[styles.productThumb, { width: size, height: size, borderRadius: br }]}>
        <Feather name="shopping-bag" size={Math.round(size * 0.44)} color={Colors.light.textMuted} />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: br, overflow: 'hidden' }}>
      <SafeImage uri={images[0]} style={{ width: size, height: size }} />
      {images.length > 1 && (
        <View style={styles.imageBadge}>
          <Feather name="camera" size={9} color="#fff" />
          <Text style={styles.imageBadgeText}>{images.length}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Lightbox Modal ───────────────────────────────────────────────────────────
interface LightboxProps {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

function LightboxModal({ visible, images, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, initialIndex]);

  const goPrev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex(i => Math.min(images.length - 1, i + 1));

  if (!visible || images.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.lightboxOverlay, { opacity: fadeAnim }]}>

        {/* Botão fechar */}
        <TouchableOpacity style={styles.lightboxClose} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={styles.lightboxCloseBtn}>
            <Feather name="x" size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Contador */}
        {images.length > 1 && (
          <View style={styles.lightboxCounter}>
            <Text style={styles.lightboxCounterText}>{currentIndex + 1} / {images.length}</Text>
          </View>
        )}

        {/* Imagem principal */}
        <SafeImage
          uri={images[currentIndex]}
          resizeMode="contain"
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.78 }}
        />

        {/* Navegação */}
        {images.length > 1 && (
          <View style={styles.lightboxNav}>
            <TouchableOpacity
              style={[styles.lightboxNavBtn, currentIndex === 0 && styles.lightboxNavBtnDisabled]}
              onPress={goPrev}
              disabled={currentIndex === 0}
            >
              <Feather name="chevron-left" size={26} color="#fff" />
            </TouchableOpacity>

            {/* Dots */}
            <View style={styles.lightboxDots}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setCurrentIndex(i)}>
                  <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.lightboxNavBtn, currentIndex === images.length - 1 && styles.lightboxNavBtnDisabled]}
              onPress={goNext}
              disabled={currentIndex === images.length - 1}
            >
              <Feather name="chevron-right" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Galeria horizontal no modal de detalhe ───────────────────────────────────
function ProductGallery({ images, onImagePress }: {
  images: string[];
  onImagePress: (index: number) => void;
}) {
  if (images.length === 0) {
    return (
      <View style={styles.galleryEmpty}>
        <Feather name="image" size={36} color={Colors.light.textMuted} />
      </View>
    );
  }

  if (images.length === 1) {
    return (
      <TouchableOpacity onPress={() => onImagePress(0)} activeOpacity={0.85} style={styles.gallerySingle}>
        <SafeImage uri={images[0]} style={{ width: '100%', height: '100%' }} />
        <View style={styles.galleryTapHint}>
          <Feather name="zoom-in" size={14} color="#fff" />
          <Text style={styles.galleryTapHintText}>Ampliar</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
        {images.map((uri, index) => (
          <TouchableOpacity key={index} onPress={() => onImagePress(index)} activeOpacity={0.85}>
            <View style={styles.galleryItem}>
              <SafeImage uri={uri} style={{ width: '100%', height: '100%' }} />
              <View style={styles.galleryIndexBadge}>
                <Feather name="zoom-in" size={10} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.galleryHint}>Toque em uma foto para ampliar</Text>
    </View>
  );
}

// ─── Tela interna ─────────────────────────────────────────────────────────────
function MarketplaceScreenInner() {
  const { user } = useAuth();
  const { isCoachDone, markCoachDone } = useOnboarding();
  const [coachVisible, setCoachVisible] = useState(false);

  // Refs para os alvos do tutorial
  const modeToggleRef   = useRef<View>(null);
  const searchRef       = useRef<View>(null);
  const productListRef  = useRef<View>(null);
  const fabRef          = useRef<View>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!isCoachDone('products')) {
        const t = setTimeout(() => setCoachVisible(true), 500);
        return () => clearTimeout(t);
      }
    }, [isCoachDone])
  );

  // Parâmetros de navegação — recebidos ao vir do menu de chat ("Vitrine do Usuário")
  const params = useLocalSearchParams<{ sellerId?: string; sellerName?: string }>();
  const [sellerFilter, setSellerFilter] = useState<{ id: string; name: string } | null>(
    params.sellerId ? { id: params.sellerId, name: params.sellerName || 'Usuário' } : null
  );

  // Modo: 'vitrine' = mercado público | 'meus' = meus anúncios
  const [mode, setMode] = useState<'vitrine' | 'meus'>('vitrine');

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMy, setLoadingMy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detail modal
  const [productModal, setProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Lightbox
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Reserve modal
  const [reserveModal, setReserveModal] = useState(false);
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resObs, setResObs] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Review modal
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');

  // Report modal
  const [reportModal, setReportModal] = useState(false);
  const [reportDesc, setReportDesc] = useState('');

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdCat, setNewProdCat] = useState('');
  const [newProdImages, setNewProdImages] = useState<(string | null)[]>([null, null, null]);
  const [isCreating, setIsCreating] = useState(false);

  // ─── Carregamento ────────────────────────────────────────────────────────────
  const loadMarketplace = useCallback(async () => {
    try {
      const response = await api.get('/products/marketplace');
      const raw = response?.data?.data?.products ?? response?.data?.data;
      setProducts(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      console.warn('[Vitrine] loadMarketplace error:', e?.message);
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMyProducts = useCallback(async () => {
    setLoadingMy(true);
    try {
      const response = await api.get('/products');
      const raw = response?.data?.data?.products ?? response?.data?.data;
      setMyProducts(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      console.warn('[Vitrine] loadMyProducts error:', e?.message);
      setMyProducts([]);
    } finally {
      setLoadingMy(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMarketplace(); }, []);

  useEffect(() => {
    if (mode === 'meus') loadMyProducts();
  }, [mode]);

  const onRefresh = () => {
    setRefreshing(true);
    if (mode === 'vitrine') loadMarketplace();
    else loadMyProducts();
  };

  // ─── Lightbox helpers ─────────────────────────────────────────────────────
  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  // ─── Ações ───────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    if (user?.plan === 'FREE' || !user?.plan) {
      Alert.alert(
        'Vitrine Exclusiva',
        'Apenas vendedores PRO e BUSINESS podem anunciar produtos.\nAssine na aba Configurações.'
      );
      return;
    }
    setCreateModal(true);
  };

  const handlePickImage = async (slot: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permissão', 'Falta permissão de galeria.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const updated = [...newProdImages];
      updated[slot] = result.assets[0].uri;
      setNewProdImages(updated);
    }
  };

  const handleRemoveImage = (slot: number) => {
    const updated = [...newProdImages];
    updated[slot] = null;
    setNewProdImages(updated);
  };

  const handleCreateProduct = async () => {
    if (!newProdName || !newProdPrice) return Alert.alert('Atenção', 'Nome e Preço são obrigatórios');
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', newProdName);
      formData.append('price', newProdPrice.replace(',', '.'));
      if (newProdDesc) formData.append('description', newProdDesc);
      if (newProdCat) formData.append('category', newProdCat);

      // Envia até 3 imagens com chaves image0, image1, image2
      newProdImages.forEach((uri, i) => {
        if (uri) {
          formData.append(`image${i}`, { uri, name: `prod_${i}.jpg`, type: 'image/jpeg' } as any);
        }
      });

      await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('Sucesso', 'Anúncio publicado na vitrine!');
      setCreateModal(false);
      setNewProdName(''); setNewProdPrice(''); setNewProdDesc(''); setNewProdCat('');
      setNewProdImages([null, null, null]);
      loadMarketplace();
      if (mode === 'meus') loadMyProducts();
    } catch {
      Alert.alert('Erro', 'Não foi possível publicar.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    Alert.alert(
      'Excluir Anúncio',
      `Deseja remover "${productName}" da vitrine?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/products/${productId}`);
              Alert.alert('Removido', 'Anúncio excluído com sucesso.');
              loadMyProducts();
              loadMarketplace();
            } catch (e: any) {
              Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  const openProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductModal(true);
  };

  const handleReserve = async () => {
    if (!resDate || !resTime) return Alert.alert('Atenção', 'Data e Hora são obrigatórios');
    setActionLoading(true);
    try {
      await api.post(`/products/${selectedProduct?.id}/reserve`, {
        reservationDate: resDate, reservationTime: resTime, observation: resObs
      });
      Alert.alert('Sucesso 🎉', 'Reserva realizada! GLBs deduzidos de sua carteira.');
      setReserveModal(false);
      setProductModal(false);
      loadMarketplace();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Erro ao reservar produto.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewComment) return Alert.alert('Atenção', 'Escreva um comentário');
    setActionLoading(true);
    try {
      await api.post('/products/reviews', {
        productId: selectedProduct?.id, rating: parseInt(reviewRating), comment: reviewComment
      });
      Alert.alert('Sucesso', 'Sua avaliação foi registrada!');
      setReviewModal(false);
    } catch (e: any) {
      Alert.alert('Acesso Negado', e?.response?.data?.message || 'Você só pode avaliar produtos que reservou e concluiu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reportDesc) return Alert.alert('Atenção', 'Descreva o motivo');
    setActionLoading(true);
    try {
      await api.post('/reports', {
        productId: selectedProduct?.id, reportType: 'OTHER', description: reportDesc
      });
      Alert.alert('Sucesso', 'Denúncia registrada. Nosso sistema de proteção avaliará este produto.');
      setReportModal(false);
      setProductModal(false);
      loadMarketplace();
    } catch (e: any) {
      Alert.alert('Aviso', e?.response?.data?.message || 'Erro ao reportar');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Dados filtrados ─────────────────────────────────────────────────────────
  const searchLower = search.toLowerCase().trim();
  const source = mode === 'vitrine' ? products : myProducts;
  const filtered = source.filter(p => {
    if (!p) return false;
    // Filtro por vendedor (vindo da navegação do chat)
    if (sellerFilter) {
      const matchesSellerId = p.userId === sellerFilter.id || p.user?.id === sellerFilter.id;
      if (!matchesSellerId) return false;
    }
    // Filtro por busca de texto
    if (!searchLower) return true;
    const inName = (p.name || '').toLowerCase().includes(searchLower);
    const inDesc = (p.description || '').toLowerCase().includes(searchLower);
    const inCategory = (p.category || '').toLowerCase().includes(searchLower);
    const sellerName = getSellerName(p) || '';
    const inSeller = sellerName.toLowerCase().includes(searchLower);
    return inName || inDesc || inCategory || inSeller;
  });

  // ─── Renderização de cards ───────────────────────────────────────────────────
  const renderProduct = ({ item }: { item: Product }) => {
    const sellerName = getSellerName(item);
    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.7}
        onPress={() => openProduct(item)}
      >
        <ProductThumb product={item} size={72} />

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>

          {/* Categoria + vendedor */}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {!!item.category && (
              <Text style={styles.productCategory}>{item.category}</Text>
            )}
            {!!sellerName && mode === 'vitrine' && (
              <View style={styles.sellerBadge}>
                <Feather name="user" size={9} color={Colors.primary} />
                <Text style={styles.sellerBadgeText} numberOfLines={1}>{sellerName}</Text>
              </View>
            )}
          </View>

          {!!item.description && (
            <Text style={styles.productDescription} numberOfLines={1}>{item.description}</Text>
          )}

          <View style={styles.productFooter}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Text style={styles.productPrice}>R$ {Number(item.price).toFixed(2)}</Text>
              <View style={{ backgroundColor: Colors.secondary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: Colors.secondaryDark, fontWeight: '800', fontSize: 11 }}>
                  G {(Number(item.price) / 0.5037).toFixed(2)}
                </Text>
              </View>
            </View>
            <Text style={styles.productStock}>Estoque: {item.stock ?? item.quantity ?? 1}</Text>
          </View>
        </View>

        {/* Botão excluir nos Meus Produtos */}
        {mode === 'meus' && item.userId === user?.id && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteProduct(item.id, item.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={18} color={Colors.error} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const isListLoading = mode === 'vitrine' ? loading : loadingMy;
  const selectedImages = selectedProduct ? getProductImages(selectedProduct) : [];

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Background Glows */}
      <View style={styles.glowBlue} pointerEvents="none" />
      <View style={styles.glowPurple} pointerEvents="none" />

      {/* Banner de Vitrine do Usuário (quando vindo do chat) */}
      {sellerFilter && (
        <View style={styles.sellerFilterBanner}>
          <Feather name="shopping-bag" size={14} color="#00F2FE" />
          <Text style={styles.sellerFilterText} numberOfLines={1}>
            Vitrine de <Text style={{ fontWeight: '800' }}>{sellerFilter.name}</Text>
          </Text>
          <TouchableOpacity
            onPress={() => { setSellerFilter(null); router.setParams({ sellerId: undefined, sellerName: undefined }); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={16} color="#00F2FE" />
          </TouchableOpacity>
        </View>
      )}

      {/* Toggle Vitrine / Meus Produtos */}
      <View ref={modeToggleRef} style={styles.modeToggleRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'vitrine' && styles.modeBtnActive]}
          onPress={() => setMode('vitrine')}
        >
          <Feather name="shopping-bag" size={14} color={mode === 'vitrine' ? '#000' : '#00F2FE'} />
          <Text style={[styles.modeBtnText, mode === 'vitrine' && styles.modeBtnTextActive]}>
            Vitrine Pública
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'meus' && styles.modeBtnActive]}
          onPress={() => setMode('meus')}
        >
          <Feather name="package" size={14} color={mode === 'meus' ? '#000' : '#9B51E0'} />
          <Text style={[styles.modeBtnText, mode === 'meus' && styles.modeBtnTextActive]}>
            Meus Produtos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Busca */}
      <View ref={searchRef} style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={20} color={Colors.light.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={sellerFilter ? `Filtrar produtos de ${sellerFilter.name}...` : mode === 'vitrine' ? 'Produto, categoria ou vendedor...' : 'Buscar nos seus anúncios...'}
            placeholderTextColor={Colors.light.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista */}
      <View ref={productListRef} style={{ flex: 1 }}>
        {isListLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => item?.id ?? String(index)}
            renderItem={renderProduct}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="box" size={48} color={Colors.light.textMuted} />
                <Text style={styles.emptyTitle}>
                  {sellerFilter ? 'Sem Anúncios' : search ? 'Nenhum resultado' : mode === 'vitrine' ? 'Vitrine Vazia' : 'Sem Anúncios'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {sellerFilter
                    ? `${sellerFilter.name} ainda não tem produtos na vitrine.`
                    : search
                      ? `Nenhum produto ou vendedor encontrado para "${search}"`
                      : mode === 'vitrine'
                        ? 'Nenhum anúncio disponível no momento'
                        : 'Você ainda não publicou nenhum produto. Toque no + para começar!'
                  }
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* FAB — adicionar produto */}
      <TouchableOpacity ref={fabRef} style={styles.fab} onPress={handleOpenCreate}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* ═══════════ MODAIS ═══════════ */}

      {/* Detail */}
      <Modal visible={productModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingHorizontal: 0, paddingTop: 0, overflow: 'hidden' }]}>
            {/* Fechar */}
            <TouchableOpacity
              style={styles.detailCloseBtn}
              onPress={() => setProductModal(false)}
            >
              <View style={styles.detailCloseBtnInner}>
                <Feather name="x" size={20} color={Colors.light.textMuted} />
              </View>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Galeria de fotos */}
              <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8 }}>
                <ProductGallery
                  images={selectedImages}
                  onImagePress={(index) => openLightbox(selectedImages, index)}
                />
              </View>

              <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                {/* Nome e categoria */}
                <Text style={[styles.modalTitle, { marginBottom: 2 }]}>{selectedProduct?.name}</Text>
                <Text style={styles.productCategory}>{selectedProduct?.category || 'Gerais'}</Text>

                {/* Vendedor */}
                {getSellerName(selectedProduct) && (
                  <View style={styles.sellerRow}>
                    <Feather name="user" size={13} color={Colors.primary} />
                    <Text style={styles.sellerRowText}>{getSellerName(selectedProduct)}</Text>
                  </View>
                )}

                {/* Descrição */}
                {!!selectedProduct?.description && (
                  <Text style={styles.detailDescription}>{selectedProduct.description}</Text>
                )}

                {/* Preços */}
                <View style={styles.priceRow}>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceBoxValue}>R$ {Number(selectedProduct?.price ?? 0).toFixed(2)}</Text>
                    <Text style={styles.priceBoxLabel}>Preço Local</Text>
                  </View>
                  <View style={[styles.priceBox, { backgroundColor: Colors.secondaryDark + '12' }]}>
                    <Text style={[styles.priceBoxValue, { color: Colors.secondaryDark }]}>
                      G {(selectedProduct?.price ? Number(selectedProduct.price) / 0.5037 : 0).toFixed(2)}
                    </Text>
                    <Text style={styles.priceBoxLabel}>Base Global</Text>
                  </View>
                </View>

                {/* Ações */}
                <View style={{ gap: 10, marginTop: 4 }}>
                  {user?.id !== selectedProduct?.userId ? (
                    <>
                      <TouchableOpacity
                        style={styles.modalBtnSubmit}
                        onPress={() => { setProductModal(false); setReserveModal(true); }}
                      >
                        <Feather name="shopping-cart" size={18} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.modalBtnSubmitText}>Reservar com G (-1.03x)</Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={[styles.modalBtnCancel, { flex: 1, borderColor: Colors.secondary, backgroundColor: Colors.secondary + '10' }]}
                          onPress={() => { setProductModal(false); setReviewModal(true); }}
                        >
                          <Text style={[styles.modalBtnText, { color: Colors.secondaryDark }]}>Avaliar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalBtnCancel, { flex: 1, borderColor: Colors.error, backgroundColor: Colors.error + '10' }]}
                          onPress={() => { setProductModal(false); setReportModal(true); }}
                        >
                          <Text style={[styles.modalBtnText, { color: Colors.error }]}>Denunciar</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={{ backgroundColor: Colors.info + '20', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                        <Text style={{ color: Colors.info, fontWeight: 'bold' }}>Seu anúncio</Text>
                        <Text style={{ color: Colors.info, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                          Estoque: {selectedProduct?.stock ?? selectedProduct?.quantity ?? 1} unidades
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.modalBtnCancel, { borderColor: Colors.error, backgroundColor: Colors.error + '10' }]}
                        onPress={() => {
                          setProductModal(false);
                          if (selectedProduct) handleDeleteProduct(selectedProduct.id, selectedProduct.name);
                        }}
                      >
                        <Feather name="trash-2" size={16} color={Colors.error} style={{ marginRight: 6 }} />
                        <Text style={[styles.modalBtnText, { color: Colors.error }]}>Excluir Anúncio</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reserve */}
      <Modal visible={reserveModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Concretizar Reserva</Text>
            <Text style={{ marginBottom: 16, color: Colors.light.textSecondary, textAlign: 'center', fontSize: 13 }}>
              A corretagem descontará 1.03x G de sua carteira e o vendedor receberá 0.97x rendimento líquido (GLB) na conclusão.
            </Text>
            <TextInput style={styles.inputModal} placeholder="Data (DD/MM/AAAA) *" placeholderTextColor={Colors.light.textMuted} value={resDate} onChangeText={setResDate} />
            <TextInput style={styles.inputModal} placeholder="Horário (HH:MM) *" placeholderTextColor={Colors.light.textMuted} value={resTime} onChangeText={setResTime} />
            <TextInput style={styles.inputModal} placeholder="Observações para o Vendedor" placeholderTextColor={Colors.light.textMuted} value={resObs} onChangeText={setResObs} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReserveModal(false)} disabled={actionLoading}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleReserve} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Confirmar e Pagar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Review */}
      <Modal visible={reviewModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Avaliar Produto</Text>
            <Text style={{ marginBottom: 16, color: Colors.light.textSecondary, textAlign: 'center', fontSize: 13 }}>
              A trava de segurança requer que você tenha uma reserva "Concluída".
            </Text>
            <TextInput style={styles.inputModal} placeholder="Nota (1 a 5) *" placeholderTextColor={Colors.light.textMuted} value={reviewRating} onChangeText={setReviewRating} keyboardType="numeric" />
            <TextInput style={styles.inputModal} placeholder="Escreva seu comentário *" placeholderTextColor={Colors.light.textMuted} value={reviewComment} onChangeText={setReviewComment} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReviewModal(false)} disabled={actionLoading}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSubmit, { backgroundColor: Colors.secondary }]} onPress={handleReview} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Publicar Opinião</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report */}
      <Modal visible={reportModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Feather name="alert-triangle" size={32} color={Colors.error} />
              <Text style={[styles.modalTitle, { color: Colors.error, marginTop: 8 }]}>Tribunal Automático</Text>
            </View>
            <Text style={{ marginBottom: 16, color: Colors.light.textSecondary, textAlign: 'center', fontSize: 13 }}>
              3 queixas consistentes suspenderão o produto e o vendedor da Vitrine imediatamente.
            </Text>
            <TextInput style={styles.inputModal} placeholder="Descreva o golpe, fraude ou ofensa *" placeholderTextColor={Colors.light.textMuted} value={reportDesc} onChangeText={setReportDesc} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReportModal(false)} disabled={actionLoading}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSubmit, { backgroundColor: Colors.error }]} onPress={handleReport} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Enviar Alerta</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create — 3 slots de imagem */}
      <Modal visible={createModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '94%' }]}>
            <Text style={styles.modalTitle}>Anunciar Produto</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Slots de foto */}
              <Text style={styles.photoSlotsLabel}>
                Fotos do anúncio ({newProdImages.filter(Boolean).length}/{MAX_PRODUCT_IMAGES})
              </Text>
              <View style={styles.photoSlotsRow}>
                {newProdImages.map((uri, slot) => (
                  <View key={slot} style={styles.photoSlotWrapper}>
                    {uri ? (
                      <View style={styles.photoSlot}>
                        <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                        <TouchableOpacity
                          style={styles.photoSlotRemove}
                          onPress={() => handleRemoveImage(slot)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Feather name="x" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.photoSlotEmpty} onPress={() => handlePickImage(slot)}>
                        <Feather name="camera" size={22} color={Colors.light.textMuted} />
                        <Text style={styles.photoSlotEmptyText}>Foto {slot + 1}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <TextInput style={styles.inputModal} placeholder="Nome do Produto *" placeholderTextColor={Colors.light.textMuted} value={newProdName} onChangeText={setNewProdName} />
              <TextInput style={styles.inputModal} placeholder="Preço (R$) *" placeholderTextColor={Colors.light.textMuted} keyboardType="numeric" value={newProdPrice} onChangeText={setNewProdPrice} />
              <TextInput style={styles.inputModal} placeholder="Categoria (ex: Serviços, Cursos...)" placeholderTextColor={Colors.light.textMuted} value={newProdCat} onChangeText={setNewProdCat} />
              <TextInput style={[styles.inputModal, { minHeight: 80 }]} placeholder="Descrição do produto..." placeholderTextColor={Colors.light.textMuted} value={newProdDesc} onChangeText={setNewProdDesc} multiline numberOfLines={3} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setCreateModal(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleCreateProduct}>
                {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Publicar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lightbox */}
      <LightboxModal
        visible={lightboxVisible}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxVisible(false)}
      />

      {/* Coach Marks */}
      <CoachMark
        visible={coachVisible}
        onComplete={async () => { setCoachVisible(false); await markCoachDone('products'); }}
        steps={[
          {
            targetRef: modeToggleRef,
            title: 'Vitrine ou Meus Anúncios',
            description: 'Alterne entre o mercado público da comunidade e a lista de produtos que você mesmo anunciou.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: searchRef,
            title: 'Buscar na Vitrine',
            description: 'Busque produtos por nome, categoria ou pelo nome do vendedor.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: productListRef,
            title: 'Explorar Produtos',
            description: 'Toque em qualquer card para ver detalhes, galeria de fotos ampliadas, fazer reservas ou avaliar.',
            tooltipPosition: 'bottom',
          },
          {
            targetRef: fabRef,
            title: 'Publicar Anúncio',
            description: 'Vendedores PRO e BUSINESS podem criar novos anúncios tocando neste botão.',
            tooltipPosition: 'top',
          },
        ]}
      />

    </View>
  );
}

// ─── Export com Error Boundary ────────────────────────────────────────────────
export default function MarketplaceScreen() {
  return (
    <ScreenErrorBoundary>
      <MarketplaceScreenInner />
    </ScreenErrorBoundary>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBlue: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
  },
  glowPurple: {
    position: 'absolute',
    bottom: 100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(155, 81, 224, 0.12)',
  },

  // Toggle de modo
  modeToggleRow: {
    flexDirection: 'row',
    margin: Spacing.md,
    marginBottom: 0,
    gap: 8,
    zIndex: 10,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: '#00F2FE',
    backgroundColor: 'transparent',
  },
  modeBtnActive: {
    backgroundColor: '#00F2FE',
    borderColor: '#00F2FE',
  },
  modeBtnText: {
    color: '#00F2FE',
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  modeBtnTextActive: {
    color: '#000',
  },

  // Busca
  searchContainer: { padding: Spacing.md, paddingBottom: 0, marginTop: Spacing.sm, zIndex: 10 },
  searchInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: {
    flex: 1, paddingVertical: Spacing.md,
    color: '#fff', fontSize: FontSize.md,
  },

  // Lista
  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },
  productCard: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.dark.border,
    alignItems: 'center',
  },
  productThumb: {
    backgroundColor: Colors.dark.surfaceLight,
    justifyContent: 'center', alignItems: 'center',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  imageBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  productInfo: { flex: 1, gap: 2 },
  productName: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  productCategory: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: '600' },
  productDescription: { color: Colors.dark.textSecondary, fontSize: FontSize.sm },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' },
  productPrice: { color: '#00F2FE', fontSize: FontSize.md, fontWeight: '700' },
  productStock: { color: Colors.dark.textMuted, fontSize: FontSize.sm },
  deleteBtn: { padding: 6 },

  // Badge do vendedor no card
  sellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(155, 81, 224, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 120,
  },
  sellerBadgeText: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1,
  },

  // Empty
  emptyContainer: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  emptySubtitle: { color: Colors.dark.textMuted, fontSize: FontSize.sm, textAlign: 'center' },

  // Error Boundary
  errorContainer: {
    flex: 1,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: 24,
  },
  errorTitle: {
    color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center',
  },
  errorMsg: {
    color: Colors.dark.textMuted, fontSize: 13, marginTop: 8, textAlign: 'center',
  },

  // Modais base
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6, 8, 20, 0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    backgroundColor: '#0B2039',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  modalTitle: {
    color: '#fff', fontSize: FontSize.lg,
    fontWeight: '700', textAlign: 'center', marginBottom: Spacing.md,
  },
  inputModal: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    color: '#fff',
    fontSize: FontSize.md,
    borderWidth: 1, borderColor: Colors.dark.border,
    marginBottom: Spacing.sm,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalBtnCancel: {
    flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1, borderColor: Colors.dark.border,
    flexDirection: 'row',
  },
  modalBtnText: { color: '#fff', fontWeight: '600' },
  modalBtnSubmit: {
    flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#00F2FE',
    flexDirection: 'row',
  },
  modalBtnSubmitText: { color: '#000', fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#00F2FE',
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    elevation: 4,
    shadowColor: '#00F2FE', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },

  // Detail modal
  detailCloseBtn: {
    position: 'absolute', right: 12, top: 12, zIndex: 10,
  },
  detailCloseBtnInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    marginBottom: 4,
  },
  sellerRowText: {
    color: '#9B51E0',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  detailDescription: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(6, 214, 160, 0.1)',
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
  },
  priceBoxValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: '#06D6A0',
  },
  priceBoxLabel: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },

  // Galeria de detalhes
  galleryEmpty: {
    height: 120,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gallerySingle: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: 12,
  },
  galleryTapHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  galleryTapHintText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  galleryScroll: {
    marginBottom: 4,
  },
  galleryItem: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  galleryIndexBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    padding: 4,
  },
  galleryHint: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Lightbox
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(6,8,20,0.97)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 20,
  },
  lightboxCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  lightboxCounter: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  lightboxCounterText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lightboxNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 24,
  },
  lightboxNavBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  lightboxNavBtnDisabled: {
    opacity: 0.3,
  },
  lightboxDots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
    borderRadius: 4,
  },

  // Create — slots de foto
  photoSlotsLabel: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: 8,
  },
  photoSlotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  photoSlotWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  photoSlot: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoSlotRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 3,
  },
  photoSlotEmpty: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    aspectRatio: 1,
  },
  photoSlotEmptyText: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  // Banner de filtro por vendedor
  sellerFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 242, 254, 0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  sellerFilterText: {
    flex: 1,
    color: '#00F2FE',
    fontSize: FontSize.sm,
  },
});
});
