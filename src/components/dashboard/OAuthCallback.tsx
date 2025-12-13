import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, XCircle } from 'lucide-react';

/**
 * Componente para processar o callback OAuth
 * Executa automaticamente quando a plataforma de anúncios redireciona de volta
 * após a autorização do usuário
 */
export const OAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autorização...');

  useEffect(() => {
    processCallback();
  }, []);

  /**
   * Processa o callback OAuth extraindo parâmetros da URL
   * e enviando mensagem para a janela pai (opener)
   */
  const processCallback = () => {
    try {
      console.log('📨 [OAuth Callback] Iniciando processamento do callback');
      console.log('📨 [OAuth Callback] URL completa:', window.location.href);

      // Extrai parâmetros da URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      const state = urlParams.get('state');

      console.log('📨 [OAuth Callback] Parâmetros extraídos:', {
        code: code ? `${code.substring(0, 20)}...` : null,
        error,
        errorDescription,
        state,
      });

      // Identifica a plataforma pelo state (meta_, google_, tiktok_)
      let platform = 'unknown';
      if (state?.startsWith('meta_')) {
        platform = 'meta';
      } else if (state?.startsWith('google_')) {
        platform = 'google';
      } else if (state?.startsWith('tiktok_')) {
        platform = 'tiktok';
      }

      console.log('📨 [OAuth Callback] Plataforma identificada:', platform);
      console.log('📨 [OAuth Callback] Window opener existe?', !!window.opener);

      // Verifica se houve erro na autorização
      if (error) {
        console.error('❌ [OAuth Callback] Erro recebido do provedor:', error, errorDescription);
        setStatus('error');
        setMessage(errorDescription || error);

        // Envia erro para janela pai
        if (window.opener) {
          console.log('📨 [OAuth Callback] Enviando mensagem de erro para janela pai');
          window.opener.postMessage({
            type: 'oauth-error',
            platform,
            error: errorDescription || error,
          }, window.location.origin);
          console.log('✅ [OAuth Callback] Mensagem de erro enviada');
        } else {
          console.warn('⚠️ [OAuth Callback] Sem window.opener para enviar erro');
        }

        // Fecha janela após 3 segundos
        setTimeout(() => {
          console.log('📨 [OAuth Callback] Fechando janela após erro');
          window.close();
        }, 3000);
        return;
      }

      // Verifica se recebeu o código de autorização
      if (!code) {
        throw new Error('Código de autorização não recebido');
      }

      console.log('✅ [OAuth Callback] Código de autorização recebido com sucesso');
      setStatus('success');
      setMessage('Autorização concluída! Fechando...');

      // Envia código para janela pai processar
      if (window.opener) {
        console.log('📨 [OAuth Callback] Enviando código para janela pai');
        const message = {
          type: 'oauth-success',
          platform,
          code,
        };
        console.log('📨 [OAuth Callback] Mensagem a enviar:', message);
        window.opener.postMessage(message, window.location.origin);
        console.log('✅ [OAuth Callback] Mensagem enviada com sucesso');
      } else {
        console.error('❌ [OAuth Callback] Window.opener não existe! Não é possível enviar mensagem');
      }

      // Fecha janela automaticamente após 2 segundos (aumentado de 1s para dar mais tempo)
      setTimeout(() => {
        console.log('📨 [OAuth Callback] Fechando janela após sucesso');
        window.close();
      }, 2000);
    } catch (err: any) {
      console.error('❌ [OAuth Callback] Erro ao processar callback:', err);
      setStatus('error');
      setMessage(err.message || 'Erro ao processar autorização');

      // Envia erro para janela pai
      if (window.opener) {
        console.log('📨 [OAuth Callback] Enviando erro para janela pai');
        window.opener.postMessage({
          type: 'oauth-error',
          error: err.message || 'Erro desconhecido',
        }, window.location.origin);
      }

      // Fecha janela após 3 segundos
      setTimeout(() => {
        console.log('📨 [OAuth Callback] Fechando janela após exceção');
        window.close();
      }, 3000);
    }
  };

  /**
   * Renderiza estado visual do processamento
   */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Processando Autorização
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Autorização Concluída!
            </h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Erro na Autorização
            </h2>
            <p className="text-gray-600">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Fechar Janela
            </button>
          </>
        )}
      </div>
    </div>
  );
};
