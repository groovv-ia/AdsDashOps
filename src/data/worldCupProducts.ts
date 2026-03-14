// Produtos da Loja Copa do Mundo 2026 - Camisetas e Uniformes do Brasil

export type ProductCategory = 'camiseta' | 'uniforme' | 'acessorio';
export type ProductSize = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XGG' | '6' | '8' | '10' | '12' | '14' | '16';
export type ProductColor = 'amarelo' | 'azul' | 'branco' | 'verde' | 'cinza';

export interface ProductVariant {
  size: ProductSize;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  colors: ProductColor[];
  sizes: ProductVariant[];
  badge?: string;
  isNew?: boolean;
  isBestSeller?: boolean;
  rating: number;
  reviewCount: number;
  features: string[];
}

export const worldCupProducts: Product[] = [
  {
    id: 'cbf-home-2026',
    name: 'Camisa Oficial Brasil Copa 2026 - Titular',
    description: 'A camisa titular da Seleção Brasileira para a Copa do Mundo 2026 nos EUA, México e Canadá. Tecido DryFit de alta performance com bordado da CBF e patch oficial da FIFA World Cup 2026.',
    category: 'camiseta',
    price: 349.90,
    originalPrice: 399.90,
    discount: 12,
    image: 'https://via.placeholder.com/400x400/FFD700/009C3B?text=Brasil+2026+Titular',
    colors: ['amarelo'],
    sizes: [
      { size: 'PP', stock: 15 },
      { size: 'P', stock: 28 },
      { size: 'M', stock: 42 },
      { size: 'G', stock: 35 },
      { size: 'GG', stock: 20 },
      { size: 'XGG', stock: 8 },
    ],
    badge: 'Oficial CBF',
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 1247,
    features: [
      'Tecido DryFit anti-suor',
      'Patch oficial FIFA World Cup 2026',
      'Bordado da CBF',
      'Corte regular',
      'Lavável à máquina',
    ],
  },
  {
    id: 'cbf-away-2026',
    name: 'Camisa Oficial Brasil Copa 2026 - Reserva',
    description: 'A camisa reserva azul da Seleção Brasileira para a Copa do Mundo 2026. Design moderno inspirado no céu do Brasil com detalhes em verde e amarelo.',
    category: 'camiseta',
    price: 349.90,
    originalPrice: 399.90,
    discount: 12,
    image: 'https://via.placeholder.com/400x400/003087/FFD700?text=Brasil+2026+Reserva',
    colors: ['azul'],
    sizes: [
      { size: 'PP', stock: 10 },
      { size: 'P', stock: 22 },
      { size: 'M', stock: 38 },
      { size: 'G', stock: 30 },
      { size: 'GG', stock: 15 },
      { size: 'XGG', stock: 5 },
    ],
    badge: 'Oficial CBF',
    isNew: true,
    rating: 4.8,
    reviewCount: 892,
    features: [
      'Tecido DryFit anti-suor',
      'Patch oficial FIFA World Cup 2026',
      'Bordado da CBF',
      'Corte regular',
      'Lavável à máquina',
    ],
  },
  {
    id: 'cbf-gk-2026',
    name: 'Camisa Goleiro Brasil Copa 2026',
    description: 'Camisa oficial do goleiro da Seleção Brasileira para a Copa do Mundo 2026. Tecido especial com proteção extra nos cotovelos.',
    category: 'camiseta',
    price: 379.90,
    image: 'https://via.placeholder.com/400x400/1B5E20/FFFFFF?text=Goleiro+2026',
    colors: ['verde'],
    sizes: [
      { size: 'P', stock: 12 },
      { size: 'M', stock: 18 },
      { size: 'G', stock: 15 },
      { size: 'GG', stock: 8 },
    ],
    badge: 'Goleiro',
    rating: 4.7,
    reviewCount: 344,
    features: [
      'Tecido acolchoado nos cotovelos',
      'Proteção UV 50+',
      'Patch oficial FIFA World Cup 2026',
      'Tecnologia anti-impacto',
    ],
  },
  {
    id: 'cbf-training-2026',
    name: 'Conjunto Treino Brasil Copa 2026',
    description: 'Conjunto completo (camisa + calção) de treino da Seleção Brasileira. Ideal para atividades esportivas com a identidade visual da Copa 2026.',
    category: 'uniforme',
    price: 499.90,
    originalPrice: 599.90,
    discount: 17,
    image: 'https://via.placeholder.com/400x400/009C3B/FFD700?text=Treino+2026',
    colors: ['verde', 'amarelo'],
    sizes: [
      { size: 'PP', stock: 8 },
      { size: 'P', stock: 16 },
      { size: 'M', stock: 24 },
      { size: 'G', stock: 20 },
      { size: 'GG', stock: 12 },
      { size: 'XGG', stock: 4 },
    ],
    badge: 'Kit Completo',
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 567,
    features: [
      'Camisa + Calção inclusos',
      'Tecido respirável',
      'Elástico reforçado no calção',
      'Ideal para treinos',
      'Patch Copa 2026',
    ],
  },
  {
    id: 'cbf-kids-home-2026',
    name: 'Camisa Brasil Copa 2026 - Infantil Titular',
    description: 'A camisa titular da Seleção Brasileira em tamanho infantil. Perfeita para os pequenos torcedores torcerem pelo Brasil na Copa de 2026!',
    category: 'camiseta',
    price: 229.90,
    originalPrice: 259.90,
    discount: 12,
    image: 'https://via.placeholder.com/400x400/FFD700/009C3B?text=Kids+2026',
    colors: ['amarelo'],
    sizes: [
      { size: '6', stock: 20 },
      { size: '8', stock: 25 },
      { size: '10', stock: 30 },
      { size: '12', stock: 22 },
      { size: '14', stock: 15 },
      { size: '16', stock: 10 },
    ],
    badge: 'Infantil',
    isNew: true,
    rating: 4.9,
    reviewCount: 423,
    features: [
      'Tamanho infantil',
      'Tecido macio e confortável',
      'Patch oficial FIFA World Cup 2026',
      'Cores vibrantes que não desbotam',
      'Seguro para crianças (sem peças soltas)',
    ],
  },
  {
    id: 'cbf-kids-away-2026',
    name: 'Camisa Brasil Copa 2026 - Infantil Reserva',
    description: 'A camisa reserva azul da Seleção Brasileira em tamanho infantil para os pequenos torcedores.',
    category: 'camiseta',
    price: 229.90,
    image: 'https://via.placeholder.com/400x400/003087/FFD700?text=Kids+Reserva',
    colors: ['azul'],
    sizes: [
      { size: '6', stock: 15 },
      { size: '8', stock: 20 },
      { size: '10', stock: 25 },
      { size: '12', stock: 18 },
      { size: '14', stock: 12 },
      { size: '16', stock: 8 },
    ],
    badge: 'Infantil',
    rating: 4.7,
    reviewCount: 287,
    features: [
      'Tamanho infantil',
      'Tecido macio e confortável',
      'Patch oficial FIFA World Cup 2026',
      'Cores vibrantes que não desbotam',
    ],
  },
  {
    id: 'cbf-polo-2026',
    name: 'Polo Torcedor Brasil Copa 2026',
    description: 'Camisa polo casual com temática da Copa do Mundo 2026. Perfeita para usar no dia a dia e torcer pelo Brasil.',
    category: 'camiseta',
    price: 189.90,
    image: 'https://via.placeholder.com/400x400/FFD700/000000?text=Polo+2026',
    colors: ['amarelo', 'verde', 'azul'],
    sizes: [
      { size: 'PP', stock: 18 },
      { size: 'P', stock: 30 },
      { size: 'M', stock: 45 },
      { size: 'G', stock: 38 },
      { size: 'GG', stock: 22 },
      { size: 'XGG', stock: 10 },
    ],
    rating: 4.6,
    reviewCount: 198,
    features: [
      'Estilo casual',
      'Logo bordado',
      'Colarinho com botões',
      'Algodão premium',
      '3 opções de cor',
    ],
  },
  {
    id: 'cbf-uniform-full-2026',
    name: 'Uniforme Completo Copa 2026 - Kit Titular',
    description: 'Kit completo do titular: camisa, calção e meias oficiais da Seleção Brasileira para a Copa do Mundo 2026. Igual ao usado pelos jogadores!',
    category: 'uniforme',
    price: 699.90,
    originalPrice: 849.90,
    discount: 18,
    image: 'https://via.placeholder.com/400x400/FFD700/009C3B?text=Kit+Completo+2026',
    colors: ['amarelo', 'azul'],
    sizes: [
      { size: 'PP', stock: 5 },
      { size: 'P', stock: 12 },
      { size: 'M', stock: 18 },
      { size: 'G', stock: 15 },
      { size: 'GG', stock: 8 },
      { size: 'XGG', stock: 3 },
    ],
    badge: 'Kit Pro',
    isBestSeller: true,
    rating: 5.0,
    reviewCount: 156,
    features: [
      'Camisa + Calção + Meias inclusos',
      'Igual ao uniforme dos jogadores',
      'Patch oficial FIFA World Cup 2026',
      'Numeração personalizada disponível',
      'Malha profissional DryFit',
    ],
  },
  {
    id: 'cbf-scarf-2026',
    name: 'Cachecol Brasil Copa do Mundo 2026',
    description: 'Cachecol oficial com as cores do Brasil e estampa comemorativa da Copa do Mundo 2026 nos EUA, México e Canadá.',
    category: 'acessorio',
    price: 89.90,
    image: 'https://via.placeholder.com/400x400/009C3B/FFD700?text=Cachecol+2026',
    colors: ['verde', 'amarelo'],
    sizes: [
      { size: 'M', stock: 100 },
    ],
    isNew: true,
    rating: 4.5,
    reviewCount: 89,
    features: [
      'Material 100% acrílico',
      'Estampa copa 2026',
      'Cores que não desbotam',
      'Tamanho único',
    ],
  },
  {
    id: 'cbf-cap-2026',
    name: 'Boné Brasil Copa do Mundo 2026',
    description: 'Boné com aba reta e logo da Seleção Brasileira bordado. Design exclusivo Copa do Mundo 2026.',
    category: 'acessorio',
    price: 79.90,
    originalPrice: 99.90,
    discount: 20,
    image: 'https://via.placeholder.com/400x400/FFD700/003087?text=Bone+2026',
    colors: ['amarelo', 'verde', 'azul'],
    sizes: [
      { size: 'M', stock: 80 },
    ],
    rating: 4.4,
    reviewCount: 134,
    features: [
      'Aba reta',
      'Ajuste traseiro snapback',
      'Logo bordado',
      'Proteção UV',
      '3 opções de cor',
    ],
  },
];

export const categoryLabels: Record<ProductCategory, string> = {
  camiseta: 'Camisetas',
  uniforme: 'Uniformes',
  acessorio: 'Acessórios',
};

export const colorLabels: Record<ProductColor, string> = {
  amarelo: 'Amarelo',
  azul: 'Azul',
  branco: 'Branco',
  verde: 'Verde',
  cinza: 'Cinza',
};

export const colorHex: Record<ProductColor, string> = {
  amarelo: '#FFD700',
  azul: '#003087',
  branco: '#FFFFFF',
  verde: '#009C3B',
  cinza: '#6B7280',
};
