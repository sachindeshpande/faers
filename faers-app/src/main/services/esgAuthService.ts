/**
 * ESG Auth Service (Phase 2B)
 *
 * Implements OAuth 2.0 Client Credentials flow for FDA ESG NextGen API.
 * Manages token lifecycle: request, cache, refresh, and invalidation.
 */

import { CredentialStorageService } from './credentialStorageService';
import type {
  EsgApiEnvironment,
  OAuthTokenResponse,
  CachedOAuthToken,
  TestConnectionResult
} from '../../shared/types/esgApi.types';
import { ESG_OAUTH_URLS } from '../../shared/types/esgApi.types';

/** Refresh tokens 60 seconds before they expire to avoid edge-case failures */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

/** Maximum time to wait for an OAuth token request */
const REQUEST_TIMEOUT_MS = 30_000;

export class EsgAuthService {
  private tokenCache: CachedOAuthToken | null = null;
  private credentialStorage: CredentialStorageService;

  constructor(credentialStorage: CredentialStorageService) {
    this.credentialStorage = credentialStorage;
  }

  /**
   * Get a valid access token, refreshing if the cached one is expired
   * or targeting a different environment.
   */
  async getAccessToken(environment: EsgApiEnvironment): Promise<string> {
    if (this.isTokenValid(environment)) {
      return this.tokenCache!.accessToken;
    }
    return this.refreshToken(environment);
  }

  /**
   * Request a new access token from the OAuth 2.0 endpoint
   * using the Client Credentials grant type.
   */
  async refreshToken(environment: EsgApiEnvironment): Promise<string> {
    const credentials = this.credentialStorage.getCredentials();
    if (!credentials) {
      throw new Error(
        'No API credentials configured. Please configure in Settings.'
      );
    }

    const tokenUrl = ESG_OAUTH_URLS[environment];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.secretKey
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: body.toString(),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'Invalid API credentials. Please verify your Client ID and Secret Key.'
          );
        }
        throw new Error(
          `Authentication failed (HTTP ${response.status}): ${errorBody}`
        );
      }

      const tokenResponse = (await response.json()) as OAuthTokenResponse;

      this.tokenCache = {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type || 'Bearer',
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
        environment
      };

      console.log(
        `[ESG Auth] Token obtained for ${environment} environment, expires in ${tokenResponse.expires_in}s`
      );
      return this.tokenCache.accessToken;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          'Authentication request timed out. Please check your network connection.'
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Check if the cached token is still valid for the given environment.
   * A token is valid if it exists, matches the environment, and has not
   * yet reached the refresh margin window before expiry.
   */
  isTokenValid(environment?: EsgApiEnvironment): boolean {
    if (!this.tokenCache) return false;
    if (environment && this.tokenCache.environment !== environment) return false;
    return Date.now() < this.tokenCache.expiresAt - TOKEN_REFRESH_MARGIN_MS;
  }

  /**
   * Clear the in-memory cached token.
   * Does not affect stored credentials on disk.
   */
  clearTokenCache(): void {
    this.tokenCache = null;
  }

  /**
   * Test the API connection by requesting a fresh token.
   * Returns timing information and success/failure status.
   */
  async testConnection(
    environment: EsgApiEnvironment
  ): Promise<TestConnectionResult> {
    const startTime = Date.now();
    try {
      await this.refreshToken(environment);
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        environment,
        latencyMs,
        tokenValid: true
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        environment,
        latencyMs,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenValid: false
      };
    }
  }
}
