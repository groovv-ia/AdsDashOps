/**
 * Script de teste para validar o token da Meta Ads fornecido
 *
 * Para executar este teste:
 * 1. Abra o console do navegador (F12)
 * 2. Cole este código e execute
 * 3. Ou importe em um componente e chame testMetaToken()
 */

import { MetaTokenValidator } from '../lib/services/MetaTokenValidator';
import { logger } from '../lib/utils/logger';

/**
 * Token fornecido pelo usuário para teste
 */
const META_ACCESS_TOKEN = 'EAAL6ZAgmhK8ABP9ZCYZBPbOaclGZCp75ZA5y4Q4uU6ZAIuOkSj1UvCyMR5fqmBFaTn40u3qkFsTqBAPZA8z1y0pbdyzIQduksGNIu7Uc14mNP86vdgUnjstfdjeVwHsJQbYlqS22l5rq0ryKtCEliH1wAPUIVutDeXlrAfVz2PrEsyKZBaR3vgPBD5QOY9Fpsgk56gHSI8fDVZCe1K2njIyy6MTd2JhMft4uSVDkp4pZCYYwZC1hwQ74N0fXajQYzcJM8QvzB8XCEzSD5t7z2MBMxnw76uSTdVv1hryqmsZAFY3b5Btq9kYAGfLDX8SQL5MTOIfPDGg871cb';

/**
 * Testa a conexão com a Meta Ads usando o token fornecido
 */
export async function testMetaToken() {
  console.log('🚀 Iniciando teste do token Meta Ads...\n');

  const validator = new MetaTokenValidator();

  try {
    // Passo 1: Validar o token
    console.log('📋 Passo 1: Validando token...');
    const tokenInfo = await validator.validateToken(META_ACCESS_TOKEN);

    if (!tokenInfo.isValid) {
      console.error('❌ Token inválido:', tokenInfo.error);
      return {
        success: false,
        error: tokenInfo.error,
      };
    }

    console.log('✅ Token válido!');
    console.log('   - App ID:', tokenInfo.appId);
    console.log('   - User ID:', tokenInfo.userId);
    console.log('   - Permissões:', tokenInfo.scopes?.join(', ') || 'Nenhuma');
    console.log('   - Expira em:', tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt * 1000).toLocaleString() : 'Nunca');
    console.log('');

    // Verifica permissões
    const permissionCheck = validator.hasRequiredPermissions(tokenInfo);
    if (!permissionCheck.hasPermissions) {
      console.warn('⚠️  Atenção: Token não tem todas as permissões necessárias');
      console.warn('   Permissões faltando:', permissionCheck.missingPermissions.join(', '));
      console.log('');
    } else {
      console.log('✅ Token tem todas as permissões necessárias');
      console.log('');
    }

    // Verifica expiração
    const isExpiringSoon = validator.isTokenExpiringSoon(tokenInfo);
    if (isExpiringSoon) {
      console.warn('⚠️  Token irá expirar em breve (menos de 7 dias)');
      console.log('');
    }

    // Passo 2: Buscar contas publicitárias
    console.log('📋 Passo 2: Buscando contas publicitárias...');
    const accounts = await validator.getAdAccounts(META_ACCESS_TOKEN);

    if (accounts.length === 0) {
      console.warn('⚠️  Nenhuma conta publicitária encontrada');
      return {
        success: true,
        tokenInfo,
        accounts: [],
        message: 'Token válido mas nenhuma conta encontrada',
      };
    }

    console.log(`✅ Encontradas ${accounts.length} conta(s) publicitária(s):\n`);

    accounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.name}`);
      console.log(`      - ID: ${account.id}`);
      console.log(`      - Account ID: ${account.accountId}`);
      console.log(`      - Status: ${account.accountStatus === 1 ? '✅ Ativa' : '❌ Inativa'}`);
      console.log(`      - Moeda: ${account.currency}`);
      console.log(`      - Timezone: ${account.timezoneName}`);
      if (account.amountSpent) {
        console.log(`      - Gasto total: ${account.currency} ${(parseFloat(account.amountSpent) / 100).toFixed(2)}`);
      }
      console.log('');
    });

    // Resumo final
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Resumo:');
    console.log(`  • Token válido: Sim`);
    console.log(`  • Permissões OK: ${permissionCheck.hasPermissions ? 'Sim' : 'Não'}`);
    console.log(`  • Contas encontradas: ${accounts.length}`);
    console.log(`  • Contas ativas: ${accounts.filter(a => a.accountStatus === 1).length}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Próximos passos:');
    console.log('  1. Use a página "Integração Meta" no menu lateral');
    console.log('  2. Cole o token no formulário');
    console.log('  3. Clique em "Validar Token"');
    console.log('  4. Selecione a conta desejada');
    console.log('  5. Clique em "Salvar Conexão"');
    console.log('  6. Execute a sincronização de dados');
    console.log('');

    return {
      success: true,
      tokenInfo,
      accounts,
    };
  } catch (error: any) {
    console.error('❌ Erro durante o teste:', error.message);
    logger.error('Meta token test failed', error);

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Função auxiliar para executar o teste diretamente do console
 */
if (typeof window !== 'undefined') {
  (window as any).testMetaToken = testMetaToken;
  console.log('💡 Para testar o token Meta, execute: testMetaToken()');
}
