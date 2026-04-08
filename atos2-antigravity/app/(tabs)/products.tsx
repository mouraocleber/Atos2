import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import api from '../../services/api';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  quantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
}

export default function ProductsScreen() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formQuantity, setFormQuantity] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data || []);
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível carregar produtos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, []);

  const openCreateModal = () => {
    setSelectedProduct(null);
    setFormName(''); setFormDescription(''); setFormPrice(''); setFormCategory(''); setFormQuantity('1');
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || '');
    setFormPrice(product.price.toString());
    setFormCategory(product.category || '');
    setFormQuantity(product.quantity.toString());
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPrice.trim()) {
      return Alert.alert('Atenção', 'Nome e preço são obrigatórios.');
    }
    setSaving(true);
    const payload = {
      name: formName.trim(),
      description: formDescription.trim(),
      price: parseFloat(formPrice.replace(',', '.')),
      category: formCategory.trim(),
      quantity: parseInt(formQuantity) || 0,
    };
    try {
      if (selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, payload);
        Alert.alert('Sucesso', 'Produto atualizado!');
      } else {
        await api.post('/products', payload);
        Alert.alert('Sucesso', 'Produto criado!');
      }
      setModalVisible(false);
      loadProducts();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert('Excluir', `Excluir "${product.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/products/${product.id}`);
            loadProducts();
          } catch (e: any) {
            Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível excluir');
          }
        }
      }
    ]);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = filtered.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const totalItems = filtered.reduce((sum, p) => sum + p.quantity, 0);

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} activeOpacity={0.7} onPress={() => openEditModal(item)}>
      <View style={styles.productImagePlaceholder}>
        <Feather name="package" size={28} color={Colors.dark.textMuted} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
        {item.description && (
          <Text style={styles.productDescription} numberOfLines={1}>{item.description}</Text>
        )}
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>R$ {item.price.toFixed(2)}</Text>
          <Text style={[styles.productStock, item.quantity < 5 && styles.lowStock]}>
            Estoque: {item.quantity}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} style={{ padding: Spacing.sm }}>
        <Feather name="trash-2" size={18} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{filtered.length}</Text>
          <Text style={styles.statLabel}>Produtos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalItems}</Text>
          <Text style={styles.statLabel}>Estoque</Text>
        </View>
        <View style={[styles.statCard, styles.statCardHighlight]}>
          <Text style={[styles.statValue, styles.statValueHighlight]}>
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </Text>
          <Text style={styles.statLabel}>Valor Total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={20} color={Colors.dark.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos..."
            placeholderTextColor={Colors.dark.textMuted}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="package" size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum produto</Text>
              <Text style={styles.emptySubtitle}>Toque no + para adicionar</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openCreateModal}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedProduct ? 'Editar Produto' : 'Novo Produto'}</Text>
            <TextInput style={styles.inputModal} placeholder="Nome *" placeholderTextColor={Colors.dark.textMuted} value={formName} onChangeText={setFormName} />
            <TextInput style={styles.inputModal} placeholder="Descrição" placeholderTextColor={Colors.dark.textMuted} value={formDescription} onChangeText={setFormDescription} />
            <TextInput style={styles.inputModal} placeholder="Preço *" placeholderTextColor={Colors.dark.textMuted} value={formPrice} onChangeText={setFormPrice} keyboardType="decimal-pad" />
            <TextInput style={styles.inputModal} placeholder="Categoria" placeholderTextColor={Colors.dark.textMuted} value={formCategory} onChangeText={setFormCategory} />
            <TextInput style={styles.inputModal} placeholder="Quantidade em estoque" placeholderTextColor={Colors.dark.textMuted} value={formQuantity} onChangeText={setFormQuantity} keyboardType="number-pad" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSubmit} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnSubmitText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  statsRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  statCardHighlight: { borderColor: Colors.secondary + '60', backgroundColor: Colors.secondary + '10' },
  statValue: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: '800' },
  statValueHighlight: { color: Colors.secondary },
  statLabel: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  searchContainer: { paddingHorizontal: Spacing.md },
  searchInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.dark.border, paddingHorizontal: Spacing.md },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, paddingVertical: Spacing.md, color: Colors.dark.text, fontSize: FontSize.md },
  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 80 },
  productCard: { flexDirection: 'row', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.dark.border, alignItems: 'center' },
  productImagePlaceholder: { width: 64, height: 64, borderRadius: BorderRadius.sm, backgroundColor: Colors.dark.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, gap: 2 },
  productName: { color: Colors.dark.text, fontSize: FontSize.md, fontWeight: '700' },
  productCategory: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: '600' },
  productDescription: { color: Colors.dark.textSecondary, fontSize: FontSize.sm },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  productPrice: { color: Colors.success, fontSize: FontSize.md, fontWeight: '700' },
  productStock: { color: Colors.dark.textMuted, fontSize: FontSize.sm },
  lowStock: { color: Colors.error },
  emptyContainer: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: '700' },
  emptySubtitle: { color: Colors.dark.textSecondary, fontSize: FontSize.sm },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Colors.dark.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.dark.border },
  modalTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.md },
  inputModal: { backgroundColor: Colors.dark.surfaceLight, borderRadius: BorderRadius.sm, padding: Spacing.md, color: Colors.dark.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.dark.border, marginBottom: Spacing.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  modalBtnCancel: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.dark.surfaceLight, borderWidth: 1, borderColor: Colors.dark.border },
  modalBtnText: { color: Colors.dark.textSecondary, fontWeight: '600' },
  modalBtnSubmit: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: 'center', backgroundColor: Colors.primary },
  modalBtnSubmitText: { color: '#fff', fontWeight: '700' },
});
