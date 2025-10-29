import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Mail, MessageSquare, Send } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const faqItems = [
    {
      question: 'Como conectar minha conta do Meta Ads?',
      answer: 'Vá em Fontes de Dados e clique em "Conectar" no card do Meta. Você será redirecionado para fazer login e autorizar o acesso.',
    },
    {
      question: 'Com que frequência os dados são atualizados?',
      answer: 'Os dados são sincronizados a cada 30 minutos automaticamente. Você também pode atualizar manualmente clicando no botão "Atualizar".',
    },
    {
      question: 'Como exportar relatórios?',
      answer: 'Use os botões CSV ou PDF na barra de filtros para exportar os dados visualizados no dashboard.',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Mensagem enviada:', { email, message });
    setMessage('');
    setEmail('');
    alert('Mensagem enviada com sucesso! Retornaremos em breve.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Suporte</h2>
        <p className="text-gray-600 mt-1">Encontre ajuda e entre em contato conosco</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Perguntas Frequentes" padding="medium">
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                <h3 className="font-medium text-gray-900 mb-2">{item.question}</h3>
                <p className="text-sm text-gray-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Entre em Contato" padding="medium">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Seu email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              icon={<Mail className="w-4 h-4" />}
              fullWidth
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva sua dúvida ou problema..."
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="medium"
              fullWidth
              icon={<Send className="w-4 h-4" />}
            >
              Enviar Mensagem
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
