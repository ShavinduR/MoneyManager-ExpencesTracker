import { describe, expect, it } from 'vitest';
import { createDemoData } from '@/lib/demoData';
import { buildSyncPayload, MAX_SYNC_CIPHERTEXT_CHARS, parseSyncPayload } from '@/data/syncPayload';
import { parseQrText, type HostMessage, type JoinMessage } from './protocol';
import { startHostSession, startJoinSession, TransportError, type HostSession, type HostState, type JoinPairing, type JoinState } from './session';
import { createMemoryNetwork, type Intercept } from './memoryTransport';

const FAST = 1_000;
const timers = { set: (fn: () => void, ms: number) => Number(setTimeout(fn, ms)), clear: (id: number) => clearTimeout(id) };
const demo = createDemoData(new Date('2026-11-22T10:00:00'));

const waitFor = async <T>(read: () => T | undefined, ms = 3000): Promise<T> => {
  const start = Date.now();
  for (;;) {
    const value = read();
    if (value !== undefined) return value;
    if (Date.now() - start > ms) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 5));
  }
};

type Run = { host: HostState[]; join: JoinState[]; session: HostSession };

const run = async (opts: { payload?: string; pairing: (state: Extract<HostState, { phase: 'waiting' }>) => JoinPairing; intercept?: Intercept; approve?: boolean }): Promise<Run> => {
  const net = createMemoryNetwork(opts.intercept);
  const host: HostState[] = [];
  const join: JoinState[] = [];
  const session = startHostSession({ transport: net.host(), getPayload: () => opts.payload ?? buildSyncPayload(demo), onState: (s) => host.push(s), iterations: FAST, timers });
  const waiting = await waitFor(() => host.find((s): s is Extract<HostState, { phase: 'waiting' }> => s.phase === 'waiting'));
  startJoinSession({
    transport: net.join(),
    pairing: opts.pairing(waiting),
    onState: (s) => join.push(s),
    validate: (text) => {
      const r = parseSyncPayload(text);
      return r.ok ? null : r.error;
    },
    maxCiphertextChars: MAX_SYNC_CIPHERTEXT_CHARS,
    iterations: FAST,
    timers,
  });
  if (opts.approve !== false) {
    await waitFor(() => (host.some((s) => s.phase === 'confirm' || s.phase === 'error') ? true : undefined));
    session.approve();
  }
  await waitFor(() => (['received', 'error'].includes(join.at(-1)?.phase ?? '') || host.at(-1)?.phase === 'error' ? true : undefined));
  await new Promise((r) => setTimeout(r, 20));
  return { host, join, session };
};

const byCode = (w: { code: string }): JoinPairing => ({ method: 'code', code: w.code });
const byQr = (w: { qrText: string }): JoinPairing => {
  const qr = parseQrText(w.qrText);
  if (!qr) throw new Error('bad qr');
  return { method: 'qr', ...qr };
};

