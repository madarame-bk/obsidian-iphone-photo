const test = require('node:test');
const assert = require('node:assert/strict');
const { undo, redo, undoDepth, isolateHistory } = require('@codemirror/commands');
const { createEditor, loadModule } = require('./support.cjs');
const { insertEmbed, mapUnobservedRange } = loadModule('src/editor.js');

for (const selected of [false, true]) {
  test(`photo insertion is one undo event${selected ? ' and replaces selected text' : ''}`, () => {
    const { cm } = createEditor({}, 'Before after', 7, selected ? 12 : 7);
    cm.dispatch({ changes: { from: 0, insert: 'Added ' }, annotations: isolateHistory.of('full') });
    const original = cm.state.doc.toString();
    insertEmbed(cm, { from: 13, to: selected ? 18 : 13 }, '![[photo.png]]');
    assert.equal(undoDepth(cm.state), 2);
    undo(cm);
    assert.equal(cm.state.doc.toString(), original);
    redo(cm);
    assert.ok(cm.state.doc.toString().includes('![[photo.png]]'));
    undo(cm);
    undo(cm);
    assert.equal(cm.state.doc.toString(), 'Before after');
  });
}

test('closed-editor mapping accepts distant edits and rejects overlapping rewrites', () => {
  const capture = { snapshot: 'Before selected after', from: 7, to: 15 };
  const before = mapUnobservedRange(capture, 'Added Before selected after');
  assert.equal(before.from, 13);
  assert.equal(before.to, 21);
  const after = mapUnobservedRange(capture, 'Before selected after added');
  assert.equal(after.from, 7);
  assert.equal(after.to, 15);
  assert.equal(mapUnobservedRange(capture, 'Before changed after'), null);
});
