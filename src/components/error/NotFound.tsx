import React from 'react';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

/**
 * Props do componente NotFound
 */
interface NotFoundProps {
  title?: string;
  message?: string;
  showSearch?: boolean;
}

/**
 * Componente NotFound (404)
 *
 * Página exibida quando uma rota não é encontrada ou
 * quando um recurso solicitado não existe.
 *
 * Funcionalidades:
 * - Mensagem amigável ao usuário
 * - Navegação de volta
 * - Botão para home
 * - Busca opcional
 * - Design responsivo
 *
 * @example
 * <NotFound />
 *
 * @example
 * <NotFound
 *   title="Campanha não encontrada"
 *   message="A campanha que você está procurando não existe ou foi removida."
 * />
 */
export const NotFound: React.FC<NotFoundProps> = ({
  title = 'Página não encontrada',
  message = 'Desculpe, a página que você está procurando não existe ou foi movida.',
  showSearch = true,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  /**
   * Volta para a página anterior
   */
  const handleGoBack = () => {
    window.history.back();
  };

  /**
   * Navega para a home
   */
  const handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * Executa busca (placeholder - implementar conforme necessidade)
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Implementar lógica de busca aqui
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Ilustração 404 */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            404
          </div>
        </div>

        <Card className="mb-6">
          <div className="p-8">
            {/* Título */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {title}
            </h1>

            {/* Mensagem */}
            <p className="text-gray-600 mb-8 text-lg">
              {message}
            </p>

            {/* Campo de busca (opcional) */}
            {showSearch && (
              <form onSubmit={handleSearch} className="mb-8">
                <div className="flex gap-2 max-w-md mx-auto">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <Button type="submit" icon={Search} variant="primary">
                    Buscar
                  </Button>
                </div>
              </form>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleGoBack}
                icon={ArrowLeft}
                variant="outline"
              >
                Voltar
              </Button>
              <Button
                onClick={handleGoHome}
                icon={Home}
                variant="primary"
              >
                Ir para Home
              </Button>
            </div>
          </div>
        </Card>

        {/* Links úteis */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">
            Você também pode acessar:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Dashboard
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="/data-sources"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Fontes de Dados
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="/ai-insights"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Insights com IA
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="/support"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Suporte
            </a>
          </div>
        </div>

        {/* Informações de contato */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            Precisa de ajuda?{' '}
            <a
              href="mailto:suporte@adsops.com"
              className="text-blue-600 hover:underline"
            >
              Entre em contato com o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente ResourceNotFound
 *
 * Variante específica para quando um recurso não é encontrado
 * (ex: campanha, usuário, relatório específico)
 */
interface ResourceNotFoundProps {
  resourceType: string;
  resourceId?: string;
  onTryAgain?: () => void;
}

export const ResourceNotFound: React.FC<ResourceNotFoundProps> = ({
  resourceType,
  resourceId,
  onTryAgain,
}) => {
  return (
    <Card className="max-w-lg mx-auto text-center p-8">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-gray-100 rounded-full">
          <Search className="w-12 h-12 text-gray-400" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {resourceType} não encontrado
      </h2>

      <p className="text-gray-600 mb-6">
        {resourceId
          ? `O ${resourceType} com ID "${resourceId}" não foi encontrado.`
          : `O ${resourceType} solicitado não existe ou foi removido.`}
      </p>

      <div className="flex gap-3 justify-center">
        {onTryAgain && (
          <Button onClick={onTryAgain} icon={RefreshCw} variant="outline">
            Tentar Novamente
          </Button>
        )}
        <Button onClick={() => window.history.back()} icon={ArrowLeft}>
          Voltar
        </Button>
      </div>
    </Card>
  );
};