describe('encrypted device sync (end to end over an in-memory transport)', () => {
  it.each([
    ['6-digit code', byCode],
    ['QR code', byQr],
  ])('transfers a full backup via %s and the receiver gets identical data', async (_label, pairing) => {
    const { host, join } = await run({ pairing });
    const last = join.at(-1);
    expect(last?.phase).toBe('received');
    if (last?.phase !== 'received') return;
    const parsed = parseSyncPayload(last.text);
    expect(parsed.ok && parsed.data).toEqual(demo);
    expect(host.map((s) => s.phase)).toEqual(expect.arrayContaining(['preparing', 'waiting', 'confirm', 'sending', 'done']));
  });

  it('never sends data before the sender approves, and a decline tells the receiver', async () => {
    const seen: string[] = [];
    const net = createMemoryNetwork((m) => {
      seen.push(m.t);
      return m;
    });
    const host: HostState[] = [];
    const join: JoinState[] = [];
    const session = startHostSession({ transport: net.host(), getPayload: () => buildSyncPayload(demo), onState: (s) => host.push(s), iterations: FAST, timers });
    const waiting = await waitFor(() => host.find((s): s is Extract<HostState, { phase: 'waiting' }> => s.phase === 'waiting'));
    startJoinSession({ transport: net.join(), pairing: byCode(waiting), onState: (s) => join.push(s), validate: () => null, maxCiphertextChars: MAX_SYNC_CIPHERTEXT_CHARS, iterations: FAST, timers });
    await waitFor(() => (join.at(-1)?.phase === 'awaiting-approval' ? true : undefined));
    await new Promise((r) => setTimeout(r, 50));
    expect(host.at(-1)?.phase).toBe('confirm');
    expect(seen).not.toContain('meta');
    expect(seen).not.toContain('chunk');
    session.decline();
    await waitFor(() => (join.at(-1)?.phase === 'error' ? true : undefined));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'declined' });
    expect(host.at(-1)?.phase).toBe('declined');
    expect(net.rooms.size).toBe(0);
  });

  it('a wrong code finds no device', async () => {
    const { join } = await run({ pairing: (w) => ({ method: 'code', code: w.code === '000000' ? '000001' : '000000' }), approve: false });
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'not-found' });
  });

  it('a wrong key (forged QR) is rejected by the sender and burns the code', async () => {
    const { host, join } = await run({ pairing: (w) => ({ method: 'qr', code: w.code, key: 'B'.repeat(43) }), approve: false });
    expect(host.at(-1)).toMatchObject({ phase: 'error', reason: 'bad-key' });
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'bad-key' });
    expect(host.some((s) => s.phase === 'confirm')).toBe(false);
  });

  it('rejects ciphertext tampered with in transit', async () => {
    const flip: Intercept = (m) => (m.t === 'chunk' ? { ...m, data: (m.data[0] === 'A' ? 'B' : 'A') + m.data.slice(1) } : m);
    const { host, join } = await run({ pairing: byCode, intercept: flip });
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'tampered' });
    expect(host.at(-1)).toMatchObject({ phase: 'error', reason: 'rejected' });
  });

  it('rejects malformed protocol messages', async () => {
    const junk: Intercept = (m: HostMessage | JoinMessage) => (m.t === 'accepted' ? { t: 'accepted', sneaky: '<script>' } : m);
    const { join } = await run({ pairing: byCode, intercept: junk, approve: false });
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'tampered' });
  });

  it('codes expire after 5 minutes and stop answering', async () => {
    const net = createMemoryNetwork();
    const host: HostState[] = [];
    const delays: number[] = [];
    const fastForward = { set: (fn: () => void, ms: number) => (delays.push(ms), Number(setTimeout(fn, 10))), clear: (id: number) => clearTimeout(id) };
    startHostSession({ transport: net.host(), getPayload: () => '', onState: (s) => host.push(s), iterations: FAST, timers: fastForward });
    const waiting = await waitFor(() => host.find((s): s is Extract<HostState, { phase: 'waiting' }> => s.phase === 'waiting'));
    await waitFor(() => (host.at(-1)?.phase === 'expired' ? true : undefined));
    expect(delays[0]).toBeGreaterThan(4.9 * 60_000);
    expect(delays[0]).toBeLessThanOrEqual(5 * 60_000);
    const join: JoinState[] = [];
    startJoinSession({ transport: net.join(), pairing: byCode(waiting), onState: (s) => join.push(s), validate: () => null, maxCiphertextChars: MAX_SYNC_CIPHERTEXT_CHARS, iterations: FAST, timers });
    await waitFor(() => (join.at(-1)?.phase === 'error' ? true : undefined));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'not-found' });
  });

  it('times out after 15 seconds when the other device never answers', async () => {
    const delays: number[] = [];
    const join: JoinState[] = [];
    const fastForward = { set: (fn: () => void, ms: number) => (delays.push(ms), Number(setTimeout(fn, 10))), clear: (id: number) => clearTimeout(id) };
    const silent = { connect: () => new Promise<never>(() => {}), destroy: () => {} };
    startJoinSession({ transport: silent, pairing: { method: 'code', code: '123456' }, onState: (s) => join.push(s), validate: () => null, maxCiphertextChars: 1, iterations: FAST, timers: fastForward });
    await waitFor(() => (join.at(-1)?.phase === 'error' ? true : undefined));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'timeout' });
    expect(delays[0]).toBe(15_000);
  });

  it('reports a room collision so the UI can pick a new code', async () => {
    const net = createMemoryNetwork();
    const taken = { ...net.host(), listen: () => Promise.reject(new TransportError('id-taken')) };
    const host: HostState[] = [];
    startHostSession({ transport: taken, getPayload: () => '', onState: (s) => host.push(s), iterations: FAST, timers });
    await waitFor(() => (host.at(-1)?.phase === 'error' ? true : undefined));
    expect(host.at(-1)).toMatchObject({ phase: 'error', reason: 'code-taken' });
  });

  it('closing mid-session tears down once (no close-event recursion) and frees the room', async () => {
    const net = createMemoryNetwork();
    const host: HostState[] = [];
    const join: JoinState[] = [];
    const session = startHostSession({ transport: net.host(), getPayload: () => buildSyncPayload(demo), onState: (s) => host.push(s), iterations: FAST, timers });
    const waiting = await waitFor(() => host.find((s): s is Extract<HostState, { phase: 'waiting' }> => s.phase === 'waiting'));
    startJoinSession({ transport: net.join(), pairing: byCode(waiting), onState: (s) => join.push(s), validate: () => null, maxCiphertextChars: MAX_SYNC_CIPHERTEXT_CHARS, iterations: FAST, timers });
    await waitFor(() => (host.at(-1)?.phase === 'confirm' ? true : undefined));
    expect(() => session.close()).not.toThrow();
    await waitFor(() => (join.at(-1)?.phase === 'error' ? true : undefined));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'disconnected' });
    expect(host.at(-1)?.phase).toBe('confirm');
    expect(net.rooms.size).toBe(0);
  });

  it('allows only one device per code', async () => {
    const net = createMemoryNetwork();
    const host: HostState[] = [];
    startHostSession({ transport: net.host(), getPayload: () => buildSyncPayload(demo), onState: (s) => host.push(s), iterations: FAST, timers });
    const waiting = await waitFor(() => host.find((s): s is Extract<HostState, { phase: 'waiting' }> => s.phase === 'waiting'));
    const a: JoinState[] = [];
    const b: JoinState[] = [];
    const validate = () => null;
    startJoinSession({ transport: net.join(), pairing: byCode(waiting), onState: (s) => a.push(s), validate, maxCiphertextChars: MAX_SYNC_CIPHERTEXT_CHARS, iterations: FAST, timers });
    await waitFor(() => (host.some((s) => s.phase === 'confirm') ? true : undefined));
    startJoinSession({ transport: net.join(), pairing: byCode(waiting), onState: (s) => b.push(s), validate, maxCiphertextChars: MAX_SYNC_CIPHERTEXT_CHARS, iterations: FAST, timers });
    await waitFor(() => (b.at(-1)?.phase === 'error' ? true : undefined));
    expect(b.at(-1)).toMatchObject({ phase: 'error', reason: 'not-found' });
    expect(a.at(-1)?.phase).toBe('awaiting-approval');
  });
});

