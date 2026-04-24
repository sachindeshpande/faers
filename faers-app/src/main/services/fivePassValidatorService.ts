/**
 * FAERS 5-Pass Pre-Submission Validator
 *
 * Implements the five-pass pre-submission check described in §8 of
 * CLAUDE_CODE_SESSION_HANDOFF_2L8T.md. Runs in-process (no Python dep, no
 * external process) alongside the existing `xmlLintService` lint gate — the
 * lint gate guards structural invariants, this validator catches the value-
 * level regressions that were learned empirically across v1–2L8T.
 *
 * The five passes:
 *   1. Element-presence structural diff   — same element path order as v37
 *   2. CE attribute completeness          — every CE value has @codeSystem
 *   3. Business-rule code validity        — race/ethnicity/etc. per policy
 *   4. Full value-level diff vs v37       — categorize every divergence
 *   5. Empirical safety check             — proven_safe / proven_rejected /
 *                                            untested classification
 *
 * Pass 4/5 require access to the v37 golden XML; when it's not on disk
 * (packaged production build without the test tree) those passes are skipped
 * cleanly and the caller is told why, matching how xmlLintService degrades.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import {
  FAERS_POLICY,
  classifyValue,
  type FieldPolicy,
  type PolicyVerdict
} from './faersEmpiricalPolicy';
import type {
  FivePassResult,
  PassSummary,
  ValidatorFinding,
  ValidatorSeverity
} from '../../shared/types/faersValidation.types';

export type { FivePassResult, PassSummary, ValidatorFinding };
/** Backwards-compatible alias; existing callers may still reference `Severity`. */
export type Severity = ValidatorSeverity;

// ────────────────────────────────────────────────────────────────────────────
//  Golden v37 XML resolution (mirrors xmlLintService's approach)
// ────────────────────────────────────────────────────────────────────────────

const V37_FILENAME = 'CASE-20260331-EMJQ_fixed_v37_patch.xml';

export function resolveGoldenV37Path(): string | null {
  const candidates: string[] = [];
  // `app` is undefined in standalone-node / headless-CLI contexts. Guard
  // every access so the cwd fallbacks still work.
  const electronApp = (app as unknown as typeof app | undefined);

  try {
    if (electronApp?.isPackaged) {
      candidates.push(join(process.resourcesPath, 'lint', V37_FILENAME));
      candidates.push(join(process.resourcesPath, V37_FILENAME));
      candidates.push(join(process.resourcesPath, 'test', 'test_submission', 'package', V37_FILENAME));
    }
  } catch {
    // app may be unavailable (test context)
  }

  try {
    const appPath = electronApp?.getAppPath?.();
    if (appPath) {
      candidates.push(join(appPath, '..', 'test', 'test_submission', 'package', V37_FILENAME));
      candidates.push(join(appPath, '..', '..', 'test', 'test_submission', 'package', V37_FILENAME));
    }
  } catch {
    // outside Electron
  }

  candidates.push(join(process.cwd(), 'test', 'test_submission', 'package', V37_FILENAME));
  candidates.push(join(process.cwd(), '..', 'test', 'test_submission', 'package', V37_FILENAME));

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
//  Minimal XML walker (no external deps)
// ────────────────────────────────────────────────────────────────────────────

interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;  // direct text content (ignoring whitespace-only)
  path: string;  // `/` joined ancestry, 1-based indexed siblings for uniqueness
}

/**
 * Parse FAERS-style ICSR XML into a simple in-memory tree. Handles:
 *   - prolog + comments (stripped)
 *   - self-closing elements
 *   - simple attribute parsing (no single-quoted, no escaped quotes in values)
 *   - default namespace declarations (dropped — not needed for the diff)
 *   - basic entity decoding
 *
 * Intentionally *not* a general-purpose parser — we feed it only the strict
 * E2B(R3) XML the generator produces, so we accept the simplifications.
 */
