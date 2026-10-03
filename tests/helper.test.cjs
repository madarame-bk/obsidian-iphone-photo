const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { findHelper, cancelHelper, runHelper } = require('../src/helper');
const fixture = path.join(__dirname, 'helper-fixture.cjs');

test('helper lookup respects a configured path and supports a bundled helper', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-helper-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const app = path.join(directory, 'ContinuityPhoto.app');
  const executable = path.join(app, 'Contents', 'MacOS', 'ContinuityPhoto');
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, '#!/bin/sh\n', { mode: 0o755 });
  assert.equal(await findHelper(app, directory), executable);
  assert.equal(await findHelper(path.join(directory, 'missing.app'), directory), null);
});

test('invalid native responses produce a useful error', async () => {
  await assert.rejects(runHelper(fixture, '/unused', {}, 'malformed'), /invalid response/);
});

test('cancellation terminates a helper that ignores SIGTERM', { timeout: 6000 }, async () => {
  const capture = {};
  const result = runHelper(fixture, '/unused', capture, 'stuck');
  await once(capture.child, 'spawn');
  await new Promise(resolve => setTimeout(resolve, 100));
  cancelHelper(capture);
  assert.equal((await result).status, 'cancelled');
  assert.equal(capture.child, null);
});
