/**
 * PermissionsScopeDisplay
 *
 * Componente reutilizavel para exibir permissoes (scopes) da Meta de forma
 * organizada, agrupada por categoria, com suporte a:
 * - Estado colapsado (mostra primeiras N permissoes + botao "+X mais")
 * - Estado expandido com agrupamento por categoria
 * - Busca por permissao
 * - Indicacao de permissoes obrigatorias e recomendadas ausentes
 * - Descricao legivel de cada permissao via tooltip
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  FileText,
  Camera,
  Building2,
  MessageCircle,
  Settings,
} from 'lucide-react';
import {
  categorizeScopes,
  getCategoryMeta,
  getPermissionInfo,
  getMissingRequired,
  getMissingRecommended,
  REQUIRED_SCOPES,
  RECOMMENDED_SCOPES,
  PermissionCategory,
  PermissionInfo,
} from '../../constants/metaPermissions';

// ============================================================
// TIPOS
// ============================================================

interface PermissionsScopeDisplayProps {
  /** Lista de scopes concedidos */
  scopes: string[];
  /** Scopes obrigatorios — destaca os que faltam em vermelho */
  requiredScopes?: string[];
  /** Scopes recomendados — destaca os que faltam em amarelo */
  recommendedScopes?: string[];
  /** Quantas badges mostrar antes do botao "+N mais" (default: 5) */
  initialVisibleCount?: number;
  /** Se true, mostra alerta quando scopes obrigatorios/recomendados faltam */
  showMissingIndicator?: boolean;
  /** Se true, mostra apenas contagem (para layouts compactos) */
  compact?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

// ============================================================
// MAPEAMENTO DE ICONES POR CATEGORIA
// ============================================================

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  BarChart3: <BarChart3 className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  Camera: <Camera className="w-4 h-4" />,
  Building2: <Building2 className="w-4 h-4" />,
  MessageCircle: <MessageCircle className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
};