describe('sync payload goes through the JSON-import validation pipeline', () => {
  const tampered = (edit: (json: string) => string) => run({ pairing: byCode, payload: edit(buildSyncPayload(demo)) });

  it('rejects a payload with a bank-account password field (strict schema)', async () => {
    const { join, host } = await tampered((t) => t.replace('"cardLast4":', '"password": "hunter2", "cardLast4":'));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'invalid' });
    expect(host.at(-1)).toMatchObject({ phase: 'error', reason: 'rejected' });
  });

  it('rejects secret-looking bank notes (secret guard)', async () => {
    const { join } = await tampered((t) => t.replace(/("bankAccounts": \[\s*\{[\s\S]*?"notes": )"[^"]*"/, '$1"password is hunter2, pin 1234"'));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'invalid' });
    expect(join.at(-1)?.phase === 'error' && join.at(-1)).toMatchObject({ detail: expect.stringMatching(/looks like a password/) });
  });

  it('rejects amounts above MAX_CENTS', async () => {
    const { join } = await tampered((t) => t.replace(/"amount": \d+/, '"amount": 200000000000000'));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'invalid', detail: expect.stringMatching(/too large/) });
  });

  it('rejects anything that is not a planner backup', async () => {
    const { join } = await tampered(() => JSON.stringify({ app: 'something-else', data: {} }));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'invalid' });
  });

  it('enforces the 5 MB cap', async () => {
    const { join } = await tampered(() => ' '.repeat(5 * 1024 * 1024 + 1));
    expect(join.at(-1)).toMatchObject({ phase: 'error', reason: 'invalid' });
  });
});
