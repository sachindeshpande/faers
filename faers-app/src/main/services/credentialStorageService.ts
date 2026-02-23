/**
 * Credential Storage Service (Phase 2B)
 *
 * Securely stores and retrieves ESG API credentials using Electron safeStorage.
 * Falls back to AES-256 encryption when OS keychain is unavailable.
 */

import { safeStorage, app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import type { EsgApiCredentials } from '../../shared/types/esgApi.types';

interface AesFallbackPayload {
  iv: string;
  data: string;
}

export class CredentialStorageService {
  private readonly credentialFilePath: string;
  private readonly ALGORITHM = 'aes-256-cbc' as const;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.credentialFilePath = join(userDataPath, 'esg-credentials.enc');
  }

  /**
   * Check if secure storage is available via OS keychain
   */
  isSecureStorageAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Save API credentials securely.
   * Uses Electron safeStorage (OS keychain) when available,
   * otherwise falls back to AES-256-CBC with a machine-derived key.
   */
  saveCredentials(clientId: string, secretKey: string): void {
    const payload = JSON.stringify({ clientId, secretKey });

    if (this.isSecureStorageAvailable()) {
      const encrypted = safeStorage.encryptString(payload);
      writeFileSync(this.credentialFilePath, encrypted);
    } else {
      const key = this.deriveKey();
      try {
        const iv = randomBytes(16);
        const cipher = createCipheriv(this.ALGORITHM, key, iv);
        let encrypted = cipher.update(payload, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const fileData: AesFallbackPayload = {
          iv: iv.toString('hex'),
          data: encrypted
        };
        writeFileSync(this.credentialFilePath, JSON.stringify(fileData), 'utf8');
      } finally {
        // Zero the key buffer to minimize exposure in memory
        key.fill(0);
      }
    }
  }

  /**
   * Retrieve stored credentials.
   * Returns null if no credentials are stored or if decryption fails.
   */
  getCredentials(): EsgApiCredentials | null {
    if (!existsSync(this.credentialFilePath)) {
      return null;
    }

    try {
      if (this.isSecureStorageAvailable()) {
        const encrypted = readFileSync(this.credentialFilePath);
        const decrypted = safeStorage.decryptString(encrypted);
        return JSON.parse(decrypted) as EsgApiCredentials;
      } else {
        const fileContent = readFileSync(this.credentialFilePath, 'utf8');
        const { iv, data } = JSON.parse(fileContent) as AesFallbackPayload;
        const key = this.deriveKey();
        try {
          const decipher = createDecipheriv(
            this.ALGORITHM,
            key,
            Buffer.from(iv, 'hex')
          );
          let decrypted = decipher.update(data, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return JSON.parse(decrypted) as EsgApiCredentials;
        } finally {
          key.fill(0);
        }
      }
    } catch (error) {
      console.error(
        'Failed to retrieve credentials:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return null;
    }
  }

  /**
   * Check if credentials are stored on disk.
   */
  hasCredentials(): boolean {
    return existsSync(this.credentialFilePath);
  }

  /**
   * Clear stored credentials by removing the encrypted file.
   */
  clearCredentials(): void {
    if (existsSync(this.credentialFilePath)) {
      unlinkSync(this.credentialFilePath);
    }
  }

  /**
   * Derive an AES-256 encryption key from machine-specific data.
   * Used as a fallback when the OS keychain is unavailable.
   */
  private deriveKey(): Buffer {
    const machineId = `${app.getPath('userData')}-faers-esg-credential-key`;
    return createHash('sha256').update(machineId).digest();
  }
}