function parseXml(xml: string): XmlNode {
  const cleaned = xml
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  const root: XmlNode = { name: '#root', attrs: {}, children: [], text: '', path: '' };
  const stack: XmlNode[] = [root];

  // Sibling counters per parent, keyed by parent's identity + child name, so
  // we can build stable positional paths like `/MCCI/PORR/controlActProcess/subject[1]/investigationEvent/component[2]/...`.
  const siblingCounters = new WeakMap<XmlNode, Map<string, number>>();

  const tagRe = /<(\/)?([A-Za-z_][A-Za-z0-9_.:-]*)((?:\s+[^/>]*?)?)\s*(\/)?>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(cleaned)) !== null) {
    const isClose = m[1] === '/';
    const name = m[2];
    const attrBlob = m[3] ?? '';
    const selfClose = m[4] === '/';
    const textChunk = m[5];

    if (textChunk !== undefined) {
      const trimmed = textChunk.trim();
      if (trimmed) {
        const top = stack[stack.length - 1];
        top.text = top.text ? `${top.text}${decodeEntities(trimmed)}` : decodeEntities(trimmed);
      }
      continue;
    }

    if (isClose) {
      stack.pop();
      continue;
    }

    const parent = stack[stack.length - 1];
    let counters = siblingCounters.get(parent);
    if (!counters) {
      counters = new Map();
      siblingCounters.set(parent, counters);
    }
    const n = (counters.get(name) ?? 0) + 1;
    counters.set(name, n);

    const node: XmlNode = {
      name,
      attrs: parseAttrs(attrBlob),
      children: [],
      text: '',
      path: parent === root ? `/${name}[${n}]` : `${parent.path}/${name}[${n}]`
    };
    parent.children.push(node);
    if (!selfClose) stack.push(node);
  }

  return root;
}

