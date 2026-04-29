/**
 * EngagementBreakdownChart
 *
 * Grafico de barras empilhadas mostrando a composicao do engajamento:
 * curtidas, comentarios, compartilhamentos e salvamentos por dia.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';
import { Heart } from 'lucide-react';

interface EngagementDataPoint {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

interface EngagementBreakdownChartProps {
  data: EngagementDataPoint[];
  loading?: boolean;
}

// Formata datas curtas para o eixo X
function formatAxisDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

// Tooltip personalizado
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-[140px]">
      <p className="text-gray-500 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
            <span className="text-gray-600">{p.name}</span>
          </span>
          <span className="font-medium text-gray-900">{p.value.toLocaleString('pt-BR')}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between">
        <span className="text-gray-500">Total</span>
        <span className="font-semibold text-gray-900">{total.toLocaleString('pt-BR')}</span>
      </div>
    </div>
  );
};

export const EngagementBreakdownChart: React.FC<EngagementBreakdownChartProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">Composicao do Engajamento</h3>
        </div>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-4 h-4 text-rose-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Composicao do Engajamento</h3>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          Sem dados de engajamento no periodo.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-4 h-4 text-rose-500" />
        <h3 className="font-semibold text-gray-900 text-sm">Composicao do Engajamento</h3>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="likes" name="Curtidas" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
          <Bar dataKey="comments" name="Comentarios" stackId="a" fill="#3b82f6" />
          <Bar dataKey="shares" name="Compartilhamentos" stackId="a" fill="#10b981" />
          <Bar dataKey="saves" name="Salvamentos" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
