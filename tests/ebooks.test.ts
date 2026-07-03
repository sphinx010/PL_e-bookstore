import './setup';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db/client', () => ({ db: { storage: { from: vi.fn() } } }));

const mockGetByTokenHash = vi.fn();
const mockIncrement = vi.fn();

vi.mock('../lib/db/queries/ebook-entitlements', () => ({
  getEntitlementByTokenHash: (...a: unknown[]) => mockGetByTokenHash(...a),
  incrementDownloadCount:    (...a: unknown[]) => mockIncrement(...a),
}));

function makeEntitlement(overrides: Record<string, unknown> = {}) {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  return {
    id: 'ent-uuid-1',
    order_id: 'order-uuid-1',
    customer_email: 'buyer@example.com',
    storage_path: 'test-ebook.pdf',
    download_token_hash: 'hashed-token',
    expires_at: future,
    maximum_downloads: 5,
    download_count: 0,
    revoked_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  mockGetByTokenHash.mockReset();
  mockIncrement.mockReset();
});

describe('E-book entitlement', () => {
  it('authorises a valid download and increments counter', async () => {
    const ent = makeEntitlement();
    mockGetByTokenHash.mockResolvedValue(ent);
    mockIncrement.mockResolvedValue({ ...ent, download_count: 1 });

    const { authoriseDownload } = await import('../lib/ebooks/entitlement');
    const result = await authoriseDownload('raw-test-token');

    expect(result.storagePath).toBe('test-ebook.pdf');
    expect(result.entitlementId).toBe('ent-uuid-1');
    expect(mockIncrement).toHaveBeenCalledWith('ent-uuid-1');
  });

  it('rejects an expired token', async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    mockGetByTokenHash.mockResolvedValue(makeEntitlement({ expires_at: past }));

    const { authoriseDownload } = await import('../lib/ebooks/entitlement');
    await expect(authoriseDownload('expired-token')).rejects.toThrow('expired');
  });

  it('rejects when download limit is exhausted', async () => {
    mockGetByTokenHash.mockResolvedValue(
      makeEntitlement({ download_count: 5, maximum_downloads: 5 })
    );

    const { authoriseDownload } = await import('../lib/ebooks/entitlement');
    await expect(authoriseDownload('exhausted-token')).rejects.toThrow('Maximum download limit');
  });

  it('rejects a revoked token', async () => {
    mockGetByTokenHash.mockResolvedValue(
      makeEntitlement({ revoked_at: new Date().toISOString() })
    );

    const { authoriseDownload } = await import('../lib/ebooks/entitlement');
    await expect(authoriseDownload('revoked-token')).rejects.toThrow('revoked');
  });

  it('rejects an unknown token', async () => {
    mockGetByTokenHash.mockResolvedValue(null);

    const { authoriseDownload } = await import('../lib/ebooks/entitlement');
    await expect(authoriseDownload('unknown-token')).rejects.toThrow('not found');
  });

  it('does not expose the token hash or storage path in the error response', async () => {
    mockGetByTokenHash.mockResolvedValue(null);
    const { authoriseDownload } = await import('../lib/ebooks/entitlement');

    try {
      await authoriseDownload('bad-token');
    } catch (err) {
      expect(String(err)).not.toContain('hashed-token');
      expect(String(err)).not.toContain('test-ebook.pdf');
    }
  });
});
