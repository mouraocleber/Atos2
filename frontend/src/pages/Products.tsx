import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import './Products.css';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  stock: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  createdAt: Date;
}

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    stock: '',
  });

  // Dados de exemplo
  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Notebook Dell',
      description: 'Notebook com processador Intel i7',
      price: 3500.00,
      category: 'Eletrônicos',
      imageUrl: 'https://via.placeholder.com/200?text=Notebook',
      stock: 5,
      status: 'ACTIVE',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Mouse Logitech',
      description: 'Mouse sem fio com bateria de longa duração',
      price: 150.00,
      category: 'Periféricos',
      imageUrl: 'https://via.placeholder.com/200?text=Mouse',
      stock: 20,
      status: 'ACTIVE',
      createdAt: new Date(),
    },
    {
      id: '3',
      name: 'Teclado Mecânico',
      description: 'Teclado mecânico RGB com switches Cherry MX',
      price: 450.00,
      category: 'Periféricos',
      imageUrl: 'https://via.placeholder.com/200?text=Teclado',
      stock: 8,
      status: 'ACTIVE',
      createdAt: new Date(),
    },
    {
      id: '4',
      name: 'Monitor LG 27"',
      description: 'Monitor 4K com 144Hz',
      price: 1200.00,
      category: 'Monitores',
      imageUrl: 'https://via.placeholder.com/200?text=Monitor',
      stock: 3,
      status: 'ACTIVE',
      createdAt: new Date(),
    },
    {
      id: '5',
      name: 'Webcam HD',
      description: 'Webcam 1080p com microfone integrado',
      price: 200.00,
      category: 'Periféricos',
      imageUrl: 'https://via.placeholder.com/200?text=Webcam',
      stock: 15,
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  ];

  useEffect(() => {
    setProducts(mockProducts);
    filterProducts(mockProducts, searchQuery, selectedCategory);
  }, []);

  const filterProducts = (
    productList: Product[],
    query: string,
    category: string
  ) => {
    let filtered = productList;

    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.description?.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (category !== 'all') {
      filtered = filtered.filter((p) => p.category === category);
    }

    setFilteredProducts(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterProducts(products, query, selectedCategory);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    filterProducts(products, searchQuery, category);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      imageUrl: '',
      stock: '',
    });
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || '',
      imageUrl: product.imageUrl || '',
      stock: product.stock.toString(),
    });
    setShowForm(true);
  };

  const handleSaveProduct = () => {
    if (!formData.name || !formData.price) {
      alert('Nome e preço são obrigatórios');
      return;
    }

    if (editingProduct) {
      // Atualizar produto
      const updated = products.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: formData.name,
              description: formData.description,
              price: parseFloat(formData.price),
              category: formData.category,
              imageUrl: formData.imageUrl,
              stock: parseInt(formData.stock),
            }
          : p
      );
      setProducts(updated);
      filterProducts(updated, searchQuery, selectedCategory);
    } else {
      // Criar novo produto
      const newProduct: Product = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        imageUrl: formData.imageUrl,
        stock: parseInt(formData.stock),
        status: 'ACTIVE',
        createdAt: new Date(),
      };
      const updated = [...products, newProduct];
      setProducts(updated);
      filterProducts(updated, searchQuery, selectedCategory);
    }

    setShowForm(false);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      const updated = products.filter((p) => p.id !== productId);
      setProducts(updated);
      filterProducts(updated, searchQuery, selectedCategory);
    }
  };

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[];

  const totalValue = filteredProducts.reduce((sum, p) => sum + p.price * p.stock, 0);
  const totalItems = filteredProducts.reduce((sum, p) => sum + p.stock, 0);

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>📦 Meus Produtos</h1>
        <p>Gerencie seu catálogo de produtos</p>
      </div>

      <div className="products-content">
        {/* Barra de Ferramentas */}
        <Card variant="elevated" className="products-toolbar">
          <div className="toolbar-top">
            <Input
              label="Buscar produtos"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Digite o nome ou descrição..."
            />
            <Button variant="primary" onClick={handleAddProduct}>
              ➕ Novo Produto
            </Button>
          </div>

          <div className="toolbar-filters">
            <button
              className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => handleCategoryFilter('all')}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => handleCategoryFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="toolbar-stats">
            <div className="stat">
              <span className="stat-label">Produtos</span>
              <span className="stat-value">{filteredProducts.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Estoque</span>
              <span className="stat-value">{totalItems}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Valor Total</span>
              <span className="stat-value">R$ {totalValue.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Formulário */}
        {showForm && (
          <Card variant="elevated" className="product-form-card">
            <h2 className="form-title">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <div className="form-grid">
              <Input
                label="Nome do Produto"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Digite o nome..."
              />

              <Input
                label="Preço (R$)"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                step="0.01"
              />

              <Input
                label="Estoque"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
              />

              <Input
                label="Categoria"
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Eletrônicos"
              />

              <Input
                label="URL da Imagem"
                type="text"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="form-textarea">
              <label>Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Digite a descrição do produto..."
                rows={4}
              />
            </div>

            <div className="form-actions">
              <Button variant="primary" onClick={handleSaveProduct}>
                ✓ Salvar
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                ✕ Cancelar
              </Button>
            </div>
          </Card>
        )}

        {/* Lista de Produtos */}
        {filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <Card key={product.id} variant="elevated" className="product-card">
                <div className="product-image">
                  <img src={product.imageUrl} alt={product.name} />
                  <span className="product-status">{product.status}</span>
                </div>

                <div className="product-info">
                  <h3>{product.name}</h3>
                  {product.category && (
                    <span className="product-category">{product.category}</span>
                  )}
                  {product.description && (
                    <p className="product-description">{product.description}</p>
                  )}

                  <div className="product-details">
                    <div className="detail">
                      <span className="detail-label">Preço</span>
                      <span className="detail-value">R$ {product.price.toFixed(2)}</span>
                    </div>
                    <div className="detail">
                      <span className="detail-label">Estoque</span>
                      <span className={`detail-value ${product.stock === 0 ? 'low' : ''}`}>
                        {product.stock}
                      </span>
                    </div>
                  </div>

                  <div className="product-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditProduct(product)}
                    >
                      ✏️ Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      🗑️ Deletar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="elevated" className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">📦</div>
              <h3>Nenhum produto encontrado</h3>
              <p>Crie seu primeiro produto para começar!</p>
              <Button variant="primary" onClick={handleAddProduct}>
                ➕ Criar Produto
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Products;

