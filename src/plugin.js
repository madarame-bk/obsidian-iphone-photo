const { Plugin, Notice, MarkdownView, FileSystemAdapter } = require('obsidian');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { trackEditors, mapUnobservedRange, insertEmbed } = require('./editor');
const { findHelper, cancelHelper, runHelper } = require('./helper');
const { HelperSetup, PhotoSettings } = require('./settings');

module.exports = class PhotoFromIPhone extends Plugin {
  async onload() {
    this.pending = null;
    this.editorViews = new WeakMap();
    const saved = await this.loadData();
    this.settings = { helperPath: typeof saved?.helperPath === 'string' ? saved.helperPath : '' };
    this.addSettingTab(new PhotoSettings(this.app, this));
    if (process.platform !== 'darwin') return;

    this.registerEditorExtension(trackEditors(this));
    this.addCommand({
      id: 'take-photo',
      name: 'Take photo from iPhone',
      editorCheckCallback: (checking, editor, info) => {
        if (!info.file) return false;
        if (!checking) this.takePhoto(editor, info);
        return true;
      }
    });
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, info) => {
        if (!info.file) return;
        menu.addItem(item =>
          item
            .setTitle(this.pending ? 'Cancel iPhone photo' : 'Take photo from iPhone')
            .setIcon('camera')
            .onClick(() => this.takePhoto(editor, info))
        );
      })
    );
  }

  takePhoto(editor, info) {
    if (this.pending) this.cancelCapture();
    else void this.capture(editor, info);
  }

  findHelper() {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) return Promise.resolve(null);
    const directory = path.join(adapter.getBasePath(), this.manifest.dir);
    return findHelper(this.settings.helperPath, directory);
  }

  cancelCapture() {
    if (this.pending) cancelHelper(this.pending);
  }

  async insertPhoto(capture, embed) {
    const editors = [];
    this.app.workspace.iterateAllLeaves(leaf => {
      const view = leaf.view;
      if (
        !(view instanceof MarkdownView) ||
        view.file !== capture.file ||
        view.getMode() !== 'source'
      )
        return;
      const cm = this.editorViews.get(view.editor) || view.editor.cm;
      if (cm) editors.push(cm);
    });
    editors.sort((a, b) => Number(b === capture.cm) - Number(a === capture.cm));

    for (const cm of editors) {
      if (capture.cancelled) return false;
      const range =
        cm === capture.cm && !capture.detached
          ? capture
          : mapUnobservedRange(capture, cm.state.doc.toString());
      if (!range) continue;
      insertEmbed(cm, range, embed);
      return true;
    }

    if (this.app.vault.getAbstractFileByPath(capture.file.path) !== capture.file) return false;
    let inserted = false;
    await this.app.vault.process(capture.file, text => {
      if (capture.cancelled) return text;
      const range = mapUnobservedRange(capture, text);
      if (!range) return text;
      inserted = true;
      return text.slice(0, range.from) + embed + text.slice(range.to);
    });
    return inserted;
  }

  async capture(editor, info, options = {}) {
    if (this.pending) return;
    const file = info.file;
    const cm = this.editorViews.get(editor) || editor.cm;
    if (!file || !cm) {
      new Notice('Open the note in editing mode to take a photo.');
      return;
    }

    const selection = cm.state.selection.main;
    const capture = {
      file,
      cm,
      from: selection.from,
      to: selection.to,
      snapshot: cm.state.doc.toString(),
      cancelled: false,
      detached: false,
      child: null
    };
    this.pending = capture;
    let tempDirectory;
    let photoReady = false;
    let attachment;

    try {
      const executable = await this.findHelper();
      if (capture.cancelled) return;
      if (!executable) {
        new HelperSetup(this.app, this).open();
        return;
      }

      tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'obsidian-iphone-photo-'));
      if (capture.cancelled) return;
      const photoPath = path.join(tempDirectory, 'photo.png');
      const result = await runHelper(executable, photoPath, capture, options.simulate);
      if (capture.cancelled || result.status === 'cancelled') return;
      if (result.status !== 'done') throw new Error(result.message || 'Could not take the photo.');
      photoReady = true;

      if (this.app.vault.getAbstractFileByPath(file.path) !== file) {
        throw new Error('The original note was removed while taking the photo.');
      }
      const buffer = await fs.readFile(photoPath);
      if (capture.cancelled) return;
      const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      const folder = file.parent.path === '/' ? '' : `${file.parent.path}/`;
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `iPhone ${date} ${randomUUID().slice(0, 8)}.png`;
      attachment = await this.app.vault.createBinary(folder + filename, bytes);
      if (capture.cancelled) {
        await this.app.vault.trash(attachment, true);
        return;
      }

      const embed = '!' + this.app.fileManager.generateMarkdownLink(attachment, file.path);
      const inserted = await this.insertPhoto(capture, embed);
      if (!inserted) {
        new Notice(
          `Photo saved as ${attachment.path}. The insertion point changed, so the photo was not embedded.`,
          10000
        );
      }
    } catch (error) {
      if (!capture.cancelled) {
        console.error('Photo from iPhone:', error);
        const location =
          attachment?.path || (photoReady ? path.join(tempDirectory, 'photo.png') : null);
        const recovery = location ? ` Photo kept at ${location}.` : '';
        new Notice(`${error.message}${recovery}`, 10000);
      }
    } finally {
      if (tempDirectory && (!photoReady || attachment || capture.cancelled)) {
        await fs.rm(tempDirectory, { recursive: true, force: true }).catch(error => {
          console.error('Photo from iPhone: could not remove temporary files', error);
        });
      }
      if (this.pending === capture) this.pending = null;
    }
  }

  onunload() {
    this.cancelCapture();
  }
};
