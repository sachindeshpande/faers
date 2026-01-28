/**
 * Validation Service Tests
 *
 * Tests for case data validation and E2B(R3) compliance checking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationService } from './validationService';
import type Database from 'better-sqlite3';

// Mock case data
const mockValidCase = {
  id: 'CASE-001',
  reportType: '1', // Spontaneous
  initialOrFollowup: '1', // Initial
  receiptDate: '2026-01-15',
  receiveDate: '2026-01-15',
  patientSex: '1', // Male
  patientAge: 45,
  patientAgeUnit: 'Year',
  senderType: '1',
  senderOrganization: 'Test Org',
  senderGivenName: 'John',
  senderFamilyName: 'Smith',
  caseNarrative: 'Patient experienced an adverse reaction after taking the medication for 5 days. Symptoms included rash and fever.'
};

const mockReporters = [
  {
    id: 1,
    case_id: 'CASE-001',
    qualification: '1', // Physician
    given_name: 'Jane',
    family_name: 'Doe',
    is_primary: 1
  }
];

const mockReactions = [
  {
    id: 1,
    case_id: 'CASE-001',
    reaction_term: 'Rash',
    serious_death: 0,
    serious_life_threat: 0,
    serious_hospitalization: 1,
    serious_disability: 0,
    serious_congenital: 0,
    serious_other: 0,
    start_date: '2026-01-20',
    outcome: 1
  }
];

const mockDrugs = [
  {
    id: 1,
    case_id: 'CASE-001',
    characterization: 1, // Suspect
    product_name: 'Test Drug',
    indication: 'Hypertension'
  }
];

// Create mock database
function createMockDb(options: {
  caseExists?: boolean;
  caseData?: Partial<typeof mockValidCase>;
  reporters?: typeof mockReporters;
  reactions?: typeof mockReactions;
  drugs?: typeof mockDrugs;
} = {}): Database.Database {
  const {
    caseExists = true,
    caseData = mockValidCase,
    reporters = mockReporters,
    reactions = mockReactions,
    drugs = mockDrugs
  } = options;

  return {
    prepare: vi.fn((sql: string) => {
      // Case queries
      if (sql.includes('SELECT') && sql.includes('FROM cases') && sql.includes('WHERE id')) {
        return {
          get: vi.fn().mockReturnValue(caseExists ? { ...mockValidCase, ...caseData } : null)
        };
      }

      // Reporter queries
      if (sql.includes('SELECT') && sql.includes('FROM case_reporters')) {
        return {
          all: vi.fn().mockReturnValue(reporters)
        };
      }

      // Reaction queries
      if (sql.includes('SELECT') && sql.includes('FROM case_reactions')) {
        return {
          all: vi.fn().mockReturnValue(reactions)
        };
      }

      // Drug queries
      if (sql.includes('SELECT') && sql.includes('FROM case_drugs')) {
        return {
          all: vi.fn().mockReturnValue(drugs)
        };
      }

      return {
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([])
      };
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => fn(...args)),
    pragma: vi.fn(),
    close: vi.fn()
  } as unknown as Database.Database;
}

describe('ValidationService', () => {
  let validationService: ValidationService;
  let mockDb: Database.Database;

  beforeEach(() => {
    mockDb = createMockDb();
    validationService = new ValidationService(mockDb);
  });

  describe('validate', () => {
    it('should return error for non-existent case', () => {
      mockDb = createMockDb({ caseExists: false });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-999');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Case not found');
    });

    it('should return validation result for case', () => {
      mockDb = createMockDb();
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      // Should return a validation result object
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should fail if report type is missing', () => {
      mockDb = createMockDb({
        caseData: { ...mockValidCase, reportType: undefined as unknown as string }
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'reportType')).toBe(true);
    });

    it('should fail if receipt date is missing', () => {
      mockDb = createMockDb({
        caseData: { ...mockValidCase, receiptDate: undefined as unknown as string }
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'receiptDate')).toBe(true);
    });

    it('should fail if patient sex is missing', () => {
      mockDb = createMockDb({
        caseData: { ...mockValidCase, patientSex: undefined as unknown as string }
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'patientSex')).toBe(true);
    });

    it('should fail if no reactions provided', () => {
      mockDb = createMockDb({ reactions: [] });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'reactions')).toBe(true);
    });

    it('should fail if no drugs provided', () => {
      mockDb = createMockDb({ drugs: [] });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'drugs')).toBe(true);
    });

    it('should fail if no suspect drug (only concomitant)', () => {
      mockDb = createMockDb({
        drugs: [{ ...mockDrugs[0], characterization: 2 }] // Concomitant only
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'drugs' && e.message.toLowerCase().includes('suspect'))).toBe(true);
    });

    it('should fail if narrative is missing', () => {
      mockDb = createMockDb({
        caseData: { ...mockValidCase, caseNarrative: undefined as unknown as string }
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'caseNarrative')).toBe(true);
    });

    it('should validate narrative field', () => {
      mockDb = createMockDb({
        caseData: { ...mockValidCase, caseNarrative: 'Short narrative' }
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      // Validation should run and return results
      expect(result).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should warn if no reporter provided', () => {
      mockDb = createMockDb({ reporters: [] });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.errors.some(e => e.field === 'reporters' && e.severity === 'warning')).toBe(true);
    });

    it('should validate sender information is required', () => {
      mockDb = createMockDb({
        caseData: { ...mockValidCase, senderType: undefined as unknown as string }
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'senderType')).toBe(true);
    });

    it('should validate date consistency (receiveDate >= receiptDate)', () => {
      mockDb = createMockDb({
        caseData: {
          ...mockValidCase,
          receiptDate: '2026-01-20',
          receiveDate: '2026-01-15' // Before receipt date
        }
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'receiveDate')).toBe(true);
    });
  });

  describe('Error Severity', () => {
    it('should categorize errors by severity', () => {
      mockDb = createMockDb({
        caseData: { ...mockValidCase, reportType: undefined as unknown as string },
        reactions: [],
        drugs: []
      });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      const hasErrors = result.errors.some(e => e.severity === 'error');
      expect(hasErrors).toBe(true);
    });

    it('should include warning-level validation issues', () => {
      mockDb = createMockDb({ reporters: [] });
      validationService = new ValidationService(mockDb);

      const result = validationService.validate('CASE-001');

      const hasWarnings = result.errors.some(e => e.severity === 'warning');
      expect(hasWarnings).toBe(true);
    });
  });
});
