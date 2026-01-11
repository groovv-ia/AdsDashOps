/**
 * WorkspacesPage
 *
 * Pagina para gerenciamento de workspaces do usuario.
 * Permite criar, editar, deletar workspaces, gerenciar membros e fazer upload de logo.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  Check,
  X,
  Crown,
  Shield,
  User,
  UserPlus,
  Loader2,
  AlertCircle,
  Camera,
  Upload,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  WorkspaceWithMembers,
  WorkspaceConnections,
  getWorkspaceDetails,
  addWorkspaceMember,
  removeWorkspaceMember,
  updateMemberRole,
  uploadWorkspaceLogo,
  removeWorkspaceLogo,
  updateWorkspace as updateWorkspaceService,
} from '../../lib/services/WorkspaceService';
import {
  CreateWorkspaceWarningModal,
  SwitchWorkspaceConfirmModal,
} from './WorkspaceWarningModals';
import { WorkspaceConnectionBadge } from './WorkspaceIndicator';

// Componente para icone de role
function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case 'owner':
      return <Crown className="w-4 h-4 text-amber-500" />;
    case 'admin':
      return <Shield className="w-4 h-4 text-blue-500" />;
    default:
      return <User className="w-4 h-4 text-gray-500" />;
  }
}

// Componente para badge de role
function RoleBadge({ role }: { role: string }) {
  const colors = {
    owner: 'bg-amber-100 text-amber-700 border-amber-200',
    admin: 'bg-blue-100 text-blue-700 border-blue-200',
    member: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const labels = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Membro',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[role as keyof typeof colors] || colors.member}`}>
      {labels[role as keyof typeof labels] || role}
    </span>
  );
}

// Componente de upload de logo
interface LogoUploaderProps {
  workspaceId: string;
  currentLogoUrl?: string | null;
  workspaceName: string;
  onLogoUpdated: () => void;
}

function LogoUploader({ workspaceId, currentLogoUrl, workspaceName, onLogoUpdated }: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const { url, error: uploadError } = await uploadWorkspaceLogo(workspaceId, file);

      if (uploadError) {
        setError(uploadError);
        return;
      }

      if (url) {
        // Salva a URL do logo no workspace
        await updateWorkspaceService(workspaceId, { logo_url: url });
        onLogoUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload');
    } finally {
      setIsUploading(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Tem certeza que deseja remover o logo?')) return;

    setIsUploading(true);
    setError('');

    try {
      const result = await removeWorkspaceLogo(workspaceId);
      if (!result.success) {
        setError(result.error || 'Erro ao remover logo');
        return;
      }
      onLogoUpdated();
    } catch (err: any) {
      setError(err.message || 'Erro ao remover logo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Preview do logo */}
      <div className="relative group">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
          {currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt={workspaceName}
              className="w-full h-full object-cover"
            />
          ) : (
            <Building2 className="w-10 h-10 text-white" />
          )}
        </div>

        {/* Overlay de edicao */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botoes de acao */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {currentLogoUrl ? 'Alterar' : 'Upload'}
        </button>

        {currentLogoUrl && (
          <button
            onClick={handleRemoveLogo}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Remover
          </button>
        )}
      </div>

      {/* Erro */}
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      {/* Dica */}
      <p className="text-xs text-gray-500 text-center">
        JPG, PNG, WEBP ou GIF. Max 2MB.
      </p>
    </div>
  );
}

// Modal de criar/editar workspace
interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  initialName?: string;
  title: string;
}

function WorkspaceModal({ isOpen, onClose, onSave, initialName = '', title }: WorkspaceModalProps) {
  const [name, setName] = useState(initialName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialName);
    setError('');
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome e obrigatorio');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave(name.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Workspace
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Minha Agencia"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de adicionar membro
interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (email: string, role: 'admin' | 'member') => Promise<void>;
}

