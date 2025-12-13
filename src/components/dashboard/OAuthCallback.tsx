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
   * e redirecionando de volta para o dashboard com os dados
   */
  const processCallback = () => {
    try {
      console.log('📨 [OAuth Callback] ========================================');
      console.log('📨 [OAuth Callback] Iniciando processamento do callback');
      console.log('📨 [OAuth Callback] URL completa:', window.location.href);
      console.log('📨 [OAuth Callback] Origin:', window.location.origin);
      console.log('📨 [OAuth Callback] Pathname:', window.location.pathname);
      console.log('📨 [OAuth Callback] Search:', window.location.search);

      // Extrai parâmetros da URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      const errorReason = urlParams.get('error_reason');
      const state = urlParams.get('state');

      // Lista todos os parâmetros recebidos
      console.log('📨 [OAuth Callback] Todos os parâmetros da URL:');
      urlParams.forEach((value, key) => {
        console.log(`  - ${key}:`, value);
      });

      console.log('📨 [OAuth Callback] Parâmetros extraídos:', {
        hasCode: !!code,
        codePreview: code ? `${code.substring(0, 20)}...` : null,
        codeLength: code?.length,
        error,
        errorDescription,
        errorReason,
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

      // Verifica se houve erro na autorização
      if (error) {
        console.error('❌ [OAuth Callback] Erro recebido do provedor Facebook:');
        console.error('  - error:', error);
        console.error('  - error_description:', errorDescription);
        console.error('  - error_reason:', errorReason);

        setStatus('error');

        // Monta mensagem de erro detalhada
        let fullErrorMessage = errorDescription || error;
        if (errorReason) {
          fullErrorMessage += ` (${errorReason})`;
        }

        setMessage(fullErrorMessage);

        // Salva erro no localStorage para exibir na página principal
        localStorage.setItem('meta_oauth_error', fullErrorMessage);
        localStorage.removeItem('meta_oauth_flow');

        console.log('📨 [OAuth Callback] Erro salvo no localStorage');
        console.log('📨 [OAuth Callback] Redirecionando de volta para o dashboard em 2 segundos...');

        // Redireciona de volta para o dashboard após 2 segundos
        setTimeout(() => {
          console.log('📨 [OAuth Callback] Executando redirecionamento...');
          window.location.href = '/';
        }, 2000);
        return;
      }

      // Verifica se recebeu o código de autorização
      if (!code) {
        console.error('❌ [OAuth Callback] ERRO: Nenhum código de autorização recebido!');
        console.error('❌ [OAuth Callback] Isso pode indicar:');
        console.error('  1. URL de callback incorreta');
        console.error('  2. Configuração errada no Facebook');
        console.error('  3. Usuário cancelou a autorização');
        throw new Error('Código de autorização não recebido');
      }

      console.log('✅ [OAuth Callback] Código de autorização recebido com sucesso!');
      console.log('✅ [OAuth Callback] Código tem', code.length, 'caracteres');
      setStatus('success');
      setMessage('Autorização concluída! Redirecionando...');

      // Salva código no localStorage para ser processado na página principal
      console.log('📨 [OAuth Callback] Salvando código no localStorage...');
      localStorage.setItem('meta_oauth_code', code);
      localStorage.setItem('meta_oauth_platform', platform);
      localStorage.removeItem('meta_oauth_error');

      console.log('📨 [OAuth Callback] Dados salvos no localStorage:');
      console.log('  - meta_oauth_code:', localStorage.getItem('meta_oauth_code')?.substring(0, 20) + '...');
      console.log('  - meta_oauth_platform:', localStorage.getItem('meta_oauth_platform'));

      // Redireciona de volta para o dashboard
      console.log('📨 [OAuth Callback] Redirecionando de volta para o dashboard em 1 segundo...');
      setTimeout(() => {
        console.log('📨 [OAuth Callback] Executando redirecionamento para /');
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
      console.error('❌ [OAuth Callback] EXCEÇÃO CAPTURADA ao processar callback:');
      console.error('❌ [OAuth Callback] Mensagem:', err.message);
      console.error('❌ [OAuth Callback] Stack:', err.stack);

      setStatus('error');
      setMessage(err.message || 'Erro ao processar autorização');

      // Salva erro no localStorage
      localStorage.setItem('meta_oauth_error', err.message || 'Erro desconhecido');
      localStorage.removeItem('meta_oauth_flow');

      console.log('📨 [OAuth Callback] Erro salvo no localStorage');

      // Redireciona de volta após 2 segundos
      setTimeout(() => {
        console.log('📨 [OAuth Callback] Redirecionando de volta após exceção');
        window.location.href = '/';
      }, 2000);
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