function parseAttrs(blob: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blob)) !== null) {
    const name = m[1];
    // Namespace declarations are noise for our diff; drop them.
    if (name === 'xmlns' || name.startsWith('xmlns:')) continue;
    out[name] = decodeEntities(m[2]);
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Pre-order walk. */
function walk(node: XmlNode, fn: (n: XmlNode) => void): void {
  for (const c of node.children) {
    fn(c);
    walk(c, fn);
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Pass 1 — element-presence structural diff
// ────────────────────────────────────────────────────────────────────────────

function collectPaths(root: XmlNode): string[] {
  const paths: string[] = [];
  walk(root, (n) => paths.push(n.path));
  return paths;
}

function runPass1(
  candidate: XmlNode,
  golden: XmlNode | null
): { summary: PassSummary; findings: ValidatorFinding[] } {
  const findings: ValidatorFinding[] = [];
  if (!golden) {
    return {
      summary: { ran: false, skipReason: 'v37 reference not found', errors: 0, warnings: 0 },
      findings: []
    };
  }

  const candPaths = collectPaths(candidate);
  const goldPaths = collectPaths(golden);

  // Missing in candidate (present in golden, not in candidate)
  const candSet = new Set(candPaths);
  const goldSet = new Set(goldPaths);
  const missing = goldPaths.filter((p) => !candSet.has(p));
  const extra = candPaths.filter((p) => !goldSet.has(p));

  for (const p of missing) {
    findings.push({
      pass: 1,
      severity: 'error',
      label: 'Missing element vs v37',
      detail: 'Element present in v37 golden but not in generated XML',
      path: p
    });
  }
  for (const p of extra) {
    findings.push({
      pass: 1,
      severity: 'warning',
      label: 'Extra element vs v37',
      detail: 'Element present in generated XML but not in v37 golden',
      path: p
    });
  }
  if (candPaths.length !== goldPaths.length) {
    findings.push({
      pass: 1,
      severity: missing.length > 0 ? 'error' : 'warning',
      label: 'Element count differs from v37',
      detail: `generated=${candPaths.length} v37=${goldPaths.length}`
    });
  }

  return summarize(1, findings);
}

// ────────────────────────────────────────────────────────────────────────────
//  Pass 2 — CE attribute completeness
// ────────────────────────────────────────────────────────────────────────────

/**
 * The FAERS engine rejects CE (coded-with-equivalents) elements that have
 * @code without @codeSystem. HL7 CS (coded-simple) elements draw from a
 * fixed HL7 enumeration and do NOT require @codeSystem — skip those.
 */
const CS_ONLY_ELEMENTS = new Set([
  'responseModeCode',
  'processingCode',
  'processingModeCode',
  'acceptAckCode',
  'statusCode',
  'priorityCode',
  'confidentialityCode',
  'routeCode'
]);

function runPass2(candidate: XmlNode): { summary: PassSummary; findings: ValidatorFinding[] } {
  const findings: ValidatorFinding[] = [];
  walk(candidate, (n) => {
    if (CS_ONLY_ELEMENTS.has(n.name)) return;
    const hasCode = 'code' in n.attrs && n.attrs.code.length > 0;
    const hasNullFlavor = 'nullFlavor' in n.attrs;
    if (hasCode && !hasNullFlavor && !('codeSystem' in n.attrs)) {
      findings.push({
        pass: 2,
        severity: 'error',
        label: 'CE element missing @codeSystem',
        detail: `<${n.name} code="${n.attrs.code}"> has no codeSystem attribute`,
        path: n.path
      });
    }
  });
  return summarize(2, findings);
}

// ────────────────────────────────────────────────────────────────────────────
//  Pass 3 — business-rule code validity (empirical policy)
// ────────────────────────────────────────────────────────────────────────────

/**
 * For each policy field (race, ethnicity, med hx, C49489 outcome, ICH outcome),
 * locate the observation block whose @code matches `observationCode`, then
 * inspect its `value` child — a CE — for the @code value. Apply the empirical
 * policy: rejections become errors, untested-but-NI-rejecting fields warn, and
 * proven-safe values are silent.
 */
function runPass3(
  candidate: XmlNode,
  caseType?: 'postmarket' | 'ind' | 'babe'
): { summary: PassSummary; findings: ValidatorFinding[] } {
  const findings: ValidatorFinding[] = [];

  // IND structural checks — run FIRST so errors surface before the empirical
  // policy sweep's warnings. These verify the XML matches what the generator
  // is supposed to emit for IND / BA-BE cases (rather than what ACK3s have
  // proven safe/rejected, which is what FAERS_POLICY covers below). Both
  // caseType flavours share the same researchStudy / C.1.3=2 emission, so
  // the checks apply to either.
  if (caseType === 'ind' || caseType === 'babe') {
    findings.push(...indStructuralChecks(candidate));
  }

  for (const field of Object.values(FAERS_POLICY)) {
    const observations = findObservations(candidate, field.observationCode);
    if (observations.length === 0) {
      // Not every case has every field (e.g. medical history code=18 is
      // optional). Only note it at info severity.
      findings.push({
        pass: 3,
        severity: 'info',
        label: `No observation found for ${field.label}`,
        detail: `No <observation> with code="${field.observationCode}" (tag ${field.tag})`
      });
      continue;
    }

    for (const obs of observations) {
      const value = obs.children.find((c) => c.name === 'value');
      if (!value) continue;

      // Med history (D.7.2) is a text observation, not a coded CE. Special-case
      // it: the rule is "must not be nullFlavor", any non-empty text is safe.
      if (field.observationCode === '18') {
        const isNull = 'nullFlavor' in value.attrs;
        if (isNull && field.rejectsNullFlavorNI) {
          findings.push({
            pass: 3,
            severity: 'error',
            label: `${field.label} uses nullFlavor (proven rejected)`,
            detail: `${field.tag} requires actual text content; nullFlavor="${value.attrs.nullFlavor}" was rejected in QTXZ/2GZK. Use "None reported" instead.`,
            path: obs.path
          });
        } else if (!isNull && !value.text.trim()) {
          findings.push({
            pass: 3,
            severity: 'warning',
            label: `${field.label} is empty`,
            detail: `${field.tag} has no text content`,
            path: obs.path
          });
        }
        continue;
      }

      // Standard CE check: inspect @code.
      const isNull = 'nullFlavor' in value.attrs;
      if (isNull) {
        if (field.rejectsNullFlavorNI && value.attrs.nullFlavor === 'NI') {
          findings.push({
            pass: 3,
            severity: 'error',
            label: `${field.label} uses nullFlavor="NI" (proven rejected)`,
            detail: `Tag ${field.tag} was rejected by FAERS 2.18 for nullFlavor="NI" (QTXZ, 2GZK). Use a real NCI code — e.g. "C41260" for race.`,
            path: obs.path
          });
        } else {
          findings.push({
            pass: 3,
            severity: 'warning',
            label: `${field.label} uses nullFlavor (untested)`,
            detail: `Tag ${field.tag} with nullFlavor="${value.attrs.nullFlavor}" has not been tested against FAERS 2.18 — prefer a proven code.`,
            path: obs.path
          });
        }
        continue;
      }

      const code = value.attrs.code;
      if (!code) {
        findings.push({
          pass: 3,
          severity: 'error',
          label: `${field.label} has no @code`,
          detail: `<value> under ${field.tag} has no code attribute`,
          path: obs.path
        });
        continue;
      }

      const verdict = classifyValue(field, code);
      if (verdict === 'proven_rejected') {
        const entry = field.entries.find((e) => e.value === code);
        findings.push({
          pass: 3,
          severity: 'error',
          label: `${field.label} uses proven-rejected code`,
          detail: `code="${code}" — ${entry?.evidence ?? 'previously rejected'}. For ${field.tag}, use a proven-safe value.`,
          path: obs.path
        });
      } else if (verdict === 'untested') {
        findings.push({
          pass: 3,
          severity: 'warning',
          label: `${field.label} uses untested code`,
          detail: `code="${code}" has no prior ACK3 evidence. Proven-safe values: ${proveSafeList(field)}.`,
          path: obs.path
        });
      }
    }
  }

  return summarize(3, findings);
}

function findObservations(root: XmlNode, observationCode: string): XmlNode[] {
  const hits: XmlNode[] = [];
  walk(root, (n) => {
    if (n.name !== 'observation') return;
    const codeEl = n.children.find((c) => c.name === 'code');
    if (codeEl?.attrs.code === observationCode) hits.push(n);
  });
  return hits;
}

/**
 * Structural checks specific to IND / SUSAR emission (spec §5.4).
 *
 * Unlike the empirical-policy sweep, these are "the generator was supposed
 * to emit X here" checks. They catch regressions — e.g. someone changes
 * the C.1.3 switch and postmarket code leaks into an IND XML — long before
 * the FDA sees the submission.
 *
 * Run only when caseType === 'ind'. Each check emits at most one error.
 */
function indStructuralChecks(root: XmlNode): ValidatorFinding[] {
  const findings: ValidatorFinding[] = [];

  // C.1.3 — Report type. The investigationCharacteristic with
  // <code code="1" .../> carries the type-of-report value. For IND it
  // must be "2" (Report from study); postmarket is "1" (Spontaneous).
  const ichReportObs = findInvestigationCharacteristic(root, '1');
  if (!ichReportObs) {
    findings.push({
      pass: 3,
      severity: 'error',
      label: 'IND: missing C.1.3 ICH ReportType observation'
    });
  } else {
    const val = ichReportObs.children.find((c) => c.name === 'value');
    if (val?.attrs.code !== '2') {
      findings.push({
        pass: 3,
        severity: 'error',
        label: 'IND: C.1.3 must be code="2" (Report from study)',
        detail: `got code="${val?.attrs.code ?? '(missing)'}"`,
        path: ichReportObs.path
      });
    }
  }

  // C.5.4 — Study type. The researchStudy block's direct <code> child
  // must have code="1" (Clinical trials) per SUSAR §2.
  const researchStudy = findFirstDescendant(root, 'researchStudy');
  if (!researchStudy) {
    findings.push({
      pass: 3,
      severity: 'error',
      label: 'IND: missing <researchStudy> block'
    });
  } else {
    const code = researchStudy.children.find((c) => c.name === 'code');
    if (code?.attrs.code !== '1') {
      findings.push({
        pass: 3,
        severity: 'error',
        label: 'IND: researchStudy C.5.4 must be code="1" (Clinical trials)',
        detail: `got code="${code?.attrs.code ?? '(missing)'}"`,
        path: researchStudy.path
      });
    }
  }

  // G.k.10a.r — FDAAddDrugInformation. Only validate when present; not
  // every IND case is BA/BE. Accept code="1" (Test), code="2" (Reference),
  // or nullFlavor="NA".
  const fdaAddDrugObservations = findObservations(root, '9')
    .filter((n) => {
      const code = n.children.find((c) => c.name === 'code');
      return code?.attrs.displayName === 'FDAAddDrugInformation';
    });
  for (const obs of fdaAddDrugObservations) {
    const val = obs.children.find((c) => c.name === 'value');
    if (!val) continue;
    const hasNullNa = val.attrs.nullFlavor === 'NA';
    const isValidCode = val.attrs.code === '1' || val.attrs.code === '2';
    if (!hasNullNa && !isValidCode) {
      findings.push({
        pass: 3,
        severity: 'error',
        label: 'IND: G.k.10a.r must be code 1/2 or nullFlavor="NA"',
        detail: `got code="${val.attrs.code ?? '(none)'}" nullFlavor="${val.attrs.nullFlavor ?? '(none)'}"`,
        path: obs.path
      });
    }
  }

  return findings;
}

/**
 * Find the investigationCharacteristic observation inside the document
 * whose <code> child carries the given `@code` attribute. Used for the
 * C.1.3 lookup (`code="1"`) and similar ICH-level characteristics.
 */
function findInvestigationCharacteristic(root: XmlNode, codeValue: string): XmlNode | null {
  let hit: XmlNode | null = null;
  walk(root, (n) => {
    if (hit || n.name !== 'investigationCharacteristic') return;
    const codeEl = n.children.find((c) => c.name === 'code');
    if (codeEl?.attrs.code === codeValue) hit = n;
  });
  return hit;
}

function findFirstDescendant(root: XmlNode, name: string): XmlNode | null {
  let hit: XmlNode | null = null;
  walk(root, (n) => {
    if (hit || n.name !== name) return;
    hit = n;
  });
  return hit;
}

function proveSafeList(f: FieldPolicy): string {
  const safe = f.entries.filter((e) => e.verdict === 'proven_safe').map((e) => e.value);
  return safe.length > 0 ? safe.map((v) => `"${v}"`).join(', ') : '(none yet)';
}

// ────────────────────────────────────────────────────────────────────────────
//  Pass 4 — value-level diff vs v37  +  Pass 5 — empirical safety check
// ────────────────────────────────────────────────────────────────────────────

/**
 * Categories for divergences the validator deliberately expects (and thus
 * doesn't report as findings). Each case has a unique case ID, unique UUIDs, a
 * fresh creation timestamp, and usually a different reporter identity, so
 * those aren't interesting divergences.
 */
const EXPECTED_DIVERGENCE_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  // UUIDs / batch IDs
  { pattern: /DeepQuence(?:Test)?-\d{8}-/i, category: 'batch-id' },
  {
    pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
    category: 'uuid'
  },
  // HL7 timestamps (YYYYMMDDhhmmss±tz or just YYYYMMDD)
  { pattern: /^\d{8}(\d{6})?([+-]\d{4})?$/, category: 'timestamp' },
  { pattern: /^\d{4}-\d{2}-\d{2}/, category: 'iso-timestamp' },
  // Case ID markers
  { pattern: /CASE-\d{8}-[A-Z0-9]{4}/, category: 'case-id' },
  { pattern: /SR-CASE-\d{8}-[A-Z0-9]{4}/, category: 'safety-report-id' }
];

function categorizeDivergence(generatedValue: string, v37Value: string, path: string): string {
  for (const { pattern, category } of EXPECTED_DIVERGENCE_PATTERNS) {
    if (pattern.test(generatedValue) || pattern.test(v37Value)) return category;
  }
  // Reporter block — name, address, telecom are expected to vary.
  if (/subjectOf1|controlActEvent|author|assignedPerson|representedOrganization|telecom|addr/i.test(path)) {
    return 'reporter';
  }
  return 'content';
}

interface Divergence {
  path: string;
  kind: 'attr' | 'text';
  attrName?: string;
  generatedValue: string;
  v37Value: string;
}

function collectDivergences(candidate: XmlNode, golden: XmlNode): Divergence[] {
  const divs: Divergence[] = [];
  const candIndex = new Map<string, XmlNode>();
  walk(candidate, (n) => candIndex.set(n.path, n));
  walk(golden, (g) => {
    const c = candIndex.get(g.path);
    if (!c) return; // handled by pass 1
    // Attributes
    const allAttrNames = new Set([...Object.keys(g.attrs), ...Object.keys(c.attrs)]);
    for (const a of allAttrNames) {
      const gv = g.attrs[a] ?? '';
      const cv = c.attrs[a] ?? '';
      if (gv !== cv) {
        divs.push({ path: g.path, kind: 'attr', attrName: a, generatedValue: cv, v37Value: gv });
      }
    }
    // Text
    if (g.text !== c.text) {
      divs.push({ path: g.path, kind: 'text', generatedValue: c.text, v37Value: g.text });
    }
  });
  return divs;
}

function runPass4and5(
  candidate: XmlNode,
  golden: XmlNode | null
): {
  p4: { summary: PassSummary; findings: ValidatorFinding[] };
  p5: {
    summary: PassSummary;
    findings: ValidatorFinding[];
    safety: { proven_safe: number; proven_rejected: number; untested: number };
  };
} {
  if (!golden) {
    const skipReason = 'v37 reference not found';
    return {
      p4: {
        summary: { ran: false, skipReason, errors: 0, warnings: 0 },
        findings: []
      },
      p5: {
        summary: { ran: false, skipReason, errors: 0, warnings: 0 },
        findings: [],
        safety: { proven_safe: 0, proven_rejected: 0, untested: 0 }
      }
    };
  }

  const divergences = collectDivergences(candidate, golden);
  const p4Findings: ValidatorFinding[] = [];
  const p5Findings: ValidatorFinding[] = [];
  const safety = { proven_safe: 0, proven_rejected: 0, untested: 0 };

  for (const d of divergences) {
    const category = categorizeDivergence(d.generatedValue, d.v37Value, d.path);
    const label = d.kind === 'attr'
      ? `@${d.attrName} differs vs v37`
      : 'text content differs vs v37';
    const detail = `[${category}] generated="${truncate(d.generatedValue)}" v37="${truncate(d.v37Value)}"`;

    // Pass 4: report every divergence once at info severity, except content
    // which we bump to warning — content is the bucket that needs safety
    // classification in pass 5.
    p4Findings.push({
      pass: 4,
      severity: category === 'content' ? 'warning' : 'info',
      label,
      detail,
      path: d.path
    });

    // Pass 5 only examines content divergences — the others are expected.
    if (category !== 'content') continue;

    const verdict = classifyContentDivergence(d);
    if (verdict === 'proven_safe') {
      safety.proven_safe++;
      p5Findings.push({
        pass: 5,
        severity: 'info',
        label: 'Content divergence is proven safe',
        detail,
        path: d.path
      });
    } else if (verdict === 'proven_rejected') {
      safety.proven_rejected++;
      p5Findings.push({
        pass: 5,
        severity: 'error',
        label: 'Content divergence is proven rejected',
        detail,
        path: d.path
      });
    } else {
      safety.untested++;
      p5Findings.push({
        pass: 5,
        severity: 'warning',
        label: 'Content divergence is untested',
        detail: `${detail} — never submitted to ZZFDATST. Rule: never combine multiple untested changes in one submission.`,
        path: d.path
      });
    }
  }

  return {
    p4: summarize(4, p4Findings),
    p5: { ...summarize(5, p5Findings), safety }
  };
}

function truncate(s: string, limit = 80): string {
  if (s.length <= limit) return s;
  return s.slice(0, limit) + '…';
}

/**
 * Classify a content divergence against the empirical policy. Only the
 * attribute-on-observation-value case has enough signal to give a definitive
 * verdict; other content divergences stay `untested` until we see them in a
 * real ACK.
 */
function classifyContentDivergence(d: Divergence): PolicyVerdict {
  if (d.kind !== 'attr' || d.attrName !== 'code') return 'untested';
  // Check every policy field — if the divergent code maps to a known verdict
  // (safe or rejected), return it.
  for (const field of Object.values(FAERS_POLICY)) {
    const verdict = classifyValue(field, d.generatedValue);
    if (verdict !== 'untested') return verdict;
  }
  return 'untested';
}

// ────────────────────────────────────────────────────────────────────────────
//  Entrypoint
// ────────────────────────────────────────────────────────────────────────────

function summarize(
  _pass: 1 | 2 | 3 | 4 | 5,
  findings: ValidatorFinding[]
): { summary: PassSummary; findings: ValidatorFinding[] } {
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  return { summary: { ran: true, errors, warnings }, findings };
}

export interface FivePassOptions {
  /** Explicit v37 path — used by tests to avoid the Electron path lookup. */
  v37Path?: string | null;
  /** Inline v37 XML — bypasses filesystem lookup entirely. */
  v37Xml?: string;
  /**
   * Case type. When `'ind'`, passes that compare against the v37 postmarket
   * golden XML (1, 4, 5) are skipped with a reason rather than run — v37
   * is Scenario-7-shaped and does not model the SUSAR `<researchStudy>`
   * block or IND routing. Pass 2/3 still run. A dedicated IND golden
   * XML + empirical policy table land once the first ZZFDA_PREMKT ACK3
   * confirms an accepted baseline.
   */
  caseType?: 'postmarket' | 'ind' | 'babe';
}

export function runFivePassValidation(xml: string, opts: FivePassOptions = {}): FivePassResult {
  if (!xml || xml.trim().length === 0) {
    return emptyResult('Empty generated XML');
  }

  // Load v37 reference (null if not available — passes 1/4/5 skip).
  // `v37Path: null` means "explicitly skip the reference" (used by tests),
  // which is distinct from the field being absent (use the resolver).
  let goldenXml: string | null = null;
  if (opts.v37Xml) {
    goldenXml = opts.v37Xml;
  } else {
    const pathExplicit = 'v37Path' in opts;
    const path = pathExplicit ? opts.v37Path : resolveGoldenV37Path();
    if (path && existsSync(path)) {
      try {
        goldenXml = readFileSync(path, 'utf-8');
      } catch {
        goldenXml = null;
      }
    }
  }

  let candidate: XmlNode;
  try {
    candidate = parseXml(xml);
  } catch (e) {
    return emptyResult(`Failed to parse generated XML: ${(e as Error).message}`);
  }

  let golden: XmlNode | null = null;
  if (goldenXml) {
    try {
      golden = parseXml(goldenXml);
    } catch {
      golden = null;
    }
  }

  // Premarket cases (both IND SUSAR and IND-Exempt BA/BE) can't be
  // compared against the v37 Scenario-7 golden — the researchStudy block
  // + different C.1.3 value legitimately change the element tree. Until
  // we have a confirmed-accepted IND / BA/BE baseline in test/golden/,
  // passes 1/4/5 are skipped with an explicit reason.
  const isPremarketCase = opts.caseType === 'ind' || opts.caseType === 'babe';
  const indSkip = isPremarketCase
    ? `${opts.caseType?.toUpperCase()} case — no golden reference yet (postmarket v37 diff would be noise)`
    : null;
  const p1 = indSkip
    ? { summary: { ran: false, skipReason: indSkip, errors: 0, warnings: 0 }, findings: [] as ValidatorFinding[] }
    : runPass1(candidate, golden);
  const p2 = runPass2(candidate);
  const p3 = runPass3(candidate, opts.caseType);
  const { p4, p5 } = indSkip
    ? {
        p4: { summary: { ran: false, skipReason: indSkip, errors: 0, warnings: 0 }, findings: [] as ValidatorFinding[] },
        p5: {
          summary: { ran: false, skipReason: indSkip, errors: 0, warnings: 0 },
          findings: [] as ValidatorFinding[],
          safety: { proven_safe: 0, proven_rejected: 0, untested: 0 }
        }
      }
    : runPass4and5(candidate, golden);

  const findings = [...p1.findings, ...p2.findings, ...p3.findings, ...p4.findings, ...p5.findings];
  const totalErrors = findings.filter((f) => f.severity === 'error').length;

  return {
    ran: true,
    pass: totalErrors === 0,
    passes: {
      p1_elementDiff: p1.summary,
      p2_ceCompleteness: p2.summary,
      p3_businessRules: p3.summary,
      p4_valueDiff: p4.summary,
      p5_empiricalSafety: p5.summary
    },
    findings,
    safety: p5.safety
  };
}

function emptyResult(reason: string): FivePassResult {
  const skip: PassSummary = { ran: false, skipReason: reason, errors: 0, warnings: 0 };
  return {
    ran: false,
    skipReason: reason,
    pass: false,
    passes: {
      p1_elementDiff: skip,
      p2_ceCompleteness: skip,
      p3_businessRules: skip,
      p4_valueDiff: skip,
      p5_empiricalSafety: skip
    },
    findings: [],
    safety: { proven_safe: 0, proven_rejected: 0, untested: 0 }
  };
}
