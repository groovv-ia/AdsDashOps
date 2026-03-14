/**
 * WorldCupStorePage
 *
 * Loja virtual de camisetas e uniformes do Brasil para a Copa do Mundo 2026.
 * Funcionalidades: catálogo de produtos, filtros por categoria, carrinho de compras,
 * seleção de tamanho/cor e resumo de pedido.
 */

import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Star,
  Tag,
  Package,
  Search,
  Filter,
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Trophy,
  Heart,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  worldCupProducts,
  Product,
  ProductCategory,
  ProductSize,
  categoryLabels,
  colorHex,
} from '../../data/worldCupProducts';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface CartItem {
  product: Product;
  size: ProductSize;
  quantity: number;
}

type SortOption = 'relevancia' | 'preco-asc' | 'preco-desc' | 'avaliacao' | 'novidades';

// ─────────────────────────────────────────────
// Componentes internos
// ─────────────────────────────────────────────

/** Badge de desconto/novidade/mais vendido no card */
function ProductBadge({ product }: { product: Product }) {
  if (product.discount) {
    return (
      <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
        -{product.discount}%
      </span>
    );
  }
  if (product.isNew) {
    return (
      <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
        Novo
      </span>
    );
  }
  if (product.isBestSeller) {
    return (
      <span className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
        Mais Vendido
      </span>
    );
  }
  return null;
}

