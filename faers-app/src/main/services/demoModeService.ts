/**
 * Demo Mode Service (Phase 2B - Demo Mode)
 *
 * Orchestrates demo mode functionality including:
 * - Demo mode activation/deactivation
 * - Sample case management
 * - Demo data isolation
 * - Configuration management
 */

import { BrowserWindow } from 'electron';
import type { Database } from 'better-sqlite3';
import type {
  DemoModeConfig,
  DemoScenario,
  DemoSpeed,
  DemoSampleCase,
  ResetDemoDataResult
} from '../../shared/types/esgApi.types';
import {
  DEFAULT_DEMO_CONFIG,
  DEMO_CREDENTIALS,
  DEMO_SAMPLE_CASES
} from '../../shared/types/esgApi.types';
import { MockEsgApiService } from './mockEsgApiService';

export class DemoModeService {
  private db: Database;
  private mockApiService: MockEsgApiService;
  private isActive: boolean = false;
  private config: DemoModeConfig;

  constructor(db: Database) {
    this.db = db;
    this.config = { ...DEFAULT_DEMO_CONFIG };
    this.mockApiService = new MockEsgApiService(this.config);
  }

  /**
   * Check if demo mode is currently active
   */
  isDemoModeActive(): boolean {
    return this.isActive;
  }

  /**
   * Activate demo mode
   */
  activate(): void {
    this.isActive = true;
    this.config.enabled = true;
    this.mockApiService.updateConfig(this.config);
    this.notifyDemoModeChange(true);
  }

  /**
   * Deactivate demo mode
   */
  deactivate(): void {
    this.isActive = false;
    this.config.enabled = false;
    this.mockApiService.updateConfig(this.config);
    this.notifyDemoModeChange(false);
  }

  /**
   * Get the mock API service instance
   */
  getMockApiService(): MockEsgApiService {
    return this.mockApiService;
  }

  /**
   * Get current demo configuration
   */
  getConfig(): DemoModeConfig {
    return { ...this.config };
  }

  /**
   * Update demo configuration
   */
  updateConfig(updates: Partial<DemoModeConfig>): void {
    this.config = { ...this.config, ...updates };
    this.mockApiService.updateConfig(this.config);
  }

  /**
   * Set demo scenario
   */
  setScenario(scenario: DemoScenario): void {
    this.config.scenario = scenario;
    this.mockApiService.updateConfig(this.config);
  }

  /**
   * Set demo speed
   */
  setSpeed(speed: DemoSpeed): void {
    this.config.speed = speed;
    this.mockApiService.updateConfig(this.config);
  }

  /**
   * Get demo credentials (pre-configured fake values)
   */
  getDemoCredentials(): typeof DEMO_CREDENTIALS {
    return { ...DEMO_CREDENTIALS };
  }

  /**
   * Get available sample cases for demonstration
   */
  getSampleCases(): DemoSampleCase[] {
    return [...DEMO_SAMPLE_CASES];
  }

  /**
   * Create sample demo cases in the database
   */
  async createSampleCases(): Promise<{ created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;

    for (const sample of DEMO_SAMPLE_CASES) {
      try {
        // Check if case already exists
        const existing = this.db
          .prepare('SELECT id FROM cases WHERE id = ?')
          .get(sample.id);

        if (existing) {
          continue; // Skip if exists
        }

        // Create minimal case record for demo
        const now = new Date().toISOString();
        this.db
          .prepare(
            `INSERT INTO cases (
              id, safety_report_id, status, created_at, updated_at, is_demo_case
            ) VALUES (?, ?, 'Draft', ?, ?, 1)`
          )
          .run(sample.id, `DEMO-SR-${sample.id}`, now, now);

        // Add patient info
        this.db
          .prepare(
            `INSERT INTO patient_info (
              case_id, patient_initials, created_at, updated_at
            ) VALUES (?, ?, ?, ?)`
          )
          .run(sample.id, sample.patientInitials, now, now);

        // Add primary drug
        this.db
          .prepare(
            `INSERT INTO drugs (
              id, case_id, drug_name, drug_characterization, created_at, updated_at
            ) VALUES (?, ?, ?, 1, ?, ?)`
          )
          .run(`${sample.id}-drug-1`, sample.id, sample.primaryDrug, now, now);

        // Add primary reaction
        this.db
          .prepare(
            `INSERT INTO reactions (
              id, case_id, reaction_term, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?)`
          )
          .run(`${sample.id}-reaction-1`, sample.id, sample.primaryReaction, now, now);

        created++;
      } catch (error) {
        errors.push(`Failed to create sample case ${sample.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { created, errors };
  }

  /**
   * Reset all demo data (cases and submissions)
   */
  resetDemoData(): ResetDemoDataResult {
    try {
      // Reset mock API service
      const mockResult = this.mockApiService.reset();

      // Delete demo cases and related data
      const deleteCases = this.db.prepare(
        'DELETE FROM cases WHERE is_demo_case = 1 OR id LIKE ?'
      );
      const result = deleteCases.run('demo-case-%');
      const casesReset = result.changes;

      // Clear demo submission attempts
      const deleteAttempts = this.db.prepare(
        "DELETE FROM api_submission_attempts WHERE environment = 'Demo'"
      );
      deleteAttempts.run();

      return {
        success: true,
        casesReset,
        submissionsCleared: mockResult.submissionsCleared
      };
    } catch (error) {
      return {
        success: false,
        casesReset: 0,
        submissionsCleared: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get demo mode status for UI display
   */
  getStatus(): {
    isActive: boolean;
    scenario: DemoScenario;
    speed: DemoSpeed;
    sampleCasesAvailable: number;
    mockSubmissionsCount: number;
  } {
    return {
      isActive: this.isActive,
      scenario: this.config.scenario,
      speed: this.config.speed,
      sampleCasesAvailable: DEMO_SAMPLE_CASES.length,
      mockSubmissionsCount: this.mockApiService.getSubmissions().length
    };
  }

  /**
   * Notify renderer about demo mode change
   */
  private notifyDemoModeChange(isActive: boolean): void {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      window.webContents.send('demo:mode-changed', {
        isActive,
        config: this.config
      });
    }
  }

  /**
   * Clean up resources (call on app shutdown)
   */
  cleanup(): void {
    this.mockApiService.cleanup();
  }
}
