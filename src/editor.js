const { editorInfoField } = require('obsidian');
const { ViewPlugin } = require('@codemirror/view');
const { Transaction } = require('@codemirror/state');
const { isolateHistory } = require('@codemirror/commands');

function trackEditors(plugin) {
  return ViewPlugin.define(view => {
    function remember(state) {
      const info = state.field(editorInfoField, false);
      if (info?.editor) plugin.editorViews.set(info.editor, view);
      return info;
    }

    remember(view.state);
    return {
      update(update) {
        const info = remember(update.state);
        const capture = plugin.pending;
        if (capture?.cm !== view || capture.detached) return;
        if (info?.file !== capture.file) {
          capture.detached = true;
          return;
        }
        if (!update.docChanged) return;

        const isCaret = capture.from === capture.to;
        capture.from = update.changes.mapPos(capture.from, 1);
        capture.to = isCaret
          ? capture.from
          : Math.max(capture.from, update.changes.mapPos(capture.to, -1));
        capture.snapshot = update.state.doc.toString();
      },
      destroy() {
        if (plugin.pending?.cm === view) plugin.pending.detached = true;
      }
    };
  });
}

// With no editor to observe, accept only an edit wholly before or after the range.
function mapUnobservedRange(capture, text) {
  const original = capture.snapshot;
  if (original === text) return { from: capture.from, to: capture.to };

  let start = 0;
  while (start < original.length && start < text.length && original[start] === text[start]) start++;

  let oldEnd = original.length;
  let newEnd = text.length;
  while (oldEnd > start && newEnd > start && original[oldEnd - 1] === text[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  if (oldEnd <= capture.from) {
    const shift = newEnd - oldEnd;
    return { from: capture.from + shift, to: capture.to + shift };
  }
  if (start >= capture.to) return { from: capture.from, to: capture.to };
  return null;
}

function insertEmbed(cm, range, embed) {
  cm.dispatch({
    changes: { from: range.from, to: range.to, insert: embed },
    selection: { anchor: range.from + embed.length },
    annotations: [Transaction.userEvent.of('input.paste'), isolateHistory.of('full')]
  });
}

module.exports = { trackEditors, mapUnobservedRange, insertEmbed };
