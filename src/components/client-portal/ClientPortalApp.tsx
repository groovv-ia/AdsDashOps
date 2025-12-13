import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  LogOut,
  Calendar,
  Loader2,
  Building2,
  ChevronDown,
  DollarSign,
  Eye,
  MousePointer,
  Target
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ClientPortalDashboard } from './ClientPortalDashboard';
import { ClientPortalCampaigns } from './ClientPortalCampaigns';

// Interface para dados do cliente
interface ClientData {
  id: string;
  name: string;
  description?: string;
}

// Interface para dados do usuario de cliente
interface ClientUserData {
  client_id: string;
  is_active: boolean;
  client: ClientData;
}

// Componente principal do portal do cliente
// Exibe dashboard e campanhas em modo somente leitura
export function ClientPortalApp() {
  const { user, signOut } = useAuth();

  // Estados do componente
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientUserData | null>(null);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'campaigns'>('dashboard');
  const [error, setError] = useState<string | null>(null);

  // Carrega dados do cliente vinculado ao usuario
  useEffect(() => {
    loadClientData();
  }, [user]);

  // Funcao para carregar dados do cliente
  const loadClientData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Busca o vinculo do usuario com o cliente
      const { data, error: fetchError } = await supabase
        .from('client_users')
        .select(`
          client_id,
          is_active,
          client:clients (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) {
        console.error('Erro ao carregar dados do cliente:', fetchError);
        setError('Erro ao carregar dados. Tente novamente.');
        return;
      }

      if (!data || !data.client) {
        setError('Voce nao tem acesso a nenhum cliente. Entre em contato com a agencia.');
        return;
      }

      setClientData({
        client_id: data.client_id,
        is_active: data.is_active,
        client: data.client as unknown as ClientData
      });
    } catch (err) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Handler de logout
  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  // Renderiza estado de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando seu portal...</p>
        </div>
      </div>
    );
  }

  // Renderiza estado de erro
  if (error || !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'Voce nao tem permissao para acessar este portal.'}
          </p>
          <Button onClick={handleLogout} variant="primary" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e nome do cliente */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {clientData.client.name}
                </h1>
                <p className="text-xs text-gray-500">Portal de Campanhas</p>
              </div>
            </div>

            {/* Navegacao */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 'dashboard'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </span>
              </button>
              <button
                onClick={() => setCurrentPage('campaigns')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 'campaigns'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Campanhas
                </span>
              </button>
            </nav>

            {/* Usuario e logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-500">Visualizador</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="secondary"
                className="!py-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Sair</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Navegacao mobile */}
        <div className="md:hidden border-t border-gray-200 px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 bg-gray-50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('campaigns')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'campaigns'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 bg-gray-50'
              }`}
            >
              Campanhas
            </button>
          </div>
        </div>
      </header>

      {/* Conteudo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentPage === 'dashboard' ? (
          <ClientPortalDashboard clientId={clientData.client_id} />
        ) : (
          <ClientPortalCampaigns clientId={clientData.client_id} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Dados atualizados automaticamente. Acesso somente leitura.
          </p>
        </div>
      </footer>
    </div>
  );
}
