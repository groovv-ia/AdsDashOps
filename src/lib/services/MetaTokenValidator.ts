import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Interface para informações do token Meta Ads
 */
export interface MetaTokenInfo {
  isValid: boolean;
  appId?: string;
  userId?: string;
  scopes?: string[];
  expiresAt?: number;
  dataAccessExpiresAt?: number;
  error?: string;
}

/**
 * Interface para conta publicitária da Meta
 */
export interface MetaAdAccountInfo {
  id: string;
  accountId: string;
  name: string;
  accountStatus: number;
  currency: string;
  timezoneName: string;
  amountSpent?: string;
  balance?: string;
}

/**
 * Serviço para validar e inspecionar tokens de acesso da Meta Ads
 */
export class MetaTokenValidator {
  private readonly baseUrl = 'https://graph.facebook.com/v19.0';

  /**
   * Valida um access token da Meta e retorna informações sobre ele
   */
  async validateToken(accessToken: string): Promise<MetaTokenInfo> {
    try {
      logger.info('Validating Meta access token...');

      // Usa o endpoint debug_token para inspecionar o token
      const response = await axios.get(`${this.baseUrl}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: accessToken, // Self-inspection
        },
      });

      const data = response.data.data;

      if (!data.is_valid) {
        logger.warn('Meta token is invalid', { error: data.error });
        return {
          isValid: false,
          error: data.error?.message || 'Token inválido',
        };
      }

      const tokenInfo: MetaTokenInfo = {
        isValid: true,
        appId: data.app_id,
        userId: data.user_id,
        scopes: data.scopes || [],
        expiresAt: data.expires_at,
        dataAccessExpiresAt: data.data_access_expires_at,
      };

      logger.info('Meta token validated successfully', {
        appId: tokenInfo.appId,
        scopes: tokenInfo.scopes?.length,
      });

      return tokenInfo;
    } catch (error: any) {
      logger.error('Failed to validate Meta token', error);
      return {
        isValid: false,
        error: error.response?.data?.error?.message || error.message || 'Erro ao validar token',
      };
    }
  }

  /**
   * Busca todas as contas publicitárias acessíveis pelo token
   */
  async getAdAccounts(accessToken: string): Promise<MetaAdAccountInfo[]> {
    try {
      logger.info('Fetching Meta ad accounts...');

      const response = await axios.get(`${this.baseUrl}/me/adaccounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,account_id,name,account_status,currency,timezone_name,amount_spent,balance',
        },
      });

      const accounts: MetaAdAccountInfo[] = response.data.data.map((account: any) => ({
        id: account.id,
        accountId: account.account_id,
        name: account.name,
        accountStatus: account.account_status,
        currency: account.currency,
        timezoneName: account.timezone_name,
        amountSpent: account.amount_spent,
        balance: account.balance,
      }));

      logger.info('Meta ad accounts retrieved', { count: accounts.length });
      return accounts;
    } catch (error: any) {
      logger.error('Failed to get Meta ad accounts', error);

      // Tratamento especial para erro de permissões
      const errorMessage = error.response?.data?.error?.message || error.message || '';
      const errorCode = error.response?.data?.error?.code;

      if (errorCode === 200 || errorMessage.includes('Missing Permissions')) {
        throw new Error(
          'Token sem permissões necessárias. Por favor, gere um novo token com as permissões: ads_read, ads_management, read_insights'
        );
      }

      throw new Error(errorMessage || 'Erro ao buscar contas publicitárias');
    }
  }

  /**
   * Testa a conexão completa: valida token e busca contas
   */
  async testConnection(accessToken: string): Promise<{
    success: boolean;
    tokenInfo?: MetaTokenInfo;
    accounts?: MetaAdAccountInfo[];
    error?: string;
  }> {
    try {
      // Primeiro valida o token
      const tokenInfo = await this.validateToken(accessToken);

      if (!tokenInfo.isValid) {
        return {
          success: false,
          tokenInfo,
          error: tokenInfo.error,
        };
      }

      // Se o token é válido, busca as contas
      const accounts = await this.getAdAccounts(accessToken);

      return {
        success: true,
        tokenInfo,
        accounts,
      };
    } catch (error: any) {
      logger.error('Connection test failed', error);
      return {
        success: false,
        error: error.message || 'Erro ao testar conexão',
      };
    }
  }

  /**
   * Verifica se o token tem as permissões necessárias
   */
  hasRequiredPermissions(tokenInfo: MetaTokenInfo): {
    hasPermissions: boolean;
    missingPermissions: string[];
  } {
    const requiredPermissions = [
      'ads_read',
      'ads_management',
    ];

    const userScopes = tokenInfo.scopes || [];
    const missingPermissions = requiredPermissions.filter(
      perm => !userScopes.includes(perm)
    );

    return {
      hasPermissions: missingPermissions.length === 0,
      missingPermissions,
    };
  }

  /**
   * Verifica se o token está próximo de expirar (menos de 7 dias)
   */
  isTokenExpiringSoon(tokenInfo: MetaTokenInfo): boolean {
    if (!tokenInfo.expiresAt || tokenInfo.expiresAt === 0) {
      // Token de longa duração sem expiração definida
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    const timeUntilExpiry = tokenInfo.expiresAt - now;

    return timeUntilExpiry < sevenDaysInSeconds;
  }
}
