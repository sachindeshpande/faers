/**
 * SQLite Database Connection
 *
 * Handles database initialization, connection, and migrations
 */

import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';

// Use dynamic require to load better-sqlite3 at runtime
// This prevents the bundler from trying to bundle the native module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3');

type DatabaseInstance = ReturnType<typeof Database>;

let db: DatabaseInstance | null = null;

/**
 * Get the database file path based on platform
 */
export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  // Use a test-specific database when running E2E tests
  const dbName = process.env.NODE_ENV === 'test' ? 'faers-test.db' : 'faers.db';
  return join(userDataPath, dbName);
}

/**
 * Get the backup directory path
 */
export function getBackupPath(): string {
  const documentsPath = app.getPath('documents');
  const backupPath = join(documentsPath, 'FAERSApp', 'Backups');

  // Ensure backup directory exists
  if (!existsSync(backupPath)) {
    mkdirSync(backupPath, { recursive: true });
  }

  return backupPath;
}

/**
 * Initialize the database connection
 */
export function initDatabase(): DatabaseInstance {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  console.log(`Initializing database at: ${dbPath}`);

  // Ensure directory exists
  const dbDir = join(dbPath, '..');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create database connection
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): DatabaseInstance {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run database migrations
 */
function runMigrations(database: DatabaseInstance): void {
  // Create migrations tracking table
  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if initial migration has been applied
  const migrationExists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('001_initial_schema');

  if (!migrationExists) {
    console.log('Applying initial database schema...');
    applyInitialSchema(database);
    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('001_initial_schema');
    console.log('Initial schema applied successfully.');

    // Seed countries data
    console.log('Seeding countries data...');
    seedCountries(database);
    console.log('Countries data seeded successfully.');
  }

  // Migration 002: Add source document fields to case_drugs
  const migration002Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('002_drug_source_fields');

  if (!migration002Exists) {
    console.log('Applying migration 002: Adding drug source document fields...');

    // Check if columns already exist (in case schema was created fresh with new columns)
    const columns = database.prepare("PRAGMA table_info(case_drugs)").all() as Array<{ name: string }>;
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('ndc_number')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN ndc_number TEXT');
    }
    if (!columnNames.includes('manufacturer_name')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN manufacturer_name TEXT');
    }
    if (!columnNames.includes('lot_number')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN lot_number TEXT');
    }
    if (!columnNames.includes('expiration_date')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN expiration_date TEXT');
    }

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('002_drug_source_fields');
    console.log('Migration 002 applied successfully.');
  }

  // Migration 003: Phase 2 - Submission tracking
  const migration003Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('003_submission_tracking');

  if (!migration003Exists) {
    console.log('Applying migration 003: Adding submission tracking tables...');

    // Create submission_records table
    database.exec(`
      CREATE TABLE IF NOT EXISTS submission_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        srp_confirmation_number TEXT,
        submission_date TEXT,
        acknowledgment_date TEXT,
        acknowledgment_type TEXT,
        fda_case_number TEXT,
        rejection_reason TEXT,
        exported_filename TEXT,
        exported_file_path TEXT,
        notes TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);

    // Create submission_history table (append-only log)
    database.exec(`
      CREATE TABLE IF NOT EXISTS submission_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        details TEXT,
        notes TEXT,
        user_id TEXT
      )
    `);

    // Create export_sequences table for FDA filename generation
    database.exec(`
      CREATE TABLE IF NOT EXISTS export_sequences (
        date TEXT PRIMARY KEY,
        last_sequence INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Add new columns to cases table for submission tracking
    const caseColumns = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
    const caseColumnNames = caseColumns.map(c => c.name);

    if (!caseColumnNames.includes('submission_id')) {
      database.exec('ALTER TABLE cases ADD COLUMN submission_id INTEGER REFERENCES submission_records(id)');
    }
    if (!caseColumnNames.includes('last_submitted_at')) {
      database.exec('ALTER TABLE cases ADD COLUMN last_submitted_at DATETIME');
    }
    if (!caseColumnNames.includes('srp_confirmation_number')) {
      database.exec('ALTER TABLE cases ADD COLUMN srp_confirmation_number TEXT');
    }
    if (!caseColumnNames.includes('fda_case_number')) {
      database.exec('ALTER TABLE cases ADD COLUMN fda_case_number TEXT');
    }
    if (!caseColumnNames.includes('acknowledgment_date')) {
      database.exec('ALTER TABLE cases ADD COLUMN acknowledgment_date TEXT');
    }

    // Create indexes for new tables
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_submission_records_case ON submission_records(case_id);
      CREATE INDEX IF NOT EXISTS idx_submission_history_case ON submission_history(case_id);
      CREATE INDEX IF NOT EXISTS idx_submission_history_timestamp ON submission_history(timestamp);
      CREATE INDEX IF NOT EXISTS idx_cases_submission_id ON cases(submission_id);
    `);

    // Migrate existing 'Ready' status to 'Ready for Export'
    database.exec(`
      UPDATE cases SET status = 'Ready for Export' WHERE status = 'Ready'
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('003_submission_tracking');
    console.log('Migration 003 applied successfully.');
  }

  // Migration 004: Phase 3 - Users, Roles, Permissions (Multi-User Support)
  const migration004Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('004_users_roles_permissions');

  if (!migration004Exists) {
    console.log('Applying migration 004: Adding users, roles, and permissions tables...');

    // Users table
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        must_change_password INTEGER NOT NULL DEFAULT 1,
        password_changed_at DATETIME,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until DATETIME,
        last_login_at DATETIME,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        created_by TEXT REFERENCES users(id),
        deactivated_at DATETIME,
        deactivated_by TEXT REFERENCES users(id)
      )
    `);

    // Roles table
    database.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);

    // Permissions table
    database.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT NOT NULL
      )
    `);

    // Role-Permission junction table
    database.exec(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      )
    `);

    // User-Role junction table
    database.exec(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at DATETIME NOT NULL,
        assigned_by TEXT REFERENCES users(id),
        PRIMARY KEY (user_id, role_id)
      )
    `);

    // Sessions table
    database.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        last_activity_at DATETIME NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        is_active INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Password history table (for preventing password reuse)
    database.exec(`
      CREATE TABLE IF NOT EXISTS password_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at DATETIME NOT NULL
      )
    `);

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
      CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id);
    `);

    // Seed default permissions
    const permissions = [
      // Case permissions
      { id: 'case.create', name: 'case.create', category: 'case', description: 'Create new cases' },
      { id: 'case.view.own', name: 'case.view.own', category: 'case', description: 'View own/assigned cases' },
      { id: 'case.view.all', name: 'case.view.all', category: 'case', description: 'View all cases' },
      { id: 'case.edit.own', name: 'case.edit.own', category: 'case', description: 'Edit own/assigned cases' },
      { id: 'case.edit.all', name: 'case.edit.all', category: 'case', description: 'Edit any case' },
      { id: 'case.delete', name: 'case.delete', category: 'case', description: 'Delete cases' },
      { id: 'case.assign', name: 'case.assign', category: 'case', description: 'Assign cases to users' },
      // Workflow permissions
      { id: 'workflow.submit_review', name: 'workflow.submit_review', category: 'workflow', description: 'Submit case for review' },
      { id: 'workflow.approve', name: 'workflow.approve', category: 'workflow', description: 'Approve cases' },
      { id: 'workflow.reject', name: 'workflow.reject', category: 'workflow', description: 'Reject cases' },
      { id: 'workflow.submit_fda', name: 'workflow.submit_fda', category: 'workflow', description: 'Submit to FDA' },
      // User permissions
      { id: 'user.view', name: 'user.view', category: 'user', description: 'View user list' },
      { id: 'user.create', name: 'user.create', category: 'user', description: 'Create users' },
      { id: 'user.edit', name: 'user.edit', category: 'user', description: 'Edit users' },
      { id: 'user.deactivate', name: 'user.deactivate', category: 'user', description: 'Deactivate users' },
      // System permissions
      { id: 'system.configure', name: 'system.configure', category: 'system', description: 'System settings' },
      { id: 'system.audit.view', name: 'system.audit.view', category: 'system', description: 'View audit logs' },
      { id: 'system.reports', name: 'system.reports', category: 'system', description: 'Run reports' }
    ];

    const insertPermission = database.prepare(
      'INSERT INTO permissions (id, name, description, category) VALUES (?, ?, ?, ?)'
    );
    for (const p of permissions) {
      insertPermission.run(p.id, p.name, p.description, p.category);
    }

    // Seed default roles
    const now = new Date().toISOString();
    const roles = [
      { id: 'admin', name: 'Administrator', description: 'Full system access', isSystem: 1 },
      { id: 'manager', name: 'Manager', description: 'Oversight and reporting', isSystem: 1 },
      { id: 'data_entry', name: 'Data Entry', description: 'Create and edit cases', isSystem: 1 },
      { id: 'medical_reviewer', name: 'Medical Reviewer', description: 'Medical review and assessment', isSystem: 1 },
      { id: 'qc_reviewer', name: 'QC Reviewer', description: 'Quality control review', isSystem: 1 },
      { id: 'submitter', name: 'Submitter', description: 'FDA submissions', isSystem: 1 },
      { id: 'read_only', name: 'Read Only', description: 'View cases only', isSystem: 1 }
    ];

    const insertRole = database.prepare(
      'INSERT INTO roles (id, name, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const r of roles) {
      insertRole.run(r.id, r.name, r.description, r.isSystem, now, now);
    }

    // Assign permissions to roles
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'], // Special marker for all permissions
      manager: ['case.view.all', 'case.assign', 'system.reports', 'user.view'],
      data_entry: ['case.create', 'case.view.own', 'case.edit.own', 'workflow.submit_review'],
      medical_reviewer: ['case.view.own', 'case.edit.own', 'workflow.approve', 'workflow.reject'],
      qc_reviewer: ['case.view.own', 'case.edit.own', 'workflow.approve', 'workflow.reject'],
      submitter: ['case.view.all', 'workflow.submit_fda'],
      read_only: ['case.view.all']
    };

    const insertRolePermission = database.prepare(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
    );

    for (const [roleId, perms] of Object.entries(rolePermissions)) {
      if (perms.includes('*')) {
        // Admin gets all permissions
        for (const p of permissions) {
          insertRolePermission.run(roleId, p.id);
        }
      } else {
        for (const permId of perms) {
          insertRolePermission.run(roleId, permId);
        }
      }
    }

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('004_users_roles_permissions');
    console.log('Migration 004 applied successfully.');
  }

  // Migration 005: Phase 3 - Audit Trail and Electronic Signatures (21 CFR Part 11)
  const migration005Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('005_audit_trail');

  if (!migration005Exists) {
    console.log('Applying migration 005: Adding audit trail and electronic signatures...');

    // Audit log table (append-only, 21 CFR Part 11 compliant)
    database.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT REFERENCES users(id),
        username TEXT,
        session_id TEXT,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        field_name TEXT,
        old_value TEXT,
        new_value TEXT,
        details TEXT,
        ip_address TEXT
      )
    `);

    // Electronic signatures table (21 CFR Part 11 compliant)
    database.exec(`
      CREATE TABLE IF NOT EXISTS electronic_signatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id),
        username TEXT NOT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        meaning TEXT NOT NULL,
        record_version INTEGER NOT NULL,
        signature_hash TEXT NOT NULL
      )
    `);

    // Create indexes for efficient audit queries
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action_type);
      CREATE INDEX IF NOT EXISTS idx_signatures_entity ON electronic_signatures(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_signatures_user ON electronic_signatures(user_id);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('005_audit_trail');
    console.log('Migration 005 applied successfully.');
  }

  // Migration 006: Phase 3 - Case Workflow, Assignments, Comments, Notes
  const migration006Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('006_workflow_assignments');

  if (!migration006Exists) {
    console.log('Applying migration 006: Adding workflow, assignments, comments, notes...');

    // Case assignments table
    database.exec(`
      CREATE TABLE IF NOT EXISTS case_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        assigned_to TEXT NOT NULL REFERENCES users(id),
        assigned_by TEXT NOT NULL REFERENCES users(id),
        assigned_at DATETIME NOT NULL,
        due_date DATETIME,
        priority TEXT DEFAULT 'normal',
        notes TEXT,
        is_current INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Case comments table
    database.exec(`
      CREATE TABLE IF NOT EXISTS case_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id),
        comment_type TEXT NOT NULL DEFAULT 'general',
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        mentions TEXT
      )
    `);

    // Case notes table (internal notes)
    database.exec(`
      CREATE TABLE IF NOT EXISTS case_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id),
        visibility TEXT NOT NULL DEFAULT 'team',
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        resolved_at DATETIME,
        resolved_by TEXT REFERENCES users(id)
      )
    `);

    // Notifications table
    database.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        read_at DATETIME
      )
    `);

    // Add workflow columns to cases table
    const caseColumns = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
    const caseColumnNames = caseColumns.map(c => c.name);

    if (!caseColumnNames.includes('workflow_status')) {
      database.exec("ALTER TABLE cases ADD COLUMN workflow_status TEXT DEFAULT 'Draft'");
    }
    if (!caseColumnNames.includes('created_by')) {
      database.exec('ALTER TABLE cases ADD COLUMN created_by TEXT REFERENCES users(id)');
    }
    if (!caseColumnNames.includes('current_owner')) {
      database.exec('ALTER TABLE cases ADD COLUMN current_owner TEXT REFERENCES users(id)');
    }
    if (!caseColumnNames.includes('current_assignee')) {
      database.exec('ALTER TABLE cases ADD COLUMN current_assignee TEXT REFERENCES users(id)');
    }
    if (!caseColumnNames.includes('due_date')) {
      database.exec('ALTER TABLE cases ADD COLUMN due_date DATETIME');
    }
    if (!caseColumnNames.includes('due_date_type')) {
      database.exec('ALTER TABLE cases ADD COLUMN due_date_type TEXT');
    }
    if (!caseColumnNames.includes('rejection_count')) {
      database.exec('ALTER TABLE cases ADD COLUMN rejection_count INTEGER DEFAULT 0');
    }
    if (!caseColumnNames.includes('last_rejection_reason')) {
      database.exec('ALTER TABLE cases ADD COLUMN last_rejection_reason TEXT');
    }

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_assignments_case ON case_assignments(case_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_user ON case_assignments(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_assignments_current ON case_assignments(is_current);
      CREATE INDEX IF NOT EXISTS idx_comments_case ON case_comments(case_id);
      CREATE INDEX IF NOT EXISTS idx_notes_case ON case_notes(case_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_cases_workflow ON cases(workflow_status);
      CREATE INDEX IF NOT EXISTS idx_cases_assignee ON cases(current_assignee);
      CREATE INDEX IF NOT EXISTS idx_cases_due_date ON cases(due_date);
    `);

    // Initialize workflow_status from existing status for existing cases
    database.exec(`
      UPDATE cases SET workflow_status = status WHERE workflow_status IS NULL OR workflow_status = ''
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('006_workflow_assignments');
    console.log('Migration 006 applied successfully.');
  }

  // Migration 007: Phase 4 - Report Type Classification and Seriousness
  const migration007Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('007_report_type_classification');

  if (!migration007Exists) {
    console.log('Applying migration 007: Adding report type classification fields...');

    // Add report classification columns to cases table
    const caseColumns = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
    const caseColumnNames = caseColumns.map(c => c.name);

    if (!caseColumnNames.includes('report_type_classification')) {
      database.exec("ALTER TABLE cases ADD COLUMN report_type_classification TEXT DEFAULT 'expedited'");
    }
    if (!caseColumnNames.includes('expedited_criteria')) {
      database.exec('ALTER TABLE cases ADD COLUMN expedited_criteria TEXT');
    }
    if (!caseColumnNames.includes('is_serious')) {
      database.exec('ALTER TABLE cases ADD COLUMN is_serious INTEGER DEFAULT 0');
    }
    if (!caseColumnNames.includes('expectedness')) {
      database.exec('ALTER TABLE cases ADD COLUMN expectedness TEXT');
    }
    if (!caseColumnNames.includes('expectedness_justification')) {
      database.exec('ALTER TABLE cases ADD COLUMN expectedness_justification TEXT');
    }

    // Create case_seriousness table for normalized seriousness criteria
    database.exec(`
      CREATE TABLE IF NOT EXISTS case_seriousness (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        criterion TEXT NOT NULL,
        is_checked INTEGER DEFAULT 0,
        notes TEXT,
        UNIQUE(case_id, criterion)
      )
    `);

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_case_seriousness_case ON case_seriousness(case_id);
      CREATE INDEX IF NOT EXISTS idx_cases_report_type ON cases(report_type_classification);
      CREATE INDEX IF NOT EXISTS idx_cases_is_serious ON cases(is_serious);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('007_report_type_classification');
    console.log('Migration 007 applied successfully.');
  }

  // Migration 008: Phase 4 - Follow-Up and Nullification Fields
  const migration008Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('008_followup_nullification');

  if (!migration008Exists) {
    console.log('Applying migration 008: Adding follow-up and nullification fields...');

    const caseColumns = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
    const caseColumnNames = caseColumns.map(c => c.name);

    // Follow-up tracking fields
    if (!caseColumnNames.includes('parent_case_id')) {
      database.exec('ALTER TABLE cases ADD COLUMN parent_case_id TEXT REFERENCES cases(id)');
    }
    if (!caseColumnNames.includes('case_version')) {
      database.exec('ALTER TABLE cases ADD COLUMN case_version INTEGER DEFAULT 1');
    }
    if (!caseColumnNames.includes('followup_type')) {
      database.exec('ALTER TABLE cases ADD COLUMN followup_type TEXT');
    }
    if (!caseColumnNames.includes('followup_info_date')) {
      database.exec('ALTER TABLE cases ADD COLUMN followup_info_date TEXT');
    }

    // Nullification fields
    if (!caseColumnNames.includes('is_nullified')) {
      database.exec('ALTER TABLE cases ADD COLUMN is_nullified INTEGER DEFAULT 0');
    }
    if (!caseColumnNames.includes('nullification_reason_text')) {
      database.exec('ALTER TABLE cases ADD COLUMN nullification_reason_text TEXT');
    }
    if (!caseColumnNames.includes('nullification_reference')) {
      database.exec('ALTER TABLE cases ADD COLUMN nullification_reference TEXT');
    }

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_cases_parent ON cases(parent_case_id);
      CREATE INDEX IF NOT EXISTS idx_cases_is_nullified ON cases(is_nullified);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('008_followup_nullification');
    console.log('Migration 008 applied successfully.');
  }

  // Migration 009: Phase 4 - Products Table
  const migration009Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('009_products');

  if (!migration009Exists) {
    console.log('Applying migration 009: Adding products table...');

    // Create products table
    database.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        active_ingredient TEXT,
        application_type TEXT,
        application_number TEXT,
        us_approval_date TEXT,
        marketing_status TEXT DEFAULT 'approved',
        company_name TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);

    // Add product_id to cases table
    const caseColumns = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
    const caseColumnNames = caseColumns.map(c => c.name);

    if (!caseColumnNames.includes('product_id')) {
      database.exec('ALTER TABLE cases ADD COLUMN product_id INTEGER REFERENCES products(id)');
    }

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
      CREATE INDEX IF NOT EXISTS idx_products_app_number ON products(application_number);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      CREATE INDEX IF NOT EXISTS idx_cases_product ON cases(product_id);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('009_products');
    console.log('Migration 009 applied successfully.');
  }

  // Migration 010: Phase 4 - PSR Schedules
  const migration010Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('010_psr_schedules');

  if (!migration010Exists) {
    console.log('Applying migration 010: Adding PSR schedules table...');

    // Create PSR schedules table
    database.exec(`
      CREATE TABLE IF NOT EXISTS psr_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        psr_format TEXT NOT NULL,
        frequency TEXT NOT NULL,
        dlp_offset_days INTEGER DEFAULT 0,
        due_offset_days INTEGER DEFAULT 30,
        start_date TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_psr_schedules_product ON psr_schedules(product_id);
      CREATE INDEX IF NOT EXISTS idx_psr_schedules_active ON psr_schedules(is_active);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('010_psr_schedules');
    console.log('Migration 010 applied successfully.');
  }

  // Migration 011: Phase 4 - Submission Batches
  const migration011Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('011_submission_batches');

  if (!migration011Exists) {
    console.log('Applying migration 011: Adding submission batches tables...');

    // Create submission batches table
    database.exec(`
      CREATE TABLE IF NOT EXISTS submission_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_number TEXT UNIQUE NOT NULL,
        batch_type TEXT NOT NULL,
        case_count INTEGER DEFAULT 0,
        valid_case_count INTEGER DEFAULT 0,
        invalid_case_count INTEGER DEFAULT 0,
        xml_filename TEXT,
        xml_file_path TEXT,
        status TEXT DEFAULT 'created',
        submission_mode TEXT,
        esg_core_id TEXT,
        submitted_at DATETIME,
        acknowledged_at DATETIME,
        ack_type TEXT,
        ack_details TEXT,
        notes TEXT,
        created_by TEXT REFERENCES users(id),
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);

    // Create batch_cases junction table
    database.exec(`
      CREATE TABLE IF NOT EXISTS batch_cases (
        batch_id INTEGER NOT NULL REFERENCES submission_batches(id) ON DELETE CASCADE,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        validation_status TEXT DEFAULT 'pending',
        validation_errors TEXT,
        added_at DATETIME NOT NULL,
        PRIMARY KEY (batch_id, case_id)
      )
    `);

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_batches_type ON submission_batches(batch_type);
      CREATE INDEX IF NOT EXISTS idx_batches_status ON submission_batches(status);
      CREATE INDEX IF NOT EXISTS idx_batches_created ON submission_batches(created_at);
      CREATE INDEX IF NOT EXISTS idx_batch_cases_batch ON batch_cases(batch_id);
      CREATE INDEX IF NOT EXISTS idx_batch_cases_case ON batch_cases(case_id);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('011_submission_batches');
    console.log('Migration 011 applied successfully.');
  }

  // Migration 012: Phase 4 - PSRs Table
  const migration012Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('012_psrs');

  if (!migration012Exists) {
    console.log('Applying migration 012: Adding PSRs table...');

    // Create PSRs table
    database.exec(`
      CREATE TABLE IF NOT EXISTS psrs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        psr_number TEXT UNIQUE NOT NULL,
        product_id INTEGER REFERENCES products(id),
        psr_format TEXT NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        data_lock_point TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        descriptive_portion_path TEXT,
        ectd_submission_ref TEXT,
        icsr_batch_id INTEGER REFERENCES submission_batches(id),
        created_by TEXT REFERENCES users(id),
        approved_by TEXT REFERENCES users(id),
        approved_at DATETIME,
        submitted_at DATETIME,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);

    // Create PSR cases junction table
    database.exec(`
      CREATE TABLE IF NOT EXISTS psr_cases (
        psr_id INTEGER NOT NULL REFERENCES psrs(id) ON DELETE CASCADE,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        included INTEGER DEFAULT 1,
        exclusion_reason TEXT,
        added_at DATETIME NOT NULL,
        added_by TEXT REFERENCES users(id),
        PRIMARY KEY (psr_id, case_id)
      )
    `);

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_psrs_product ON psrs(product_id);
      CREATE INDEX IF NOT EXISTS idx_psrs_status ON psrs(status);
      CREATE INDEX IF NOT EXISTS idx_psrs_due_date ON psrs(due_date);
      CREATE INDEX IF NOT EXISTS idx_psr_cases_psr ON psr_cases(psr_id);
      CREATE INDEX IF NOT EXISTS idx_psr_cases_case ON psr_cases(case_id);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('012_psrs');
    console.log('Migration 012 applied successfully.');
  }

  // Migration 013: Phase 5 - MedDRA Dictionary Tables
  const migration013Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('013_meddra_dictionary');

  if (!migration013Exists) {
    console.log('Applying migration 013: Adding MedDRA dictionary tables...');

    // MedDRA version tracking
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        release_date TEXT,
        import_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        llt_count INTEGER DEFAULT 0,
        pt_count INTEGER DEFAULT 0,
        imported_by TEXT
      )
    `);

    // System Organ Class (SOC) - Level 1 (top)
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_soc (
        soc_code INTEGER NOT NULL,
        soc_name TEXT NOT NULL,
        soc_abbrev TEXT,
        version_id INTEGER NOT NULL REFERENCES meddra_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (soc_code, version_id)
      )
    `);

    // High Level Group Term (HLGT) - Level 2
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_hlgt (
        hlgt_code INTEGER NOT NULL,
        hlgt_name TEXT NOT NULL,
        version_id INTEGER NOT NULL REFERENCES meddra_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (hlgt_code, version_id)
      )
    `);

    // HLGT to SOC relationship
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_hlgt_soc (
        hlgt_code INTEGER NOT NULL,
        soc_code INTEGER NOT NULL,
        version_id INTEGER NOT NULL REFERENCES meddra_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (hlgt_code, soc_code, version_id)
      )
    `);

    // High Level Term (HLT) - Level 3
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_hlt (
        hlt_code INTEGER NOT NULL,
        hlt_name TEXT NOT NULL,
        version_id INTEGER NOT NULL REFERENCES meddra_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (hlt_code, version_id)
      )
    `);

    // HLT to HLGT relationship
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_hlt_hlgt (
        hlt_code INTEGER NOT NULL,
        hlgt_code INTEGER NOT NULL,
        version_id INTEGER NOT NULL REFERENCES meddra_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (hlt_code, hlgt_code, version_id)
      )
    `);

    // Preferred Term (PT) - Level 4
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_pt (
        pt_code INTEGER NOT NULL,
        pt_name TEXT NOT NULL,
        primary_soc_code INTEGER,
        version_id INTEGER NOT NULL REFERENCES meddra_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (pt_code, version_id)
      )
    `);

    // PT to HLT relationship
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_pt_hlt (
        pt_code INTEGER NOT NULL,
        hlt_code INTEGER NOT NULL,
        version_id INTEGER NOT NULL REFERENCES meddra_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (pt_code, hlt_code, version_id)
      )
    `);

    // Lowest Level Term (LLT) - Level 5 (bottom)
    database.exec(`
      CREATE TABLE IF NOT EXISTS meddra_llt (
        llt_code INTEGER NOT NULL,
        llt_name TEXT NOT NULL,
        pt_code INTEGER NOT NULL,
        is_current INTEGER DEFAULT 1,
        version_id INTEGER NOT NULL REFERENCES meddra_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (llt_code, version_id)
      )
    `);

    // Create indexes for search performance
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_meddra_llt_name ON meddra_llt(llt_name);
      CREATE INDEX IF NOT EXISTS idx_meddra_pt_name ON meddra_pt(pt_name);
      CREATE INDEX IF NOT EXISTS idx_meddra_llt_pt ON meddra_llt(pt_code, version_id);
      CREATE INDEX IF NOT EXISTS idx_meddra_llt_version ON meddra_llt(version_id);
      CREATE INDEX IF NOT EXISTS idx_meddra_pt_version ON meddra_pt(version_id);
      CREATE INDEX IF NOT EXISTS idx_meddra_version_active ON meddra_versions(is_active);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('013_meddra_dictionary');
    console.log('Migration 013 applied successfully.');
  }

  // Migration 014: Phase 5 - WHO Drug Dictionary Tables
  const migration014Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('014_whodrug_dictionary');

  if (!migration014Exists) {
    console.log('Applying migration 014: Adding WHO Drug dictionary tables...');

    // WHO Drug version tracking
    database.exec(`
      CREATE TABLE IF NOT EXISTS whodrug_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        release_date TEXT,
        import_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        drug_count INTEGER DEFAULT 0,
        imported_by TEXT
      )
    `);

    // ATC Classification
    database.exec(`
      CREATE TABLE IF NOT EXISTS whodrug_atc (
        atc_code TEXT NOT NULL,
        atc_level INTEGER NOT NULL,
        atc_name TEXT NOT NULL,
        parent_atc_code TEXT,
        version_id INTEGER NOT NULL REFERENCES whodrug_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (atc_code, version_id)
      )
    `);

    // Active Ingredients
    database.exec(`
      CREATE TABLE IF NOT EXISTS whodrug_ingredients (
        ingredient_id INTEGER NOT NULL,
        ingredient_name TEXT NOT NULL,
        cas_number TEXT,
        version_id INTEGER NOT NULL REFERENCES whodrug_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (ingredient_id, version_id)
      )
    `);

    // Drug Products (Trade Names)
    database.exec(`
      CREATE TABLE IF NOT EXISTS whodrug_products (
        drug_code TEXT NOT NULL,
        drug_record_number TEXT NOT NULL,
        seq1 TEXT NOT NULL,
        seq2 TEXT NOT NULL,
        drug_name TEXT NOT NULL,
        country_code TEXT,
        pharmaceutical_form TEXT,
        strength TEXT,
        manufacturer TEXT,
        version_id INTEGER NOT NULL REFERENCES whodrug_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (drug_code, version_id)
      )
    `);

    // Drug to Ingredient relationship
    database.exec(`
      CREATE TABLE IF NOT EXISTS whodrug_product_ingredients (
        drug_code TEXT NOT NULL,
        ingredient_id INTEGER NOT NULL,
        version_id INTEGER NOT NULL REFERENCES whodrug_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (drug_code, ingredient_id, version_id)
      )
    `);

    // Drug to ATC relationship
    database.exec(`
      CREATE TABLE IF NOT EXISTS whodrug_product_atc (
        drug_code TEXT NOT NULL,
        atc_code TEXT NOT NULL,
        is_official INTEGER DEFAULT 1,
        version_id INTEGER NOT NULL REFERENCES whodrug_versions(id) ON DELETE CASCADE,
        PRIMARY KEY (drug_code, atc_code, version_id)
      )
    `);

    // Create indexes for search
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_whodrug_name ON whodrug_products(drug_name);
      CREATE INDEX IF NOT EXISTS idx_whodrug_ingredient ON whodrug_ingredients(ingredient_name);
      CREATE INDEX IF NOT EXISTS idx_whodrug_atc ON whodrug_atc(atc_code, version_id);
      CREATE INDEX IF NOT EXISTS idx_whodrug_version ON whodrug_products(version_id);
      CREATE INDEX IF NOT EXISTS idx_whodrug_country ON whodrug_products(country_code);
      CREATE INDEX IF NOT EXISTS idx_whodrug_version_active ON whodrug_versions(is_active);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('014_whodrug_dictionary');
    console.log('Migration 014 applied successfully.');
  }

  // Migration 015: Phase 5 - Case Coding Fields
  const migration015Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('015_case_coding_fields');

  if (!migration015Exists) {
    console.log('Applying migration 015: Adding case coding fields...');

    // Add coding fields to case_reactions
    const reactionColumns = database.prepare("PRAGMA table_info(case_reactions)").all() as Array<{ name: string }>;
    const reactionColumnNames = reactionColumns.map(c => c.name);

    if (!reactionColumnNames.includes('verbatim_text')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN verbatim_text TEXT');
    }
    if (!reactionColumnNames.includes('llt_code')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN llt_code INTEGER');
    }
    if (!reactionColumnNames.includes('llt_name')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN llt_name TEXT');
    }
    if (!reactionColumnNames.includes('pt_code')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN pt_code INTEGER');
    }
    if (!reactionColumnNames.includes('pt_name')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN pt_name TEXT');
    }
    if (!reactionColumnNames.includes('hlt_code')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN hlt_code INTEGER');
    }
    if (!reactionColumnNames.includes('hlt_name')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN hlt_name TEXT');
    }
    if (!reactionColumnNames.includes('hlgt_code')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN hlgt_code INTEGER');
    }
    if (!reactionColumnNames.includes('hlgt_name')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN hlgt_name TEXT');
    }
    if (!reactionColumnNames.includes('soc_code')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN soc_code INTEGER');
    }
    if (!reactionColumnNames.includes('soc_name')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN soc_name TEXT');
    }
    if (!reactionColumnNames.includes('coding_meddra_version')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN coding_meddra_version TEXT');
    }
    if (!reactionColumnNames.includes('coded_by')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN coded_by TEXT');
    }
    if (!reactionColumnNames.includes('coded_at')) {
      database.exec('ALTER TABLE case_reactions ADD COLUMN coded_at TEXT');
    }

    // Add coding fields to case_drugs
    const drugColumns = database.prepare("PRAGMA table_info(case_drugs)").all() as Array<{ name: string }>;
    const drugColumnNames = drugColumns.map(c => c.name);

    if (!drugColumnNames.includes('verbatim_name')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN verbatim_name TEXT');
    }
    if (!drugColumnNames.includes('whodrug_code')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN whodrug_code TEXT');
    }
    if (!drugColumnNames.includes('coded_drug_name')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN coded_drug_name TEXT');
    }
    if (!drugColumnNames.includes('ingredient_names')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN ingredient_names TEXT');
    }
    if (!drugColumnNames.includes('atc_code')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN atc_code TEXT');
    }
    if (!drugColumnNames.includes('atc_name')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN atc_name TEXT');
    }
    if (!drugColumnNames.includes('coding_whodrug_version')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN coding_whodrug_version TEXT');
    }
    if (!drugColumnNames.includes('drug_coded_by')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN drug_coded_by TEXT');
    }
    if (!drugColumnNames.includes('drug_coded_at')) {
      database.exec('ALTER TABLE case_drugs ADD COLUMN drug_coded_at TEXT');
    }

    // Create indexes for coded terms
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_reactions_pt_code ON case_reactions(pt_code);
      CREATE INDEX IF NOT EXISTS idx_reactions_soc_code ON case_reactions(soc_code);
      CREATE INDEX IF NOT EXISTS idx_drugs_whodrug ON case_drugs(whodrug_code);
      CREATE INDEX IF NOT EXISTS idx_drugs_atc ON case_drugs(atc_code);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('015_case_coding_fields');
    console.log('Migration 015 applied successfully.');
  }

  // Migration 016: Phase 5 - Saved Searches
  const migration016Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('016_saved_searches');

  if (!migration016Exists) {
    console.log('Applying migration 016: Adding saved searches table...');

    database.exec(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        query_definition TEXT NOT NULL,
        created_by TEXT,
        is_shared INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(created_by);
      CREATE INDEX IF NOT EXISTS idx_saved_searches_shared ON saved_searches(is_shared);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('016_saved_searches');
    console.log('Migration 016 applied successfully.');
  }

  // Migration 017: Phase 5 - Case Templates
  const migration017Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('017_case_templates');

  if (!migration017Exists) {
    console.log('Applying migration 017: Adding case templates tables...');

    database.exec(`
      CREATE TABLE IF NOT EXISTS case_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        template_data TEXT NOT NULL,
        locked_fields TEXT,
        required_fields TEXT,
        created_by TEXT,
        is_global INTEGER DEFAULT 0,
        is_approved INTEGER DEFAULT 0,
        approved_by TEXT,
        approved_at TEXT,
        usage_count INTEGER DEFAULT 0,
        version INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS template_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL REFERENCES case_templates(id) ON DELETE CASCADE,
        case_id TEXT NOT NULL,
        used_by TEXT,
        used_at TEXT NOT NULL
      )
    `);

    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_templates_category ON case_templates(category);
      CREATE INDEX IF NOT EXISTS idx_templates_user ON case_templates(created_by);
      CREATE INDEX IF NOT EXISTS idx_templates_global ON case_templates(is_global);
      CREATE INDEX IF NOT EXISTS idx_templates_active ON case_templates(is_active);
      CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage(template_id);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('017_case_templates');
    console.log('Migration 017 applied successfully.');
  }

  // Migration 018: Phase 5 - Duplicate Detection
  const migration018Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('018_duplicate_detection');

  if (!migration018Exists) {
    console.log('Applying migration 018: Adding duplicate detection tables...');

    database.exec(`
      CREATE TABLE IF NOT EXISTS duplicate_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id_1 TEXT NOT NULL,
        case_id_2 TEXT NOT NULL,
        similarity_score REAL NOT NULL,
        matching_criteria TEXT,
        status TEXT DEFAULT 'pending',
        resolution TEXT,
        resolved_by TEXT,
        resolved_at TEXT,
        resolution_notes TEXT,
        detected_at TEXT NOT NULL,
        UNIQUE(case_id_1, case_id_2)
      )
    `);

    database.exec(`
      CREATE TABLE IF NOT EXISTS merged_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_case_id TEXT NOT NULL,
        merged_case_id TEXT NOT NULL,
        merged_by TEXT,
        merged_at TEXT NOT NULL,
        field_sources TEXT
      )
    `);

    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_duplicates_status ON duplicate_candidates(status);
      CREATE INDEX IF NOT EXISTS idx_duplicates_case1 ON duplicate_candidates(case_id_1);
      CREATE INDEX IF NOT EXISTS idx_duplicates_case2 ON duplicate_candidates(case_id_2);
      CREATE INDEX IF NOT EXISTS idx_duplicates_score ON duplicate_candidates(similarity_score);
      CREATE INDEX IF NOT EXISTS idx_merged_master ON merged_cases(master_case_id);
      CREATE INDEX IF NOT EXISTS idx_merged_source ON merged_cases(merged_case_id);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('018_duplicate_detection');
    console.log('Migration 018 applied successfully.');
  }

  // Migration 019: Phase 5 - Validation Rules & Import
  const migration019Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('019_validation_import');

  if (!migration019Exists) {
    console.log('Applying migration 019: Adding validation rules and import tables...');

    // Validation rules
    database.exec(`
      CREATE TABLE IF NOT EXISTS validation_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_code TEXT UNIQUE NOT NULL,
        rule_name TEXT NOT NULL,
        description TEXT,
        rule_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'error',
        condition_expression TEXT,
        validation_expression TEXT NOT NULL,
        error_message TEXT NOT NULL,
        field_path TEXT,
        related_fields TEXT,
        is_system INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Validation results per case
    database.exec(`
      CREATE TABLE IF NOT EXISTS validation_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL,
        rule_id INTEGER REFERENCES validation_rules(id),
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        field_path TEXT,
        field_value TEXT,
        is_acknowledged INTEGER DEFAULT 0,
        acknowledged_by TEXT,
        acknowledged_at TEXT,
        validated_at TEXT NOT NULL
      )
    `);

    // Import jobs
    database.exec(`
      CREATE TABLE IF NOT EXISTS import_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        row_count INTEGER,
        column_count INTEGER,
        status TEXT DEFAULT 'pending',
        column_mapping TEXT,
        transformation_rules TEXT,
        validation_summary TEXT,
        imported_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        skipped_count INTEGER DEFAULT 0,
        created_by TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Import job rows
    database.exec(`
      CREATE TABLE IF NOT EXISTS import_job_rows (
        import_job_id INTEGER NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
        row_number INTEGER NOT NULL,
        case_id TEXT,
        status TEXT NOT NULL,
        errors TEXT,
        warnings TEXT,
        PRIMARY KEY (import_job_id, row_number)
      )
    `);

    // Saved column mappings
    database.exec(`
      CREATE TABLE IF NOT EXISTS saved_column_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        mapping TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create indexes
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_validation_rules_type ON validation_rules(rule_type);
      CREATE INDEX IF NOT EXISTS idx_validation_rules_active ON validation_rules(is_active);
      CREATE INDEX IF NOT EXISTS idx_validation_rules_system ON validation_rules(is_system);
      CREATE INDEX IF NOT EXISTS idx_validation_results_case ON validation_results(case_id);
      CREATE INDEX IF NOT EXISTS idx_validation_results_ack ON validation_results(is_acknowledged);
      CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(created_by);
      CREATE INDEX IF NOT EXISTS idx_import_rows_status ON import_job_rows(status);
    `);

    // Seed default validation rules
    const now = new Date().toISOString();
    const systemRules = [
      {
        code: 'SYS-DATE-001',
        name: 'Date Sequence',
        description: 'Start dates must be before or equal to end dates',
        type: 'date_logic',
        severity: 'error',
        condition: 'true',
        validation: '(!reaction_start_date || !reaction_end_date) || new Date(reaction_start_date) <= new Date(reaction_end_date)',
        message: 'Reaction end date cannot be before start date',
        field: 'reaction_end_date'
      },
      {
        code: 'SYS-SERIOUS-001',
        name: 'Serious Requires Criterion',
        description: 'If case is marked serious, at least one seriousness criterion must be selected',
        type: 'cross_field',
        severity: 'error',
        condition: 'is_serious === 1',
        validation: 'serious_death || serious_life_threat || serious_hospitalization || serious_disability || serious_congenital || serious_other',
        message: 'At least one seriousness criterion must be selected for a serious case',
        field: 'is_serious'
      },
      {
        code: 'SYS-AGE-002',
        name: 'Age Limit',
        description: 'Patient age should not exceed 150 years',
        type: 'range',
        severity: 'warning',
        condition: "patient_age && patient_age_unit === '801'",
        validation: 'patient_age <= 150',
        message: 'Patient age exceeds 150 years - please verify',
        field: 'patient_age'
      },
      {
        code: 'SYS-DATE-002',
        name: 'No Future Dates',
        description: 'Event dates should not be in the future',
        type: 'date_logic',
        severity: 'error',
        condition: 'reaction_start_date',
        validation: 'new Date(reaction_start_date) <= new Date()',
        message: 'Reaction date cannot be in the future',
        field: 'reaction_start_date'
      },
      {
        code: 'SYS-CODING-001',
        name: 'MedDRA Coding Required',
        description: 'Reaction should be coded with MedDRA PT for submission',
        type: 'required',
        severity: 'error',
        condition: "workflow_status === 'Ready for Export' || workflow_status === 'Approved'",
        validation: '!!reaction_pt_code',
        message: 'MedDRA coding (PT) is required for submission',
        field: 'reaction_pt_code'
      }
    ];

    const insertRule = database.prepare(`
      INSERT INTO validation_rules
      (rule_code, rule_name, description, rule_type, severity, condition_expression, validation_expression, error_message, field_path, is_system, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
    `);

    for (const rule of systemRules) {
      insertRule.run(
        rule.code, rule.name, rule.description, rule.type, rule.severity,
        rule.condition, rule.validation, rule.message, rule.field, now, now
      );
    }

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('019_validation_import');
    console.log('Migration 019 applied successfully.');
  }

  // Migration 020: Phase 2B - ESG API Submission Tracking
  const migration020Exists = database.prepare(
    'SELECT 1 FROM migrations WHERE name = ?'
  ).get('020_esg_api_submission');

  if (!migration020Exists) {
    console.log('Applying migration 020: Adding ESG API submission tracking...');

    // API submission attempts table
    database.exec(`
      CREATE TABLE IF NOT EXISTS api_submission_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        esg_submission_id TEXT,
        esg_core_id TEXT,
        environment TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        error TEXT,
        error_category TEXT,
        http_status_code INTEGER,
        ack_type TEXT,
        ack_timestamp DATETIME,
        ack_fda_core_id TEXT,
        ack_errors TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )
    `);

    // Indexes for api_submission_attempts
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_api_attempts_case ON api_submission_attempts(case_id);
      CREATE INDEX IF NOT EXISTS idx_api_attempts_status ON api_submission_attempts(status);
      CREATE INDEX IF NOT EXISTS idx_api_attempts_esg_id ON api_submission_attempts(esg_submission_id);
      CREATE INDEX IF NOT EXISTS idx_api_attempts_esg_core ON api_submission_attempts(esg_core_id);
      CREATE INDEX IF NOT EXISTS idx_api_attempts_env ON api_submission_attempts(environment);
      CREATE INDEX IF NOT EXISTS idx_api_attempts_ack ON api_submission_attempts(ack_type);
    `);

    // Add ESG fields to cases table
    const caseColumns = database.prepare("PRAGMA table_info(cases)").all() as Array<{ name: string }>;
    const caseColumnNames = caseColumns.map(c => c.name);

    if (!caseColumnNames.includes('esg_submission_id')) {
      database.exec('ALTER TABLE cases ADD COLUMN esg_submission_id TEXT');
    }
    if (!caseColumnNames.includes('esg_core_id')) {
      database.exec('ALTER TABLE cases ADD COLUMN esg_core_id TEXT');
    }
    if (!caseColumnNames.includes('api_submission_started_at')) {
      database.exec('ALTER TABLE cases ADD COLUMN api_submission_started_at DATETIME');
    }
    if (!caseColumnNames.includes('api_last_error')) {
      database.exec('ALTER TABLE cases ADD COLUMN api_last_error TEXT');
    }
    if (!caseColumnNames.includes('api_attempt_count')) {
      database.exec('ALTER TABLE cases ADD COLUMN api_attempt_count INTEGER DEFAULT 0');
    }

    // Create indexes for ESG-related case queries
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_cases_esg_submission ON cases(esg_submission_id);
      CREATE INDEX IF NOT EXISTS idx_cases_esg_core ON cases(esg_core_id);
    `);

    database.prepare(
      'INSERT INTO migrations (name) VALUES (?)'
    ).run('020_esg_api_submission');
    console.log('Migration 020 applied successfully.');
  }
}

/**
 * Seed countries lookup data from JSON file
 */
function seedCountries(database: DatabaseInstance): void {
  try {
    // Try to load from resources directory
    // In dev mode, app.getAppPath() returns the project root
    // In production, use process.resourcesPath for app.asar resources
    const resourcesPath = app.isPackaged
      ? join(process.resourcesPath, 'data', 'countries.json')
      : join(app.getAppPath(), 'resources', 'data', 'countries.json');

    if (existsSync(resourcesPath)) {
      const countriesJson = readFileSync(resourcesPath, 'utf-8');
      const countries = JSON.parse(countriesJson) as Array<{ code: string; name: string }>;

      const stmt = database.prepare(
        'INSERT OR IGNORE INTO lookup_countries (code, name) VALUES (?, ?)'
      );

      const insertMany = database.transaction((items: Array<{ code: string; name: string }>) => {
        for (const country of items) {
          stmt.run(country.code, country.name);
        }
      });

      insertMany(countries);
      console.log(`Inserted ${countries.length} countries`);
    } else {
      console.warn('Countries data file not found:', resourcesPath);
    }
  } catch (error) {
    console.error('Error seeding countries:', error);
  }
}

/**
 * Apply the initial database schema (REQ-DB-002)
 */
function applyInitialSchema(database: DatabaseInstance): void {
  database.exec(`
    -- Cases table (main ICSR record)
    CREATE TABLE IF NOT EXISTS cases (
        id              TEXT PRIMARY KEY,
        status          TEXT NOT NULL DEFAULT 'Draft',
        created_at      DATETIME NOT NULL,
        updated_at      DATETIME NOT NULL,
        deleted_at      DATETIME,

        -- Report Information (A.1)
        safety_report_id    TEXT,
        report_type         INTEGER,
        initial_or_followup INTEGER,
        receipt_date        TEXT,
        receive_date        TEXT,
        additional_docs     INTEGER,
        expedited_report    INTEGER,
        worldwide_case_id   TEXT,
        nullification_type  INTEGER,
        nullification_reason TEXT,

        -- Sender Information (A.3)
        sender_type         INTEGER,
        sender_organization TEXT,
        sender_department   TEXT,
        sender_given_name   TEXT,
        sender_family_name  TEXT,
        sender_address      TEXT,
        sender_city         TEXT,
        sender_state        TEXT,
        sender_postcode     TEXT,
        sender_country      TEXT,
        sender_phone        TEXT,
        sender_fax          TEXT,
        sender_email        TEXT,

        -- Patient Information (B.1)
        patient_initials    TEXT,
        patient_gp_record   TEXT,
        patient_specialist_record TEXT,
        patient_hospital_record TEXT,
        patient_investigation TEXT,
        patient_birthdate   TEXT,
        patient_age         REAL,
        patient_age_unit    TEXT,
        patient_age_group   INTEGER,
        patient_weight      REAL,
        patient_height      REAL,
        patient_sex         INTEGER,
        patient_lmp_date    TEXT,

        -- Death Information (B.1.9)
        patient_death       INTEGER DEFAULT 0,
        death_date          TEXT,
        autopsy_performed   INTEGER,

        -- Narrative (B.5)
        case_narrative      TEXT,
        reporter_comments   TEXT,
        sender_comments     TEXT,
        sender_diagnosis    TEXT,

        -- Metadata
        version             INTEGER DEFAULT 1,
        exported_at         DATETIME,
        exported_xml_path   TEXT
    );

    -- Primary Source / Reporters (A.2)
    CREATE TABLE IF NOT EXISTS case_reporters (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        is_primary      INTEGER DEFAULT 0,
        title           TEXT,
        given_name      TEXT,
        family_name     TEXT,
        qualification   INTEGER,
        organization    TEXT,
        department      TEXT,
        address         TEXT,
        city            TEXT,
        state           TEXT,
        postcode        TEXT,
        country         TEXT,
        phone           TEXT,
        email           TEXT,
        sort_order      INTEGER DEFAULT 0
    );

    -- Other Case Identifiers (A.1.9)
    CREATE TABLE IF NOT EXISTS case_identifiers (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        source          TEXT,
        identifier      TEXT
    );

    -- Related Reports (A.1.11)
    CREATE TABLE IF NOT EXISTS case_related_reports (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        related_case_id TEXT,
        link_type       INTEGER
    );

    -- Medical History (B.1.7)
    CREATE TABLE IF NOT EXISTS case_medical_history (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        condition       TEXT,
        meddra_code     TEXT,
        meddra_version  TEXT,
        start_date      TEXT,
        continuing      INTEGER,
        end_date        TEXT,
        comments        TEXT,
        family_history  INTEGER,
        sort_order      INTEGER DEFAULT 0
    );

    -- Past Drug History (B.1.8)
    CREATE TABLE IF NOT EXISTS case_drug_history (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        drug_name       TEXT,
        mpid            TEXT,
        start_date      TEXT,
        end_date        TEXT,
        indication      TEXT,
        indication_code TEXT,
        reaction        TEXT,
        reaction_code   TEXT,
        sort_order      INTEGER DEFAULT 0
    );

    -- Death Causes (B.1.9.2, B.1.9.4)
    CREATE TABLE IF NOT EXISTS case_death_causes (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        cause_type      TEXT,
        cause           TEXT,
        meddra_code     TEXT,
        sort_order      INTEGER DEFAULT 0
    );

    -- Reactions (B.2)
    CREATE TABLE IF NOT EXISTS case_reactions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        assessment_source INTEGER,
        reaction_term   TEXT NOT NULL,
        meddra_code     TEXT,
        meddra_version  TEXT,
        native_term     TEXT,
        start_date      TEXT,
        end_date        TEXT,
        duration        REAL,
        duration_unit   TEXT,

        -- Seriousness (B.2.i.7)
        serious_death           INTEGER DEFAULT 0,
        serious_life_threat     INTEGER DEFAULT 0,
        serious_hospitalization INTEGER DEFAULT 0,
        serious_disability      INTEGER DEFAULT 0,
        serious_congenital      INTEGER DEFAULT 0,
        serious_other           INTEGER DEFAULT 0,

        outcome         INTEGER,
        medical_confirm INTEGER,
        sort_order      INTEGER DEFAULT 0
    );

    -- Drugs (B.4)
    CREATE TABLE IF NOT EXISTS case_drugs (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        characterization INTEGER NOT NULL,
        product_name    TEXT NOT NULL,
        mpid            TEXT,
        phpid           TEXT,

        cumulative_dose REAL,
        cumulative_unit TEXT,
        cumulative_first REAL,
        cumulative_first_unit TEXT,

        gestation_exposure REAL,
        indication      TEXT,
        indication_code TEXT,

        start_date      TEXT,
        end_date        TEXT,
        duration        REAL,
        duration_unit   TEXT,

        time_to_onset   REAL,
        time_onset_unit TEXT,

        action_taken    INTEGER,
        dechallenge     INTEGER,
        rechallenge     INTEGER,
        additional_info TEXT,

        -- Source document fields (not part of E2B R3)
        ndc_number      TEXT,
        manufacturer_name TEXT,
        lot_number      TEXT,
        expiration_date TEXT,

        sort_order      INTEGER DEFAULT 0
    );

    -- Drug Active Substances (B.4.k.3)
    CREATE TABLE IF NOT EXISTS case_drug_substances (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        drug_id         INTEGER NOT NULL REFERENCES case_drugs(id) ON DELETE CASCADE,
        substance_name  TEXT,
        substance_code  TEXT,
        strength        REAL,
        strength_unit   TEXT,
        sort_order      INTEGER DEFAULT 0
    );

    -- Drug Dosage Information (B.4.k.4)
    CREATE TABLE IF NOT EXISTS case_drug_dosages (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        drug_id         INTEGER NOT NULL REFERENCES case_drugs(id) ON DELETE CASCADE,
        dose            REAL,
        dose_first      REAL,
        dose_last       REAL,
        dose_unit       TEXT,
        num_units       REAL,
        interval_unit   TEXT,
        interval_def    TEXT,
        dosage_text     TEXT,
        pharma_form     TEXT,
        route           TEXT,
        parent_route    TEXT,
        sort_order      INTEGER DEFAULT 0
    );

    -- Drug-Reaction Matrix (B.4.k.16)
    CREATE TABLE IF NOT EXISTS case_drug_reaction_matrix (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        drug_id         INTEGER NOT NULL REFERENCES case_drugs(id) ON DELETE CASCADE,
        reaction_id     INTEGER NOT NULL REFERENCES case_reactions(id) ON DELETE CASCADE,
        assessment_source TEXT,
        assessment_method TEXT,
        assessment_result TEXT
    );

    -- Attachments
    CREATE TABLE IF NOT EXISTS case_attachments (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id         TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        filename        TEXT NOT NULL,
        file_type       TEXT,
        file_size       INTEGER,
        file_path       TEXT,
        description     TEXT,
        created_at      DATETIME NOT NULL
    );

    -- Application Settings
    CREATE TABLE IF NOT EXISTS settings (
        key             TEXT PRIMARY KEY,
        value           TEXT,
        updated_at      DATETIME
    );

    -- Lookup Tables for Dropdowns
    CREATE TABLE IF NOT EXISTS lookup_countries (
        code            TEXT PRIMARY KEY,
        name            TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lookup_meddra_terms (
        code            TEXT PRIMARY KEY,
        term            TEXT NOT NULL,
        pt_code         TEXT,
        version         TEXT
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
    CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at);
    CREATE INDEX IF NOT EXISTS idx_cases_deleted ON cases(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_reactions_case ON case_reactions(case_id);
    CREATE INDEX IF NOT EXISTS idx_drugs_case ON case_drugs(case_id);
    CREATE INDEX IF NOT EXISTS idx_reporters_case ON case_reporters(case_id);
    CREATE INDEX IF NOT EXISTS idx_medical_history_case ON case_medical_history(case_id);
    CREATE INDEX IF NOT EXISTS idx_drug_history_case ON case_drug_history(case_id);
  `);
}

/**
 * Backup the database to a file
 */
export function backupDatabase(): string {
  const database = getDatabase();
  const backupPath = getBackupPath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = join(backupPath, `faers-backup-${timestamp}.db`);

  database.backup(backupFile);

  return backupFile;
}

/**
 * Restore the database from a backup file
 */
export function restoreDatabase(backupFile: string): void {
  if (!existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  const dbPath = getDatabasePath();

  // Close current connection
  closeDatabase();

  // Copy backup to database location
  const backupDb = new Database(backupFile);
  backupDb.backup(dbPath);
  backupDb.close();

  // Reinitialize
  initDatabase();
}
