/**
 * ImportAckDialog — renderer component tests.
 *
 * Mocks the two preload methods the dialog uses: `showOpenDialog` for the
 * file picker and `esgParseAck` for the actual parse. No electron / fs
 * involvement — we verify the dialog orchestrates the right calls and
 * renders the right verdict for the two main outcome shapes (accepted +
 * rejected).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportAckDialog from './ImportAckDialog';
import type { ParsedAck } from '../../../shared/types/faersValidation.types';

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

interface MockAPI {
  showOpenDialog: ReturnType<typeof vi.fn>;
  esgParseAck: ReturnType<typeof vi.fn>;
}

function installMocks(api: Partial<MockAPI> = {}): MockAPI {
  const mocks: MockAPI = {
    showOpenDialog: vi.fn().mockResolvedValue({ success: true, data: null }),
    esgParseAck: vi.fn(),
    ...api
  };
  (window as unknown as { electronAPI: MockAPI }).electronAPI = mocks;
  return mocks;
}

const ACCEPTED: ParsedAck = {
  parsed: true,
  batchCode: 'AA',
  messageCode: 'CA',
  overall: 'accepted',
  targetMessageId: 'SR-CASE-20260421-2L8T',
  targetBatchId: 'DeepQuenceTest-20260421-abcdef',
  messageDetail: 'Report Loaded Successfully',
  batchDetail: 'Batch accepted',
  rejections: [],
  creationTime: '20260421171802-0400',
  batchNumber: '3230032234',
  localReportNumber: '839790'
};

const REJECTED: ParsedAck = {
  parsed: true,
  batchCode: 'AR',
  messageCode: 'CR',
  overall: 'rejected',
  targetMessageId: 'SR-CASE-20260331-EMJQ',
  targetBatchId: 'DeepQuenceTest-20260331-xyz',
  messageDetail: 'Safety report not loaded; Validated against 2.18 business rules',
  rejections: [
    { index: 1, tag: 'C.3.4.3', message: 'Data value required for tag C.3.4.3' },
    { index: 2, tag: 'FDA.D.11.r.1', message: 'Data value required for tag FDA.D.11.r.1' }
  ]
};

describe('ImportAckDialog', () => {
  it('does not render content when open=false', () => {
    installMocks();
    render(<ImportAckDialog open={false} onClose={() => {}} />);
    expect(screen.queryByText(/Import FDA Acknowledgment/)).not.toBeInTheDocument();
  });

  it('renders both "From file" and "Paste XML" tabs when open', () => {
    installMocks();
    render(<ImportAckDialog open={true} onClose={() => {}} />);
    expect(screen.getByText(/Import FDA Acknowledgment/)).toBeInTheDocument();
    // Tabs and their labels
    expect(screen.getByRole('tab', { name: /From file/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Paste XML/i })).toBeInTheDocument();
  });

  it('calls showOpenDialog and stores the selected path when the user picks a file', async () => {
    const user = userEvent.setup();
    const mocks = installMocks({
      showOpenDialog: vi
        .fn()
        .mockResolvedValue({ success: true, data: ['/tmp/fixtures/test.ack'] })
    });
    render(<ImportAckDialog open={true} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Choose file/i }));

    expect(mocks.showOpenDialog).toHaveBeenCalledTimes(1);
    const call = mocks.showOpenDialog.mock.calls[0][0];
    expect(call.properties).toContain('openFile');
    expect(call.filters.some((f: { extensions: string[] }) => f.extensions.includes('ack'))).toBe(
      true
    );
    // Selected path rendered
    await waitFor(() => expect(screen.getByText('/tmp/fixtures/test.ack')).toBeInTheDocument());
  });

  it('shows an error when the user clicks Parse without providing input', async () => {
    const user = userEvent.setup();
    installMocks();
    render(<ImportAckDialog open={true} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Parse ACK/i }));

    await waitFor(() =>
      expect(screen.getByText(/Provide either a file or paste XML/i)).toBeInTheDocument()
    );
  });

  it('sends pasted XML to esgParseAck and renders an ACCEPTED verdict', async () => {
    const user = userEvent.setup();
    const mocks = installMocks({
      esgParseAck: vi.fn().mockResolvedValue({ success: true, data: ACCEPTED })
    });
    render(<ImportAckDialog open={true} onClose={() => {}} />);

    // Switch to the paste tab and type in XML.
    await user.click(screen.getByRole('tab', { name: /Paste XML/i }));
    const textarea = await screen.findByPlaceholderText(/Paste the raw MCCI/i);
    await user.type(textarea, '<MCCI_IN200101UV01/>');

    await user.click(screen.getByRole('button', { name: /Parse ACK/i }));

    await waitFor(() => expect(mocks.esgParseAck).toHaveBeenCalledTimes(1));
    expect(mocks.esgParseAck).toHaveBeenCalledWith({ xml: '<MCCI_IN200101UV01/>' });

    // The Accepted verdict alert renders the target case + a positive summary.
    await waitFor(() =>
      expect(screen.getByText(/ACCEPTED — CA \+ AA received/i)).toBeInTheDocument()
    );
    expect(screen.getByText('SR-CASE-20260421-2L8T')).toBeInTheDocument();
  });

  it('renders a REJECTED verdict with the structured rejection list', async () => {
    const user = userEvent.setup();
    const mocks = installMocks({
      showOpenDialog: vi
        .fn()
        .mockResolvedValue({ success: true, data: ['/tmp/fixtures/reject.ack'] }),
      esgParseAck: vi.fn().mockResolvedValue({ success: true, data: REJECTED })
    });
    render(<ImportAckDialog open={true} onClose={() => {}} />);

    // Pick a file, then parse.
    await user.click(screen.getByRole('button', { name: /Choose file/i }));
    await waitFor(() =>
      expect(screen.getByText('/tmp/fixtures/reject.ack')).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: /Parse ACK/i }));

    await waitFor(() => expect(mocks.esgParseAck).toHaveBeenCalledTimes(1));
    expect(mocks.esgParseAck).toHaveBeenCalledWith({ filePath: '/tmp/fixtures/reject.ack' });

    // Rejection summary + field tags show.
    await waitFor(() => expect(screen.getByText(/^REJECTED$/)).toBeInTheDocument());
    expect(screen.getByText('C.3.4.3')).toBeInTheDocument();
    expect(screen.getByText('FDA.D.11.r.1')).toBeInTheDocument();
    expect(screen.getByText(/Rejections \(2\)/i)).toBeInTheDocument();
  });

  it('surfaces backend parse failures as an error alert', async () => {
    const user = userEvent.setup();
    installMocks({
      esgParseAck: vi.fn().mockResolvedValue({ success: false, error: 'kaboom' })
    });
    render(<ImportAckDialog open={true} onClose={() => {}} />);

    await user.click(screen.getByRole('tab', { name: /Paste XML/i }));
    const textarea = await screen.findByPlaceholderText(/Paste the raw MCCI/i);
    await user.type(textarea, '<x/>');
    await user.click(screen.getByRole('button', { name: /Parse ACK/i }));

    await waitFor(() => expect(screen.getByText(/Parse failed/i)).toBeInTheDocument());
    expect(screen.getByText('kaboom')).toBeInTheDocument();
  });

  it('fires onClose when the Close button is clicked', async () => {
    const user = userEvent.setup();
    installMocks();
    const onClose = vi.fn();
    render(<ImportAckDialog open={true} onClose={onClose} />);

    // antd's Modal adds its own X close button with aria-label "Close", so
    // getByRole matches two elements. Target the footer button by its
    // visible text content instead.
    await user.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fires onResult with the ParsedAck after a successful parse', async () => {
    const user = userEvent.setup();
    installMocks({
      esgParseAck: vi.fn().mockResolvedValue({ success: true, data: ACCEPTED })
    });
    const onResult = vi.fn();
    render(<ImportAckDialog open={true} onClose={() => {}} onResult={onResult} />);

    await user.click(screen.getByRole('tab', { name: /Paste XML/i }));
    const textarea = await screen.findByPlaceholderText(/Paste the raw MCCI/i);
    await user.type(textarea, '<x/>');
    await user.click(screen.getByRole('button', { name: /Parse ACK/i }));

    await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ overall: 'accepted' }));
  });
});
