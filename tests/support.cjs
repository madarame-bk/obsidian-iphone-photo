const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EditorState, StateField } = require('@codemirror/state');
const { history } = require('@codemirror/commands');

const editorInfoField = StateField.define({ create: () => null, update: value => value });
const notices = [];
const obsidian = {
  editorInfoField,
  Plugin: class {
    async loadData() {
      return null;
    }
    addSettingTab() {}
    addCommand() {}
    registerEvent() {}
    registerEditorExtension(extension) {
      this.extension = extension;
    }
  },
  Notice: class {
    constructor(message) {
      notices.push(message);
    }
  },
  MarkdownView: class {
    getMode() {
      return 'source';
    }
  },
  FileSystemAdapter: class {},
  Modal: class {},
  PluginSettingTab: class {},
  Setting: class {}
};

function loadModule(relativePath) {
  const module = { exports: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'),
    {
      module,
      require: name => (name === 'obsidian' ? obsidian : require(name)),
      process: { ...process, platform: 'darwin' },
      console: { ...console, error() {} },
      setTimeout,
      clearTimeout
    },
    { filename: relativePath }
  );
  return module.exports;
}

function createEditor(file, doc = 'Before after', from = 7, to = from) {
  const editor = {};
  const cm = {
    state: EditorState.create({
      doc,
      selection: { anchor: from, head: to },
      extensions: [history(), editorInfoField.init(() => ({ editor, file }))]
    })
  };
  cm.dispatch = spec => {
    const transaction = spec.startState ? spec : cm.state.update(spec);
    cm.state = transaction.state;
    cm.tracker?.update({
      state: cm.state,
      view: cm,
      changes: transaction.changes,
      docChanged: transaction.docChanged
    });
  };
  editor.cm = cm;
  return editor;
}

async function createPlugin({ closed = false, doc, from, to, save } = {}) {
  const file = { path: 'Topic/Note.md', parent: { path: 'Topic' } };
  const editor = createEditor(file, doc, from, to);
  const attachments = [];
  const deleted = [];
  let disk = editor.cm.state.doc.toString();
  let exists = true;
  const view = Object.assign(new obsidian.MarkdownView(), { file, editor });
  const leaves = closed ? [] : [{ view }];
  const Plugin = loadModule('main.js');
  const plugin = new Plugin();
  plugin.manifest = { dir: '.obsidian/plugins/iphone-photo' };
  plugin.app = {
    workspace: {
      on() {},
      iterateAllLeaves(callback) {
        leaves.forEach(callback);
      }
    },
    vault: {
      adapter: new obsidian.FileSystemAdapter(),
      getAbstractFileByPath() {
        return exists ? file : null;
      },
      async process(note, change) {
        disk = change(disk);
      },
      async createBinary(filename, data) {
        if (save) await save(plugin);
        const attachment = { path: filename, data };
        attachments.push(attachment);
        return attachment;
      },
      async trash(attachment) {
        deleted.push(attachment);
      }
    },
    fileManager: { generateMarkdownLink: attachment => `[[${attachment.path}]]` }
  };
  await plugin.onload();
  plugin.findHelper = async () => path.join(__dirname, 'helper-fixture.cjs');
  editor.cm.tracker = plugin.extension.create(editor.cm);
  return {
    plugin,
    file,
    editor,
    attachments,
    deleted,
    leaves,
    disk: () => disk,
    removeNote() {
      exists = false;
    },
    setDisk(text) {
      disk = text;
    }
  };
}

module.exports = { createEditor, createPlugin, loadModule, notices, obsidian };
