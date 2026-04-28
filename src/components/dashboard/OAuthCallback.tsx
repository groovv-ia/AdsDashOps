import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, XCircle } from 'lucide-react';

/**
 * Componente para processar o callback OAuth
 * Executa automaticamente quando a plataforma de anuncios redireciona de volta
 * apos a autorizacao do usuario
 *
 * Suporta multiplas plataformas: Meta, Google, TikTok
 * Identifica a plataforma pelo prefixo do state (meta_, google_, tiktok_)
 */
export const OAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autorizacao...');
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    processCallback();
  }, []);

  /**
   * Processa o callback OAuth extraindo parametros da URL
   * e redirecionando de volta para o dashboard com os dados
   */
  const processCallback = () => {
    try {
      console.log('[OAuth Callback] ========================================');
      console.log('[OAuth Callback] Iniciando processamento do callback');
      console.log('[OAuth Callback] URL completa:', window.location.href);

      // Extrai parametros da URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      const errorReason = urlParams.get('error_reason');
      const state = urlParams.get('state');

      // Log de parametros recebidos
      console.log('[OAuth Callback] Parametros extraidos:', {
        hasCode: !!code,
        codeLength: code?.length,
        error,
        errorDescription,
        state,
      });

      // Identifica a plataforma pelo state (meta_, google_, tiktok_)
      let detectedPlatform = 'unknown';
      if (state?.startsWith('meta_')) {
        detectedPlatform = 'meta';
      } else if (state?.startsWith('google_')) {
        detectedPlatform = 'google';
      } else if (state?.startsWith('tiktok_')) {
        detectedPlatform = 'tiktok';
      }

      setPlatform(detectedPlatform);
      console.log('[OAuth Callback] Plataforma identificada:', detectedPlatform);

      // Verifica se houve erro na autorizacao
      if (error) {
        console.error('[OAuth Callback] Erro recebido do provedor:', error);
        setStatus('error');

        // Monta mensagem de erro detalhada
        let fullErrorMessage = errorDescription || error;
        if (errorReason) {
          fullErrorMessage += ` (${errorReason})`;
        }

        setMessage(fullErrorMessage);

        // Salva erro no localStorage usando prefixo da plataforma
        localStorage.setItem(`${detectedPlatform}_oauth_error`, fullErrorMessage);
        localStorage.removeItem(`${detectedPlatform}_oauth_flow`);

        // Redireciona de volta para a pagina apropriada
        const redirectUrl = getRedirectUrl(detectedPlatform);
        console.log('[OAuth Callback] Redirecionando para:', redirectUrl);

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
        return;
      }

      // Verifica se recebeu o codigo de autorizacao
      if (!code) {
        console.error('[OAuth Callback] ERRO: Nenhum codigo de autorizacao recebido!');
        throw new Error('Codigo de autorizacao nao recebido');
      }

      console.log('[OAuth Callback] Codigo de autorizacao recebido com sucesso!');
      setStatus('success');
      setMessage('Autorizacao concluida! Redirecionando...');

      // Salva codigo no localStorage usando prefixo da plataforma
      localStorage.setItem(`${detectedPlatform}_oauth_code`, code);
      localStorage.setItem(`${detectedPlatform}_oauth_platform`, detectedPlatform);
      localStorage.removeItem(`${detectedPlatform}_oauth_error`);

      // Para compatibilidade com o codigo existente do Meta
      if (detectedPlatform === 'meta') {
        localStorage.setItem('meta_oauth_code', code);
        localStorage.setItem('meta_oauth_platform', 'meta');
      }

      console.log('[OAuth Callback] Dados salvos no localStorage');

      // Redireciona de volta para a pagina apropriada
      const redirectUrl = getRedirectUrl(detectedPlatform);
      console.log('[OAuth Callback] Redirecionando para:', redirectUrl);

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[OAuth Callback] ERRO ao processar callback:', errorMessage);

      setStatus('error');
      setMessage(errorMessage);

      // Salva erro no localStorage
      const detectedPlatform = platform || 'unknown';
      localStorage.setItem(`${detectedPlatform}_oauth_error`, errorMessage);

      // Redireciona de volta apos 2 segundos
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  };

  /**
   * Retorna a URL de redirecionamento apropriada para cada plataforma
   */
  const getRedirectUrl = (detectedPlatform: string): string => {
    switch (detectedPlatform) {
      case 'google':
        return '/google-admin';
      case 'meta':
        return '/';
      case 'tiktok':
        return '/';
      default:
        return '/';
    }
  };

  /**
   * Retorna o nome da plataforma para exibicao
   */
  const getPlatformName = (): string => {
    switch (platform) {
      case 'google':
        return 'Google Ads';
      case 'meta':
        return 'Meta Ads';
      case 'tiktok':
        return 'TikTok Ads';
      default:
        return 'Plataforma';
    }
  };

  /**
   * Renderiza estado visual do processamento
   */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processando Autorizacao
            </h2>
            <p className="text-gray-600">{message}</p>
            {platform && (
              <p className="text-sm text-gray-500 mt-2">
                Plataforma: {getPlatformName()}
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Autorizacao Concluida!
            </h2>
            <p className="text-gray-600">{message}</p>
            {platform && (
              <p className="text-sm text-gray-500 mt-2">
                {getPlatformName()} conectado com sucesso
              </p>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Erro na Autorizacao
            </h2>
            <p className="text-gray-600">{message}</p>
            <button
              onClick={() => window.location.href = getRedirectUrl(platform)}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
};
