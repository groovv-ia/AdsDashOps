import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loading } from '../ui/Loading';

// Componente para processar callback de OAuth
// Este componente é renderizado quando o usuário é redirecionado de volta após autenticação OAuth
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Processa os parâmetros da URL
    const processOAuthCallback = () => {
      // Obtém parâmetros da query string e hash
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));

      // Verifica se há um access_token (sucesso) ou error
      const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

      if (accessToken) {
        // Sucesso: usuário autenticado
        console.log('OAuth callback bem-sucedido');

        // Limpa a URL removendo os parâmetros
        window.history.replaceState({}, document.title, window.location.pathname);

        // Redireciona para o dashboard
        // A sessão já foi estabelecida pelo Supabase automaticamente
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else if (error) {
        // Erro na autenticação
        console.error('Erro no OAuth callback:', error, errorDescription);

        // Redireciona de volta para a página de login com mensagem de erro
        setTimeout(() => {
          window.location.href = `/?error=${encodeURIComponent(errorDescription || error)}`;
        }, 1000);
      } else {
        // Sem parâmetros relevantes, redireciona para home
        console.log('Nenhum parâmetro OAuth encontrado, redirecionando...');
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    };

    processOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
      <div className="text-center">
        <Loading size="large" text="Processando autenticação..." />
        <p className="mt-4 text-sm text-gray-600">
          Aguarde enquanto concluímos seu login
        </p>
      </div>
    </div>
  );
};
