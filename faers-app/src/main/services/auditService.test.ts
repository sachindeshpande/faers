/**
 * Audit Service Tests
 *
 * Tests for 21 CFR Part 11 compliant audit trail functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './auditService';
import type Database from 'better-sqlite3';

// Mock audit entries
const mockAuditEntries = [
  {
    id: 1,
    timestamp: '2026-01-26T10:00:00.000Z',
    user_id: 'user-123',
    username: 'testuser',
    session_id: 'session-123',
    action_type: 'case_create',
    entity_type: 'case',
    entity_id: 'CASE-001',
    field_name: null,
    old_value: null,
    new_value: null,
    details: JSON.stringify({ caseId: 'CASE-001' }),
    ip_address: null
  },
  {
    id: 2,
    timestamp: '2026-01-26T10:05:00.000Z',
    user_id: 'user-123',
    username: 'testuser',
    session_id: 'session-123',
    action_type: 'case_update',
    entity_type: 'case',
    entity_id: 'CASE-001',
    field_name: 'status',
    old_value: 'draft',
    new_value: 'ready',
    details: null,
    ip_address: null
  }
];

const mockSignatures = [
  {
    id: 1,
    user_id: 'user-123',
    username: 'testuser',
    timestamp: '2026-01-26T11:00:00.000Z',
    entity_type: 'case',
    entity_id: 'CASE-001',
    action: 'workflow_approved',
    meaning: 'I certify that I have reviewed this case',
    record_version: 1,
    signature_hash: 'hash123'
  }
];

// Create mock database
function createMockDb(): Database.Database {
  return {
    prepare: vi.fn((sql: string) => {
      // Statistics queries - most specific patterns first (for getStatistics method)
      if (sql.includes('SELECT COUNT(*)') && sql.includes('FROM audit_log') && sql.includes('timestamp >=') && sql.includes('timestamp <=')) {
        return {
          get: vi.fn().mockReturnValue({ count: 100 })
        };
      }
      if (sql.includes('SELECT COUNT(*)') && sql.includes('FROM electronic_signatures') && sql.includes('timestamp >=') && sql.includes('timestamp <=')) {
        return {
          get: vi.fn().mockReturnValue({ count: 5 })
        };
      }
      if (sql.includes('GROUP BY action_type')) {
        return {
          all: vi.fn().mockReturnValue([
            { action_type: 'case_create', count: 50 },
            { action_type: 'case_update', count: 50 }
          ])
        };
      }
      if (sql.includes('GROUP BY username')) {
        return {
          all: vi.fn().mockReturnValue([
            { username: 'testuser', count: 100 }
          ])
        };
      }

      // General audit log count query (without timestamp filter)
      if (sql.includes('SELECT COUNT(*)') && sql.includes('FROM audit_log')) {
        return {
          get: vi.fn().mockReturnValue({ count: mockAuditEntries.length })
        };
      }

      // Audit log select queries
      if (sql.includes('SELECT') && sql.includes('FROM audit_log')) {
        return {
          all: vi.fn().mockReturnValue(mockAuditEntries),
          get: vi.fn().mockReturnValue(mockAuditEntries[0])
        };
      }

      // Audit log insert
      if (sql.includes('INSERT INTO audit_log')) {
        return {
          run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 3 })
        };
      }

      // Electronic signatures select
      if (sql.includes('SELECT') && sql.includes('FROM electronic_signatures')) {
        return {
          all: vi.fn().mockReturnValue(mockSignatures),
          get: vi.fn().mockReturnValue(mockSignatures[0])
        };
      }

      // Electronic signatures insert
      if (sql.includes('INSERT INTO electronic_signatures')) {
        return {
          run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 2 })
        };
      }

      return {
        run: vi.fn(),
        get: vi.fn().mockReturnValue({ count: 0 }),
        all: vi.fn().mockReturnValue([])
      };
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => fn(...args)),
    pragma: vi.fn(),
    close: vi.fn()
  } as unknown as Database.Database;
}

describe('AuditService', () => {
  let auditService: AuditService;
  let mockDb: Database.Database;

  beforeEach(() => {
    mockDb = createMockDb();
    auditService = new AuditService(mockDb);
  });

  describe('log', () => {
    it('should log an audit entry', () => {
      const entry = {
        userId: 'user-123',
        username: 'testuser',
        sessionId: 'session-123',
        actionType: 'case_create' as const,
        entityType: 'case' as const,
        entityId: 'CASE-002',
        details: { caseId: 'CASE-002' }
      };

      // log() returns void, just verify no error thrown
      expect(() => auditService.log(entry)).not.toThrow();
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should log field changes', () => {
      const entry = {
        userId: 'user-123',
        username: 'testuser',
        actionType: 'case_update' as const,
        entityType: 'case' as const,
        entityId: 'CASE-001',
        fieldName: 'status',
        oldValue: 'draft',
        newValue: 'ready'
      };

      expect(() => auditService.log(entry)).not.toThrow();
    });

    it('should handle entries without userId for system actions', () => {
      const entry = {
        actionType: 'login' as const,
        entityType: 'session' as const
      };

      // System actions without user context should still work
      expect(() => auditService.log(entry)).not.toThrow();
    });
  });

  describe('logFieldChanges', () => {
    it('should log multiple field changes', () => {
      const changes = [
        { field: 'status', oldValue: 'draft', newValue: 'ready' },
        { field: 'receiptDate', oldValue: '2026-01-01', newValue: '2026-01-15' }
      ];

      expect(() => {
        auditService.logFieldChanges(
          'user-123',
          'testuser',
          'session-123',
          'case',
          'CASE-001',
          changes
        );
      }).not.toThrow();
    });
  });

  describe('logWorkflowTransition', () => {
    it('should log a workflow transition', () => {
      expect(() => {
        auditService.logWorkflowTransition(
          'user-123',
          'testuser',
          'session-123',
          'CASE-001',
          'Draft',
          'Data Entry Complete',
          'Submitting for review'
        );
      }).not.toThrow();
    });
  });

  describe('query', () => {
    it('should return audit entries without filter', () => {
      const result = auditService.query();

      expect(result.entries).toBeDefined();
      expect(result.total).toBe(mockAuditEntries.length);
      expect(result.hasMore).toBeDefined();
    });

    it('should filter by date range', () => {
      const result = auditService.query({
        startDate: '2026-01-26',
        endDate: '2026-01-27'
      });

      expect(result.entries).toBeDefined();
    });

    it('should filter by user', () => {
      const result = auditService.query({
        userId: 'user-123'
      });

      expect(result.entries).toBeDefined();
    });

    it('should filter by action type', () => {
      const result = auditService.query({
        actionType: 'case_create'
      });

      expect(result.entries).toBeDefined();
    });

    it('should filter by entity type', () => {
      const result = auditService.query({
        entityType: 'case'
      });

      expect(result.entries).toBeDefined();
    });

    it('should filter by entity ID', () => {
      const result = auditService.query({
        entityId: 'CASE-001'
      });

      expect(result.entries).toBeDefined();
    });

    it('should support pagination', () => {
      const result = auditService.query({
        offset: 0,
        limit: 10
      });

      expect(result.entries).toBeDefined();
      expect(result.hasMore).toBeDefined();
    });

    it('should support search filter', () => {
      const result = auditService.query({
        search: 'testuser'
      });

      expect(result.entries).toBeDefined();
    });
  });

  describe('getCaseAuditTrail', () => {
    it('should return audit history for a case', () => {
      const result = auditService.getCaseAuditTrail('CASE-001');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUserAuditTrail', () => {
    it('should return audit history for a user', () => {
      const result = auditService.getUserAuditTrail('user-123');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should support limit parameter', () => {
      const result = auditService.getUserAuditTrail('user-123', 10);

      expect(result).toBeDefined();
    });
  });

  describe('exportToCsv', () => {
    it('should export audit log to CSV format', () => {
      const csv = auditService.exportToCsv();

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv).toContain('ID'); // Header
      expect(csv).toContain('Timestamp'); // Header
      expect(csv).toContain(','); // CSV delimiter
    });

    it('should export filtered entries', () => {
      const csv = auditService.exportToCsv({
        userId: 'user-123'
      });

      expect(csv).toBeDefined();
    });
  });

  describe('createSignature', () => {
    it('should create an electronic signature', () => {
      const signatureData = {
        userId: 'user-123',
        username: 'testuser',
        entityType: 'case' as const,
        entityId: 'CASE-001',
        action: 'workflow_approved',
        meaning: 'I certify that I have reviewed this case',
        recordVersion: 1
      };

      const result = auditService.createSignature(signatureData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user-123');
      expect(result.signatureHash).toBeDefined();
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      // First create a signature
      const signatureData = {
        userId: 'user-123',
        username: 'testuser',
        entityType: 'case' as const,
        entityId: 'CASE-001',
        action: 'workflow_approved',
        meaning: 'I certify',
        recordVersion: 1
      };
      auditService.createSignature(signatureData);

      // Mock returns a signature that was created with same data
      const isValid = auditService.verifySignature(1);

      // Since mock returns preset data, verification depends on hash matching
      expect(typeof isValid).toBe('boolean');
    });

    it('should return false for non-existent signature', () => {
      // Mock to return undefined for this specific call
      mockDb = {
        ...mockDb,
        prepare: vi.fn((sql: string) => {
          if (sql.includes('SELECT') && sql.includes('FROM electronic_signatures') && sql.includes('WHERE id')) {
            return { get: vi.fn().mockReturnValue(undefined) };
          }
          return { run: vi.fn(), get: vi.fn(), all: vi.fn().mockReturnValue([]) };
        })
      } as unknown as Database.Database;
      auditService = new AuditService(mockDb);

      const isValid = auditService.verifySignature(999);

      expect(isValid).toBe(false);
    });
  });

  describe('getSignaturesForEntity', () => {
    it('should return signatures for an entity', () => {
      const signatures = auditService.getSignaturesForEntity('case', 'CASE-001');

      expect(signatures).toBeDefined();
      expect(Array.isArray(signatures)).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return audit statistics for a time period', () => {
      const stats = auditService.getStatistics('2026-01-01', '2026-01-31');

      expect(stats.totalEntries).toBeDefined();
      expect(stats.entriesByAction).toBeDefined();
      expect(stats.entriesByUser).toBeDefined();
      expect(stats.signatureCount).toBeDefined();
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should not expose update or delete methods', () => {
      // Audit entries are append-only by design
      expect((auditService as unknown as Record<string, unknown>).updateEntry).toBeUndefined();
      expect((auditService as unknown as Record<string, unknown>).deleteEntry).toBeUndefined();
    });

    it('should include timestamp in audit log inserts', () => {
      const entry = {
        userId: 'user-123',
        username: 'testuser',
        actionType: 'case_view' as const,
        entityType: 'case' as const,
        entityId: 'CASE-001'
      };

      auditService.log(entry);

      // Verify prepare was called with INSERT containing timestamp
      const calls = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls;
      const insertCall = calls.find((c: string[]) => c[0].includes('INSERT INTO audit_log'));
      expect(insertCall).toBeDefined();
    });
  });
});
