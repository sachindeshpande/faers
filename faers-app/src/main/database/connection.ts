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
  return join(userDataPath, 'faers.db');
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
