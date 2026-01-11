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
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
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
          {/* Header with Reset Button */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Configurações de Interface</h3>
                <p className="text-sm text-gray-600">Personalize a aparência e comportamento da interface</p>
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

      {activeTab === 'notifications' && (
        <NotificationsTab />
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

/**
 * Componente da aba de notificações
 * Permite ao usuário configurar todas as preferências de notificações
 */
const NotificationsTab: React.FC = () => {
  const { user } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadNotificationSettings();
  }, [user]);

  /**
   * Carrega as configurações de notificação do usuário do banco de dados
   */
  const loadNotificationSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar configurações existentes
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar configurações de notificação:', error);
      }

      if (data) {
        setNotificationSettings(data);
      } else {
        // Se não existir, criar com valores padrão
        const defaultSettings = {
          user_id: user.id,
          email_notifications: true,
          push_notifications: true,
          desktop_notifications: true,
          notification_frequency: 'immediate',
          categories: {
            system: true,
            campaign: true,
            budget: true,
            performance: true,
            sync: true,
            security: true
          },
          thresholds: {
            budget_alert_percentage: 80,
            performance_drop_percentage: 20,
            spend_increase_percentage: 50,
            ctr_drop_percentage: 25,
            roas_drop_percentage: 30
          },
          quiet_hours: {
            enabled: false,
            start_time: '22:00',
            end_time: '08:00'
          }
        };

        const { data: created, error: createError } = await supabase
          .from('notification_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar configurações padrão:', createError);
          setNotificationSettings(defaultSettings);
        } else {
          setNotificationSettings(created);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de notificação:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Salva as configurações de notificação no banco de dados
   */
  const handleSaveNotificationSettings = async () => {
    if (!user || !notificationSettings) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          ...notificationSettings,
          user_id: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSaveMessage({ type: 'success', text: 'Configurações de notificação salvas com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setSaveMessage({ type: 'error', text: 'Erro ao salvar configurações. Tente novamente.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  /**
   * Atualiza uma configuração específica
   */
  const updateSetting = (key: string, value: any) => {
    setNotificationSettings((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  /**
   * Atualiza uma categoria de notificação
   */
  const updateCategory = (category: string, enabled: boolean) => {
    setNotificationSettings((prev: any) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: enabled
      }
    }));
  };

  /**
   * Atualiza um threshold de alerta
   */
  const updateThreshold = (threshold: string, value: number) => {
    setNotificationSettings((prev: any) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [threshold]: value
      }
    }));
  };

  /**
   * Atualiza configurações de horário silencioso
   */
  const updateQuietHours = (updates: any) => {
    setNotificationSettings((prev: any) => ({
      ...prev,
      quiet_hours: {
        ...prev.quiet_hours,
        ...updates
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!notificationSettings) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Erro ao carregar configurações de notificação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Delivery Methods - Métodos de Entrega */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Métodos de Entrega</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Email</h4>
                <p className="text-sm text-gray-500">Receber notificações por email</p>
              </div>
            </div>
            <Tooltip content={notificationSettings.email_notifications ? "Desativar emails" : "Ativar emails"}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.email_notifications}
                  onChange={(e) => updateSetting('email_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </Tooltip>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Monitor className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Desktop</h4>
                <p className="text-sm text-gray-500">Notificações do navegador</p>
              </div>
            </div>
            <Tooltip content={notificationSettings.desktop_notifications ? "Desativar notificações desktop" : "Ativar notificações desktop"}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.desktop_notifications}
                  onChange={(e) => updateSetting('desktop_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </Tooltip>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Push</h4>
                <p className="text-sm text-gray-500">Notificações push no dispositivo</p>
              </div>
            </div>
            <Tooltip content={notificationSettings.push_notifications ? "Desativar push" : "Ativar push"}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.push_notifications}
                  onChange={(e) => updateSetting('push_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* Frequency - Frequência */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Frequência de Notificações</h3>
        <div className="space-y-3">
          {[
            { value: 'immediate', label: 'Imediato', description: 'Receber notificações instantaneamente' },
            { value: 'hourly', label: 'A cada hora', description: 'Resumo das notificações a cada hora' },
            { value: 'daily', label: 'Diário', description: 'Resumo diário das notificações às 9h' },
            { value: 'weekly', label: 'Semanal', description: 'Resumo semanal toda segunda-feira' }
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                notificationSettings.notification_frequency === option.value
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'border-2 border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={option.value}
                checked={notificationSettings.notification_frequency === option.value}
                onChange={(e) => updateSetting('notification_frequency', e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Categories - Categorias */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Categorias de Notificação</h3>
        <p className="text-sm text-gray-600 mb-4">
          Escolha quais tipos de notificações você deseja receber
        </p>
        <div className="space-y-4">
          {[
            { key: 'system', label: 'Sistema', description: 'Atualizações e manutenções do sistema', color: 'bg-gray-100 text-gray-600' },
            { key: 'campaign', label: 'Campanhas', description: 'Status e alterações em campanhas', color: 'bg-blue-100 text-blue-600' },
            { key: 'budget', label: 'Orçamento', description: 'Alertas de orçamento e gastos', color: 'bg-yellow-100 text-yellow-600' },
            { key: 'performance', label: 'Performance', description: 'Mudanças significativas na performance', color: 'bg-green-100 text-green-600' },
            { key: 'sync', label: 'Sincronização', description: 'Status de sincronização de dados', color: 'bg-purple-100 text-purple-600' },
            { key: 'security', label: 'Segurança', description: 'Alertas de segurança e acesso', color: 'bg-red-100 text-red-600' }
          ].map((category) => (
            <div key={category.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${category.color}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{category.label}</h4>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.categories[category.key]}
                  onChange={(e) => updateCategory(category.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </Card>

      {/* Thresholds - Limites de Alerta */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Limites de Alerta</h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure quando você deseja ser notificado sobre mudanças importantes
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alerta de Orçamento (% gasto)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={notificationSettings.thresholds.budget_alert_percentage}
                onChange={(e) => updateThreshold('budget_alert_percentage', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                {notificationSettings.thresholds.budget_alert_percentage}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Notificar quando {notificationSettings.thresholds.budget_alert_percentage}% do orçamento for gasto
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Queda de Performance (% de redução)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={notificationSettings.thresholds.performance_drop_percentage}
                onChange={(e) => updateThreshold('performance_drop_percentage', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                {notificationSettings.thresholds.performance_drop_percentage}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Notificar se performance cair {notificationSettings.thresholds.performance_drop_percentage}%
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Queda de CTR (% de redução)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={notificationSettings.thresholds.ctr_drop_percentage}
                onChange={(e) => updateThreshold('ctr_drop_percentage', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                {notificationSettings.thresholds.ctr_drop_percentage}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Notificar se CTR cair {notificationSettings.thresholds.ctr_drop_percentage}%
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Queda de ROAS (% de redução)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={notificationSettings.thresholds.roas_drop_percentage}
                onChange={(e) => updateThreshold('roas_drop_percentage', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 w-12 text-right">
                {notificationSettings.thresholds.roas_drop_percentage}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Notificar se ROAS cair {notificationSettings.thresholds.roas_drop_percentage}%
            </p>
          </div>
        </div>
      </Card>

      {/* Quiet Hours - Horário Silencioso */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Horário Silencioso</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Moon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Ativar Modo Silencioso</h4>
                <p className="text-sm text-gray-500">Pausar notificações durante horários específicos</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.quiet_hours.enabled}
                onChange={(e) => updateQuietHours({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {notificationSettings.quiet_hours.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Início
                </label>
                <input
                  type="time"
                  value={notificationSettings.quiet_hours.start_time}
                  onChange={(e) => updateQuietHours({ start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fim
                </label>
                <input
                  type="time"
                  value={notificationSettings.quiet_hours.end_time}
                  onChange={(e) => updateQuietHours({ end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {notificationSettings.quiet_hours.enabled && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-sm text-indigo-700">
                <Clock className="w-4 h-4 inline mr-2" />
                Você não receberá notificações entre {notificationSettings.quiet_hours.start_time} e {notificationSettings.quiet_hours.end_time}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveNotificationSettings}
          loading={saving}
          icon={Save}
          size="lg"
        >
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};