const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { undo, redo, undoDepth } = require('@codemirror/commands');
const { createPlugin, createEditor, notices, obsidian } = require('./support.cjs');

for (const mode of ['cancel', 'error']) {
  test(`${mode} leaves the note and undo history untouched`, async () => {
    const { plugin, file, editor, attachments } = await createPlugin();
    const capture = plugin.capture(editor, { file }, { simulate: mode });
    assert.equal(editor.cm.state.doc.toString(), 'Before after');
    await capture;
    assert.equal(plugin.pending, null);
    assert.equal(editor.cm.state.doc.toString(), 'Before after');
    assert.equal(undoDepth(editor.cm.state), 0);
    assert.equal(attachments.length, 0);
  });
}

test('capture follows edits without creating a placeholder undo event', async () => {
  const { plugin, file, editor, attachments } = await createPlugin();
  const capture = plugin.capture(editor, { file }, { simulate: 'success' });
  editor.cm.dispatch({ changes: { from: 0, insert: 'Added ' } });
  await capture;
  assert.match(editor.cm.state.doc.toString(), /^Added Before !\[\[Topic\/iPhone Photos\/iPhone /);
  assert.equal(attachments.length, 1);
  undo(editor.cm);
  assert.equal(editor.cm.state.doc.toString(), 'Added Before after');
  redo(editor.cm);
  assert.ok(editor.cm.state.doc.toString().includes('![[Topic/iPhone Photos/iPhone '));
});

test('the capture editor takes precedence when a note is open in two panes', async () => {
  const { plugin, file, editor, leaves } = await createPlugin();
  const other = createEditor(file);
  leaves.unshift({ view: Object.assign(new obsidian.MarkdownView(), { file, editor: other }) });
  await plugin.capture(editor, { file }, { simulate: 'success' });
  assert.ok(editor.cm.state.doc.toString().includes('![['));
  assert.equal(other.cm.state.doc.toString(), 'Before after');
});

test('a moved note receives its photo in the new folder', async () => {
  const { plugin, file, editor, attachments } = await createPlugin();
  const capture = plugin.capture(editor, { file }, { simulate: 'success' });
  file.path = 'Moved/Note.md';
  file.parent.path = 'Moved';
  await capture;
  assert.ok(attachments[0].path.startsWith('Moved/iPhone Photos/'));
});

test('a closed note accepts an unambiguous insertion', async () => {
  const { plugin, file, editor, disk } = await createPlugin({ closed: true });
  await plugin.capture(editor, { file }, { simulate: 'success' });
  assert.match(disk(), /^Before !\[\[Topic\/iPhone Photos\/iPhone /);
});

test('an ambiguous closed-note rewrite keeps the photo without changing the note', async () => {
  const { plugin, file, editor, disk, setDisk, attachments } = await createPlugin({ closed: true });
  const capture = plugin.capture(editor, { file }, { simulate: 'success' });
  setDisk('A completely different note');
  await capture;
  assert.equal(disk(), 'A completely different note');
  assert.equal(attachments.length, 1);
});

test('cancel during saving trashes only the newly created attachment', async () => {
  const { plugin, file, editor, attachments, deleted } = await createPlugin({
    save: async plugin => plugin.cancelCapture()
  });
  await plugin.capture(editor, { file }, { simulate: 'success' });
  assert.equal(deleted[0], attachments[0]);
  assert.equal(editor.cm.state.doc.toString(), 'Before after');
});

test('unloading cancels an active helper', async () => {
  const { plugin, file, editor } = await createPlugin();
  const capture = plugin.capture(editor, { file }, { simulate: 'wait' });
  while (!plugin.pending?.child) await new Promise(resolve => setImmediate(resolve));
  plugin.onunload();
  await capture;
  assert.equal(plugin.pending, null);
  assert.equal(undoDepth(editor.cm.state), 0);
});

test('a vault save failure keeps the original photo and reports its location', async t => {
  const { plugin, file, editor } = await createPlugin({
    save: async () => {
      throw new Error('Disk full');
    }
  });
  await plugin.capture(editor, { file }, { simulate: 'success' });
  const message = notices.findLast(message => message.startsWith('Disk full'));
  assert.ok(message);
  const photoPath = message.split(' Photo kept at ')[1].slice(0, -1);
  assert.equal(path.dirname(path.dirname(photoPath)), os.tmpdir().replace(/\/$/, ''));
  assert.ok((await fs.readFile(photoPath)).length > 0);
  t.after(() => fs.rm(path.dirname(photoPath), { recursive: true, force: true }));
  assert.equal(editor.cm.state.doc.toString(), 'Before after');
});

test('the first photo creates an iPhone Photos folder and later photos reuse it', async () => {
  const { plugin, file, editor, attachments, createdFolders } = await createPlugin();
  await plugin.capture(editor, { file }, { simulate: 'success' });
  await plugin.capture(editor, { file }, { simulate: 'success' });
  assert.deepEqual(createdFolders, ['Topic/iPhone Photos']);
  assert.equal(attachments.length, 2);
  assert.ok(attachments.every(photo => photo.path.startsWith('Topic/iPhone Photos/')));
});

test('a note at the vault root uses the root iPhone Photos folder', async () => {
  const { plugin, file, editor, attachments, createdFolders } = await createPlugin();
  file.path = 'Note.md';
  file.parent.path = '/';
  await plugin.capture(editor, { file }, { simulate: 'success' });
  assert.deepEqual(createdFolders, ['iPhone Photos']);
  assert.ok(attachments[0].path.startsWith('iPhone Photos/'));
});

test('an existing iPhone Photos folder is reused without a creation attempt', async () => {
  const { plugin, file, editor, folders, createdFolders } = await createPlugin();
  folders.set(
    'Topic/iPhone Photos',
    Object.assign(new obsidian.TFolder(), { path: 'Topic/iPhone Photos' })
  );
  await plugin.capture(editor, { file }, { simulate: 'success' });
  assert.deepEqual(createdFolders, []);
});

test('a folder created by sync during capture is accepted', async () => {
  const { plugin, file, editor, folders, attachments } = await createPlugin();
  plugin.app.vault.createFolder = async folderPath => {
    folders.set(folderPath, Object.assign(new obsidian.TFolder(), { path: folderPath }));
    throw new Error('Folder already exists');
  };
  await plugin.capture(editor, { file }, { simulate: 'success' });
  assert.equal(attachments.length, 1);
});

test('a file named iPhone Photos cannot be used as the photo folder', async t => {
  const { plugin, file, editor, folders, attachments } = await createPlugin();
  folders.set('Topic/iPhone Photos', { path: 'Topic/iPhone Photos' });
  await plugin.capture(editor, { file }, { simulate: 'success' });
  assert.equal(attachments.length, 0);
  assert.equal(editor.cm.state.doc.toString(), 'Before after');
  const message = notices.findLast(message => message.startsWith('Cannot save photos:'));
  assert.ok(message.includes('is a file, not a folder'));
  const photoPath = message.split(' Photo kept at ')[1].slice(0, -1);
  assert.ok((await fs.readFile(photoPath)).length > 0);
  t.after(() => fs.rm(path.dirname(photoPath), { recursive: true, force: true }));
});
