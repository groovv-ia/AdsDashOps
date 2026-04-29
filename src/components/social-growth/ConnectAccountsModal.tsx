/**
 * ConnectAccountsModal
 *
 * Modal para listar e selecionar Pages do Facebook e contas Instagram
 * disponíveis na conexão Meta do workspace, para iniciar monitoramento.
 * Usa o componente Modal existente do projeto.
 */

import React, { useState, useEffect } from 'react';
import { Instagram, Facebook, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Loading } from '../ui/Loading';
import {
  listAvailablePages,
  savePageConnection,
  type SocialPageOption,
} from '../../lib/services/SocialGrowthService';

interface ConnectAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  clientId?: string;
  onConnected: () => void;
}

export const ConnectAccountsModal: React.FC<ConnectAccountsModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  clientId,
  onConnected,
}) => {
  const [pages, setPages] = useState<SocialPageOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedCount, setSavedCount] = useState(0);

  // Carrega pages ao abrir o modal
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadPages();
    }
  }, [isOpen, workspaceId]);

  const loadPages = async () => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    setSavedCount(0);

    const { pages: result, error: err } = await listAvailablePages(workspaceId);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    setPages(result);
  };

  // Chave unica para selecao (pageId|platform)
  const makeKey = (pageId: string, platform: string) => `${pageId}|${platform}`;

  const toggleSelection = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConnect = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);
    let count = 0;

    for (const page of pages) {
      // Conecta Facebook Page
      const fbKey = makeKey(page.facebook.page_id, 'facebook');
      if (selected.has(fbKey)) {
        const result = await savePageConnection({
          workspace_id: workspaceId,
          client_id: clientId,
          platform: 'facebook',
          page_id: page.facebook.page_id,
          page_name: page.facebook.page_name,
          page_access_token: page.facebook.access_token,
          instagram_account_id: page.instagram?.instagram_account_id,
          instagram_username: page.instagram?.instagram_username,
        });
        if (result.success) count++;
      }

      // Conecta Instagram (usa o mesmo token da Page)
      if (page.instagram) {
        const igKey = makeKey(page.instagram.instagram_account_id, 'instagram');
        if (selected.has(igKey)) {
          const result = await savePageConnection({
            workspace_id: workspaceId,
            client_id: clientId,
            platform: 'instagram',
            page_id: page.instagram.instagram_account_id,
            page_name: page.instagram.instagram_name || page.instagram.instagram_username,
            page_access_token: page.facebook.access_token,
            instagram_account_id: page.instagram.instagram_account_id,
            instagram_username: page.instagram.instagram_username,
          });
          if (result.success) count++;
        }
      }
    }

    setSaving(false);
    setSavedCount(count);

    if (count > 0) {
      setTimeout(() => {
        onConnected();
        onClose();
      }, 1200);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conectar Contas de Redes Sociais"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Selecione as Pages do Facebook e/ou contas do Instagram que deseja monitorar.
          Utilizamos o token Meta ja configurado no seu workspace.
        </p>

        {error && (
          <Alert variant="warning" title="Aviso">
            {error}
            {error.includes('conexao Meta') && (
              <p className="mt-1 text-xs">
                Acesse a secao <strong>Meta Ads &gt; Conexao Meta</strong> para configurar a integracao.
              </p>
            )}
          </Alert>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <Loading text="Buscando paginas disponiveis..." />
          </div>
        )}

        {!loading && !error && pages.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Nenhuma Page do Facebook encontrada com o token atual.
          </div>
        )}

        {!loading && pages.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pages.map((page) => (
              <div key={page.facebook.page_id} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                {/* Facebook Page */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selected.has(makeKey(page.facebook.page_id, 'facebook'))}
                    onChange={() => toggleSelection(makeKey(page.facebook.page_id, 'facebook'))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Facebook className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{page.facebook.page_name}</p>
                      <p className="text-xs text-gray-500">
                        Facebook Page &middot; {page.facebook.page_category || 'Pagina'}
                      </p>
                    </div>
                  </div>
                </label>

                {/* Instagram Account (se houver) */}
                {page.instagram && (
                  <label className="flex items-center gap-3 cursor-pointer mt-2 pl-1">
                    <input
                      type="checkbox"
                      checked={selected.has(makeKey(page.instagram.instagram_account_id, 'instagram'))}
                      onChange={() =>
                        toggleSelection(makeKey(page.instagram!.instagram_account_id, 'instagram'))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                        <Instagram className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          @{page.instagram.instagram_username}
                        </p>
                        <p className="text-xs text-gray-500">
                          Instagram Business &middot;{' '}
                          {page.instagram.followers_count.toLocaleString('pt-BR')} seguidores
                        </p>
                      </div>
                    </div>
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        {savedCount > 0 && (
          <Alert variant="success">
            {savedCount} conta{savedCount > 1 ? 's' : ''} conectada{savedCount > 1 ? 's' : ''} com sucesso!
          </Alert>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadPages} loading={loading}>
            Atualizar lista
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle}
              disabled={selected.size === 0 || saving}
              loading={saving}
              onClick={handleConnect}
            >
              Conectar {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
