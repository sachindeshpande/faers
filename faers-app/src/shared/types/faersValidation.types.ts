/**
 * Shared types for the FAERS pre-submission validator stack:
 *   - ACK parser result (`ParsedAck`)
 *   - 5-pass empirical validator result (`FivePassResult`)
 *
 * These types cross the main/renderer boundary via IPC, so they live here
 * rather than in `src/main/services/`. The main-side service files import
 * from this module — the renderer side does too, via the ElectronAPI
 * contract in `ipc.types.ts`.
 */

// ────────────────────────────────────────────────────────────────────────────
//  ACK parser
// ────────────────────────────────────────────────────────────────────────────

/** Outer (batch) acknowledgement code. AA = accept, AR = reject. */
export type AckBatchCode = 'AA' | 'AR';

/** Inner (ICSR message) acknowledgement code. CA = accept, CR = reject. */
export type AckMessageCode = 'CA' | 'CR';

export interface AckRejection {
  /** E2B / FAERS field tag, e.g. `C.3.4.3`, `D.7.2`, `FDA.D.11.r.1`. */
  tag: string;
  /** Full rejection text. */
  message: string;
  /** 1-based index as listed in the ACK. */
  index: number;
}

/**
 * Originating report type for a parsed ACK. The ACK XML itself does not
 * carry this information — it comes from the caller, who typically knows
 * the case / submission that produced the acknowledgment. Used downstream
 * to route empirical-policy promotions to the right table (FAERS_POLICY
 * for postmarket, IND_POLICY for IND). Absent when the caller parsed an
 * ACK blind (e.g. the GUI's Import ACK dialog without linking to a case).
 */
export type AckReportContext = 'postmarket' | 'ind' | 'babe';

export interface ParsedAck {
  parsed: boolean;
  parseError?: string;
  batchCode: AckBatchCode | null;
  messageCode: AckMessageCode | null;
  overall: 'accepted' | 'rejected' | 'unknown';
  targetMessageId?: string;
  targetBatchId?: string;
  messageDetail?: string;
  batchDetail?: string;
  rejections: AckRejection[];
  creationTime?: string;
  batchNumber?: string;
  localReportNumber?: string;
  /** See `AckReportContext`. Optional — absent when the ACK was parsed
   *  without knowledge of the originating submission. */
  reportContext?: AckReportContext;
}

// ────────────────────────────────────────────────────────────────────────────
//  5-pass validator
// ────────────────────────────────────────────────────────────────────────────

export type ValidatorSeverity = 'error' | 'warning' | 'info';

export interface ValidatorFinding {
  pass: 1 | 2 | 3 | 4 | 5;
  severity: ValidatorSeverity;
  label: string;
  detail?: string;
  path?: string;
}

export interface PassSummary {
  ran: boolean;
  skipReason?: string;
  errors: number;
  warnings: number;
}

export interface FivePassResult {
  ran: boolean;
  skipReason?: string;
  pass: boolean;
  passes: {
    p1_elementDiff: PassSummary;
    p2_ceCompleteness: PassSummary;
    p3_businessRules: PassSummary;
    p4_valueDiff: PassSummary;
    p5_empiricalSafety: PassSummary;
  };
  findings: ValidatorFinding[];
  safety: {
    proven_safe: number;
    proven_rejected: number;
    untested: number;
  };
}