/** Estrelas de avaliação */
function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
          }`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">({reviewCount})</span>
    </div>
  );
}

/** Card de produto */
function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
}) {
  const [wished, setWished] = useState(false);
  const hasStock = product.sizes.some((s) => s.stock > 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 group">
      {/* Imagem */}
      <div className="relative bg-gray-50 aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <ProductBadge product={product} />
        <button
          onClick={() => setWished((w) => !w)}
          className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
        >
          <Heart
            className={`w-4 h-4 ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          />
        </button>
        {product.badge && (
          <span className="absolute bottom-3 right-3 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
            {product.badge}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        {/* Cores disponíveis */}
        <div className="flex gap-1.5 mb-2">
          {product.colors.map((color) => (
            <span
              key={color}
              title={color}
              className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: colorHex[color] }}
            />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">
          {product.name}
        </h3>

        <StarRating rating={product.rating} reviewCount={product.reviewCount} />

        {/* Preço */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-green-700">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              R$ {product.originalPrice.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>

        {/* Parcelas */}
        <p className="text-xs text-gray-500 mt-0.5">
          ou 6x de R$ {(product.price / 6).toFixed(2).replace('.', ',')} sem juros
        </p>

        {/* Botão */}
        <button
          onClick={() => onAddToCart(product)}
          disabled={!hasStock}
          className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
            hasStock
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          {hasStock ? 'Adicionar ao Carrinho' : 'Indisponível'}
        </button>
      </div>
    </div>
  );
}

/** Modal de seleção de tamanho */
function SizePickerModal({
  product,
  onConfirm,
  onClose,
}: {
  product: Product;
  onConfirm: (size: ProductSize) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ProductSize | null>(null);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Selecione o Tamanho</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={product.image}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover bg-gray-50"
            />
            <div>
              <p className="font-semibold text-gray-800 text-sm">{product.name}</p>
              <p className="text-green-700 font-bold">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-3 font-medium">Tamanhos disponíveis:</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(({ size, stock }) => (
              <button
                key={size}
                onClick={() => stock > 0 && setSelected(size)}
                disabled={stock === 0}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                  stock === 0
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : selected === size
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-700 hover:border-green-400'
                }`}
              >
                {size}
                {stock <= 5 && stock > 0 && (
                  <span className="ml-1 text-xs text-amber-500">({stock})</span>
                )}
              </button>
            ))}
          </div>

          {selected && (
            <p className="mt-3 text-xs text-gray-500">
              Estoque:{' '}
              {product.sizes.find((s) => s.size === selected)?.stock ?? 0} unidades
            </p>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Painel do carrinho lateral */
function CartPanel({
  items,
  onClose,
  onUpdateQty,
  onRemove,
}: {
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
}) {
  const [orderPlaced, setOrderPlaced] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 29.90;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    setOrderPlaced(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-md bg-white flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-gray-800">
              Carrinho ({items.reduce((s, i) => s + i.quantity, 0)})
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          {orderPlaced ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Pedido Realizado!</h3>
              <p className="text-gray-500 mb-1">
                Obrigado pela sua compra. Você receberá um e-mail de confirmação em breve.
              </p>
              <p className="text-green-700 font-semibold text-lg mt-2">
                Total: R$ {total.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Previsão de entrega: 5 a 10 dias úteis
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
              >
                Continuar Comprando
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">Seu carrinho está vazio</p>
              <p className="text-gray-400 text-sm mt-1">
                Adicione produtos para torcer pelo Brasil!
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {items.map((item, idx) => (
                <div
                  key={`${item.product.id}-${item.size}-${idx}`}
                  className="flex gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-lg object-cover bg-white flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Tamanho: {item.size}</p>
                    <p className="text-green-700 font-bold text-sm mt-1">
                      R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdateQty(idx, item.quantity - 1)}
                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQty(idx, item.quantity + 1)}
                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onRemove(idx)}
                        className="ml-auto p-1 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo e checkout */}
        {!orderPlaced && items.length > 0 && (
          <div className="border-t border-gray-100 p-5 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Frete</span>
                <span className={shipping === 0 ? 'text-green-600 font-semibold' : ''}>
                  {shipping === 0 ? 'Grátis' : `R$ ${shipping.toFixed(2).replace('.', ',')}`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-amber-600">
                  Frete grátis em compras acima de R$ 500,00
                </p>
              )}
              <div className="flex justify-between font-bold text-gray-800 text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-green-700">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              Finalizar Pedido
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-center text-gray-400">
              Pagamento seguro via PIX, cartão ou boleto
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────

export const WorldCupStorePage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'todos'>('todos');
  const [sortBy, setSortBy] = useState<SortOption>('relevancia');
  const [searchQuery, setSearchQuery] = useState('');

  // Produtos filtrados e ordenados
  const displayedProducts = useMemo(() => {
    let filtered = worldCupProducts;

    if (activeCategory !== 'todos') {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'preco-asc':
        return [...filtered].sort((a, b) => a.price - b.price);
      case 'preco-desc':
        return [...filtered].sort((a, b) => b.price - a.price);
      case 'avaliacao':
        return [...filtered].sort((a, b) => b.rating - a.rating);
      case 'novidades':
        return [...filtered].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      default:
        return [...filtered].sort(
          (a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0)
        );
    }
  }, [activeCategory, sortBy, searchQuery]);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handleAddToCart = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleConfirmSize = (size: ProductSize) => {
    if (!selectedProduct) return;
    setCartItems((prev) => {
      const existing = prev.findIndex(
        (i) => i.product.id === selectedProduct.id && i.size === size
      );
      if (existing >= 0) {
        return prev.map((item, idx) =>
          idx === existing ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product: selectedProduct, size, quantity: 1 }];
    });
    setSelectedProduct(null);
    setCartOpen(true);
  };

  const handleUpdateQty = (index: number, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((_, i) => i !== index));
    } else {
      setCartItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item))
      );
    }
  };

  const handleRemove = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const categories: Array<{ key: ProductCategory | 'todos'; label: string }> = [
    { key: 'todos', label: 'Todos' },
    { key: 'camiseta', label: categoryLabels.camiseta },
    { key: 'uniforme', label: categoryLabels.uniforme },
    { key: 'acessorio', label: categoryLabels.acessorio },
  ];

  return (
    <div className="min-h-full">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-green-800 via-green-700 to-yellow-600 rounded-2xl overflow-hidden mb-6 p-8 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 text-9xl font-black text-white">2026</div>
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-yellow-300" />
              <span className="text-yellow-300 font-semibold text-sm uppercase tracking-wider">
                Copa do Mundo 2026
              </span>
            </div>
            <h1 className="text-3xl font-black mb-2 leading-tight">
              Loja Oficial Brasil
              <br />
              <span className="text-yellow-300">Copa do Mundo 2026</span>
            </h1>
            <p className="text-green-100 text-sm max-w-md">
              Camisetas e uniformes oficiais da Seleção Brasileira para torcer no maior evento
              esportivo do mundo — EUA, México e Canadá.
            </p>
            <div className="flex gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-black text-yellow-300">10+</p>
                <p className="text-xs text-green-200">Produtos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-yellow-300">Grátis</p>
                <p className="text-xs text-green-200">Frete acima R$500</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-yellow-300">6x</p>
                <p className="text-xs text-green-200">Sem juros</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center w-40 h-40 bg-white/10 rounded-full">
            <span className="text-7xl">🇧🇷</span>
          </div>
        </div>
      </div>

      {/* Barra de busca e carrinho */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700"
          >
            <option value="relevancia">Relevância</option>
            <option value="preco-asc">Menor Preço</option>
            <option value="preco-desc">Maior Preço</option>
            <option value="avaliacao">Melhor Avaliação</option>
            <option value="novidades">Novidades</option>
          </select>
        </div>

        <button
          onClick={() => setCartOpen(true)}
          className="relative p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtros de categoria */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {categories.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeCategory === key
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
            }`}
          >
            {key === 'camiseta' && <Tag className="w-3.5 h-3.5" />}
            {key === 'uniforme' && <Package className="w-3.5 h-3.5" />}
            {key === 'acessorio' && <ShoppingBag className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
        <span className="flex-shrink-0 flex items-center text-xs text-gray-400 px-2">
          {displayedProducts.length} produto{displayedProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grade de produtos */}
      {displayedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum produto encontrado</p>
          <p className="text-gray-400 text-sm mt-1">Tente outro termo ou categoria</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('todos');
            }}
            className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-100"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}

      {/* Modal seleção de tamanho */}
      {selectedProduct && (
        <SizePickerModal
          product={selectedProduct}
          onConfirm={handleConfirmSize}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Painel do carrinho */}
      {cartOpen && (
        <CartPanel
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
};
