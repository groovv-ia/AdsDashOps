/**
 * DynamicDataTable - Tabela de dados dinâmica
 *
 * Exibe dados em formato de tabela com ordenação, paginação
 * e formatação automática baseada no tipo de dado.
 */

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';

// ============================================
// Tipos
// ============================================

interface DynamicDataTableProps {
  title: string;
  description?: string;
  data: Record<string, any>[];
  columns: string[];
  pageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}

// ============================================
// Utilitários
// ============================================

/** Formata nome de campo para cabeçalho */
function formatColumnHeader(field: string): string {
  const translations: Record<string, string> = {
    spend: 'Gasto',
    impressions: 'Impressões',
    clicks: 'Cliques',
    reach: 'Alcance',
    frequency: 'Frequência',
    conversions: 'Conversões',
    conversion_value: 'Valor Conv.',
    ctr: 'CTR',
    cpc: 'CPC',
    cpm: 'CPM',
    cpp: 'CPP',
    roas: 'ROAS',
    cost_per_result: 'Custo/Resultado',
    campaign_name: 'Campanha',
    adset_name: 'Conjunto',
    ad_name: 'Anúncio',
    date_start: 'Data',
    age: 'Idade',
    gender: 'Gênero',
    country: 'País',
    region: 'Região',
    device_platform: 'Dispositivo',
  };

  return translations[field.toLowerCase()] ||
         field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Formata valor da célula baseado no tipo */
function formatCellValue(value: any, column: string): string {
  if (value === null || value === undefined) return '-';

  const columnLower = column.toLowerCase();

  // Datas
  if (columnLower.includes('date')) {
    try {
      return new Date(value).toLocaleDateString('pt-BR');
    } catch {
      return String(value);
    }
  }

  // Valores monetários
  if (columnLower.includes('spend') || columnLower.includes('cost') ||
      columnLower.includes('value') || columnLower.includes('cpc') ||
      columnLower.includes('cpm') || columnLower.includes('cpp')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return String(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  }

  // Percentuais
  if (columnLower.includes('ctr') || columnLower.includes('rate')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return String(value);
    return `${num.toFixed(2)}%`;
  }

  // ROAS e decimais
  if (columnLower.includes('roas') || columnLower.includes('frequency')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return String(value);
    return num.toFixed(2);
  }

  // Números grandes
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  return String(value);
}

/** Compara valores para ordenação */
function compareValues(a: any, b: any, column: string): number {
  const columnLower = column.toLowerCase();

  // Datas
  if (columnLower.includes('date')) {
    return new Date(a).getTime() - new Date(b).getTime();
  }

  // Números
  const numA = typeof a === 'number' ? a : parseFloat(a);
  const numB = typeof b === 'number' ? b : parseFloat(b);

  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  // Strings
  return String(a).localeCompare(String(b), 'pt-BR');
}

// ============================================
// Componente
// ============================================

export function DynamicDataTable({
  title,
  description,
  data,
  columns,
  pageSize = 10,
  initialSortBy,
  initialSortOrder = 'desc',
}: DynamicDataTableProps) {
  // Estado de ordenação
  const [sortBy, setSortBy] = useState<string | null>(initialSortBy || columns[0] || null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  // Estado de paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Dados ordenados
  const sortedData = useMemo(() => {
    if (!sortBy) return data;

    return [...data].sort((a, b) => {
      const result = compareValues(a[sortBy], b[sortBy], sortBy);
      return sortOrder === 'asc' ? result : -result;
    });
  }, [data, sortBy, sortOrder]);

  // Dados paginados
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Total de páginas
  const totalPages = Math.ceil(data.length / pageSize);

  // Handler de clique no cabeçalho
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Ícone de ordenação
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-300" />;
    }
    return sortOrder === 'asc'
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <Card className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map(column => (
                <th
                  key={column}
                  className="px-3 py-2 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{formatColumnHeader(column)}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {columns.map(column => (
                  <td key={column} className="px-3 py-2 text-gray-700">
                    {formatCellValue(row[column], column)}
                  </td>
                ))}
              </tr>
            ))}

            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  Nenhum dado disponível
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="text-sm text-gray-500">
            Mostrando {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, data.length)} de {data.length}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
