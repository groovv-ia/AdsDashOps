/**
 * Tipos relacionados à interface do usuário
 *
 * Define interfaces e tipos para componentes UI,
 * estados visuais e interações do usuário.
 */

/**
 * Tamanhos padrão de componentes UI
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Variantes de cor/estilo para componentes
 */
export type Variant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'ghost'
  | 'outline';

/**
 * Estados de loading/carregamento
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Posições para componentes flutuantes (tooltips, dropdowns, etc)
 */
export type Position =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

/**
 * Direções de alinhamento
 */
export type Alignment = 'left' | 'center' | 'right' | 'justify';

/**
 * Orientação de componentes
 */
export type Orientation = 'horizontal' | 'vertical';

/**
 * Interface para estado de paginação
 */
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Interface para estado de ordenação
 */
export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Interface para opções de filtro
 */
export interface FilterOption {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
  value: any;
}

/**
 * Interface para item de breadcrumb
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
}

/**
 * Interface para item de menu/navegação
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  disabled?: boolean;
  children?: MenuItem[];
}

/**
 * Interface para item de tab
 */
export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

/**
 * Interface para notificação toast
 */
export interface ToastNotification {
  id: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  onClose?: () => void;
}

/**
 * Interface para modal/dialog
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
}

/**
 * Interface para tema da aplicação
 */
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontSize: 'sm' | 'md' | 'lg';
  compactMode: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
}

/**
 * Interface para configurações de visualização
 */
export interface ViewSettings {
  density: 'comfortable' | 'compact' | 'spacious';
  showImages: boolean;
  showDescriptions: boolean;
  columns: number;
}

/**
 * Interface para estado de formulário
 */
export interface FormState<T = any> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Interface para campo de formulário
 */
export interface FormField<T = any> {
  name: keyof T;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  validation?: (value: any) => string | undefined;
  options?: Array<{ value: any; label: string }>;
}

/**
 * Interface para ação de contexto (menu de contexto)
 */
export interface ContextAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

/**
 * Interface para item de timeline
 */
export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  completed?: boolean;
}

/**
 * Interface para estatística/métrica
 */
export interface StatCard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  trend?: Array<{ date: string; value: number }>;
}

/**
 * Interface para gráfico/chart
 */
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

/**
 * Tipo para callback de mudança de valor
 */
export type OnChangeCallback<T = any> = (value: T) => void;

/**
 * Tipo para callback de evento
 */
export type EventCallback<T = any> = (event: T) => void;

/**
 * Interface para drag and drop
 */
export interface DragDropItem {
  id: string;
  type: string;
  data: any;
}

/**
 * Interface para configuração de coluna de tabela
 */
export interface TableColumn<T = any> {
  id: string;
  header: string;
  accessor?: keyof T | ((row: T) => any);
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
}

/**
 * Interface para ações em massa de tabela
 */
export interface BulkAction<T = any> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedItems: T[]) => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

/**
 * Tipo para callback de seleção
 */
export type SelectionCallback<T = any> = (selectedItems: T[]) => void;
