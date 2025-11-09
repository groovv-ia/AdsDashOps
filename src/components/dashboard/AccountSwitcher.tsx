/**
 * Componente para alternar entre contas de anúncios conectadas
 *
 * Permite ao usuário selecionar qual conta deseja visualizar no dashboard.
 * Apenas uma conta pode estar ativa por vez.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import { DataConnection } from '../../hooks/useDataConnections';

interface AccountSwitcherProps {
  // Lista de todas as conexões disponíveis
  connections: DataConnection[];

  // Conexão atualmente ativa
  activeConnection: DataConnection | null;

  // Callback quando usuário seleciona uma conta
  onSelectConnection: (connectionId: string) => void;

  // Callback para sincronizar conta manualmente
  onSyncConnection?: (connectionId: string) => void;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({
  connections,
  activeConnection,
  onSelectConnection,
  onSyncConnection
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Retorna ícone de status baseado no estado da conexão
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'syncing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Retorna cor do badge de status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'syncing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Retorna texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'syncing':
        return 'Sincronizando';
      case 'error':
        return 'Erro';
      case 'disconnected':
        return 'Desconectado';
      default:
        return status;
    }
  };

  // Formata data da última sincronização
  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Nunca sincronizado';

    const date = new Date(lastSync);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  // Manipula seleção de conta
  const handleSelectConnection = (connectionId: string) => {
    onSelectConnection(connectionId);
    setIsOpen(false);
  };

  // Manipula sincronização manual
  const handleSync = (e: React.MouseEvent, connectionId: string) => {
    e.stopPropagation();
    if (onSyncConnection) {
      onSyncConnection(connectionId);
    }
  };

  if (!activeConnection) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm"
      >
        {/* Ícone da plataforma */}
        <img
          src={activeConnection.logo}
          alt={activeConnection.platform}
          className="w-8 h-8 object-contain"
        />

        {/* Informações da conta */}
        <div className="flex flex-col items-start min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-900 truncate max-w-xs">
              {activeConnection.name}
            </span>
            {getStatusIcon(activeConnection.status)}
          </div>
          <span className="text-xs text-gray-500">
            {formatLastSync(activeConnection.last_sync)}
          </span>
        </div>

        {/* Indicador de dropdown */}
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown de contas */}
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu dropdown */}
          <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 max-h-[500px] overflow-y-auto">
            {/* Header do dropdown */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Contas Conectadas</h3>
              <p className="text-xs text-gray-600 mt-1">
                Selecione a conta que deseja visualizar
              </p>
            </div>

            {/* Lista de conexões */}
            <div className="py-2">
              {connections.map((connection) => {
                const isActive = connection.id === activeConnection.id;

                return (
                  <button
                    key={connection.id}
                    onClick={() => handleSelectConnection(connection.id)}
                    className={`w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                      isActive ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        {/* Ícone da plataforma */}
                        <img
                          src={connection.logo}
                          alt={connection.platform}
                          className="w-10 h-10 object-contain flex-shrink-0"
                        />

                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">
                              {connection.name}
                            </span>
                            {isActive && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                Ativa
                              </span>
                            )}
                          </div>

                          {/* Plataforma e status */}
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs text-gray-600">
                              {connection.platform}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${getStatusColor(connection.status)}`}>
                              {getStatusText(connection.status)}
                            </span>
                          </div>

                          {/* Última sincronização */}
                          <div className="text-xs text-gray-500">
                            {formatLastSync(connection.last_sync)}
                          </div>

                          {/* ID da conta */}
                          {connection.config?.accountId && (
                            <div className="text-xs text-gray-400 mt-1">
                              ID: {connection.config.accountId}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botão de sincronização */}
                      {connection.status === 'connected' && onSyncConnection && (
                        <button
                          onClick={(e) => handleSync(e, connection.id)}
                          className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Sincronizar agora"
                        >
                          <RefreshCw className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer com ações */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Aqui você pode adicionar navegação para página de gerenciar conexões
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium text-center py-2 hover:bg-blue-50 rounded transition-colors"
              >
                Gerenciar Conexões
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
