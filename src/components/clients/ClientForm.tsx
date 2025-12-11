import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Client } from '../../contexts/ClientContext';
import { Button } from '../ui/Button';

// Props do componente ClientForm
interface ClientFormProps {
  // Cliente a ser editado (null para criar novo)
  client?: Client | null;
  // Callback chamado ao salvar
  onSave: (name: string, description: string) => Promise<boolean>;
  // Callback chamado ao cancelar
  onCancel: () => void;
  // Indicador de carregamento durante o salvamento
  loading?: boolean;
}

// Componente de formulário para criar ou editar clientes
export function ClientForm({ client, onSave, onCancel, loading = false }: ClientFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Preenche o formulário se estiver editando um cliente existente
  useEffect(() => {
    if (client) {
      setName(client.name);
      setDescription(client.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [client]);

  // Handler do submit do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação básica
    if (!name.trim()) {
      setError('O nome do cliente é obrigatório');
      return;
    }

    if (name.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres');
      return;
    }

    if (name.trim().length > 100) {
      setError('O nome não pode ter mais de 100 caracteres');
      return;
    }

    try {
      setIsSaving(true);
      const success = await onSave(name.trim(), description.trim());

      if (success) {
        // Formulário será fechado pelo componente pai
        setName('');
        setDescription('');
      } else {
        setError('Erro ao salvar o cliente. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao salvar o cliente. Tente novamente.');
      console.error('Error saving client:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loading || isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campo de nome */}
      <div>
        <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nome do Cliente *
        </label>
        <input
          id="client-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          placeholder="Ex: Empresa ABC, Cliente XYZ"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white"
          maxLength={100}
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          {name.length}/100 caracteres
        </p>
      </div>

      {/* Campo de descrição */}
      <div>
        <label htmlFor="client-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descrição (opcional)
        </label>
        <textarea
          id="client-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          placeholder="Adicione notas ou informações adicionais sobre o cliente"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white resize-none"
          maxLength={500}
        />
        <p className="mt-1 text-xs text-gray-500">
          {description.length}/500 caracteres
        </p>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading || !name.trim()}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {client ? 'Salvar Alterações' : 'Criar Cliente'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
