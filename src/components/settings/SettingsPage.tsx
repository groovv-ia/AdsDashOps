import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, loading, updateSettings } = useSystemSettings();

  if (loading || !settings) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
        <p className="text-gray-600 mt-1">Personalize sua experiência no dashboard</p>
      </div>

      <Card title="Preferências Gerais" padding="medium">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.auto_refresh}
                onChange={(e) => updateSettings({ auto_refresh: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Atualização automática</span>
            </label>
          </div>

          {settings.auto_refresh && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo de atualização (minutos)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.refresh_interval}
                onChange={(e) => updateSettings({ refresh_interval: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button variant="primary" icon={<Save className="w-4 h-4" />}>
            Salvar Alterações
          </Button>
        </div>
      </Card>
    </div>
  );
};
