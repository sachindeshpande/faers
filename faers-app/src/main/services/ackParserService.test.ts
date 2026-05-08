/**
 * Unit tests for the FDA ESG ACK parser.
 *
 * As of 2026-05-07 the source-of-truth ACK fixtures live under the curated
 * FDA-accepted/rejected golden set at `test/golden/`. The CA+AA fixture
 * is a confirmed-accepted postmarket ACK; the CR+AR fixture is one of the
 * three confirmed-rejected scenarios (TC-A03 — race code C41257 not in
 * the FDA codelist). See `test/golden/postmarket/{accepted,rejected}/`
 * and the FAERS_POLICY entries that record the per-value verdicts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFdaAck, mapAckToEsgAckType } from './ackParserService';

const ACCEPTED_DIR = resolve(__dirname, '../../../../test/golden/postmarket/accepted');
const REJECTED_DIR = resolve(__dirname, '../../../../test/golden/postmarket/rejected');

const CA_AA_FIXTURE = resolve(ACCEPTED_DIR, 'TC-A01-race-white.ack');
const CR_AR_FIXTURE = resolve(REJECTED_DIR, 'TC-A03-race-amerindian.ack');

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

describe('parseFdaAck', () => {
  it('parses a CA+AA acceptance ACK (TC-A01-race-white)', () => {
    const xml = read(CA_AA_FIXTURE);
    const ack = parseFdaAck(xml);

    expect(ack.parsed).toBe(true);
    expect(ack.messageCode).toBe('CA');
    expect(ack.batchCode).toBe('AA');
    expect(ack.overall).toBe('accepted');
    expect(ack.messageDetail).toMatch(/Report Loaded Successfully/i);
    expect(ack.rejections).toEqual([]);
    expect(mapAckToEsgAckType(ack)).toBe('ACK3');
  });

  it('parses a CR+AR rejection ACK and extracts field tags (TC-A03 — invalid race code)', () => {
    // TC-A03 race=C41257 (American Indian) was rejected with a single
    // FDA.D.11.r.1 tag — see test/golden/postmarket/rejected/.
    const xml = read(CR_AR_FIXTURE);
    const ack = parseFdaAck(xml);

    expect(ack.parsed).toBe(true);
    expect(ack.messageCode).toBe('CR');
    expect(ack.batchCode).toBe('AR');
    expect(ack.overall).toBe('rejected');
    expect(ack.rejections.length).toBeGreaterThanOrEqual(1);
    const tags = ack.rejections.map((r) => r.tag);
    expect(tags).toContain('FDA.D.11.r.1');
    // Indices are 1-based and sequential
    expect(ack.rejections.map((r) => r.index)).toEqual(
      ack.rejections.map((_, i) => i + 1)
    );

    expect(mapAckToEsgAckType(ack)).toBe('NACK');
  });

  it('handles empty input without throwing', () => {
    const ack = parseFdaAck('');
    expect(ack.parsed).toBe(false);
    expect(ack.parseError).toBe('Empty ACK payload');
    expect(ack.overall).toBe('unknown');
  });

  it('leaves reportContext undefined when no option is passed', () => {
    const xml = read(CA_AA_FIXTURE);
    const ack = parseFdaAck(xml);
    expect(ack.reportContext).toBeUndefined();
  });

  it('stamps reportContext on the result when supplied via options', () => {
    const xml = read(CA_AA_FIXTURE);
    expect(parseFdaAck(xml, { reportContext: 'postmarket' }).reportContext).toBe('postmarket');
    expect(parseFdaAck(xml, { reportContext: 'ind' }).reportContext).toBe('ind');
    expect(parseFdaAck(xml, { reportContext: 'babe' }).reportContext).toBe('babe');
  });

  it('extracts tag from embedded FAERS-D-r patterns (synthetic)', () => {
    const synthetic = `<?xml version="1.0"?>
      <MCCI_IN200101UV01 xmlns="urn:hl7-org:v3">
        <MCCI_IN000002UV01>
          <acknowledgement typeCode="CR">
            <targetMessage><id extension="SR-SYNTH-1"/></targetMessage>
            <acknowledgementDetail><text>Safety report not loaded; Validated against 2.18 business rules;
Rejections:
1: Data value required for tag FDA.D.11.r.1.
2: Data value required for tag FDA.D.12.
3: Data value required for tag D.7.2.
</text></acknowledgementDetail>
          </acknowledgement>
        </MCCI_IN000002UV01>
        <acknowledgement typeCode="AR">
          <targetBatch><id extension="BATCH-1"/></targetBatch>
          <acknowledgementDetail><text>Application Acknowledgment Reject</text></acknowledgementDetail>
        </acknowledgement>
      </MCCI_IN200101UV01>`;
    const ack = parseFdaAck(synthetic);
    expect(ack.messageCode).toBe('CR');
    expect(ack.batchCode).toBe('AR');
    const tags = ack.rejections.map((r) => r.tag);
    expect(tags).toEqual(['FDA.D.11.r.1', 'FDA.D.12', 'D.7.2']);
  });
});
