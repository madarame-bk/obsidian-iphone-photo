const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const HELPER_NAME = 'ContinuityPhoto.app';
const CAPTURE_TIMEOUT_MS = 190_000;
const CANCEL_GRACE_MS = 3_000;

function helperExecutable(appPath) {
  return path.join(appPath, 'Contents', 'MacOS', 'ContinuityPhoto');
}

async function findHelper(configuredPath, pluginDirectory) {
  const candidates = configuredPath
    ? [configuredPath.replace(/^~(?=\/)/, os.homedir())]
    : [
        path.join('/Applications', HELPER_NAME),
        path.join(os.homedir(), 'Applications', HELPER_NAME),
        path.join(pluginDirectory, HELPER_NAME)
      ];

  for (const appPath of candidates) {
    const executable = helperExecutable(appPath);
    try {
      await fs.access(executable, fs.constants.X_OK);
      return executable;
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) throw error;
    }
  }
  return null;
}

function cancelHelper(capture) {
  capture.cancelled = true;
  if (!capture.child) return;
  capture.child.kill('SIGTERM');
  if (capture.cancelTimer) return;

  // SIGTERM lets macOS cancel the phone request; SIGKILL bounds a stuck helper.
  capture.cancelTimer = setTimeout(() => capture.child?.kill('SIGKILL'), CANCEL_GRACE_MS);
}

function runHelper(executable, outputPath, capture, simulation) {
  const args = [outputPath];
  if (simulation) args.push('--simulate', simulation);

  return new Promise((resolve, reject) => {
    capture.child = execFile(
      executable,
      args,
      {
        timeout: CAPTURE_TIMEOUT_MS,
        killSignal: 'SIGKILL',
        maxBuffer: 1024 * 1024
      },
      (error, stdout, stderr) => {
        clearTimeout(capture.cancelTimer);
        capture.child = null;
        if (capture.cancelled) {
          resolve({ status: 'cancelled' });
          return;
        }
        if (error) {
          const message = error.killed
            ? 'The camera helper timed out. Try again.'
            : stderr.trim() || error.message;
          reject(new Error(message));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (!['done', 'cancelled', 'error'].includes(result?.status)) {
            throw new Error('Invalid capture status');
          }
          resolve(result);
        } catch {
          reject(new Error('The camera helper returned an invalid response.'));
        }
      }
    );
    if (capture.cancelled) cancelHelper(capture);
  });
}

module.exports = { findHelper, cancelHelper, runHelper };
