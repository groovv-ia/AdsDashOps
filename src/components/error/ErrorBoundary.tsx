import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

/**
 * Props do ErrorBoundary
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State do ErrorBoundary
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Componente ErrorBoundary
 *
 * Captura erros do React em qualquer componente filho e exibe
 * uma UI de fallback ao invés de quebrar toda a aplicação.
 *
 * Funcionalidades:
 * - Captura erros de renderização
 * - Exibe mensagem amigável ao usuário
 * - Permite recarregar a página
 * - Loga erros para debug
 * - Suporta fallback customizado
 *
 * @example
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Método estático chamado quando um erro é capturado
   * Retorna o novo estado para indicar que houve erro
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Método de ciclo de vida chamado após capturar um erro
   * Usado para logging e side effects
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Loga o erro para debug
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Atualiza state com informações do erro
    this.setState({
      errorInfo,
    });

    // Chama callback customizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Em produção, poderia enviar para serviço de logging (Sentry, etc)
    // if (import.meta.env.PROD) {
    //   logErrorToService(error, errorInfo);
    // }
  }

  /**
   * Reseta o estado de erro e tenta renderizar novamente
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Recarrega a página inteira
   */
  handleReload = (): void => {
    window.location.reload();
  };

  /**
   * Navega para a home
   */
  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    // Se não há erro, renderiza os filhos normalmente
    if (!hasError) {
      return children;
    }

    // Se tem fallback customizado, usa ele
    if (fallback) {
      return fallback;
    }

    // Renderiza UI de erro padrão
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <div className="text-center">
            {/* Ícone de erro */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Título */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Oops! Algo deu errado
            </h1>

            {/* Descrição */}
            <p className="text-gray-600 mb-8">
              Desculpe, ocorreu um erro inesperado na aplicação.
              Nossa equipe foi notificada e está trabalhando para resolver o problema.
            </p>

            {/* Detalhes do erro (apenas em desenvolvimento) */}
            {import.meta.env.DEV && error && (
              <div className="mb-8 text-left">
                <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <summary className="cursor-pointer font-semibold text-gray-900 mb-2">
                    Detalhes do erro (apenas em desenvolvimento)
                  </summary>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Mensagem:</h3>
                      <pre className="text-sm text-red-600 bg-red-50 p-3 rounded overflow-x-auto">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Stack Trace:</h3>
                        <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-x-auto max-h-60">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo && errorInfo.componentStack && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Component Stack:</h3>
                        <pre className="text-xs text-gray-600 bg-gray-100 p-3 rounded overflow-x-auto max-h-60">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                icon={RefreshCw}
                variant="primary"
              >
                Tentar Novamente
              </Button>
              <Button
                onClick={this.handleReload}
                icon={RefreshCw}
                variant="outline"
              >
                Recarregar Página
              </Button>
              <Button
                onClick={this.handleGoHome}
                icon={Home}
                variant="ghost"
              >
                Ir para Home
              </Button>
            </div>

            {/* Informações de suporte */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Se o problema persistir, entre em contato com o suporte em{' '}
                <a
                  href="mailto:suporte@adsops.com"
                  className="text-blue-600 hover:underline"
                >
                  suporte@adsops.com
                </a>
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }
}

/**
 * Hook para uso funcional do ErrorBoundary
 *
 * @example
 * function MyComponent() {
 *   const throwError = useErrorHandler();
 *
 *   const handleAction = () => {
 *     try {
 *       // código que pode falhar
 *     } catch (error) {
 *       throwError(error);
 *     }
 *   };
 * }
 */
export const useErrorHandler = () => {
  const [, setError] = React.useState();

  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
};
