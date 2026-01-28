/**
 * React Testing Setup
 *
 * Setup file for React component tests with jsdom environment.
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = MockIntersectionObserver as any;

// Mock scrollTo
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// Mock getComputedStyle
window.getComputedStyle = vi.fn().mockReturnValue({
  getPropertyValue: vi.fn().mockReturnValue('')
});

// Mock electron API
window.electronAPI = {
  // Auth
  login: vi.fn().mockResolvedValue({ success: true, data: { sessionId: 'test-session', user: { id: 'user-1', username: 'testuser' } } }),
  logout: vi.fn().mockResolvedValue({ success: true }),
  validateSession: vi.fn().mockResolvedValue({ success: true, data: { valid: true, user: { id: 'user-1', username: 'testuser' } } }),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  getCurrentUser: vi.fn().mockResolvedValue({ success: true, data: null }),
  extendSession: vi.fn().mockResolvedValue({ success: true }),
  getSessionTimeoutConfig: vi.fn().mockResolvedValue({ success: true, data: { timeoutMinutes: 30, warningMinutes: 5 } }),
  validatePasswordPolicy: vi.fn().mockResolvedValue({ success: true, data: { valid: true, errors: [] } }),

  // Cases
  getCases: vi.fn().mockResolvedValue({ success: true, data: { cases: [], total: 0, hasMore: false } }),
  getCase: vi.fn().mockResolvedValue({ success: true, data: null }),
  createCase: vi.fn().mockResolvedValue({ success: true, data: { id: 'CASE-001' } }),
  updateCase: vi.fn().mockResolvedValue({ success: true }),
  deleteCase: vi.fn().mockResolvedValue({ success: true }),
  duplicateCase: vi.fn().mockResolvedValue({ success: true }),
  validateCase: vi.fn().mockResolvedValue({ success: true, data: { valid: true, errors: [], warnings: [] } }),
  getCaseCount: vi.fn().mockResolvedValue({ success: true, data: 0 }),

  // Reporters, Reactions, Drugs
  getReporters: vi.fn().mockResolvedValue({ success: true, data: [] }),
  saveReporter: vi.fn().mockResolvedValue({ success: true }),
  deleteReporter: vi.fn().mockResolvedValue({ success: true }),
  getReactions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  saveReaction: vi.fn().mockResolvedValue({ success: true }),
  deleteReaction: vi.fn().mockResolvedValue({ success: true }),
  getDrugs: vi.fn().mockResolvedValue({ success: true, data: [] }),
  saveDrug: vi.fn().mockResolvedValue({ success: true }),
  deleteDrug: vi.fn().mockResolvedValue({ success: true }),

  // XML
  generateXML: vi.fn().mockResolvedValue({ success: true, data: '<?xml version="1.0"?>' }),
  exportXML: vi.fn().mockResolvedValue({ success: true }),
  validateXML: vi.fn().mockResolvedValue({ success: true }),
  exportXmlFda: vi.fn().mockResolvedValue({ success: true }),

  // Database
  backupDatabase: vi.fn().mockResolvedValue({ success: true }),
  restoreDatabase: vi.fn().mockResolvedValue({ success: true }),

  // Settings
  getSetting: vi.fn().mockResolvedValue({ success: true, data: null }),
  setSetting: vi.fn().mockResolvedValue({ success: true }),

  // Lookups
  getCountries: vi.fn().mockResolvedValue({ success: true, data: [] }),
  searchMedDRA: vi.fn().mockResolvedValue({ success: true, data: [] }),

  // File dialogs
  showSaveDialog: vi.fn().mockResolvedValue({ success: true, data: null }),
  showOpenDialog: vi.fn().mockResolvedValue({ success: true, data: null }),

  // Import
  importForm3500: vi.fn().mockResolvedValue({ success: true }),

  // Submission
  recordSubmission: vi.fn().mockResolvedValue({ success: true }),
  recordAcknowledgment: vi.fn().mockResolvedValue({ success: true }),
  getSubmissionHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getSubmissionRecord: vi.fn().mockResolvedValue({ success: true, data: null }),

  // Dashboard
  getDashboardStats: vi.fn().mockResolvedValue({ success: true, data: {} }),

  // Status transitions
  markCaseReady: vi.fn().mockResolvedValue({ success: true }),
  revertCaseToDraft: vi.fn().mockResolvedValue({ success: true }),

  // Users
  getUsers: vi.fn().mockResolvedValue({ success: true, data: { users: [], total: 0 } }),
  getUser: vi.fn().mockResolvedValue({ success: true, data: null }),
  createUser: vi.fn().mockResolvedValue({ success: true }),
  updateUser: vi.fn().mockResolvedValue({ success: true }),
  deactivateUser: vi.fn().mockResolvedValue({ success: true }),
  reactivateUser: vi.fn().mockResolvedValue({ success: true }),
  resetUserPassword: vi.fn().mockResolvedValue({ success: true, data: { temporaryPassword: 'TempPass123!' } }),
  getUserProfile: vi.fn().mockResolvedValue({ success: true }),
  updateUserProfile: vi.fn().mockResolvedValue({ success: true }),

  // Roles
  getRoles: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getRole: vi.fn().mockResolvedValue({ success: true, data: null }),
  getPermissions: vi.fn().mockResolvedValue({ success: true, data: [] }),

  // Workflow
  transitionWorkflow: vi.fn().mockResolvedValue({ success: true }),
  getAvailableActions: vi.fn().mockResolvedValue({ success: true, data: { actions: [] } }),

  // Assignments
  assignCase: vi.fn().mockResolvedValue({ success: true }),
  reassignCase: vi.fn().mockResolvedValue({ success: true }),
  getCaseAssignments: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getMyCases: vi.fn().mockResolvedValue({ success: true, data: { cases: [], total: 0 } }),
  getWorkloadSummary: vi.fn().mockResolvedValue({ success: true, data: {} }),

  // Comments & Notes
  addComment: vi.fn().mockResolvedValue({ success: true }),
  getComments: vi.fn().mockResolvedValue({ success: true, data: [] }),
  addNote: vi.fn().mockResolvedValue({ success: true }),
  getNotes: vi.fn().mockResolvedValue({ success: true, data: [] }),
  resolveNote: vi.fn().mockResolvedValue({ success: true }),

  // Audit
  getAuditLog: vi.fn().mockResolvedValue({ success: true, data: { entries: [], total: 0, hasMore: false } }),
  getCaseAuditHistory: vi.fn().mockResolvedValue({ success: true, data: [] }),
  exportAuditLog: vi.fn().mockResolvedValue({ success: true }),

  // Notifications
  getNotifications: vi.fn().mockResolvedValue({ success: true, data: { notifications: [], unreadCount: 0 } }),
  markNotificationRead: vi.fn().mockResolvedValue({ success: true }),
  getUnreadNotificationCount: vi.fn().mockResolvedValue({ success: true, data: 0 })
} as any;

// Declare global type
declare global {
  interface Window {
    electronAPI: typeof window.electronAPI;
  }
}
