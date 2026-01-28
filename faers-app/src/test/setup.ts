/**
 * Test Setup File
 *
 * This file is run before each test file. It sets up global mocks
 * and test utilities.
 */

import { vi } from 'vitest';

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/path/${name}`),
    isPackaged: false,
    on: vi.fn(),
    quit: vi.fn()
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn()
  },
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    showMessageBox: vi.fn()
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: {
      send: vi.fn(),
      on: vi.fn()
    }
  })),
  contextBridge: {
    exposeInMainWorld: vi.fn()
  }
}));

// Mock better-sqlite3 for tests that don't need real database
vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => createMockDatabase())
  };
});

/**
 * Creates a mock SQLite database for testing
 */
export function createMockDatabase() {
  const mockStatements = new Map<string, any>();

  return {
    prepare: vi.fn((sql: string) => {
      const stmt = {
        run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        get: vi.fn().mockReturnValue(null),
        all: vi.fn().mockReturnValue([]),
        bind: vi.fn().mockReturnThis()
      };
      mockStatements.set(sql, stmt);
      return stmt;
    }),
    exec: vi.fn(),
    transaction: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
    pragma: vi.fn(),
    close: vi.fn(),
    _mockStatements: mockStatements
  };
}

/**
 * Creates a mock user for testing
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    mustChangePassword: false,
    failedLoginAttempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Creates a mock case for testing
 */
export function createMockCase(overrides = {}) {
  return {
    id: 'CASE-20260126-TEST',
    safetyReportId: 'SR-001',
    reportType: '1',
    serious: true,
    seriousnessDeath: false,
    seriousnessLifeThreatening: false,
    seriousnessHospitalization: true,
    seriousnessDisabling: false,
    seriousnessCongenitalAnomaly: false,
    seriousnessOther: false,
    receiptDate: '2026-01-15',
    receiveDate: '2026-01-15',
    transmissionDate: null,
    status: 'draft',
    workflowStatus: 'Draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Creates a mock session for testing
 */
export function createMockSession(overrides = {}) {
  return {
    id: 'session-123',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

// Global test utilities
global.testUtils = {
  createMockDatabase,
  createMockUser,
  createMockCase,
  createMockSession
};

// Extend expect matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    interface Assertion {
      toBeValidPassword(): void;
    }
  }

  // eslint-disable-next-line no-var
  var testUtils: {
    createMockDatabase: typeof createMockDatabase;
    createMockUser: typeof createMockUser;
    createMockCase: typeof createMockCase;
    createMockSession: typeof createMockSession;
  };
}
