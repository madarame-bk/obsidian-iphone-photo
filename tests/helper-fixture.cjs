#!/usr/bin/env node
const fs = require('node:fs');
const [output, , mode] = process.argv.slice(2);
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64'
);

function finish(result) {
  process.stdout.write(JSON.stringify(result), () => process.exit(0));
}

if (mode === 'stuck') {
  process.on('SIGTERM', () => {});
  setInterval(() => {}, 1000);
} else {
  process.on('SIGTERM', () => finish({ status: 'cancelled' }));
  setTimeout(() => {
    if (mode === 'success') {
      fs.writeFileSync(output, png);
      finish({ status: 'done' });
    } else if (mode === 'cancel') {
      finish({ status: 'cancelled' });
    } else if (mode === 'malformed') {
      finish({ status: 'unknown' });
    } else if (mode === 'error') {
      finish({ status: 'error', message: 'Simulated connection failure' });
    }
  }, 150);
}
