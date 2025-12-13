import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Users, Check } from 'lucide-react';
import { useClient } from '../../contexts/ClientContext';

// Componente de seletor de cliente que aparece na navegação principal
export function ClientSelector() {
  const { selectedClient, clients, selectClient, loading } = useClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handler para selecionar um cliente
  const handleSelectClient = (clientId: string | null) => {
    if (clientId === null) {
      selectClient(null);
    } else {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        selectClient(client);
      }
    }
    setIsOpen(false);
  };

  // Texto a ser exibido no botão
  const displayText = selectedClient ? selectedClient.name : 'Todos os Clientes';

  if (loading) {
    return (
      <div className="px-4 py-2 text-gray-500 text-sm">
        Carregando clientes...
      </div>
    );
  }

  // Se não há clientes, não mostra o seletor
  if (clients.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão principal do seletor */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {displayText}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Menu dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[250px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {/* Opção "Todos os Clientes" */}
          <button
            onClick={() => handleSelectClient(null)}
            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              !selectedClient ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Todos os Clientes
                </div>
                <div className="text-xs text-gray-500">
                  Visualizar dados agregados
                </div>
              </div>
            </div>
            {!selectedClient && (
              <Check className="w-4 h-4 text-blue-600" />
            )}
          </button>

          {/* Separador */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

          {/* Lista de clientes */}
          <div className="py-1">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelectClient(client.id)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedClient?.id === client.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {client.name}
                  </div>
                  {client.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {client.description}
                    </div>
                  )}
                </div>
                {selectedClient?.id === client.id && (
                  <Check className="w-4 h-4 text-blue-600 ml-2 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Informação sobre quantidade de clientes */}
          {clients.length > 0 && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              <div className="px-4 py-2 text-xs text-gray-500 text-center">
                {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
