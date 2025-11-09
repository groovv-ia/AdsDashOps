import React, { useState, useEffect } from 'react';
import { Search, Loader, AlertCircle, Building2 } from 'lucide-react';
import { AdAccountCard } from './AdAccountCard';
import { Button } from '../ui/Button';

/**
 * Interface para informações da conta de anúncios do Meta
 */
interface MetaAccount {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  currency: string;
  // Campos adicionais que vêm da API do Meta
  amount_spent?: string;
  balance?: string;
  business?: {
    id: string;
    name: string;
  };
}

/**
 * Props do componente MetaAccountSelector
 */
interface MetaAccountSelectorProps {
  accessToken: string;
  onAccountSelect: (account: MetaAccount) => void;
  onBack?: () => void;
  loading?: boolean;
}

/**
 * Componente para selecionar uma conta de anúncios do Meta
 *
 * Fluxo:
 * 1. Busca todas as contas disponíveis via Meta Graph API
 * 2. Exibe contas em formato de cards com informações relevantes
 * 3. Usuário seleciona uma conta
 * 4. Callback é chamado com os dados da conta selecionada
 *
 * @param accessToken - Token de acesso OAuth do Meta
 * @param onAccountSelect - Callback ao selecionar uma conta
 * @param onBack - Callback para voltar à etapa anterior
 * @param loading - Estado de loading externo
 */
export const MetaAccountSelector: React.FC<MetaAccountSelectorProps> = ({
  accessToken,
  onAccountSelect,
  onBack,
  loading: externalLoading = false
}) => {
  // Estados do componente
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<MetaAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca todas as contas de anúncios disponíveis na API do Meta
   */
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Busca contas com campos relevantes
        const fields = 'id,name,account_id,account_status,currency,amount_spent,balance,business';
        const url = `https://graph.facebook.com/v19.0/me/adaccounts?fields=${fields}&access_token=${accessToken}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || 'Erro ao buscar contas de anúncios');
        }

        const accountsList = data.data || [];

        if (accountsList.length === 0) {
          setError('Nenhuma conta de anúncios encontrada. Certifique-se de ter acesso a pelo menos uma conta no Meta Business Manager.');
          setAccounts([]);
          setFilteredAccounts([]);
        } else {
          setAccounts(accountsList);
          setFilteredAccounts(accountsList);
        }
      } catch (err: any) {
        console.error('Erro ao buscar contas:', err);
        setError(err.message || 'Erro ao buscar contas de anúncios');
        setAccounts([]);
        setFilteredAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchAccounts();
    }
  }, [accessToken]);

  /**
   * Filtra contas baseado no termo de busca
   */
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAccounts(accounts);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = accounts.filter(account =>
      account.name.toLowerCase().includes(term) ||
      account.account_id.toLowerCase().includes(term) ||
      account.id.toLowerCase().includes(term)
    );

    setFilteredAccounts(filtered);
  }, [searchTerm, accounts]);

  /**
   * Busca informações detalhadas de uma conta específica
   * incluindo total de campanhas e campanhas ativas
   */
  const fetchAccountDetails = async (accountId: string) => {
    try {
      // Busca total de campanhas
      const campaignsUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns?fields=id,status&access_token=${accessToken}`;
      const campaignsResponse = await fetch(campaignsUrl);
      const campaignsData = await campaignsResponse.json();

      if (campaignsData.error) {
        console.error('Erro ao buscar campanhas:', campaignsData.error);
        return { total_campaigns: 0, active_campaigns: 0 };
      }

      const campaigns = campaignsData.data || [];
      const activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE').length;

      return {
        total_campaigns: campaigns.length,
        active_campaigns: activeCampaigns
      };
    } catch (err) {
      console.error('Erro ao buscar detalhes da conta:', err);
      return { total_campaigns: 0, active_campaigns: 0 };
    }
  };

  /**
   * Handler para seleção de conta
   */
  const handleAccountClick = (account: MetaAccount) => {
    setSelectedAccountId(account.id);
  };

  /**
   * Handler para confirmar seleção e avançar
   */
  const handleConfirmSelection = async () => {
    if (!selectedAccountId) return;

    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount) return;

    setLoading(true);
    try {
      // Busca detalhes adicionais da conta antes de confirmar
      const details = await fetchAccountDetails(selectedAccount.id);

      // Adiciona detalhes ao objeto da conta
      const accountWithDetails = {
        ...selectedAccount,
        ...details
      };

      onAccountSelect(accountWithDetails);
    } catch (err) {
      console.error('Erro ao confirmar seleção:', err);
      setError('Erro ao processar seleção da conta');
      setLoading(false);
    }
  };

  /**
   * Renderiza estado de loading
   */
  if (loading || externalLoading) {
    return (
      <div className="text-center py-12">
        <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Buscando suas contas de anúncios...</p>
        <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  /**
   * Renderiza estado de erro
   */
  if (error && accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <p className="text-red-800 mb-2 font-medium">Erro ao carregar contas</p>
        <p className="text-gray-600 mb-4">{error}</p>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Selecione uma Conta de Anúncios
        </h2>
        <p className="text-gray-600 mb-1">
          Escolha a conta Meta que deseja conectar
        </p>
        <p className="text-sm text-gray-500">
          {accounts.length} {accounts.length === 1 ? 'conta encontrada' : 'contas encontradas'}
        </p>
      </div>

      {/* Barra de busca */}
      {accounts.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou ID da conta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Grid de contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((account) => (
          <AdAccountCard
            key={account.id}
            account={{
              id: account.id,
              account_id: account.account_id,
              account_name: account.name,
              account_status: account.account_status.toString(),
              total_campaigns: 0, // Será preenchido ao confirmar seleção
              active_campaigns: 0, // Será preenchido ao confirmar seleção
              account_type: 'PERSONAL', // Padrão, pode ser customizado depois
              currency: account.currency
            }}
            isSelected={selectedAccountId === account.id}
            onClick={() => handleAccountClick(account)}
            disabled={loading}
          />
        ))}
      </div>

      {/* Mensagem quando busca não retorna resultados */}
      {filteredAccounts.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            Nenhuma conta encontrada com "{searchTerm}"
          </p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex items-center justify-between pt-4 border-t">
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={loading}>
            Voltar
          </Button>
        )}
        <div className="flex-1" />
        <Button
          onClick={handleConfirmSelection}
          disabled={!selectedAccountId || loading}
          loading={loading}
        >
          Continuar com Conta Selecionada
        </Button>
      </div>
    </div>
  );
};
