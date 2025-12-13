import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, Mail, Lock, User, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

// Interface para dados do convite retornados pela API
interface InvitationData {
  id: string;
  email: string;
  expires_at: string;
  client_name: string;
  client_description?: string;
  inviter_name?: string;
  inviter_company?: string;
}

// Interface para props do componente
interface InvitationAcceptPageProps {
  token: string;
  onSuccess?: () => void;
}

// Componente da pagina de aceite de convite
// Exibido quando um usuario acessa /invite/:token
export function InvitationAcceptPage({ token, onSuccess }: InvitationAcceptPageProps) {
  // Estados do componente
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estados do formulario
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Carrega os dados do convite ao montar o componente
  useEffect(() => {
    loadInvitation();
  }, [token]);

  // Funcao para buscar dados do convite
  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Chama Edge Function para obter detalhes do convite
      const response = await fetch(
        `${supabaseUrl}/functions/v1/client-get-invitation?token=${token}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao carregar convite');
        setErrorCode(data.code || null);
        return;
      }

      setInvitation(data.invitation);
    } catch (err) {
      console.error('Erro ao carregar convite:', err);
      setError('Erro de conexao. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Funcao para aceitar o convite e criar a conta
  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validacoes
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Chama Edge Function para aceitar convite
      const response = await fetch(
        `${supabaseUrl}/functions/v1/client-accept-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
          },
          body: JSON.stringify({
            token,
            password,
            full_name: fullName || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao aceitar convite');
        setErrorCode(data.code || null);
        return;
      }

      // Sucesso - exibe mensagem e redireciona
      setSuccess(true);

      // Aguarda 3 segundos e faz login automatico
      setTimeout(async () => {
        if (invitation) {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password,
          });

          if (loginError) {
            console.error('Erro ao fazer login automatico:', loginError);
            // Redireciona para pagina de login
            window.location.href = '/';
          } else {
            // Redireciona para o portal do cliente
            window.location.href = '/client-portal';
          }
        }
      }, 3000);

    } catch (err) {
      console.error('Erro ao aceitar convite:', err);
      setError('Erro de conexao. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Renderiza estado de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando convite...</p>
        </Card>
      </div>
    );
  }

  // Renderiza estado de erro (convite invalido/expirado)
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {errorCode === 'NOT_FOUND' && 'Convite nao encontrado'}
            {errorCode === 'EXPIRED' && 'Convite expirado'}
            {errorCode === 'ALREADY_ACCEPTED' && 'Convite ja aceito'}
            {errorCode === 'REVOKED' && 'Convite revogado'}
            {!errorCode && 'Erro ao carregar convite'}
          </h1>

          <p className="text-gray-600 mb-6">
            {errorCode === 'NOT_FOUND' && 'Este link de convite nao existe ou foi removido.'}
            {errorCode === 'EXPIRED' && 'Este convite expirou. Solicite um novo convite ao administrador.'}
            {errorCode === 'ALREADY_ACCEPTED' && 'Voce ja aceitou este convite. Faca login para acessar.'}
            {errorCode === 'REVOKED' && 'Este convite foi revogado pelo administrador.'}
            {!errorCode && error}
          </p>

          <Button
            onClick={() => window.location.href = '/'}
            variant="primary"
            className="w-full"
          >
            Ir para Login
          </Button>
        </Card>
      </div>
    );
  }

  // Renderiza estado de sucesso
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Conta criada com sucesso!
          </h1>

          <p className="text-gray-600 mb-4">
            Sua conta foi criada e vinculada ao cliente <strong>{invitation?.client_name}</strong>.
          </p>

          <p className="text-sm text-gray-500">
            Redirecionando para o portal...
          </p>

          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mt-4" />
        </Card>
      </div>
    );
  }

  // Renderiza formulario de aceite
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Header com logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bem-vindo ao Portal
          </h1>

          <p className="text-gray-600">
            Voce foi convidado para acessar os dados de campanhas de
          </p>

          <p className="text-lg font-semibold text-blue-600 mt-1">
            {invitation?.client_name}
          </p>

          {invitation?.inviter_name && (
            <p className="text-sm text-gray-500 mt-2">
              Convidado por {invitation.inviter_name}
              {invitation.inviter_company && ` - ${invitation.inviter_company}`}
            </p>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleAccept} className="space-y-4">
          {/* Email (somente leitura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={invitation?.email || ''}
                disabled
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600"
              />
            </div>
          </div>

          {/* Nome completo (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo <span className="text-gray-400">(opcional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Criar Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Confirmar senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a senha novamente"
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Botao de submissao */}
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar Conta e Acessar'
            )}
          </Button>
        </form>

        {/* Link para login */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Ja tem uma conta?{' '}
          <a href="/" className="text-blue-600 hover:underline font-medium">
            Fazer login
          </a>
        </p>
      </Card>
    </div>
  );
}
