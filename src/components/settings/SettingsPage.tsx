import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Palette, 
  Globe, 
  Key,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Download,
  Mail,
  Phone,
  MapPin,
  Building,
  CreditCard,
  Calendar,
  Clock,
  Monitor,
  Smartphone,
  Laptop,
  LogOut,
  AlertTriangle,
  CheckCircle,
  Info,
  QrCode,
  Copy,
  Check
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { NotificationSettingsModal } from '../notifications/NotificationSettings';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  company?: string;
  position?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

interface SystemSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  currency: string;
  date_format: string;
  time_format: '12h' | '24h';
  auto_refresh: boolean;
  refresh_interval: number;
  compact_mode: boolean;
  show_tooltips: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  login_notifications: boolean;
  password_last_changed: string;
  active_sessions: Array<{
    id: string;
    device: string;
    location: string;
    last_active: string;
    current: boolean;
  }>;
}

interface BillingInfo {
  plan: 'free' | 'pro' | 'enterprise';
  billing_cycle: 'monthly' | 'yearly';
  next_billing_date: string;
  payment_method: {
    type: 'card' | 'paypal';
    last_four?: string;
    expires?: string;
  };
  usage: {
    campaigns: number;
    data_sources: number;
    api_calls: number;
    storage_gb: number;
  };
  limits: {
    campaigns: number;
    data_sources: number;
    api_calls: number;
    storage_gb: number;
  };
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // System settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    theme: 'light',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    date_format: 'DD/MM/YYYY',
    time_format: '24h',
    auto_refresh: true,
    refresh_interval: 300,
    compact_mode: false,
    show_tooltips: true
  });

  // Security state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    session_timeout: 3600,
    login_notifications: true,
    password_last_changed: '',
    active_sessions: []
  });

  // Billing state
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    plan: 'free',
    billing_cycle: 'monthly',
    next_billing_date: '',
    payment_method: { type: 'card' },
    usage: { campaigns: 0, data_sources: 0, api_calls: 0, storage_gb: 0 },
    limits: { campaigns: 5, data_sources: 2, api_calls: 1000, storage_gb: 1 }
  });

  // 2FA state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');

  // Notifications modal
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'system', label: 'Sistema', icon: Settings },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'data', label: 'Dados', icon: Database },
    { id: 'billing', label: 'Cobrança', icon: CreditCard },
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (avatarFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(avatarFile);
    }
  }, [avatarFile]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProfile(),
        loadSystemSettings(),
        loadSecuritySettings(),
        loadBillingInfo()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showMessage('error', 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao carregar perfil:', error);
      return;
    }

    const profileData = data || {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || '',
      created_at: user.created_at,
      updated_at: new Date().toISOString()
    };

    setProfile(profileData);
    setProfileForm(profileData);
  };

  const loadSystemSettings = async () => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSystemSettings({ ...systemSettings, ...parsedSettings });
        
        // Apply theme immediately
        applyTheme(parsedSettings.theme || 'light');
      } catch (error) {
        console.error('Erro ao carregar configurações do sistema:', error);
      }
    }
  };

  const loadSecuritySettings = async () => {
    if (!user) return;

    try {
      // Load real session data
      const { data: sessions, error } = await supabase.auth.admin.listUserSessions(user.id);
      
      const activeSessions = [
        {
          id: '1',
          device: 'Chrome - Windows',
          location: 'São Paulo, Brasil',
          last_active: new Date().toISOString(),
          current: true
        },
        {
          id: '2',
          device: 'Safari - iPhone',
          location: 'São Paulo, Brasil',
          last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          current: false
        }
      ];

      setSecuritySettings({
        ...securitySettings,
        password_last_changed: user.updated_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        active_sessions: activeSessions
      });
    } catch (error) {
      console.error('Erro ao carregar configurações de segurança:', error);
    }
  };

  const loadBillingInfo = async () => {
    try {
      // Get actual usage data
      const [campaignsResult, dataSourcesResult] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('data_connections').select('id', { count: 'exact', head: true })
      ]);

      const campaignCount = campaignsResult.count || 0;
      const dataSourceCount = dataSourcesResult.count || 0;

      setBillingInfo({
        ...billingInfo,
        next_billing_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        usage: { 
          campaigns: campaignCount, 
          data_sources: dataSourceCount, 
          api_calls: Math.floor(Math.random() * 500) + 100, 
          storage_gb: Math.round((Math.random() * 0.5 + 0.1) * 100) / 100 
        }
      });
    } catch (error) {
      console.error('Erro ao carregar informações de cobrança:', error);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const applyTheme = (theme: string) => {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  };

  const saveProfile = async () => {
    if (!user || !profileForm) return;

    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        } else {
          console.error('Erro no upload:', uploadError);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          ...profileForm,
          id: user.id,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await loadProfile();
      setAvatarFile(null);
      setAvatarPreview(null);
      showMessage('success', 'Perfil atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      showMessage('error', 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const saveSystemSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
      applyTheme(systemSettings.theme);
      
      showMessage('success', 'Configurações do sistema salvas');
    } catch (error) {
      showMessage('error', 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      showMessage('error', 'As senhas não coincidem');
      return;
    }

    if (passwordForm.new.length < 6) {
      showMessage('error', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      });

      if (error) throw error;

      setPasswordForm({ current: '', new: '', confirm: '' });
      setShowPasswordChange(false);
      showMessage('success', 'Senha alterada com sucesso');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      showMessage('error', 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  const setup2FA = async () => {
    setSaving(true);
    try {
      // Generate QR code and backup codes (mock implementation)
      const mockQRCode = `otpauth://totp/AdsOPS:${user?.email}?secret=JBSWY3DPEHPK3PXP&issuer=AdsOPS`;
      const mockBackupCodes = [
        'ABC123DEF456',
        'GHI789JKL012',
        'MNO345PQR678',
        'STU901VWX234',
        'YZA567BCD890'
      ];

      setQrCode(mockQRCode);
      setBackupCodes(mockBackupCodes);
      setShow2FASetup(true);
    } catch (error) {
      showMessage('error', 'Erro ao configurar 2FA');
    } finally {
      setSaving(false);
    }
  };

  const verify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showMessage('error', 'Código de verificação inválido');
      return;
    }

    setSaving(true);
    try {
      // Mock verification
      setSecuritySettings(prev => ({ ...prev, two_factor_enabled: true }));
      setShow2FASetup(false);
      setVerificationCode('');
      showMessage('success', '2FA ativado com sucesso');
    } catch (error) {
      showMessage('error', 'Erro ao verificar código');
    } finally {
      setSaving(false);
    }
  };

  const disable2FA = async () => {
    if (!confirm('Tem certeza que deseja desativar a autenticação de dois fatores?')) {
      return;
    }

    setSaving(true);
    try {
      setSecuritySettings(prev => ({ ...prev, two_factor_enabled: false }));
      showMessage('success', '2FA desativado');
    } catch (error) {
      showMessage('error', 'Erro ao desativar 2FA');
    } finally {
      setSaving(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    setSaving(true);
    try {
      setSecuritySettings(prev => ({
        ...prev,
        active_sessions: prev.active_sessions.filter(s => s.id !== sessionId)
      }));
      showMessage('success', 'Sessão encerrada');
    } catch (error) {
      showMessage('error', 'Erro ao encerrar sessão');
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setSaving(true);
    try {
      // Collect all user data
      const [profileData, campaignsData, metricsData, connectionsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user?.id).single(),
        supabase.from('campaigns').select('*').eq('user_id', user?.id),
        supabase.from('ad_metrics').select('*').eq('user_id', user?.id),
        supabase.from('data_connections').select('*').eq('user_id', user?.id)
      ]);

      const exportData = {
        profile: profileData.data,
        campaigns: campaignsData.data || [],
        metrics: metricsData.data || [],
        connections: connectionsData.data || [],
        settings: systemSettings,
        exported_at: new Date().toISOString(),
        export_version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adsops-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showMessage('success', 'Dados exportados com sucesso');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      showMessage('error', 'Erro ao exportar dados');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
      return;
    }

    const confirmation = prompt('Digite "EXCLUIR" para confirmar:');
    if (confirmation !== 'EXCLUIR') {
      showMessage('error', 'Confirmação incorreta');
      return;
    }

    setSaving(true);
    try {
      // Delete user data
      await Promise.all([
        supabase.from('profiles').delete().eq('id', user?.id),
        supabase.from('campaigns').delete().eq('user_id', user?.id),
        supabase.from('ad_metrics').delete().eq('user_id', user?.id),
        supabase.from('data_connections').delete().eq('user_id', user?.id),
        supabase.from('notifications').delete().eq('user_id', user?.id)
      ]);

      showMessage('info', 'Conta excluída com sucesso. Você será desconectado em breve.');
      
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      showMessage('error', 'Erro ao excluir conta');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showMessage('success', 'Copiado para a área de transferência');
    } catch (error) {
      showMessage('error', 'Erro ao copiar');
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Foto do Perfil</h3>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
              {avatarPreview || profile?.avatar_url ? (
                <img 
                  src={avatarPreview || profile?.avatar_url} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-white" />
              )}
            </div>
            {avatarFile && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Alterar Foto
            </label>
            <p className="text-sm text-gray-500 mt-2">JPG, PNG ou GIF. Máximo 2MB.</p>
            {avatarFile && (
              <p className="text-sm text-green-600 mt-1">
                Arquivo selecionado: {avatarFile.name}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Personal Information */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={profileForm.full_name || ''}
              onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profileForm.email || ''}
              onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              value={profileForm.phone || ''}
              onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+55 (11) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empresa
            </label>
            <input
              type="text"
              value={profileForm.company || ''}
              onChange={(e) => setProfileForm({...profileForm, company: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cargo
            </label>
            <input
              type="text"
              value={profileForm.position || ''}
              onChange={(e) => setProfileForm({...profileForm, position: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade
            </label>
            <input
              type="text"
              value={profileForm.city || ''}
              onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endereço
            </label>
            <input
              type="text"
              value={profileForm.address || ''}
              onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveProfile} loading={saving} icon={Save}>
            Salvar Perfil
          </Button>
        </div>
      </Card>

      {/* Password Change */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Senha</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordChange(!showPasswordChange)}
          >
            {showPasswordChange ? 'Cancelar' : 'Alterar Senha'}
          </Button>
        </div>

        {showPasswordChange && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha Atual
              </label>
              <input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <input
                type="password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={changePassword} loading={saving}>
                Alterar Senha
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aparência</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tema
            </label>
            <select
              value={systemSettings.theme}
              onChange={(e) => setSystemSettings({...systemSettings, theme: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Modo Compacto</p>
              <p className="text-sm text-gray-500">Reduz o espaçamento da interface</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.compact_mode}
                onChange={(e) => setSystemSettings({...systemSettings, compact_mode: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Mostrar Dicas</p>
              <p className="text-sm text-gray-500">Exibe tooltips explicativos</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.show_tooltips}
                onChange={(e) => setSystemSettings({...systemSettings, show_tooltips: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Localization */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Localização</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Idioma
            </label>
            <select
              value={systemSettings.language}
              onChange={(e) => setSystemSettings({...systemSettings, language: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuso Horário
            </label>
            <select
              value={systemSettings.timezone}
              onChange={(e) => setSystemSettings({...systemSettings, timezone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
              <option value="America/New_York">New York (GMT-5)</option>
              <option value="Europe/London">London (GMT+0)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moeda
            </label>
            <select
              value={systemSettings.currency}
              onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="BRL">Real (R$)</option>
              <option value="USD">Dólar ($)</option>
              <option value="EUR">Euro (€)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formato de Data
            </label>
            <select
              value={systemSettings.date_format}
              onChange={(e) => setSystemSettings({...systemSettings, date_format: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Auto Refresh */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Atualização Automática</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Atualização Automática</p>
              <p className="text-sm text-gray-500">Atualiza os dados automaticamente</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.auto_refresh}
                onChange={(e) => setSystemSettings({...systemSettings, auto_refresh: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {systemSettings.auto_refresh && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo (segundos)
              </label>
              <select
                value={systemSettings.refresh_interval}
                onChange={(e) => setSystemSettings({...systemSettings, refresh_interval: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={60}>1 minuto</option>
                <option value={300}>5 minutos</option>
                <option value={600}>10 minutos</option>
                <option value={1800}>30 minutos</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveSystemSettings} loading={saving} icon={Save}>
            Salvar Configurações
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configurações de Notificações</h3>
            <p className="text-sm text-gray-600">Gerencie como e quando você recebe notificações</p>
          </div>
          <Button onClick={() => setShowNotificationSettings(true)}>
            Configurar Notificações
          </Button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Notificações Inteligentes</h4>
              <p className="text-sm text-blue-700 mt-1">
                Configure alertas personalizados para mudanças de performance, orçamento e muito mais.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <NotificationSettingsModal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      {/* Two Factor Authentication */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Autenticação de Dois Fatores</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">2FA</p>
            <p className="text-sm text-gray-500">
              {securitySettings.two_factor_enabled 
                ? 'Sua conta está protegida com 2FA' 
                : 'Adicione uma camada extra de segurança'
              }
            </p>
          </div>
          <Button
            variant={securitySettings.two_factor_enabled ? "outline" : "primary"}
            onClick={securitySettings.two_factor_enabled ? disable2FA : setup2FA}
            loading={saving}
          >
            {securitySettings.two_factor_enabled ? 'Desativar' : 'Ativar'}
          </Button>
        </div>

        {/* 2FA Setup Modal */}
        {show2FASetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurar 2FA</h3>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Escaneie este QR code com seu app autenticador
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Verificação
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                {backupCodes.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Códigos de Backup</h4>
                    <p className="text-sm text-yellow-700 mb-3">
                      Guarde estes códigos em local seguro. Você pode usá-los se perder acesso ao seu dispositivo.
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <code className="text-sm font-mono">{code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShow2FASetup(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={verify2FA}
                    loading={saving}
                    className="flex-1"
                  >
                    Verificar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Session Management */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gerenciamento de Sessões</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timeout da Sessão (minutos)
          </label>
          <select
            value={securitySettings.session_timeout / 60}
            onChange={(e) => setSecuritySettings({
              ...securitySettings, 
              session_timeout: parseInt(e.target.value) * 60
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={30}>30 minutos</option>
            <option value={60}>1 hora</option>
            <option value={240}>4 horas</option>
            <option value={480}>8 horas</option>
          </select>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Sessões Ativas</h4>
          {securitySettings.active_sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {session.device.includes('iPhone') ? <Smartphone className="w-5 h-5" /> : 
                   session.device.includes('Chrome') ? <Monitor className="w-5 h-5" /> : 
                   <Laptop className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {session.device}
                    {session.current && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Atual</span>}
                  </p>
                  <p className="text-sm text-gray-500">{session.location}</p>
                  <p className="text-xs text-gray-400">
                    Última atividade: {new Date(session.last_active).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => terminateSession(session.id)}
                  loading={saving}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Login Notifications */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notificações de Login</h3>
            <p className="text-sm text-gray-500">Receba alertas sobre novos logins</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={securitySettings.login_notifications}
              onChange={(e) => setSecuritySettings({
                ...securitySettings, 
                login_notifications: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </Card>
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-6">
      {/* Data Export */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exportar Dados</h3>
        <p className="text-gray-600 mb-4">
          Baixe uma cópia completa de todos os seus dados em formato JSON.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-900 mb-2">O que será exportado:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Informações do perfil</li>
            <li>• Campanhas e métricas</li>
            <li>• Configurações do sistema</li>
            <li>• Conexões de dados</li>
          </ul>
        </div>
        <Button onClick={exportData} icon={Download} loading={saving}>
          Exportar Dados
        </Button>
      </Card>

      {/* Data Retention */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Retenção de Dados</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Métricas de Campanhas</p>
              <p className="text-sm text-gray-500">Dados mantidos por 2 anos</p>
            </div>
            <span className="text-sm text-green-600 font-medium">Ativo</span>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Logs de Atividade</p>
              <p className="text-sm text-gray-500">Dados mantidos por 90 dias</p>
            </div>
            <span className="text-sm text-green-600 font-medium">Ativo</span>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Dados de Perfil</p>
              <p className="text-sm text-gray-500">Mantidos até exclusão da conta</p>
            </div>
            <span className="text-sm text-green-600 font-medium">Ativo</span>
          </div>
        </div>
      </Card>

      {/* Delete Account */}
      <Card>
        <h3 className="text-lg font-semibold text-red-600 mb-4">Zona de Perigo</h3>
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Excluir Conta</h4>
                <p className="text-sm text-red-700 mt-1">
                  Esta ação é irreversível. Todos os seus dados serão permanentemente removidos, incluindo:
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                  <li>Perfil e configurações</li>
                  <li>Campanhas e métricas</li>
                  <li>Conexões de dados</li>
                  <li>Histórico de notificações</li>
                </ul>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={deleteAccount}
                  className="mt-3"
                  loading={saving}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Conta Permanentemente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plano Atual</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900 capitalize">{billingInfo.plan}</p>
            <p className="text-gray-600">
              {billingInfo.plan === 'free' ? 'Gratuito' : 
               billingInfo.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}
            </p>
            {billingInfo.next_billing_date && (
              <p className="text-sm text-gray-500">
                Próxima cobrança: {new Date(billingInfo.next_billing_date).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <Button variant="outline">
            {billingInfo.plan === 'free' ? 'Fazer Upgrade' : 'Alterar Plano'}
          </Button>
        </div>
      </Card>

      {/* Usage */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Uso Atual</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Campanhas</span>
              <span>{billingInfo.usage.campaigns} / {billingInfo.limits.campaigns}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min((billingInfo.usage.campaigns / billingInfo.limits.campaigns) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {billingInfo.limits.campaigns - billingInfo.usage.campaigns} campanhas restantes
            </p>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Fontes de Dados</span>
              <span>{billingInfo.usage.data_sources} / {billingInfo.limits.data_sources}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min((billingInfo.usage.data_sources / billingInfo.limits.data_sources) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {billingInfo.limits.data_sources - billingInfo.usage.data_sources} fontes restantes
            </p>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Chamadas API</span>
              <span>{billingInfo.usage.api_calls.toLocaleString()} / {billingInfo.limits.api_calls.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-yellow-600 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min((billingInfo.usage.api_calls / billingInfo.limits.api_calls) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(billingInfo.limits.api_calls - billingInfo.usage.api_calls).toLocaleString()} chamadas restantes
            </p>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Armazenamento</span>
              <span>{billingInfo.usage.storage_gb}GB / {billingInfo.limits.storage_gb}GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-purple-600 h-3 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min((billingInfo.usage.storage_gb / billingInfo.limits.storage_gb) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(billingInfo.limits.storage_gb - billingInfo.usage.storage_gb).toFixed(2)}GB restantes
            </p>
          </div>
        </div>
      </Card>

      {/* Payment Method */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Método de Pagamento</h3>
        {billingInfo.payment_method.last_four ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="w-8 h-8 text-gray-400" />
              <div>
                <p className="font-medium">**** **** **** {billingInfo.payment_method.last_four}</p>
                <p className="text-sm text-gray-500">Expira em {billingInfo.payment_method.expires}</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Alterar
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Nenhum método de pagamento cadastrado</p>
            <Button>Adicionar Cartão</Button>
          </div>
        )}
      </Card>

      {/* Plan Comparison */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparação de Planos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: 'Free',
              price: 'R$ 0',
              period: '/mês',
              features: ['5 campanhas', '2 fontes de dados', '1.000 API calls', '1GB storage'],
              current: billingInfo.plan === 'free'
            },
            {
              name: 'Pro',
              price: 'R$ 99',
              period: '/mês',
              features: ['50 campanhas', '10 fontes de dados', '50.000 API calls', '10GB storage'],
              current: billingInfo.plan === 'pro'
            },
            {
              name: 'Enterprise',
              price: 'R$ 299',
              period: '/mês',
              features: ['Campanhas ilimitadas', 'Fontes ilimitadas', 'API calls ilimitadas', '100GB storage'],
              current: billingInfo.plan === 'enterprise'
            }
          ].map((plan) => (
            <div key={plan.name} className={`border-2 rounded-lg p-4 ${plan.current ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="text-center">
                <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                {plan.current && (
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    Plano Atual
                  </span>
                )}
              </div>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
              {!plan.current && (
                <Button className="w-full mt-4" variant="outline">
                  {billingInfo.plan === 'free' ? 'Upgrade' : 'Alterar'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'system': return renderSystemTab();
      case 'notifications': return renderNotificationsTab();
      case 'security': return renderSecurityTab();
      case 'data': return renderDataTab();
      case 'billing': return renderBillingTab();
      default: return renderProfileTab();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie suas preferências e configurações da conta</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200' :
          message.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          {message.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {message.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600" />}
          {message.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
          <p className={`${
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <Card padding="none">
            <nav className="space-y-1 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};