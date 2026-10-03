const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const { once } = require('node:events');
const helper = path.resolve(
  __dirname,
  '../build/test/ContinuityPhoto.app/Contents/MacOS/ContinuityPhoto'
);
const skip = process.platform !== 'darwin' || !fsSync.existsSync(helper);
const run = promisify(execFile);

for (const [mode, status] of [
  ['success', 'done'],
  ['cancel', 'cancelled'],
  ['error', 'error']
]) {
  test(`native ${mode}`, { skip, timeout: 10000 }, async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-native-test-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const photo = path.join(directory, 'photo.png');
    const { stdout, stderr } = await run(helper, [photo, '--simulate', mode]);
    assert.equal(stderr, '');
    assert.equal(JSON.parse(stdout).status, status);
    assert.equal(fsSync.existsSync(photo), mode === 'success');
    if (mode === 'success') {
      const image = await fs.readFile(photo);
      assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    }
  });
}

test('native SIGTERM cancels a pending request', { skip, timeout: 10000 }, async () => {
  const child = spawn(helper, ['/unused', '--simulate', 'wait']);
  let output = '';
  child.stdout.on('data', chunk => {
    output += chunk;
  });
  const ended = once(child, 'close');
  await new Promise(resolve => setTimeout(resolve, 500));
  child.kill('SIGTERM');
  await ended;
  assert.equal(JSON.parse(output).status, 'cancelled');
});

test('native helper quits if its parent exits', { skip, timeout: 10000 }, async () => {
  const wrapper = `require('node:child_process').spawn(process.argv[1], ['/unused', '--simulate', 'wait'], {stdio: ['ignore', 1, 2]}); setTimeout(() => process.exit(0), 500);`;
  const { stdout } = await run(process.execPath, ['-e', wrapper, helper]);
  assert.equal(JSON.parse(stdout).status, 'cancelled');
});