function AddMemberModal({ isOpen, onClose, onAdd }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail('');
    setRole('member');
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email e obrigatorio');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onAdd(email.trim().toLowerCase(), role);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar membro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Adicionar Membro</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email do Usuario
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Funcao
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="member">Membro - Apenas visualizacao</option>
              <option value="admin">Admin - Pode gerenciar membros</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente principal
export function WorkspacesPage() {
  const {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    isLoading,
    refreshWorkspaces,
    getWorkspaceConnections,
  } = useWorkspace();

  // Estados locais
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceWithMembers | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [actionError, setActionError] = useState('');

  // Novos estados para modais de aviso
  const [showCreateWarningModal, setShowCreateWarningModal] = useState(false);
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState(false);
  const [targetSwitchWorkspace, setTargetSwitchWorkspace] = useState<any>(null);

  // Estados para conexões
  const [workspaceConnections, setWorkspaceConnections] = useState<Map<string, WorkspaceConnections>>(new Map());
  const [currentWorkspaceConn, setCurrentWorkspaceConn] = useState<WorkspaceConnections | null>(null);

  // Carrega detalhes do workspace selecionado
  const loadWorkspaceDetails = async (workspaceId: string) => {
    setIsLoadingDetails(true);
    const { data, error } = await getWorkspaceDetails(workspaceId);
    if (data) {
      setSelectedWorkspace(data);
    }
    if (error) {
      setActionError(error);
    }
    setIsLoadingDetails(false);
  };

  // Carrega conexões de todos os workspaces
  useEffect(() => {
    const loadAllConnections = async () => {
      if (workspaces.length === 0) return;

      const connections = new Map<string, WorkspaceConnections>();

      for (const ws of workspaces) {
        const conn = await getWorkspaceConnections(ws.id);
        if (conn) {
          connections.set(ws.id, conn);
        }
      }

      setWorkspaceConnections(connections);

      // Atualiza conexão do workspace atual
      if (currentWorkspace) {
        const currentConn = connections.get(currentWorkspace.id);
        setCurrentWorkspaceConn(currentConn || null);
      }
    };

    loadAllConnections();
  }, [workspaces, currentWorkspace, getWorkspaceConnections]);

  // Seleciona primeiro workspace por padrao
  useEffect(() => {
    if (currentWorkspace && !selectedWorkspace) {
      loadWorkspaceDetails(currentWorkspace.id);
    }
  }, [currentWorkspace, selectedWorkspace]);

  // Criar workspace
  const handleCreate = async (name: string) => {
    const result = await createWorkspace({ name });
    if (!result.success) {
      throw new Error(result.error);
    }
    await refreshWorkspaces();
  };

  // Editar workspace
  const handleEdit = async (name: string) => {
    if (!selectedWorkspace) return;
    const result = await updateWorkspace(selectedWorkspace.id, { name });
    if (!result.success) {
      throw new Error(result.error);
    }
    await refreshWorkspaces();
    await loadWorkspaceDetails(selectedWorkspace.id);
  };

  // Deletar workspace
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este workspace? Esta acao nao pode ser desfeita.')) {
      return;
    }

    const result = await deleteWorkspace(id);
    if (!result.success) {
      setActionError(result.error || 'Erro ao deletar');
      return;
    }

    setSelectedWorkspace(null);
    await refreshWorkspaces();
  };

  // Adicionar membro
  const handleAddMember = async (email: string, role: 'admin' | 'member') => {
    if (!selectedWorkspace) return;

    const result = await addWorkspaceMember(selectedWorkspace.id, { email, role });
    if (!result.success) {
      throw new Error(result.error);
    }

    await loadWorkspaceDetails(selectedWorkspace.id);
  };

  // Remover membro
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedWorkspace) return;
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    const result = await removeWorkspaceMember(selectedWorkspace.id, memberId);
    if (!result.success) {
      setActionError(result.error || 'Erro ao remover membro');
      return;
    }

    await loadWorkspaceDetails(selectedWorkspace.id);
  };

  // Alterar role
  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!selectedWorkspace) return;

    const result = await updateMemberRole(selectedWorkspace.id, memberId, newRole);
    if (!result.success) {
      setActionError(result.error || 'Erro ao alterar funcao');
      return;
    }

    await loadWorkspaceDetails(selectedWorkspace.id);
  };

  // Trocar workspace ativo - agora com confirmação
  const handleActivate = async (workspace: any) => {
    // Busca conexões do workspace de destino se ainda não tiver
    let targetConn = workspaceConnections.get(workspace.id);
    if (!targetConn) {
      targetConn = await getWorkspaceConnections(workspace.id);
    }

    setTargetSwitchWorkspace({
      workspace,
      connections: targetConn,
    });
    setShowSwitchConfirmModal(true);
  };

  // Confirma a troca de workspace
  const confirmSwitchWorkspace = () => {
    if (targetSwitchWorkspace) {
      setCurrentWorkspace(targetSwitchWorkspace.workspace);
      setShowSwitchConfirmModal(false);
      // Recarrega a página para atualizar todos os dados
      window.location.reload();
    }
  };

  // Callback quando logo e atualizado
  const handleLogoUpdated = async () => {
    await refreshWorkspaces();
    if (selectedWorkspace) {
      await loadWorkspaceDetails(selectedWorkspace.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-gray-500 mt-1">
            Gerencie seus workspaces e membros da equipe
          </p>
        </div>
        <button
          onClick={() => setShowCreateWarningModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Workspace
        </button>
      </div>

      {/* Erro global */}
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{actionError}</p>
          <button
            onClick={() => setActionError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Workspaces */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Seus Workspaces</h2>
            </div>

            <div className="divide-y divide-gray-100">
              {workspaces.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum workspace encontrado</p>
                </div>
              ) : (
                workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      setSelectedWorkspace(null);
                      loadWorkspaceDetails(workspace.id);
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedWorkspace?.id === workspace.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Logo ou icone padrao */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden ${
                        !workspace.logo_url && currentWorkspace?.id === workspace.id
                          ? 'bg-blue-100 text-blue-600'
                          : !workspace.logo_url
                            ? 'bg-gray-100 text-gray-600'
                            : ''
                      }`}>
                        {workspace.logo_url ? (
                          <img
                            src={workspace.logo_url}
                            alt={workspace.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {workspace.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {currentWorkspace?.id === workspace.id && (
                            <span className="text-xs text-blue-600 font-medium">Ativo</span>
                          )}
                          {workspaceConnections.get(workspace.id) && (
                            <WorkspaceConnectionBadge
                              hasMetaConnection={(workspaceConnections.get(workspace.id)?.meta_connections || 0) > 0}
                              hasGoogleConnection={(workspaceConnections.get(workspace.id)?.google_connections || 0) > 0}
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                      {currentWorkspace?.id === workspace.id && (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detalhes do Workspace */}
        <div className="lg:col-span-2">
          {isLoadingDetails ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : selectedWorkspace ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header do workspace */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-6">
                    {/* Upload de logo */}
                    <LogoUploader
                      workspaceId={selectedWorkspace.id}
                      currentLogoUrl={selectedWorkspace.logo_url}
                      workspaceName={selectedWorkspace.name}
                      onLogoUpdated={handleLogoUpdated}
                    />

                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedWorkspace.name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedWorkspace.member_count} membro(s)
                      </p>

                      {/* Botao de ativar */}
                      {currentWorkspace?.id !== selectedWorkspace.id && (
                        <button
                          onClick={() => handleActivate(selectedWorkspace)}
                          className="mt-3 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Ativar este workspace
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar nome"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedWorkspace.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Deletar workspace"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Membros */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Membros
                  </h3>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedWorkspace.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <RoleIcon role={member.role} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.user_name || member.user_email || 'Usuario'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {member.user_email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {member.role !== 'owner' ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value as 'admin' | 'member')}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Membro</option>
                          </select>
                        ) : (
                          <RoleBadge role={member.role} />
                        )}

                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Selecione um workspace para ver detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      <WorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
        title="Criar Workspace"
      />

      <WorkspaceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEdit}
        initialName={selectedWorkspace?.name || ''}
        title="Editar Workspace"
      />

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onAdd={handleAddMember}
      />

      {/* Novos modais de aviso */}
      <CreateWorkspaceWarningModal
        isOpen={showCreateWarningModal}
        onClose={() => setShowCreateWarningModal(false)}
        onConfirm={() => {
          setShowCreateWarningModal(false);
          setShowCreateModal(true);
        }}
        currentWorkspaceName={currentWorkspace?.name || ''}
        hasConnections={currentWorkspaceConn?.has_any_connection || false}
      />

      {targetSwitchWorkspace && currentWorkspace && (
        <SwitchWorkspaceConfirmModal
          isOpen={showSwitchConfirmModal}
          onClose={() => setShowSwitchConfirmModal(false)}
          onConfirm={confirmSwitchWorkspace}
          currentWorkspace={{
            name: currentWorkspace.name,
            connections: currentWorkspaceConn,
          }}
          targetWorkspace={{
            name: targetSwitchWorkspace.workspace.name,
            connections: targetSwitchWorkspace.connections,
          }}
        />
      )}
    </div>
  );
}