// Cores dos badges por variante de categoria
const VARIANT_CLASSES: Record<string, { badge: string; header: string }> = {
  primary: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    header: 'text-blue-700 bg-blue-50/50',
  },
  success: {
    badge: 'bg-green-50 text-green-700 border-green-200',
    header: 'text-green-700 bg-green-50/50',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    header: 'text-amber-700 bg-amber-50/50',
  },
  info: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    header: 'text-cyan-700 bg-cyan-50/50',
  },
  default: {
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    header: 'text-slate-700 bg-slate-50/50',
  },
  gray: {
    badge: 'bg-gray-50 text-gray-600 border-gray-200',
    header: 'text-gray-600 bg-gray-50/50',
  },
  danger: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    header: 'text-red-700 bg-red-50/50',
  },
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const PermissionsScopeDisplay: React.FC<PermissionsScopeDisplayProps> = ({
  scopes,
  requiredScopes = REQUIRED_SCOPES,
  recommendedScopes = RECOMMENDED_SCOPES,
  initialVisibleCount = 5,
  showMissingIndicator = true,
  compact = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Calcula permissoes ausentes
  const missingRequired = useMemo(
    () => getMissingRequired(scopes),
    [scopes]
  );
  const missingRecommended = useMemo(
    () => getMissingRecommended(scopes),
    [scopes]
  );

  // Agrupa scopes por categoria
  const categorized = useMemo(() => categorizeScopes(scopes), [scopes]);

  // Prioriza required scopes no modo colapsado
  const prioritizedScopes = useMemo(() => {
    const required = scopes.filter(s => requiredScopes.includes(s));
    const recommended = scopes.filter(s => recommendedScopes.includes(s) && !requiredScopes.includes(s));
    const others = scopes.filter(s => !requiredScopes.includes(s) && !recommendedScopes.includes(s));
    return [...required, ...recommended, ...others];
  }, [scopes, requiredScopes, recommendedScopes]);

  // Filtra permissoes por busca no modo expandido
  const filteredCategorized = useMemo(() => {
    if (!searchTerm.trim()) return categorized;

    const term = searchTerm.toLowerCase();
    const filtered = new Map<PermissionCategory, PermissionInfo[]>();

    for (const [category, perms] of categorized) {
      const matching = perms.filter(
        p => p.scope.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
      );
      if (matching.length > 0) {
        filtered.set(category, matching);
      }
    }
    return filtered;
  }, [categorized, searchTerm]);

  // Total de permissoes
  const totalCount = scopes.length;
  const hasMissingRequired = missingRequired.length > 0;
  const hasMissingRecommended = missingRecommended.length > 0;

  // Modo compacto: apenas contagem
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Shield className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {totalCount} permiss{totalCount === 1 ? 'ao' : 'oes'} concedida{totalCount === 1 ? '' : 's'}
        </span>
        {hasMissingRequired && (
          <span className="flex items-center gap-1 text-xs text-red-600">
            <ShieldAlert className="w-3.5 h-3.5" />
            {missingRequired.length} obrigatoria{missingRequired.length > 1 ? 's' : ''} ausente{missingRequired.length > 1 ? 's' : ''}
          </span>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
        >
          {expanded ? 'Ocultar' : 'Ver detalhes'}
        </button>
        {expanded && (
          <div className="absolute mt-2 z-10">
            {renderExpandedContent()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Indicador de permissoes ausentes */}
      {showMissingIndicator && hasMissingRequired && (
        <div className="flex items-start gap-2 mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-800">
              {missingRequired.length} permiss{missingRequired.length > 1 ? 'oes obrigatorias ausentes' : 'ao obrigatoria ausente'}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {missingRequired.join(', ')}
            </p>
          </div>
        </div>
      )}

      {showMissingIndicator && !hasMissingRequired && hasMissingRecommended && (
        <div className="flex items-start gap-2 mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-800">
              {missingRecommended.length} permiss{missingRecommended.length > 1 ? 'oes recomendadas ausentes' : 'ao recomendada ausente'}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {missingRecommended.join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Cabecalho com contagem */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700">
            {totalCount} permiss{totalCount === 1 ? 'ao' : 'oes'} concedida{totalCount === 1 ? '' : 's'}
          </span>
          {!hasMissingRequired && totalCount > 0 && (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          )}
        </div>
        {totalCount > initialVisibleCount && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Recolher
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Ver todas
              </>
            )}
          </button>
        )}
      </div>

      {/* Estado colapsado: mostra as primeiras N permissoes */}
      {!expanded && (
        <div className="flex flex-wrap items-center gap-1.5">
          {prioritizedScopes.slice(0, initialVisibleCount).map(scope => (
            <PermissionBadge
              key={scope}
              scope={scope}
              isRequired={requiredScopes.includes(scope)}
              isRecommended={recommendedScopes.includes(scope)}
            />
          ))}
          {totalCount > initialVisibleCount && (
            <button
              onClick={() => setExpanded(true)}
              className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              +{totalCount - initialVisibleCount} mais
            </button>
          )}
        </div>
      )}

      {/* Estado expandido: agrupado por categoria com busca */}
      {expanded && renderExpandedContent()}
    </div>
  );

  /** Renderiza o conteudo expandido com categorias e busca */
  function renderExpandedContent() {
    return (
      <div className="mt-3 space-y-3">
        {/* Campo de busca */}
        {totalCount > 10 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar permissao..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>
        )}

        {/* Permissoes ausentes (obrigatorias) */}
        {hasMissingRequired && (
          <CategorySection
            icon={<ShieldAlert className="w-4 h-4" />}
            label="Ausentes (obrigatorias)"
            count={missingRequired.length}
            headerClass="text-red-700 bg-red-50/50"
          >
            {missingRequired.map(scope => (
              <MissingBadge key={scope} scope={scope} variant="required" />
            ))}
          </CategorySection>
        )}

        {/* Permissoes ausentes (recomendadas) */}
        {hasMissingRecommended && (
          <CategorySection
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Ausentes (recomendadas)"
            count={missingRecommended.length}
            headerClass="text-amber-700 bg-amber-50/50"
          >
            {missingRecommended.map(scope => (
              <MissingBadge key={scope} scope={scope} variant="recommended" />
            ))}
          </CategorySection>
        )}

        {/* Categorias de permissoes concedidas */}
        {[...filteredCategorized.entries()].map(([categoryId, perms]) => {
          const meta = getCategoryMeta(categoryId);
          const variantStyle = VARIANT_CLASSES[meta.badgeVariant] || VARIANT_CLASSES.gray;
          const icon = CATEGORY_ICONS[meta.icon] || <Settings className="w-4 h-4" />;

          return (
            <CategorySection
              key={categoryId}
              icon={icon}
              label={meta.label}
              count={perms.length}
              headerClass={variantStyle.header}
            >
              {perms.map(perm => (
                <PermissionBadge
                  key={perm.scope}
                  scope={perm.scope}
                  isRequired={requiredScopes.includes(perm.scope)}
                  isRecommended={recommendedScopes.includes(perm.scope)}
                  showDescription
                />
              ))}
            </CategorySection>
          );
        })}

        {/* Sem resultados de busca */}
        {filteredCategorized.size === 0 && searchTerm.trim() && (
          <p className="text-xs text-gray-500 text-center py-3">
            Nenhuma permissao encontrada para "{searchTerm}"
          </p>
        )}

        {/* Botao recolher no final */}
        <div className="flex justify-center pt-1">
          <button
            onClick={() => { setExpanded(false); setSearchTerm(''); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            Recolher
          </button>
        </div>
      </div>
    );
  }
};

// ============================================================
// SUBCOMPONENTES
// ============================================================

/** Secao de categoria com cabecalho e badges */
const CategorySection: React.FC<{
  icon: React.ReactNode;
  label: string;
  count: number;
  headerClass: string;
  children: React.ReactNode;
}> = ({ icon, label, count, headerClass, children }) => (
  <div className="rounded-lg border border-gray-100 overflow-hidden">
    <div className={`flex items-center gap-2 px-3 py-1.5 ${headerClass}`}>
      {icon}
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-xs opacity-70">({count})</span>
    </div>
    <div className="flex flex-wrap gap-1.5 p-2.5">
      {children}
    </div>
  </div>
);

/** Badge individual de permissao concedida */
const PermissionBadge: React.FC<{
  scope: string;
  isRequired?: boolean;
  isRecommended?: boolean;
  showDescription?: boolean;
}> = ({ scope, isRequired, isRecommended, showDescription }) => {
  const info = getPermissionInfo(scope);
  const meta = getCategoryMeta(info.category);
  const variantStyle = VARIANT_CLASSES[meta.badgeVariant] || VARIANT_CLASSES.gray;

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border font-medium
        ${variantStyle.badge}
        ${isRequired ? 'ring-1 ring-blue-400/50' : ''}
      `}
      title={showDescription ? info.description : `${info.description} (${meta.label})`}
    >
      {isRequired && <Shield className="w-3 h-3 opacity-60" />}
      {isRecommended && !isRequired && <CheckCircle className="w-3 h-3 opacity-60" />}
      {scope}
    </span>
  );
};

/** Badge de permissao ausente */
const MissingBadge: React.FC<{
  scope: string;
  variant: 'required' | 'recommended';
}> = ({ scope, variant }) => {
  const info = getPermissionInfo(scope);
  const isRequired = variant === 'required';

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border font-medium
        ${isRequired
          ? 'bg-red-50 text-red-700 border-red-300 border-dashed'
          : 'bg-amber-50 text-amber-700 border-amber-300 border-dashed'}
      `}
      title={info.description}
    >
      {isRequired ? <ShieldAlert className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {scope}
      <span className="opacity-60 ml-0.5">(ausente)</span>
    </span>
  );
};
