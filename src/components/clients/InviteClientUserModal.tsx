import React, { useState } from 'react';
import { Mail, Send, Copy, CheckCircle, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Client } from '../../contexts/ClientContext';
import { supabase } from '../../lib/supabase';

// Interface para props do modal
interface InviteClientUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onInviteSent?: () => void;
}

// Interface para resposta da API de envio de convite
interface InvitationResponse {
  success: boolean;
  invitation?: {
    id: string;
    email: string;
    client_name: string;
    expires_at: string;
    invite_url: string;
  };
  error?: string;
}

// Modal para convidar um usuario de cliente para acessar o portal
export function InviteClientUserModal({
  isOpen,
  onClose,
  client,
  onInviteSent
}: InviteClientUserModalProps) {
  // Estados do componente
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Funcao para enviar o convite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validacao basica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Digite um email valido');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Obtem a sessao atual para autenticacao
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Voce precisa estar logado para enviar convites');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Chama Edge Function para criar o convite
      const response = await fetch(
        `${supabaseUrl}/functions/v1/client-send-invitation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            client_id: client.id,
            email: email.toLowerCase(),
          }),
        }
      );

      const data: InvitationResponse = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao enviar convite');
        return;
      }

      // Sucesso!
      setSuccess(true);
      setInviteUrl(data.invitation?.invite_url || null);
      onInviteSent?.();

    } catch (err) {
      console.error('Erro ao enviar convite:', err);
      setError('Erro de conexao. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Funcao para copiar o link do convite
  const handleCopyLink = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Funcao para resetar o modal e fechar
  const handleClose = () => {
    setEmail('');
    setError(null);
    setSuccess(false);
    setInviteUrl(null);
    setCopied(false);
    onClose();
  };

  // Funcao para enviar outro convite
  const handleSendAnother = () => {
    setEmail('');
    setError(null);
    setSuccess(false);
    setInviteUrl(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={success ? 'Convite Enviado!' : 'Convidar Usuario'}
    >
      <div className="space-y-4">
        {/* Estado de sucesso */}
        {success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Convite criado com sucesso!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Um link de convite foi gerado para <strong>{email}</strong>.
                </p>
              </div>
            </div>

            {/* Link do convite */}
            {inviteUrl && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Link do Convite
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 truncate"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="secondary"
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  O convite expira em 7 dias. Compartilhe este link com o usuario.
                </p>
              </div>
            )}

            {/* Acoes */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSendAnother}
                variant="secondary"
                className="flex-1"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Outro
              </Button>
              <Button
                onClick={handleClose}
                variant="primary"
                className="flex-1"
              >
                Concluir
              </Button>
            </div>
          </div>
        ) : (
          /* Formulario de envio */
          <form onSubmit={handleSendInvite} className="space-y-4">
            {/* Informacoes do cliente */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                O usuario convidado tera acesso de <strong>somente leitura</strong> aos
                dados de campanhas do cliente <strong>{client.name}</strong>.
              </p>
            </div>

            {/* Campo de email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email do Usuario
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="usuario@empresa.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Botoes de acao */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={handleClose}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !email}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
