/**
 * FivePassValidatorPanel — renderer component tests.
 *
 * window.electronAPI is mocked per-test; we only need the single method
 * the panel actually calls (`esgFivePassValidate`). Selectors lean on
 * roles/exact text because antd wraps many elements in additional nodes
 * (icons get aria-labels, Tags add wrappers) so fuzzy matching
 * over-selects.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Registers jest-dom matchers like toBeInTheDocument / toHaveTextContent
// on vitest's expect. Required because the project's root vitest setup
// (src/test/setup.ts) is main-oriented and doesn't load jest-dom.
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FivePassValidatorPanel from './FivePassValidatorPanel';
import type { FivePassResult } from '../../../shared/types/faersValidation.types';

// antd's Modal / motion stack needs these browser APIs under jsdom.
beforeEach(() => {
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
});

/** Build a minimal FivePassResult with per-pass summaries set to clean-pass defaults. */
function makeResult(overrides: Partial<FivePassResult> = {}): FivePassResult {
  const clean = { ran: true, errors: 0, warnings: 0 };
  return {
    ran: true,
    pass: true,
    passes: {
      p1_elementDiff: { ...clean },
      p2_ceCompleteness: { ...clean },
      p3_businessRules: { ...clean },
      p4_valueDiff: { ...clean },
      p5_empiricalSafety: { ...clean }
    },
    findings: [],
    safety: { proven_safe: 0, proven_rejected: 0, untested: 0 },
    ...overrides
  };
}

function mockValidate(result: FivePassResult | { success: false; error: string }) {
  const fn = vi.fn().mockResolvedValue(
    'success' in result && result.success === false
      ? { success: false, error: result.error }
      : { success: true, data: result }
  );
  (window as unknown as { electronAPI: Record<string, unknown> }).electronAPI = {
    esgFivePassValidate: fn
  };
  return fn;
}

describe('FivePassValidatorPanel', () => {
  it('renders a PASS badge when all passes are clean', async () => {
    mockValidate(makeResult());
    render(<FivePassValidatorPanel caseId="CASE-1" />);

    // The overall-verdict badge renders the exact literal "PASS" (not
    // the case-insensitive /pass/i which also matches "All passes clean").
    await waitFor(() =>
      expect(screen.getByText('PASS', { selector: 'span' })).toBeInTheDocument()
    );
    // All five traffic lights render by their P1..P5 labels.
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P5')).toBeInTheDocument();
    // Card title is "5-Pass Validator"
    expect(screen.getByText(/5-Pass Validator/)).toBeInTheDocument();
  });

  it('renders a FAIL badge and lists errors when a pass reports errors', async () => {
    const result = makeResult({
      pass: false,
      passes: {
        p1_elementDiff: { ran: true, errors: 0, warnings: 0 },
        p2_ceCompleteness: { ran: true, errors: 0, warnings: 0 },
        p3_businessRules: { ran: true, errors: 1, warnings: 0 },
        p4_valueDiff: { ran: true, errors: 0, warnings: 0 },
        p5_empiricalSafety: { ran: true, errors: 0, warnings: 0 }
      },
      findings: [
        {
          pass: 3,
          severity: 'error',
          label: 'Patient Race uses proven-rejected code',
          detail: 'code="C17998" — 26ZL ACK3 rejection.',
          path: '/some/path'
        }
      ]
    });
    mockValidate(result);
    render(<FivePassValidatorPanel caseId="CASE-REJECT" />);

    await waitFor(() =>
      expect(screen.getByText('FAIL', { selector: 'span' })).toBeInTheDocument()
    );
    expect(screen.getByText(/Errors \(1\)/)).toBeInTheDocument();
  });

  it('fires onResult with the parsed validator result', async () => {
    const result = makeResult();
    mockValidate(result);
    const onResult = vi.fn();
    render(<FivePassValidatorPanel caseId="CASE-1" onResult={onResult} />);

    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ pass: true }));
  });

  it('shows an error alert and retry button when the IPC call reports failure', async () => {
    const user = userEvent.setup();
    const fn = mockValidate({ success: false, error: 'Boom' });
    render(<FivePassValidatorPanel caseId="CASE-1" />);

    // The error path renders an antd Alert — poll for the retry button which
    // only exists in that branch.
    const retryBtn = await screen.findByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();

    // Success on the retry — panel should flip to the PASS state.
    fn.mockResolvedValueOnce({ success: true, data: makeResult() });
    await user.click(retryBtn);
    await waitFor(() =>
      expect(screen.getByText('PASS', { selector: 'span' })).toBeInTheDocument()
    );
  });

  it('re-runs validation when the Re-run button is clicked', async () => {
    const user = userEvent.setup();
    const fn = mockValidate(makeResult());
    render(<FivePassValidatorPanel caseId="CASE-1" />);

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await user.click(await screen.findByRole('button', { name: /Re-run/i }));
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
  });

  it('in compact mode, renders only traffic lights without the findings card', async () => {
    mockValidate(
      makeResult({
        findings: [
          {
            pass: 2,
            severity: 'error',
            label: 'CE element missing @codeSystem',
            detail: 'detail text',
            path: '/x'
          }
        ],
        pass: false
      })
    );
    const { container } = render(<FivePassValidatorPanel caseId="CASE-1" compact />);

    // Traffic lights still render; findings / card wrapper do not.
    await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument());
    expect(within(container).queryByText(/Errors \(\d+\)/)).not.toBeInTheDocument();
    expect(within(container).queryByText(/5-Pass Validator/)).not.toBeInTheDocument();
    expect(within(container).queryByRole('button', { name: /Re-run/i })).not.toBeInTheDocument();
  });

  it('does not call the IPC when caseId is null', () => {
    const fn = mockValidate(makeResult());
    render(<FivePassValidatorPanel caseId={null} />);
    expect(fn).not.toHaveBeenCalled();
  });
});
