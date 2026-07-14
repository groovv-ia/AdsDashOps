/**
 * MetaOAuthConnectModal
 *
 * Modal de conexão com Meta Ads via OAuth (Login pelo Facebook).
 * Fluxo em etapas: intro → conectando (OAuth redirect) → seleção de contas (multi) → salvando → sucesso.
 *
 * Preserva o fluxo de token manual (System User) intacto — este modal é uma ADIÇÃO, não substituto.
 *
 * Como funciona o redirecionamento:
 * 1. Usuário clica "Conectar com Facebook" → redirect para dialog OAuth do Meta
 * 2. Meta redireciona para /oauth-callback → OAuthCallback salva o code no localStorage
 * 3. OAuthCallback redireciona de volta para / (home = Meta Admin)
 * 4. MetaAdminPage detecta meta_oauth_code + meta_oauth_flow=modal no localStorage → auto-abre este modal
 * 5. Modal detecta o code no mount, troca pelo token via Edge Function, lista contas
 * 6. Usuário seleciona uma ou mais contas e confirma → salva no banco
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Loader2,
  AlertCircle,
  Search,
  Users,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  LogIn,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { logger } from '../../lib/utils/logger';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Step = 'intro' | 'connecting' | 'selecting' | 'saving' | 'success';

interface MetaAdAccount {
  id: string;          // formato act_XXXXXXXXX
  name: string;
  account_id: string;  // apenas os números
  account_status: number;
  currency: string;
}

interface ConnectedAccount {
  accountId: string;
  accountName: string;
  currency: string;
}

interface MetaOAuthConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Permissões solicitadas ao Facebook ───────────────────────────────────────

const OAUTH_SCOPE = 'ads_read,ads_management,business_management,pages_show_list';

const PERMISSIONS_LABELS: { scope: string; label: string; desc: string }[] = [
  { scope: 'ads_read', label: 'Ler Anúncios', desc: 'Ver campanhas, conjuntos e anúncios' },
  { scope: 'ads_management', label: 'Gerenciar Anúncios', desc: 'Acesso às métricas de desempenho' },
  { scope: 'business_management', label: 'Business Manager', desc: 'Ver contas de anúncios vinculadas' },
  { scope: 'pages_show_list', label: 'Listar Páginas', desc: 'Identificar páginas do negócio' },
];

// ─── Status de conta Meta ────────────────────────────────────────────────────

const ACCOUNT_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Ativa', color: 'bg-green-100 text-green-700' },
  2: { label: 'Desabilitada', color: 'bg-red-100 text-red-700' },
  3: { label: 'Não Verificada', color: 'bg-yellow-100 text-yellow-700' },
  7: { label: 'Encerrada', color: 'bg-gray-100 text-gray-600' },
  9: { label: 'Em Revisão', color: 'bg-blue-100 text-blue-700' },
  101: { label: 'Pendente', color: 'bg-orange-100 text-orange-700' },
  201: { label: 'Suspensa', color: 'bg-red-100 text-red-700' },
};

// ─── Componente Principal ────────────────────────────────────────────────────

export const MetaOAuthConnectModal: React.FC<MetaOAuthConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentWorkspace } = useWorkspace();

  // Etapa atual do fluxo
  const [step, setStep] = useState<Step>('intro');

  // Dados das contas disponíveis (retornadas pelo Meta após auth)
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<MetaAdAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Contas salvas com sucesso
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);

  // Mensagem de erro
  const [error, setError] = useState<string | null>(null);

  // Token temporário (guardado em sessão durante o fluxo, nunca em estado React)
  const TEMP_TOKEN_KEY = 'meta_oauth_temp_token';

  // ─── Detecta retorno do OAuth ao abrir o modal ──────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    const code = localStorage.getItem('meta_oauth_code');
    const flow = localStorage.getItem('meta_oauth_flow');
    const oauthError = localStorage.getItem('meta_oauth_error');

    // Limpa erros pendentes
    if (oauthError && flow === 'modal') {
      localStorage.removeItem('meta_oauth_error');
      localStorage.removeItem('meta_oauth_flow');
      setError(mapOAuthError(oauthError));
      setStep('intro');
      return;
    }

    // Processa código OAuth pendente
    if (code && flow === 'modal') {
      setStep('connecting');
      setError(null);
      processOAuthCode(code);
    }
  }, [isOpen]);

  // ─── Filtragem de contas por busca ──────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAccounts(accounts);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredAccounts(
      accounts.filter(
        a => a.name.toLowerCase().includes(q) || a.account_id.includes(q)
      )
    );
  }, [searchQuery, accounts]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Traduz erros comuns do OAuth do Meta para mensagens amigáveis */
  const mapOAuthError = (err: string): string => {
    if (err.includes('access_denied')) {
      return 'Autorização cancelada. Para conectar, é necessário aceitar as permissões solicitadas.';
    }
    if (err.includes('redirect_uri')) {
      return 'Erro de configuração: URL de redirecionamento não autorizada no Facebook Developer Console.';
    }
    if (err.includes('invalid_scope')) {
      return 'Erro de permissões: as permissões solicitadas não estão configuradas no App do Facebook.';
    }
    return err;
  };

  /** Gera state CSRF aleatório */
  const generateState = (): string =>
    `meta_${Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;

  // ─── Inicia fluxo OAuth (redirect para Facebook) ────────────────────────────

  const handleStartOAuth = useCallback(() => {
    const clientId = import.meta.env.VITE_META_APP_ID;

    if (!clientId) {
      setError('App ID do Meta não configurado. Contate o suporte.');
      return;
    }

    if (!/^\d+$/.test(clientId)) {
      setError('App ID do Meta inválido. Contate o suporte.');
      return;
    }

    const redirectUri =
      import.meta.env.VITE_OAUTH_REDIRECT_URL ||
      `${window.location.origin}/oauth-callback`;

    const state = generateState();

    // Salva estado para validação CSRF e identificação do fluxo ao retornar
    localStorage.setItem('meta_oauth_state', state);
    localStorage.setItem('meta_oauth_flow', 'modal'); // identifica que o retorno deve abrir este modal

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: OAUTH_SCOPE,
      response_type: 'code',
      state,
    });

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;

    logger.info('Iniciando OAuth Meta', { redirectUri });
    setStep('connecting');

    // Navega para o Facebook — a página recarrega no retorno
    window.location.href = authUrl;
  }, []);

  // ─── Troca o código OAuth pelo token via Edge Function ──────────────────────

  const processOAuthCode = async (code: string) => {
    try {
      logger.info('Trocando código OAuth pelo token...');

      // Lê estados para validação CSRF
      const expectedState = localStorage.getItem('meta_oauth_state');
      const returnedState = localStorage.getItem('meta_oauth_returned_state');

      // Limpa localStorage imediatamente para evitar reprocessamento
      localStorage.removeItem('meta_oauth_code');
      localStorage.removeItem('meta_oauth_platform');
      localStorage.removeItem('meta_oauth_flow');
      localStorage.removeItem('meta_oauth_state');
      localStorage.removeItem('meta_oauth_returned_state');

      const redirectUri =
        import.meta.env.VITE_OAUTH_REDIRECT_URL ||
        `${window.location.origin}/oauth-callback`;

      // Chama Edge Function — o App Secret nunca é exposto ao browser
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-exchange-token`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            state: returnedState || undefined,
            expected_state: expectedState || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${response.status} ao trocar token`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.access_token) {
        throw new Error('Token não recebido. Tente novamente.');
      }

      logger.info('Token OAuth obtido', { isLongLived: data.is_long_lived });

      // Guarda token temporariamente em sessionStorage (não em estado React)
      sessionStorage.setItem(TEMP_TOKEN_KEY, data.access_token);

      // Busca contas de anúncios disponíveis
      await fetchAdAccounts(data.access_token);
    } catch (err: any) {
      logger.error('Erro ao processar código OAuth', err);
      setError(err.message || 'Erro ao processar autorização. Tente novamente.');
      setStep('intro');
    }
  };

  // ─── Lista contas de anúncios do usuário ────────────────────────────────────

  const fetchAdAccounts = async (accessToken: string) => {
    try {
      logger.info('Buscando contas de anúncios...');

      const url = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_id,account_status,currency&limit=200&access_token=${accessToken}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro ${response.status} ao buscar contas`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Erro ao listar contas de anúncios');
      }

      const list: MetaAdAccount[] = data.data || [];

      if (list.length === 0) {
        throw new Error(
          'Nenhuma conta de anúncios encontrada. Verifique se sua conta Meta tem contas de anúncios vinculadas.'
        );
      }

      logger.info(`${list.length} conta(s) encontrada(s)`);

      setAccounts(list);
      setFilteredAccounts(list);
      setStep('selecting');
    } catch (err: any) {
      logger.error('Erro ao buscar contas', err);
      setError(err.message || 'Erro ao listar contas de anúncios.');
      setStep('intro');
    }
  };

  // ─── Alterna seleção de uma conta ───────────────────────────────────────────

  const toggleAccount = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /** Seleciona/deseleciona todas as contas visíveis no filtro atual */
  const toggleAll = () => {
    const allVisible = filteredAccounts.map(a => a.id);
    const allSelected = allVisible.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allVisible.forEach(id => next.delete(id));
      } else {
        allVisible.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // ─── Salva as contas selecionadas no banco de dados ─────────────────────────

  const handleSaveConnections = async () => {
    if (selectedIds.size === 0) return;

    setStep('saving');
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const accessToken = sessionStorage.getItem(TEMP_TOKEN_KEY);
      if (!accessToken) {
        throw new Error('Token temporário expirado. Reconecte-se.');
      }

      const selectedAccounts = accounts.filter(a => selectedIds.has(a.id));
      const saved: ConnectedAccount[] = [];

      for (const account of selectedAccounts) {
        // 1. Cria registro de conexão
        const { data: conn, error: connErr } = await supabase
          .from('data_connections')
          .insert({
            user_id: user.id,
            workspace_id: currentWorkspace?.id || null,
            name: `Meta Ads - ${account.name}`,
            platform: 'meta',
            type: 'advertising',
            status: 'connected',
            connection_method: 'oauth',
            account_label: account.name,
            logo: '/meta-icon.svg',
            description: 'Facebook e Instagram Ads',
            config: {
              accountId: account.id,
              accountName: account.name,
              currency: account.currency,
            },
            last_sync: new Date().toISOString(),
          })
          .select()
          .single();

        if (connErr) throw connErr;

        // 2. Salva token OAuth vinculado à conexão
        const { error: tokenErr } = await supabase
          .from('oauth_tokens')
          .insert({
            user_id: user.id,
            connection_id: conn.id,
            platform: 'meta',
            access_token: accessToken,
            token_type: 'user_token',
            account_id: account.id,
            account_name: account.name,
            is_active: true,
            // Long-lived tokens duram ~60 dias
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (tokenErr) throw tokenErr;

        saved.push({
          accountId: account.account_id,
          accountName: account.name,
          currency: account.currency,
        });

        logger.info('Conta conectada', { accountId: account.id, accountName: account.name });
      }

      // Limpa token temporário
      sessionStorage.removeItem(TEMP_TOKEN_KEY);

      setConnectedAccounts(saved);
      setStep('success');

      // Notifica outras partes do app sobre a nova conexão
      window.dispatchEvent(
        new CustomEvent('metaOAuthConnected', {
          detail: { accountsCount: saved.length, accounts: saved },
        })
      );
    } catch (err: any) {
      logger.error('Erro ao salvar conexões', err);
      setError(err.message || 'Erro ao salvar conexões. Tente novamente.');
      setStep('selecting');
    }
  };

  // ─── Fecha e reseta o modal ──────────────────────────────────────────────────

  const handleClose = () => {
    if (step === 'saving') return; // não fecha enquanto salva
    sessionStorage.removeItem(TEMP_TOKEN_KEY);
    setStep('intro');
    setError(null);
    setAccounts([]);
    setFilteredAccounts([]);
    setSelectedIds(new Set());
    setConnectedAccounts([]);
    setSearchQuery('');
    onClose();
  };

  const handleSuccess = () => {
    onSuccess();
    handleClose();
  };

  // ─── Render de cada etapa ───────────────────────────────────────────────────

  const renderIntro = () => (
    <div className="flex flex-col items-center text-center px-2 py-4 space-y-6">
      {/* Logo Meta + Título */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md bg-white flex items-center justify-center border border-gray-100">
          <img src="/meta-icon.svg" alt="Meta" className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Conectar Meta Ads</h2>
          <p className="text-sm text-gray-500 mt-1">
            Login seguro pelo Facebook — sem App ID nem tokens manuais
          </p>
        </div>
      </div>

      {/* Permissões que serão solicitadas */}
      <div className="w-full bg-gray-50 rounded-xl border border-gray-200 p-4 text-left">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Permissões solicitadas
        </p>
        <ul className="space-y-2">
          {PERMISSIONS_LABELS.map(p => (
            <li key={p.scope} className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-gray-800">{p.label}</span>
                <span className="text-sm text-gray-500"> — {p.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Erro */}
      {error && (
        <div className="w-full flex items-start space-x-2 bg-red-50 border border-red-200 rounded-lg p-3 text-left">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Botão de conexão */}
      <button
        onClick={handleStartOAuth}
        className="w-full flex items-center justify-center space-x-3 bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1564D3] text-white font-semibold text-sm py-3 px-6 rounded-xl transition-all duration-150 shadow-md hover:shadow-lg"
      >
        {/* Ícone f do Facebook */}
        <svg className="h-5 w-5 fill-white flex-shrink-0" viewBox="0 0 24 24">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.095 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.1 24 12.073z" />
        </svg>
        <span>Continuar com o Facebook</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      <p className="text-xs text-gray-400 leading-relaxed">
        Você será redirecionado para o Facebook para autorizar o acesso.
        Seus dados de login nunca são compartilhados conosco.
      </p>
    </div>
  );

  const renderConnecting = () => (
    <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Processando autorização...</h3>
        <p className="text-sm text-gray-500 mt-1">
          Aguarde enquanto trocamos o código pelo token de acesso.
        </p>
      </div>
    </div>
  );

  const renderSelecting = () => {
    const allVisibleSelected =
      filteredAccounts.length > 0 &&
      filteredAccounts.every(a => selectedIds.has(a.id));

    return (
      <div className="flex flex-col space-y-4">
        {/* Cabeçalho */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Selecionar Contas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Escolha quais contas de anúncios deseja conectar.
            Você pode selecionar várias.
          </p>
        </div>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou ID..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Seleção em massa */}
        {filteredAccounts.length > 1 && (
          <button
            onClick={toggleAll}
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                allVisibleSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
              }`}
            >
              {allVisibleSelected && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <span>{allVisibleSelected ? 'Desmarcar todas' : 'Selecionar todas'}</span>
          </button>
        )}

        {/* Lista de contas */}
        <div className="overflow-y-auto max-h-72 space-y-2 pr-1">
          {filteredAccounts.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-6">Nenhuma conta encontrada</p>
          ) : (
            filteredAccounts.map(account => {
              const isSelected = selectedIds.has(account.id);
              const statusInfo = ACCOUNT_STATUS[account.account_status] || {
                label: 'Desconhecido',
                color: 'bg-gray-100 text-gray-600',
              };
              return (
                <button
                  key={account.id}
                  onClick={() => toggleAccount(account.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  {/* Checkbox visual */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>

                  {/* Informações da conta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {account.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ID: {account.account_id} &bull; {account.currency}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-start space-x-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Resumo de seleção + Botão confirmar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
            <p className="text-sm text-blue-900 font-medium">
              <Users className="inline h-4 w-4 mr-1 text-blue-600" />
              {selectedIds.size} conta{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="flex space-x-3 pt-1">
          <Button
            variant="secondary"
            onClick={() => {
              setStep('intro');
              setError(null);
              sessionStorage.removeItem(TEMP_TOKEN_KEY);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button
            onClick={handleSaveConnections}
            disabled={selectedIds.size === 0}
            className="flex-1"
          >
            Conectar {selectedIds.size > 0 ? `${selectedIds.size} conta${selectedIds.size > 1 ? 's' : ''}` : 'contas'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  const renderSaving = () => (
    <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Salvando conexões...</h3>
        <p className="text-sm text-gray-500 mt-1">
          Configurando {selectedIds.size} conta{selectedIds.size > 1 ? 's' : ''} no seu workspace.
        </p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center text-center space-y-5 py-4">
      {/* Ícone de sucesso animado */}
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="h-9 w-9 text-green-600" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">Conexão realizada!</h2>
        <p className="text-sm text-gray-500 mt-1">
          {connectedAccounts.length > 1
            ? `${connectedAccounts.length} contas conectadas com sucesso.`
            : 'Conta conectada com sucesso.'}
        </p>
      </div>

      {/* Lista de contas conectadas */}
      <div className="w-full space-y-2">
        {connectedAccounts.map(acc => (
          <div
            key={acc.accountId}
            className="flex items-center space-x-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5"
          >
            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold text-green-900">{acc.accountName}</p>
              <p className="text-xs text-green-700">ID: {acc.accountId} &bull; {acc.currency}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-left">
        <p className="text-sm text-blue-800">
          A sincronização dos dados será iniciada em breve. Acesse a aba
          {' '}<strong>Meta Ads</strong> para acompanhar o status.
        </p>
      </div>

      <Button onClick={handleSuccess} className="w-full">
        Concluir
      </Button>
    </div>
  );

  // ─── Render principal ────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={step !== 'saving' && step !== 'connecting'}
      closeOnEsc={step !== 'saving' && step !== 'connecting'}
    >
      {/* Botão fechar personalizado (oculto durante saving/connecting) */}
      {step !== 'saving' && step !== 'connecting' && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div className="relative pt-2">
        {step === 'intro' && renderIntro()}
        {step === 'connecting' && renderConnecting()}
        {step === 'selecting' && renderSelecting()}
        {step === 'saving' && renderSaving()}
        {step === 'success' && renderSuccess()}
      </div>
    </Modal>
  );
};
