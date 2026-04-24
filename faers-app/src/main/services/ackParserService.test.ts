/**
 * Unit tests for the FDA ESG ACK parser.
 *
 * Uses real ACK XML captured from the ZZFDATST environment during the v1–2L8T
 * submission campaign. Fixtures live under `test/test_submission/acks/` at
 * repo root.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFdaAck, mapAckToEsgAckType } from './ackParserService';

const ACKS_DIR = resolve(__dirname, '../../../../test/test_submission/acks');

function read(name: string): string {
  return readFileSync(resolve(ACKS_DIR, name), 'utf-8');
}

describe('parseFdaAck', () => {
  it('parses the 2L8T CA+AA acceptance ACK', () => {
    const xml = read('ci260421211040.39a4bea3542d4f6081340d5c03a105f3.ack');
    const ack = parseFdaAck(xml);

    expect(ack.parsed).toBe(true);
    expect(ack.messageCode).toBe('CA');
    expect(ack.batchCode).toBe('AA');
    expect(ack.overall).toBe('accepted');
    expect(ack.targetMessageId).toBe('SR-CASE-20260421-2L8T');
    expect(ack.messageDetail).toMatch(/Report Loaded Successfully/i);
    expect(ack.rejections).toEqual([]);
    expect(mapAckToEsgAckType(ack)).toBe('ACK3');
  });

  it('parses a CR+AR rejection ACK and extracts field tags', () => {
    // This is one of the original v-series rejections with 13 C.3.x tags.
    const xml = read('ci260410020531.48c92c27ca4f49ec8019378f1bd50533.ack');
    const ack = parseFdaAck(xml);

    expect(ack.parsed).toBe(true);
    expect(ack.messageCode).toBe('CR');
    expect(ack.batchCode).toBe('AR');
    expect(ack.overall).toBe('rejected');
    expect(ack.targetMessageId).toBe('SR-CASE-20260331-EMJQ');

    // 13 rejections, tags C.3.4.3, C.3.4.5, C.3.3.2, C.3.4.2, C.3.4.6,
    // C.3.3.3, C.3.4.8, C.3.4.7, C.3.3.5, C.3.4.4, C.3.3.1, C.3.4.1, C.3.1
    expect(ack.rejections).toHaveLength(13);
    const tags = ack.rejections.map((r) => r.tag);
    expect(tags).toContain('C.3.4.3');
    expect(tags).toContain('C.3.3.5');
    expect(tags).toContain('C.3.1');
    // Indices should be 1..13 in order
    expect(ack.rejections.map((r) => r.index)).toEqual(
      Array.from({ length: 13 }, (_, i) => i + 1)
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
    const xml = read('ci260421211040.39a4bea3542d4f6081340d5c03a105f3.ack');
    const ack = parseFdaAck(xml);
    expect(ack.reportContext).toBeUndefined();
  });

  it('stamps reportContext on the result when supplied via options', () => {
    const xml = read('ci260421211040.39a4bea3542d4f6081340d5c03a105f3.ack');
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
