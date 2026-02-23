/**
 * ESG API Service (Phase 2B)
 *
 * HTTP client for FDA ESG NextGen REST API.
 * Handles submission creation, XML upload, finalization,
 * and acknowledgment retrieval.
 */

import { EsgAuthService } from './esgAuthService';
import type {
  EsgApiEnvironment,
  EsgCreateSubmissionRequest,
  EsgCreateSubmissionResponse,
  EsgUploadResponse,
  EsgFinalizeResponse,
  EsgAcknowledgmentResponse,
  EsgErrorCategory
} from '../../shared/types/esgApi.types';
import { ESG_API_BASE_URLS } from '../../shared/types/esgApi.types';

/** Maximum time to wait for any single API request */
const REQUEST_TIMEOUT_MS = 30_000;

/** User-Agent header for all outgoing requests */
const USER_AGENT = 'FAERS-App/1.0';

export class EsgApiService {
  private authService: EsgAuthService;

  constructor(authService: EsgAuthService) {
    this.authService = authService;
  }

  /**
   * Create a new submission record on the ESG platform.
   */
  async createSubmission(
    request: EsgCreateSubmissionRequest
  ): Promise<EsgCreateSubmissionResponse> {
    const url = `${ESG_API_BASE_URLS[request.environment]}/submissions`;
    const response = await this.makeAuthenticatedRequest(
      request.environment,
      'POST',
      url,
      {
        submissionType: request.submissionType,
        senderCompanyName: request.senderCompanyName,
        senderContactName: request.senderContactName,
        senderContactEmail: request.senderContactEmail
      }
    );
    return response as EsgCreateSubmissionResponse;
  }

  /**
   * Upload an E2B(R3) XML file to an existing submission
   * using multipart/form-data.
   */
  async uploadXml(
    environment: EsgApiEnvironment,
    submissionId: string,
    xmlContent: string,
    filename: string
  ): Promise<EsgUploadResponse> {
    const url = `${ESG_API_BASE_URLS[environment]}/submissions/${submissionId}/files`;
    const token = await this.authService.getAccessToken(environment);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const blob = new Blob([xmlContent], { type: 'application/xml' });
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('fileType', 'E2B_R3_XML');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': USER_AGENT
        },
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return (await response.json()) as EsgUploadResponse;
    } catch (error) {
      if (error instanceof EsgApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new EsgApiError('XML upload timed out', 'network');
      }
      throw new EsgApiError(
        error instanceof Error ? error.message : 'Unknown upload error',
        'unknown'
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Finalize a submission to trigger FDA processing.
   */
  async finalizeSubmission(
    environment: EsgApiEnvironment,
    submissionId: string
  ): Promise<EsgFinalizeResponse> {
    const url = `${ESG_API_BASE_URLS[environment]}/submissions/${submissionId}/finalize`;
    const response = await this.makeAuthenticatedRequest(
      environment,
      'POST',
      url
    );
    return response as EsgFinalizeResponse;
  }

  /**
   * Get the current status/acknowledgment for a submission.
   * Returns null when no acknowledgment has been issued yet (HTTP 404).
   */
  async getSubmissionStatus(
    environment: EsgApiEnvironment,
    submissionId: string
  ): Promise<EsgAcknowledgmentResponse | null> {
    const url = `${ESG_API_BASE_URLS[environment]}/submissions/${submissionId}/acknowledgment`;
    try {
      const response = await this.makeAuthenticatedRequest(
        environment,
        'GET',
        url
      );
      return response as EsgAcknowledgmentResponse;
    } catch (error) {
      if (error instanceof EsgApiError && error.httpStatus === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check acknowledgment by ESG Core ID.
   * Returns null when no acknowledgment has been issued yet (HTTP 404).
   */
  async checkAcknowledgment(
    environment: EsgApiEnvironment,
    esgCoreId: string
  ): Promise<EsgAcknowledgmentResponse | null> {
    const url = `${ESG_API_BASE_URLS[environment]}/acknowledgments/${esgCoreId}`;
    try {
      const response = await this.makeAuthenticatedRequest(
        environment,
        'GET',
        url
      );
      return response as EsgAcknowledgmentResponse;
    } catch (error) {
      if (error instanceof EsgApiError && error.httpStatus === 404) {
        return null;
      }
      throw error;
    }
  }

  // ============================================================
  // Private helpers
  // ============================================================

  /**
   * Make an authenticated JSON request to the ESG API.
   * Automatically attaches the Bearer token and handles
   * timeouts, network errors, and HTTP error responses.
   */
  private async makeAuthenticatedRequest(
    environment: EsgApiEnvironment,
    method: string,
    url: string,
    body?: Record<string, unknown>
  ): Promise<unknown> {
    const token = await this.authService.getAccessToken(environment);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': USER_AGENT
      };

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal
      };

      if (body) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      if (error instanceof EsgApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new EsgApiError('Request timed out', 'network');
      }
      if (error instanceof TypeError) {
        // Network-level errors (DNS failure, connection refused, etc.)
        throw new EsgApiError(
          `Network error: ${error.message}`,
          'network'
        );
      }
      throw new EsgApiError(
        error instanceof Error ? error.message : 'Unknown API error',
        'unknown'
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Handle non-OK HTTP responses and throw categorized errors.
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const body = await response.text().catch(() => '');
    const category = this.categorizeHttpError(response.status);

    let message = `ESG API error (HTTP ${response.status})`;
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (typeof parsed.message === 'string') message = parsed.message;
      else if (typeof parsed.error === 'string') message = parsed.error;
    } catch {
      if (body) message += `: ${body.substring(0, 200)}`;
    }

    throw new EsgApiError(message, category, response.status);
  }

  /**
   * Categorize an HTTP status code into an error category
   * for display and retry logic.
   */
  private categorizeHttpError(status: number): EsgErrorCategory {
    if (status === 401 || status === 403) return 'authentication';
    if (status === 429) return 'rate_limit';
    if (status === 400 || status === 422) return 'validation';
    if (status >= 500) return 'server_error';
    return 'unknown';
  }
}

/**
 * Custom error class for ESG API errors.
 * Carries an error category for retry logic and an optional HTTP status.
 */
export class EsgApiError extends Error {
  readonly category: EsgErrorCategory;
  readonly httpStatus?: number;

  constructor(
    message: string,
    category: EsgErrorCategory,
    httpStatus?: number
  ) {
    super(message);
    this.name = 'EsgApiError';
    this.category = category;
    this.httpStatus = httpStatus;
  }
}
