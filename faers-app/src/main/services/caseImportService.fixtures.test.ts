/**
 * Fixture-driven tests for every JSON in test/test_submission/examples/cases/.
 *
 * Two layers of verification per fixture:
 *   1. The raw JSON validates against the zod schema.
 *   2. The service successfully runs the full import (with mocked repos).
 *
 * This keeps the shipped examples honest: if someone edits a fixture into an
 * invalid shape, the test fails before anyone ships a broken seed file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  CaseImportDocumentSchema
} from '../../shared/types/caseImport.types';

// Hoisted repo mocks so the vi.mock factory can reach them.
const mocks = vi.hoisted(() => ({
  caseCreate: vi.fn(),
  caseUpdate: vi.fn(),
  reporterCreate: vi.fn(),
  reactionCreate: vi.fn(),
  drugCreate: vi.fn()
}));

vi.mock('../database/repositories', () => ({
  CaseRepository: vi.fn().mockImplementation(() => ({
    create: mocks.caseCreate,
    update: mocks.caseUpdate
  })),
  ReporterRepository: vi.fn().mockImplementation(() => ({
    create: mocks.reporterCreate
  })),
  ReactionRepository: vi.fn().mockImplementation(() => ({
    create: mocks.reactionCreate
  })),
  DrugRepository: vi.fn().mockImplementation(() => ({
    create: mocks.drugCreate
  }))
}));

import { CaseImportService } from './caseImportService';

const EXAMPLES_DIR = resolve(__dirname, '../../../../test/test_submission/examples/cases');

function fixtureFiles(): string[] {
  return readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

function readFixture(name: string): { raw: unknown; text: string } {
  const text = readFileSync(join(EXAMPLES_DIR, name), 'utf-8');
  return { raw: JSON.parse(text), text };
}

function makeMockDb() {
  return {
    transaction: <R>(fn: () => R) => () => fn()
  };
}

beforeEach(() => {
  // Default repo behaviour — returns the DTO it was given so the service
  // gets a Case-shaped object back.
  mocks.caseCreate.mockReset();
  mocks.caseUpdate.mockReset();
  mocks.reporterCreate.mockReset();
  mocks.reactionCreate.mockReset();
  mocks.drugCreate.mockReset();

  mocks.caseCreate.mockImplementation((dto) => ({
    id: 'CASE-FIXTURE-TEST',
    status: 'Draft',
    createdAt: '2026-04-22T00:00:00Z',
    updatedAt: '2026-04-22T00:00:00Z',
    patientDeath: false,
    version: 1,
    ...(dto ?? {})
  }));
  mocks.caseUpdate.mockImplementation((id, dto) => ({ id, patientDeath: false, version: 1, ...dto }));
  mocks.reporterCreate.mockImplementation((r) => ({ ...r, id: 1 }));
  mocks.reactionCreate.mockImplementation((r) => ({ ...r, id: 1 }));
  mocks.drugCreate.mockImplementation((d) => ({ ...d, id: 1 }));
});

describe('Shipped example JSONs', () => {
  const fixtures = fixtureFiles();

  it('finds at least the baseline + 9 test-catalog examples (10 total)', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
    expect(fixtures).toContain('2L8T-baseline.json');
  });

  it.each(fixtures)('%s is valid against the import schema', (name) => {
    const { raw } = readFixture(name);
    const parsed = CaseImportDocumentSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`${name} failed schema validation:\n${issues}`);
    }
    expect(parsed.success).toBe(true);
  });

  it.each(fixtures)('%s imports successfully (no enum warnings)', (name) => {
    const { raw } = readFixture(name);
    const svc = new CaseImportService(makeMockDb());
    const result = svc.importCaseFromJson({ jsonObject: raw });

    if (!result.success) {
      const errs = result.errors?.map((e) => `${e.path}: ${e.message}`).join('\n');
      throw new Error(`${name} import failed:\n${errs}`);
    }
    expect(result.success).toBe(true);
    // Warnings indicate an enum we couldn't map — shipped fixtures should
    // all hit the known values. Catch drift early. Filter out the
    // intentional informational messages (like the 21 CFR 312.32 IND
    // timeline auto-derivation) because those are by-design, not drift.
    const driftWarnings = (result.warnings ?? []).filter(
      (w) => !w.includes('21 CFR 312.32')
    );
    expect(driftWarnings).toEqual([]);
  });
});
