import { supabase } from '../../supabase';
import { encryptData, decryptData } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { OAuthToken } from './types';

export class TokenManager {
  private platform: 'meta' | 'google' | 'tiktok';

  constructor(platform: 'meta' | 'google' | 'tiktok') {
    this.platform = platform;
  }

  async saveToken(
    connectionId: string,
    userId: string,
    accessToken: string,
    accountId: string,
    expiresIn: number,
    refreshToken?: string,
    scope?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      const { error } = await supabase
        .from('oauth_tokens')
        .upsert({
          connection_id: connectionId,
          user_id: userId,
          platform: this.platform,
          access_token_encrypted: encryptData(accessToken),
          refresh_token_encrypted: refreshToken ? encryptData(refreshToken) : null,
          token_type: 'Bearer',
          expires_at: expiresAt,
          scope,
          account_id: accountId,
          last_refreshed_at: new Date().toISOString(),
          refresh_attempts: 0,
        }, {
          onConflict: 'connection_id'
        });

      if (error) throw error;

      logger.info(`Token saved for ${this.platform}`, { connectionId, accountId });
      return { success: true };
    } catch (error) {
      logger.error(`Failed to save token for ${this.platform}`, error as Error, { connectionId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getToken(connectionId: string): Promise<OAuthToken | null> {
    try {
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('platform', this.platform)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        connectionId: data.connection_id,
        userId: data.user_id,
        platform: data.platform,
        accessToken: decryptData(data.access_token_encrypted),
        refreshToken: data.refresh_token_encrypted ? decryptData(data.refresh_token_encrypted) : undefined,
        tokenType: data.token_type,
        expiresAt: data.expires_at,
        scope: data.scope,
        accountId: data.account_id,
        lastRefreshedAt: data.last_refreshed_at,
        refreshAttempts: data.refresh_attempts,
      };
    } catch (error) {
      logger.error(`Failed to get token for ${this.platform}`, error as Error, { connectionId });
      return null;
    }
  }

  async isTokenValid(connectionId: string): Promise<boolean> {
    try {
      const token = await this.getToken(connectionId);
      if (!token) return false;

      const expiresAt = new Date(token.expiresAt);
      const now = new Date();

      return expiresAt > now;
    } catch {
      return false;
    }
  }

  async needsRefresh(connectionId: string): Promise<boolean> {
    try {
      const token = await this.getToken(connectionId);
      if (!token) return true;

      const expiresAt = new Date(token.expiresAt);
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      return expiresAt < oneHourFromNow;
    } catch {
      return true;
    }
  }

  async updateRefreshAttempts(connectionId: string, attempts: number): Promise<void> {
    try {
      await supabase
        .from('oauth_tokens')
        .update({
          refresh_attempts: attempts,
          updated_at: new Date().toISOString(),
        })
        .eq('connection_id', connectionId);
    } catch (error) {
      logger.error(`Failed to update refresh attempts for ${this.platform}`, error as Error, { connectionId });
    }
  }

  async deleteToken(connectionId: string): Promise<void> {
    try {
      await supabase
        .from('oauth_tokens')
        .delete()
        .eq('connection_id', connectionId);

      logger.info(`Token deleted for ${this.platform}`, { connectionId });
    } catch (error) {
      logger.error(`Failed to delete token for ${this.platform}`, error as Error, { connectionId });
    }
  }

  async refreshToken(connectionId: string, refreshTokenFn: (refreshToken: string) => Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }>): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getToken(connectionId);
      if (!token || !token.refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      logger.info(`Attempting to refresh token for ${this.platform}`, { connectionId });

      const result = await refreshTokenFn(token.refreshToken);

      await this.saveToken(
        connectionId,
        token.userId,
        result.accessToken,
        token.accountId,
        result.expiresIn,
        result.refreshToken || token.refreshToken,
        token.scope
      );

      await this.updateRefreshAttempts(connectionId, 0);

      logger.tokenRefresh(this.platform, true, token.refreshAttempts + 1);
      return { success: true };
    } catch (error) {
      const token = await this.getToken(connectionId);
      if (token) {
        await this.updateRefreshAttempts(connectionId, token.refreshAttempts + 1);
      }

      logger.tokenRefresh(this.platform, false, (token?.refreshAttempts || 0) + 1);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
