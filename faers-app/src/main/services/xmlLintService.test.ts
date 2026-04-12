/**
 * Unit tests for xmlLintService.
 *
 * Covers the three interesting paths:
 *   1. Lint runs and passes (generated XML from the fixture)
 *   2. Lint runs and FAILS (intentionally broken XML — missing reporter block)
 *   3. Lint is skipped cleanly (missing script path)
 *
 * Uses the real Python lint script, so this is technically an integration
 * test. Kept under the fast vitest tree because it only needs system
 * python3, no Electron, no SQLite. The electron.app import is stubbed.
 */

import { describe, it, expect, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Mutable mock so individual tests can flip isPackaged to simulate the
// production-app candidate resolution path. Must be declared via vi.hoisted
// so it's initialized before the hoisted vi.mock factory runs.
const { mockApp } = vi.hoisted(() => ({
  mockApp: { isPackaged: false, getAppPath: () => process.cwd() }
}));
vi.mock('electron', () => ({ app: mockApp }));

import { lintE2bXml, resolveLintScriptPath } from './xmlLintService';
import { XMLGeneratorService } from './xmlGeneratorService';
import {
  ReportType,
  ReportCategory,
  ReporterQualification,
  PatientSex,
  AgeUnit,
  DrugCharacterization,
  ReactionOutcome
} from '../../shared/types/case.types';
import type { Case, CaseReporter, CaseReaction, CaseDrug } from '../../shared/types/case.types';

const SCRIPT_PATH = resolve(__dirname, '../../../../test/test_submission/faers_xml_lint.py');

const FIXTURE_CASE: Case = {
  id: 'CASE-20260331-LINTGATE',
  version: 1,
  status: 'Draft' as never,
  createdAt: '2026-03-31T16:14:51Z',
  updatedAt: '2026-03-31T16:14:51Z',
  safetyReportId: 'SR-CASE-20260331-LINTGATE',
  worldwideCaseId: 'SR-CASE-20260331-LINTGATE',
  reportType: ReportType.Spontaneous,
  initialOrFollowup: ReportCategory.Initial,
  receiptDate: '2026-03-15',
  expeditedReport: true,
  patientInitials: 'T.P.',
  patientSex: PatientSex.Male,
  patientAge: 50,
  patientAgeUnit: AgeUnit.Year,
  patientDeath: false,
  caseNarrative: 'Lint-gate test narrative.'
} as Case;

const FIXTURE_REPORTERS: CaseReporter[] = [
  {
    caseId: FIXTURE_CASE.id,
    isPrimary: true,
    title: 'Mr',
    givenName: 'Sachin',
    familyName: 'Deshpande',
    qualification: ReporterQualification.Physician,
    organization: 'DeepQuence',
    department: 'Drug Safety',
    address: '123 Test St',
    city: 'Sunnyvale',
    state: 'CA',
    postcode: '94085',
    country: 'US',
    phone: '+14085550100',
    fax: '+14085550101',
    email: 'sachindeshpande@deepquence.com',
    sortOrder: 0
  }
];

const FIXTURE_REACTIONS: CaseReaction[] = [
  {
    caseId: FIXTURE_CASE.id,
    reactionTerm: 'Nausea',
    meddraCode: '10028813',
    startDate: '2026-03-01',
    seriousHospitalization: true,
    seriousOther: true,
    outcome: ReactionOutcome.NotRecovered,
    sortOrder: 0
  }
] as CaseReaction[];

const FIXTURE_DRUGS: CaseDrug[] = [
  {
    caseId: FIXTURE_CASE.id,
    characterization: DrugCharacterization.Suspect,
    productName: 'Testdrugimab',
    startDate: '2026-01-15',
    indication: 'Rheumatoid arthritis',
    indicationCode: '10039073',
    sortOrder: 0
  }
] as CaseDrug[];

function generateFixtureXml(): string {
  const svc = new XMLGeneratorService({} as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = svc as any;
  any.caseRepo.findById = () => FIXTURE_CASE;
  any.reporterRepo.findByCaseId = () => FIXTURE_REPORTERS;
  any.reactionRepo.findByCaseId = () => FIXTURE_REACTIONS;
  any.drugRepo.findByCaseId = () => FIXTURE_DRUGS;
  const result = svc.generate(FIXTURE_CASE.id, {
    submissionEnvironment: 'Test',
    submissionReportType: 'Postmarket',
    senderIdentifierType: 'duns',
    senderIdentifierValue: '334818134',
    targetCenter: 'CDER',
    batchNumber: `LintGate-${Date.now()}`
  });
  if (!result.xml) throw new Error(`fixture XML generation failed: ${result.errors.join('; ')}`);
  return result.xml;
}

describe('xmlLintService', () => {
  it('resolveLintScriptPath finds the real script in dev layout', () => {
    mockApp.isPackaged = false;
    const path = resolveLintScriptPath();
    expect(path).toBeTruthy();
    expect(path).toMatch(/faers_xml_lint\.py$/);
  });

  it('resolveLintScriptPath finds the packaged script in a staged production build', () => {
    // The `electron-builder --dir` stage places the packaged script at
    //   dist/mac-arm64/FAERS Submission App.app/Contents/Resources/lint/faers_xml_lint.py
    // This test only exercises the assertion when that staged file actually
    // exists on disk; otherwise we'd be asserting against the dev fallback
    // (which resolveLintScriptPath returns for dev paths that still exist).
    const packagedResources = resolve(
      __dirname,
      '../../../dist/mac-arm64/FAERS Submission App.app/Contents/Resources'
    );
    const packagedScript = resolve(packagedResources, 'lint', 'faers_xml_lint.py');
    if (!existsSync(packagedScript)) {
      console.warn('[skip] Packaged build not staged — run `npx electron-builder --dir` to exercise this assertion.');
      return;
    }

    const originalResourcesPath = process.resourcesPath;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process as any).resourcesPath = packagedResources;
      mockApp.isPackaged = true;
      const path = resolveLintScriptPath();
      expect(path).toBe(packagedScript);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process as any).resourcesPath = originalResourcesPath;
      mockApp.isPackaged = false;
    }
  });

  it('reports 0 FAIL on a clean generated XML', () => {
    const xml = generateFixtureXml();
    const result = lintE2bXml(xml, { scriptPath: SCRIPT_PATH });
    expect(result.ran).toBe(true);
    expect(result.fail).toBe(0);
    expect(result.failures).toHaveLength(0);
    // Conditional checks vary with fixture richness — the lint-conformance
    // suite covers the 55-check maximum; here we only care that nothing fails.
    expect(result.pass).toBeGreaterThan(40);
  });

  it('reports non-zero fail count on structurally broken XML', () => {
    // Inject a broken XML by removing the entire subjectOf1/reporter block.
    // This should trip lint section 11 (reporter checks) and several C.3
    // checks even without touching anything else.
    const good = generateFixtureXml();
    const broken = good.replace(/<subjectOf1[\s\S]*?<\/subjectOf1>/, '');
    const result = lintE2bXml(broken, { scriptPath: SCRIPT_PATH });
    expect(result.ran).toBe(true);
    expect(result.fail).toBeGreaterThan(0);
    expect(result.failures.length).toBeGreaterThan(0);
    // The label text should mention subjectOf1 / reporter — specific enough
    // that we know we're parsing the FAILURES block correctly.
    const joined = result.failures.map(f => f.label).join(' | ');
    expect(joined).toMatch(/reporter|subjectOf1|C\.3/i);
  });

  it('skips cleanly when the lint script path does not exist', () => {
    const result = lintE2bXml('<MCCI_IN200100UV01/>', {
      scriptPath: '/nonexistent/path/to/faers_xml_lint.py'
    });
    expect(result.ran).toBe(false);
    expect(result.skipReason).toBeTruthy();
    expect(result.fail).toBe(0);
  });

  it('skips cleanly when python3 is not available', () => {
    const result = lintE2bXml('<MCCI_IN200100UV01/>', {
      scriptPath: SCRIPT_PATH,
      pythonExe: 'definitely-not-a-real-python-binary'
    });
    expect(result.ran).toBe(false);
    expect(result.skipReason).toMatch(/python3 executable not found/);
  });
});
