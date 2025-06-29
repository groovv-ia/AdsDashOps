import React, { useState, useEffect } from 'react';
import { Shield, Key, Smartphone, AlertTriangle, CheckCircle, Copy, QrCode } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface SecurityManagerProps {
  onSecurityChange?: (enabled: boolean) => void;
}

export const SecurityManager: React.FC<SecurityManagerProps> = ({ onSecurityChange }) => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      // Load 2FA status from user metadata or separate table
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.two_factor_enabled) {
        setTwoFactorEnabled(true);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de segurança:', error);
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não encontrado');

      // Generate secret key (in real app, this would be done server-side)
      const secret = generateSecret();
      const issuer = 'AdsOPS';
      const accountName = user.email;
      
      const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
      
      setQrCode(qrCodeUrl);
      
      // Generate backup codes
      const codes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      setBackupCodes(codes);
      
      setShowSetup(true);
      setStep('qr');
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      alert('Código deve ter 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      // In real app, verify the TOTP code server-side
      // For demo, we'll just check if it's not empty
      if (verificationCode) {
        // Update user metadata
        const { error } = await supabase.auth.updateUser({
          data: { two_factor_enabled: true }
        });

        if (error) throw error;

        setTwoFactorEnabled(true);
        setStep('backup');
        onSecurityChange?.(true);
      }
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      alert('Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!confirm('Tem certeza que deseja desativar a autenticação de dois fatores?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { two_factor_enabled: false }
      });

      if (error) throw error;

      setTwoFactorEnabled(false);
      setShowSetup(false);
      onSecurityChange?.(false);
    } catch (error) {
      console.error('Erro ao desativar 2FA:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copiado para a área de transferência');
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const finishSetup = () => {
    setShowSetup(false);
    setVerificationCode('');
    setStep('qr');
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Autenticação de Dois Fatores</h3>
              <p className="text-sm text-gray-600">
                {twoFactorEnabled 
                  ? 'Sua conta está protegida com 2FA' 
                  : 'Adicione uma camada extra de segurança à sua conta'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {twoFactorEnabled && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Ativo</span>
              </div>
            )}
            
            <Button
              variant={twoFactorEnabled ? "outline" : "primary"}
              onClick={twoFactorEnabled ? disable2FA : generateQRCode}
              loading={loading}
            >
              {twoFactorEnabled ? 'Desativar' : 'Ativar 2FA'}
            </Button>
          </div>
        </div>

        {!twoFactorEnabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Recomendação de Segurança</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Ative a autenticação de dois fatores para proteger sua conta contra acessos não autorizados.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 2FA Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configurar Autenticação de Dois Fatores
            </h3>
            
            {step === 'qr' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    1. Instale um app autenticador (Google Authenticator, Authy, etc.)
                  </p>
                  <p className="text-sm text-gray-600">
                    2. Escaneie este QR code com o app
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowSetup(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => setStep('verify')}
                    className="flex-1"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Verificação
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                    placeholder="000000"
                    maxLength={6}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Digite o código de 6 dígitos do seu app autenticador
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('qr')}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={verifyCode}
                    loading={loading}
                    disabled={verificationCode.length !== 6}
                    className="flex-1"
                  >
                    Verificar
                  </Button>
                </div>
              </div>
            )}

            {step === 'backup' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">2FA Ativado com Sucesso!</span>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Códigos de Backup</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Guarde estes códigos em local seguro. Você pode usá-los se perder acesso ao seu dispositivo.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
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

                <Button onClick={finishSetup} className="w-full">
                  Concluir
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};