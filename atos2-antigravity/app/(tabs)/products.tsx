import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Product {
  id: string;
  userId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  quantity: number;
  stock?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
}

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals
  const [productModal, setProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [reserveModal, setReserveModal] = useState(false);
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resObs, setResObs] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [reviewModal, setReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');

  const [reportModal, setReportModal] = useState(false);
  const [reportDesc, setReportDesc] = useState('');

  const loadMarketplace = useCallback(async () => {
    try {
      // Modificado para carregar a vitrine pública em vez do estoque pessoal
      const response = await api.get('/products/marketplace');
      setProducts(response.data.data.products || response.data.data || []);
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível carregar o marketplace');
      // Fallback
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMarketplace(); }, []);

  const openProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductModal(true);
  };

  const handleReserve = async () => {
    if (!resDate || !resTime) return Alert.alert('Atenção', 'Data e Hora são obrigatórios');
    setActionLoading(true);
    try {
      await api.post(`/products/${selectedProduct?.id}/reserve`, {
        reservationDate: resDate,
        reservationTime: resTime,
        observation: resObs
      });
      Alert.alert('Sucesso 🎉', 'Reserva realizada! GLBs deduzidos de sua carteira.');
      setReserveModal(false);
      setProductModal(false);
      loadMarketplace();
    } catch(e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Erro ao reservar produto.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewComment) return Alert.alert('Atenção', 'Escreva um comentário');
    setActionLoading(true);
    try {
      await api.post(`/products/reviews`, {
        productId: selectedProduct?.id,
        rating: parseInt(reviewRating),
        comment: reviewComment
      });
      Alert.alert('Sucesso', 'Sua avaliação foi registrada!');
      setReviewModal(false);
    } catch(e: any) {
      // Aqui a Trava de Avaliação fará efeito (se não comprou ou não tá COMPLETED)
      Alert.alert('Acesso Negado', e?.response?.data?.message || 'Você só pode avaliar produtos que reservou e concluiu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reportDesc) return Alert.alert('Atenção', 'Descreva o motivo');
    setActionLoading(true);
    try {
      await api.post(`/reports`, {
        productId: selectedProduct?.id,
        reportType: 'OTHER',
        description: reportDesc
      });
      Alert.alert('Sucesso', 'Denúncia registrada. Nosso sistema de proteção avaliará este produto.');
      setReportModal(false);
      setProductModal(false);
      loadMarketplace();
    } catch(e: any) {
      Alert.alert('Aviso', e?.response?.data?.message || 'Erro ao reportar');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} activeOpacity={0.7} onPress={() => openProduct(item)}>
      <View style={styles.productImagePlaceholder}>
        <Feather name="shopping-bag" size={28} color={Colors.light.textMuted} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
        {item.description && (
          <Text style={styles.productDescription} numberOfLines={1}>{item.description}</Text>
        )}
        <View style={styles.productFooter}>
          <View style={{flexDirection: 'row', gap: 6, alignItems: 'center'}}>
            <Text style={styles.productPrice}>R$ {item.price.toFixed(2)}</Text>
            <View style={{backgroundColor: Colors.secondary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4}}>
              <Text style={{color: Colors.secondaryDark, fontWeight: '800', fontSize: 12}}>G {(item.price / 0.5037).toFixed(2)}</Text>
            </View>
          </View>
          <Text style={styles.productStock}>
            Estoque: {item.stock ?? item.quantity ?? 1}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Barra de Busca Minimalista */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={20} color={Colors.light.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="O que você está procurando?"
            placeholderTextColor={Colors.light.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMarketplace(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="box" size={48} color={Colors.light.textMuted} />
              <Text style={styles.emptyTitle}>Vitrine Vazia</Text>
              <Text style={styles.emptySubtitle}>Nenhum anúncio disponível no momento</Text>
            </View>
          }
        />
      )}

      {/* Main Product Modal */}
      <Modal visible={productModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <TouchableOpacity style={{position: 'absolute', right: 16, top: 16, zIndex: 10}} onPress={() => setProductModal(false)}>
                <Feather name="x" size={24} color={Colors.light.textMuted} />
             </TouchableOpacity>

             <View style={{alignItems: 'center', marginBottom: 20}}>
               <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.secondary+'20', justifyContent: 'center', alignItems: 'center', marginBottom: 12}}>
                  <Feather name="package" size={40} color={Colors.secondaryDark} />
               </View>
               <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
               <Text style={styles.productCategory}>{selectedProduct?.category || 'Gerais'}</Text>
             </View>

             <ScrollView style={{maxHeight: 100, marginBottom: 20}}>
                <Text style={{color: Colors.light.text, textAlign: 'center'}}>{selectedProduct?.description || 'Nenhuma descrição fornecida.'}</Text>
             </ScrollView>

             <View style={{flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20}}>
                <View style={{alignItems: 'center'}}>
                   <Text style={{fontSize: 24, fontWeight: 'bold', color: Colors.success}}>R$ {selectedProduct?.price?.toFixed(2)}</Text>
                   <Text style={{fontSize: 12, color: Colors.light.textMuted}}>Preço Local</Text>
                </View>
                <View style={{alignItems: 'center'}}>
                   <Text style={{fontSize: 24, fontWeight: 'bold', color: Colors.secondaryDark}}>G {(selectedProduct?.price ? selectedProduct.price / 0.5037 : 0).toFixed(2)}</Text>
                   <Text style={{fontSize: 12, color: Colors.light.textMuted}}>Base Global</Text>
                </View>
             </View>

             <View style={{gap: 12}}>
               {user?.id !== selectedProduct?.userId ? (
                 <>
                   <TouchableOpacity style={styles.modalBtnSubmit} onPress={() => { setProductModal(false); setReserveModal(true); }}>
                     <Feather name="shopping-cart" size={18} color="#fff" style={{marginRight: 8}} />
                     <Text style={styles.modalBtnSubmitText}>Reservar com G (-1.03x)</Text>
                   </TouchableOpacity>

                   <View style={{flexDirection: 'row', gap: 12}}>
                     <TouchableOpacity style={[styles.modalBtnCancel, {flex: 1, borderColor: Colors.secondary, backgroundColor: Colors.secondary+'10'}]} onPress={() => { setProductModal(false); setReviewModal(true); }}>
                       <Text style={[styles.modalBtnText, {color: Colors.secondaryDark}]}>Deixar Avaliação</Text>
                     </TouchableOpacity>

                     <TouchableOpacity style={[styles.modalBtnCancel, {flex: 1, borderColor: Colors.error, backgroundColor: Colors.error+'10'}]} onPress={() => { setProductModal(false); setReportModal(true); }}>
                       <Text style={[styles.modalBtnText, {color: Colors.error}]}>Denunciar Golpe</Text>
                     </TouchableOpacity>
                   </View>
                 </>
               ) : (
                 <View style={{backgroundColor: Colors.info+'20', padding: 12, borderRadius: 8, alignItems: 'center'}}>
                    <Text style={{color: Colors.info, fontWeight: 'bold'}}>Este é o seu próprio anúncio</Text>
                    <Text style={{color: Colors.info, fontSize: 12, textAlign: 'center', marginTop: 4}}>As transações públicas via GLB aparecem apenas para terceiros verem seu Card.</Text>
                 </View>
               )}
             </View>
          </View>
        </View>
      </Modal>

      {/* Reserve Modal */}
      <Modal visible={reserveModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Concretizar Reserva</Text>
            <Text style={{marginBottom: 16, color: Colors.light.textSecondary, textAlign: 'center'}}>
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

      {/* Review Modal */}
      <Modal visible={reviewModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Avaliar Produto</Text>
            <Text style={{marginBottom: 16, color: Colors.light.textSecondary, textAlign: 'center'}}>
              A trava de segurança requer que você tenha uma reserva "Concluída".
            </Text>

            <TextInput style={styles.inputModal} placeholder="Nota (1 a 5) *" placeholderTextColor={Colors.light.textMuted} value={reviewRating} onChangeText={setReviewRating} keyboardType="numeric" />
            <TextInput style={styles.inputModal} placeholder="Escreva seu comentário *" placeholderTextColor={Colors.light.textMuted} value={reviewComment} onChangeText={setReviewComment} multiline />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReviewModal(false)} disabled={actionLoading}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSubmit, {backgroundColor: Colors.secondary}]} onPress={handleReview} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Publicar Opinião</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{alignItems: 'center', marginBottom: 16}}>
               <Feather name="alert-triangle" size={32} color={Colors.error} />
               <Text style={[styles.modalTitle, {color: Colors.error, marginTop: 8}]}>Tribunal Automático</Text>
            </View>
            <Text style={{marginBottom: 16, color: Colors.light.textSecondary, textAlign: 'center'}}>
              Sistema de Denúncia: 3 queixas consistentes suspenderão o produto e o vendedor da Vitrine imediatamente.
            </Text>

            <TextInput style={styles.inputModal} placeholder="Descreva o golpe, fraude ou ofensa *" placeholderTextColor={Colors.light.textMuted} value={reportDesc} onChangeText={setReportDesc} multiline />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReportModal(false)} disabled={actionLoading}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnSubmit, {backgroundColor: Colors.error}]} onPress={handleReport} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Enviar Alerta (Block)</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  searchContainer: { padding: Spacing.md, paddingBottom: 0, marginTop: Spacing.md },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.surface, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.light.border, paddingHorizontal: Spacing.md },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, paddingVertical: Spacing.md, color: Colors.light.text, fontSize: FontSize.md },
  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 80 },
  productCard: { flexDirection: 'row', backgroundColor: Colors.light.surface, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center' },
  productImagePlaceholder: { width: 64, height: 64, borderRadius: BorderRadius.sm, backgroundColor: Colors.light.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, gap: 2 },
  productName: { color: Colors.light.text, fontSize: FontSize.md, fontWeight: '700' },
  productCategory: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: '600' },
  productDescription: { color: Colors.light.textSecondary, fontSize: FontSize.sm },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  productPrice: { color: Colors.success, fontSize: FontSize.md, fontWeight: '700' },
  productStock: { color: Colors.light.textMuted, fontSize: FontSize.sm },
  emptyContainer: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { color: Colors.light.text, fontSize: FontSize.lg, fontWeight: '700' },
  emptySubtitle: { color: Colors.light.textSecondary, fontSize: FontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Colors.light.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.light.border },
  modalTitle: { color: Colors.light.text, fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.md },
  inputModal: { backgroundColor: Colors.light.surfaceLight, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.light.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.light.border, marginBottom: Spacing.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalBtnCancel: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.light.surfaceLight, borderWidth: 1, borderColor: Colors.light.border, justifyContent: 'center' },
  modalBtnText: { color: Colors.light.textSecondary, fontWeight: '600' },
  modalBtnSubmit: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'center' },
  modalBtnSubmitText: { color: '#fff', fontWeight: '700' },
});
