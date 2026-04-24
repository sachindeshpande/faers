/**
 * FDA ESG Acknowledgment Parser
 *
 * Parses the raw HL7 v3 MCCI_IN200101UV01 ACK envelope that lands in the ESG
 * mailbox after a FAERS ICSR submission. The envelope carries two independent
 * acknowledgments:
 *
 *   Outer (batch):   <acknowledgement typeCode="AA|AR"> inside MCCI_IN200101UV01
 *   Inner (message): <acknowledgement typeCode="CA|CR"> inside MCCI_IN000002UV01
 *
 * FAERS 2.18 reports rejections as a numbered list in the inner
 * acknowledgementDetail/text block, one rejection per line like
 * "1: Data value required for tag C.3.4.3." — we extract those tags so the
 * caller can show them to the user and feed them to the empirical policy.
 *
 * Deliberately regex-based (no DOM dep) to match the rest of this codebase and
 * to stay robust against minor whitespace / ordering differences across ACK
 * generations.
 */

import type {
  AckBatchCode,
  AckMessageCode,
  AckRejection,
  AckReportContext,
  ParsedAck
} from '../../shared/types/faersValidation.types';

export type { AckBatchCode, AckMessageCode, AckRejection, AckReportContext, ParsedAck };

export interface ParseFdaAckOptions {
  /**
   * Stamp the result with the originating submission's report type.
   * The ACK XML doesn't encode this; the caller (typically case-aware
   * code that triggered or is polling for the ACK) supplies it so that
   * downstream consumers can promote values in the right empirical-
   * policy table (FAERS_POLICY vs IND_POLICY).
   */
  reportContext?: AckReportContext;
}

/** Remove XML comments — they can contain our field-tag patterns and confuse matching. */
function stripComments(xml: string): string {
  return xml.replace(/<!--[\s\S]*?-->/g, '');
}

/** Pull an attribute value by name from a tag fragment. Returns undefined when missing. */
function attr(fragment: string, name: string): string | undefined {
  const m = fragment.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : undefined;
}

/**
 * Isolate the first occurrence of `<parent ...>...</parent>`, respecting
 * self-closing tags. Returns just the inner content (not the wrapper).
 * Null when the element is not found or is self-closing (no content).
 */
function sliceElement(xml: string, parent: string): string | null {
  const openRe = new RegExp(`<${parent}\\b([^>]*)>`);
  const openMatch = openRe.exec(xml);
  if (!openMatch) return null;
  const openEnd = openMatch.index + openMatch[0].length;
  // Self-closing: `<parent .../>` — no content.
  if (openMatch[0].endsWith('/>')) return '';
  const closeRe = new RegExp(`</${parent}>`);
  closeRe.lastIndex = openEnd;
  const closeMatch = closeRe.exec(xml.slice(openEnd));
  if (!closeMatch) return null;
  return xml.slice(openEnd, openEnd + closeMatch.index);
}

/**
 * Parse the numbered rejection list out of the inner acknowledgementDetail/text.
 * Shape (from a real FAERS 2.18 CR ACK):
 *
 *   Safety report not loaded; Validated against 2.18 business rules;
 *   Rejections:
 *   1: Data value required for tag C.3.4.3.
 *   2: Data value required for tag C.3.4.5.
 *
 * Also tolerates newer shapes where the tag reference is embedded in a sentence,
 * e.g. "1: Patient Race (FDA.D.11.r.1) must have a value".
 */
function parseRejections(text: string): AckRejection[] {
  const rejections: AckRejection[] = [];
  if (!text) return rejections;
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^(\d+)\s*[:.\-]\s*(.+?)\s*\.?$/);
    if (!m) continue;
    const index = Number(m[1]);
    const message = m[2];
    // Prefer the explicit "for tag X" clause; fall back to any E2B/FAERS tag
    // pattern anywhere in the message.
    let tag = '';
    const forTag = message.match(/for\s+tag\s+([A-Za-z0-9._]+(?:\.r)?(?:\.\d+)?)/i);
    if (forTag) {
      tag = forTag[1].replace(/\.$/, '');
    } else {
      const generic = message.match(/\b(FDA\.[A-Z]\.\d+(?:\.r\.\d+)?|[A-Z]\.\d+(?:\.\d+){0,3})\b/);
      if (generic) tag = generic[1];
    }
    rejections.push({ tag, message, index });
  }
  return rejections;
}

/**
 * Parse an FDA ESG ACK XML payload. Accepts either the outer batch envelope
 * (MCCI_IN200101UV01) or a bare inner message envelope (MCCI_IN000002UV01).
 *
 * Optional `opts.reportContext` stamps the result with the originating
 * submission's report type. When omitted, `reportContext` is undefined on
 * the returned object — downstream consumers should treat that as "context
 * unknown" rather than assume postmarket.
 */
