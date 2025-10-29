import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { platformOptions } from '../../data/mockData';

export const DataSources: React.FC = () => {
  const connectedSources = [
    { platform: 'meta', connected: true, lastSync: '2024-10-29 10:30' },
    { platform: 'google', connected: false, lastSync: null },
    { platform: 'tiktok', connected: false, lastSync: null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fontes de Dados</h2>
          <p className="text-gray-600 mt-1">Conecte suas plataformas de publicidade para sincronizar dados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformOptions.map(platform => {
          const source = connectedSources.find(s => s.platform === platform.value);
          const isConnected = source?.connected || false;

          return (
            <Card key={platform.value} padding="medium">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <img src={platform.icon} alt={platform.label} className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{platform.label}</h3>
                    <div className={'flex items-center mt-1 text-sm ' + (isConnected ? 'text-green-600' : 'text-gray-500')}>
                      {isConnected ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                      <span>{isConnected ? 'Conectado' : 'Não conectado'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {isConnected && source?.lastSync && (
                <p className="text-xs text-gray-500 mb-4">Última sincronização: {source.lastSync}</p>
              )}

              <Button
                variant={isConnected ? 'outline' : 'primary'}
                size="medium"
                fullWidth
                icon={!isConnected ? <Plus className="w-4 h-4" /> : undefined}
              >
                {isConnected ? 'Reconfigurar' : 'Conectar'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
