import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Globe, 
  Clock, 
  Palette, 
  Monitor,
  Moon,
  Sun,
  Save,
  Upload,
  Camera,
  Shield,
  Download,
  Bell,
  Settings as SettingsIcon,
  CheckCircle,
  AlertCircle,
  Search,
  Loader,
  Zap,
  Eye,
  Accessibility,
  RotateCcw
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { useSettings } from '../../hooks/useSettings';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { useTheme } from '../settings/ThemeProvider';
import { SecurityManager } from './SecurityManager';
import { DataExporter } from './DataExporter';

export const SettingsPage: React.FC = () => {
  const { 
    profile, 
    systemSettings: legacySettings, 
    loading, 
    updateProfile, 
    updateSystemSettings: updateLegacySettings, 
    uploadAvatar 
  } = useSettings();
  
  const { settings: systemSettings, updateSettings: updateSystemSettings, resetToDefaults } = useSystemSettings();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: '',
    cep: '',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR'
  });

  useEffect(() => {
    if (profile) {
      const addressParts = profile.address ? profile.address.split(',').map(part => part.trim()) : [];
      
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        company: profile.company || '',
        address: addressParts[0] || '',
        number: addressParts[1] || '',
        complement: addressParts[2] || '',
        neighborhood: addressParts[3] || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || '',
        cep: profile.cep || '',
        timezone: profile.timezone || 'America/Sao_Paulo',
        language: profile.language || 'pt-BR'
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, (match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`;
        if (p2) return `(${p1}) ${p2}`;
        if (p1) return `(${p1}`;
        return numbers;
      });
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, (match, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`;
        if (p2) return `(${p1}) ${p2}`;
        if (p1) return `(${p1}`;
        return numbers;
      });
    }
  };

  const handlePhoneChange = (value: string) => {
    const formattedPhone = formatPhone(value);
    handleInputChange('phone', formattedPhone);
  };

  const searchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setSaveMessage({ type: 'error', text: 'CEP deve ter 8 dígitos' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setCepLoading(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setSaveMessage({ type: 'error', text: 'CEP não encontrado' });
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      setFormData(prev => ({
        ...prev,
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
        country: 'Brasil',
        cep: cleanCep
      }));

      setSaveMessage({ type: 'success', text: 'Endereço encontrado e preenchido!' });
      setTimeout(() => setSaveMessage(null), 3000);

    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao buscar CEP. Tente novamente.' });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    let formattedValue = cleanValue;
    
    if (cleanValue.length > 5) {
      formattedValue = `${cleanValue.slice(0, 5)}-${cleanValue.slice(5, 8)}`;
    }
    
    handleInputChange('cep', formattedValue);
    
    if (cleanValue.length === 8) {
      searchAddressByCep(cleanValue);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const addressComponents = [
        formData.address,
        formData.number,
        formData.complement,
        formData.neighborhood
      ].filter(Boolean);
      
      const fullAddress = addressComponents.join(', ');

      const profileData = {
        ...formData,
        address: fullAddress
      };

      const result = await updateProfile(profileData);
      
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      } else {
        setSaveMessage({ type: 'error', text: 'Erro ao atualizar perfil. Tente novamente.' });
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao atualizar perfil. Tente novamente.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveMessage({ type: 'error', text: 'Por favor, selecione um arquivo de imagem.' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'A imagem deve ter no máximo 5MB.' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setUploading(true);
    setSaveMessage(null);

    try {
      const result = await uploadAvatar(file);
      
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'Avatar atualizado com sucesso!' });
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Erro ao fazer upload do avatar.' });
      }
    } catch (error) {
      console.error('Erro no upload do avatar:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao fazer upload do avatar.' });
    } finally {
      setUploading(false);
      setTimeout(() => setSaveMessage(null), 5000);
      event.target.value = '';
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    updateSystemSettings({ theme: newTheme });
  };

  const handleSystemSettingChange = (key: keyof typeof systemSettings, value: any) => {
    updateSystemSettings({ [key]: value });
  };

  const handleResetSettings = () => {
    if (confirm('Tem certeza que deseja restaurar todas as configurações para os valores padrão?')) {
      resetToDefaults();
      setSaveMessage({ type: 'success', text: 'Configurações restauradas para os valores padrão!' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'data', label: 'Dados', icon: Download }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-r from-gray-600 to-blue-600 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600">Gerencie suas preferências e configurações da conta</p>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-4 rounded-lg border ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {saveMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar Section */}
          <Card>
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <User className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
                <Tooltip content="Clique para alterar sua foto de perfil">
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </Tooltip>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Foto do Perfil</h3>
                <p className="text-sm text-gray-600">JPG, PNG ou GIF. Máximo 5MB.</p>
                <p className="text-xs text-green-600 mt-1">
                  {profile?.avatar_url ? 'Avatar carregado' : 'Nenhum avatar'}
                </p>
                {uploading && (
                  <p className="text-xs text-blue-600 mt-1">
                    Fazendo upload...
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Informações Pessoais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: (11) 99999-9999
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome da empresa"
                />
              </div>
            </div>
          </Card>

          {/* Address Information */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Endereço</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CEP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {cepLoading ? (
                      <Loader className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Digite o CEP para buscar o endereço automaticamente
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Estado/UF"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logradouro
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rua, Avenida, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.complement}
                  onChange={(e) => handleInputChange('complement', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Apto, Sala, etc. (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do bairro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sua cidade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  País
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="País"
                />
              </div>
            </div>
          </Card>

          {/* System Preferences */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Preferências do Sistema</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuso Horário
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                  <option value="America/New_York">Nova York (GMT-5)</option>
                  <option value="Europe/London">Londres (GMT+0)</option>
                  <option value="Asia/Tokyo">Tóquio (GMT+9)</option>
                  <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
                  <option value="Europe/Paris">Paris (GMT+1)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSaveProfile}
                loading={saving}
                icon={Save}
              >
                Salvar Perfil
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Theme Selection */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tema</h3>
                <p className="text-sm text-gray-600">Escolha a aparência da interface</p>
              </div>
              <Tooltip content="Restaurar configurações padrão">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetSettings}
                  icon={RotateCcw}
                >
                  Restaurar Padrão
                </Button>
              </Tooltip>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mb-6">
              {[
                { value: 'light', label: 'Claro', icon: Sun, description: 'Interface clara e limpa' },
                { value: 'dark', label: 'Escuro', icon: Moon, description: 'Interface escura para reduzir cansaço visual' },
                { value: 'auto', label: 'Automático', icon: Monitor, description: 'Segue as configurações do sistema' }
              ].map((themeOption) => (
                <Tooltip key={themeOption.value} content={themeOption.description}>
                  <button
                    onClick={() => handleThemeChange(themeOption.value as any)}
                    className={`relative p-6 border-2 rounded-xl flex flex-col items-center space-y-4 transition-all duration-200 ${
                      theme === themeOption.value
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-4 rounded-xl ${
                      theme === themeOption.value ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <themeOption.icon className={`w-8 h-8 ${
                        theme === themeOption.value ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 text-lg">{themeOption.label}</h4>
                      <p className="text-sm text-gray-500 mt-1">{themeOption.description}</p>
                    </div>
                    {theme === themeOption.value && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </button>
                </Tooltip>
              ))}
            </div>
          </Card>

          {/* Interface Options */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Opções de Interface</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Modo Compacto</h4>
                    <p className="text-sm text-gray-500">Reduz o espaçamento da interface</p>
                  </div>
                </div>
                <Tooltip content={systemSettings.compact_mode ? "Desativar modo compacto" : "Ativar modo compacto"}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.compact_mode}
                      onChange={(e) => handleSystemSettingChange('compact_mode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </Tooltip>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Mostrar Dicas</h4>
                    <p className="text-sm text-gray-500">Exibir tooltips explicativos</p>
                  </div>
                </div>
                <Tooltip content={systemSettings.show_tooltips ? "Desativar tooltips" : "Ativar tooltips"}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.show_tooltips}
                      onChange={(e) => handleSystemSettingChange('show_tooltips', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </Tooltip>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Animações</h4>
                    <p className="text-sm text-gray-500">Habilitar transições e animações</p>
                  </div>
                </div>
                <Tooltip content={systemSettings.animations_enabled ? "Desativar animações" : "Ativar animações"}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.animations_enabled}
                      onChange={(e) => handleSystemSettingChange('animations_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </Tooltip>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Accessibility className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Alto Contraste</h4>
                    <p className="text-sm text-gray-500">Aumenta o contraste para melhor legibilidade</p>
                  </div>
                </div>
                <Tooltip content={systemSettings.high_contrast ? "Desativar alto contraste" : "Ativar alto contraste"}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.high_contrast}
                      onChange={(e) => handleSystemSettingChange('high_contrast', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </Tooltip>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Clock className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Reduzir Movimento</h4>
                    <p className="text-sm text-gray-500">Minimiza animações para sensibilidade ao movimento</p>
                  </div>
                </div>
                <Tooltip content={systemSettings.reduce_motion ? "Permitir movimento normal" : "Reduzir movimento"}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.reduce_motion}
                      onChange={(e) => handleSystemSettingChange('reduce_motion', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </Tooltip>
              </div>
            </div>
          </Card>

          {/* Auto Refresh Settings */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Atualização Automática</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <RotateCcw className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Atualização Automática</h4>
                    <p className="text-sm text-gray-500">Atualizar dados automaticamente</p>
                  </div>
                </div>
                <Tooltip content={systemSettings.auto_refresh ? "Desativar atualização automática" : "Ativar atualização automática"}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.auto_refresh}
                      onChange={(e) => handleSystemSettingChange('auto_refresh', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </Tooltip>
              </div>

              {systemSettings.auto_refresh && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intervalo de Atualização (segundos)
                  </label>
                  <select
                    value={systemSettings.refresh_interval}
                    onChange={(e) => handleSystemSettingChange('refresh_interval', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={60}>1 minuto</option>
                    <option value={300}>5 minutos</option>
                    <option value={600}>10 minutos</option>
                    <option value={1800}>30 minutos</option>
                    <option value={3600}>1 hora</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Frequência com que os dados serão atualizados automaticamente
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'security' && (
        <SecurityManager />
      )}

      {activeTab === 'data' && (
        <DataExporter />
      )}
    </div>
  );
};