export function parseFdaAck(xml: string, opts: ParseFdaAckOptions = {}): ParsedAck {
  const result: ParsedAck = {
    parsed: false,
    batchCode: null,
    messageCode: null,
    overall: 'unknown',
    rejections: [],
    reportContext: opts.reportContext
  };

  if (!xml || typeof xml !== 'string' || xml.trim().length === 0) {
    result.parseError = 'Empty ACK payload';
    return result;
  }

  const clean = stripComments(xml);

  // Batch-level creationTime, batch number (ACK.M.1), and local report number
  // are on the outer envelope but some gateways send just the inner — they're
  // best-effort and safe to miss.
  const ctMatch = clean.match(/<creationTime\s+value="([^"]+)"/);
  if (ctMatch) result.creationTime = ctMatch[1];

  // The outer envelope's top-level <id> sits before MCCI_IN000002UV01; pull it
  // off the first 500 chars to avoid grabbing an inner-message id.
  const head = clean.slice(0, Math.min(clean.length, 1500));
  const mciStart = head.indexOf('<MCCI_IN000002UV01');
  const headerZone = mciStart >= 0 ? head.slice(0, mciStart) : head;
  const outerIdMatch = headerZone.match(/<id\s+[^>]*\bextension="([^"]+)"/);
  if (outerIdMatch) result.batchNumber = outerIdMatch[1];

  // Inner message envelope. Its first <id>@extension is the FDA local report
  // number (ACK.B.r.2 per the sample).
  const innerMsg = sliceElement(clean, 'MCCI_IN000002UV01');
  if (innerMsg !== null) {
    const innerIdMatch = innerMsg.match(/<id\s+[^>]*\bextension="([^"]+)"/);
    if (innerIdMatch) result.localReportNumber = innerIdMatch[1];

    // Walk each <acknowledgement> block inside the inner message. In practice
    // there's only one, but the XPath allows multiple and we don't want to
    // silently pick the wrong one.
    const ackBlocks = splitTopLevel(innerMsg, 'acknowledgement');
    for (const block of ackBlocks) {
      const openTag = block.match(/<acknowledgement\b[^>]*>/)?.[0] ?? '';
      const code = attr(openTag, 'typeCode');
      if (code === 'CA' || code === 'CR') {
        result.messageCode = code as AckMessageCode;
        const body = sliceElement(block, 'acknowledgement') ?? '';
        const targetId = body.match(/<targetMessage>\s*<id\s+[^>]*\bextension="([^"]+)"/);
        if (targetId) result.targetMessageId = targetId[1];
        const detailText = extractDetailText(body);
        if (detailText) {
          result.messageDetail = firstLine(detailText);
          result.rejections = parseRejections(detailText);
        }
      }
    }
  }

  // Outer envelope's batch-level acknowledgement (after the inner message).
  // Restrict to the tail of the document so we don't collide with an inner ack.
  const tail = mciStart >= 0
    ? clean.slice(clean.indexOf('</MCCI_IN000002UV01>') + '</MCCI_IN000002UV01>'.length)
    : '';
  if (tail) {
    const outerAck = tail.match(/<acknowledgement\b([^>]*)>([\s\S]*?)<\/acknowledgement>/);
    if (outerAck) {
      const code = attr('<acknowledgement' + outerAck[1] + '>', 'typeCode');
      if (code === 'AA' || code === 'AR') {
        result.batchCode = code as AckBatchCode;
        const body = outerAck[2];
        const batchId = body.match(/<targetBatch>\s*<id\s+[^>]*\bextension="([^"]+)"/);
        if (batchId) result.targetBatchId = batchId[1];
        const detailText = extractDetailText(body);
        if (detailText) result.batchDetail = firstLine(detailText);
      }
    }
  }

  // Overall verdict: accepted requires *both* inner CA and outer AA. Anything
  // else with at least one explicit code is a rejection for case-tracking.
  if (result.messageCode === 'CA' && result.batchCode === 'AA') {
    result.overall = 'accepted';
  } else if (result.messageCode || result.batchCode) {
    result.overall = 'rejected';
  }

  result.parsed = true;
  return result;
}

/** Pull out <acknowledgementDetail><text>…</text></acknowledgementDetail>. */
function extractDetailText(xml: string): string | undefined {
  const detail = sliceElement(xml, 'acknowledgementDetail');
  if (detail === null) return undefined;
  const text = sliceElement(detail, 'text');
  if (text === null) return undefined;
  return decodeXmlEntities(text);
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function firstLine(s: string): string {
  return s.split(/\r?\n/)[0].trim();
}

/**
 * Return every top-level `<name …>…</name>` block inside a fragment. Naive but
 * sufficient because FAERS ACKs never nest a given block inside itself.
 */
function splitTopLevel(xml: string, name: string): string[] {
  const out: string[] = [];
  const openRe = new RegExp(`<${name}\\b[^>]*>`, 'g');
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(xml)) !== null) {
    if (match[0].endsWith('/>')) {
      out.push(match[0]);
      continue;
    }
    const closeIdx = xml.indexOf(`</${name}>`, match.index + match[0].length);
    if (closeIdx < 0) break;
    out.push(xml.slice(match.index, closeIdx + `</${name}>`.length));
  }
  return out;
}

/**
 * Map the FDA ACK codes to the cooked `EsgAckType` the rest of the app already
 * uses. Provided here (rather than on the consumer side) so there's a single
 * source of truth for the mapping.
 *
 *   CA + AA  → ACK3  (loaded successfully; FAERS considers it accepted)
 *   CR or AR → NACK  (rejected at either layer)
 *   Otherwise → NACK (safe default; caller can treat as unknown)
 */
export function mapAckToEsgAckType(parsed: ParsedAck): 'ACK3' | 'NACK' {
  return parsed.overall === 'accepted' ? 'ACK3' : 'NACK';
}
