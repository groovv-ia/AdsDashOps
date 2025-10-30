import { MetaAdsService } from './connectors/meta/MetaAdsService';
import { GoogleAdsService } from './connectors/google/GoogleAdsService';
import { DataSyncService } from './services/DataSyncService';
import { TokenManager } from './connectors/shared/TokenManager';
import { logger } from './utils/logger';

export { MetaAdsService, GoogleAdsService, DataSyncService, TokenManager, logger };

export * from './connectors/shared/types';
export * from './connectors/meta/types';
export * from './connectors/google/types';

export const createMetaService = () => new MetaAdsService();
export const createGoogleService = () => new GoogleAdsService();
export const createSyncService = () => new DataSyncService();
export const createTokenManager = (platform: 'meta' | 'google' | 'tiktok') => new TokenManager(platform);
