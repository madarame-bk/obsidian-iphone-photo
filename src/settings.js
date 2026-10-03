const { Modal, PluginSettingTab, Setting } = require('obsidian');

const RELEASE_URL = 'https://github.com/madarame-bk/obsidian-iphone-photo/releases/latest';

class HelperSetup extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    this.setTitle('Set up the Mac camera helper');
    this.contentEl.createEl('p', {
      text: 'Download ContinuityPhoto.app and drag it into Applications. You only need to do this once.'
    });
    this.contentEl.createEl('p', {
      text: 'The helper runs when you take a photo and quits when you finish or cancel.'
    });
    new Setting(this.contentEl)
      .addButton(button =>
        button
          .setButtonText('Download helper')
          .setCta()
          .onClick(() => window.open(RELEASE_URL))
      )
      .addButton(button =>
        button.setButtonText('Check installation').onClick(async () => {
          const executable = await this.plugin.findHelper();
          this.status.setText(
            executable
              ? 'Helper found. Close this window and take a photo from your note.'
              : 'Helper not found. Put ContinuityPhoto.app in Applications, or set its location in plugin settings.'
          );
        })
      );
    this.status = this.contentEl.createEl('p');
  }

  onClose() {
    this.contentEl.empty();
  }
}

class PhotoSettings extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName('Mac camera helper')
      .setDesc('Install the helper once to take photos with your iPhone.')
      .addButton(button =>
        button
          .setButtonText('Set up helper')
          .onClick(() => new HelperSetup(this.app, this.plugin).open())
      );

    new Setting(this.containerEl)
      .setName('Helper location')
      .setDesc(
        'Leave blank to look in Applications. Use the full path to ContinuityPhoto.app if you keep it elsewhere.'
      )
      .addText(text =>
        text
          .setPlaceholder('/Applications/ContinuityPhoto.app')
          .setValue(this.plugin.settings.helperPath)
          .onChange(async value => {
            this.plugin.settings.helperPath = value.trim();
            await this.plugin.saveData(this.plugin.settings);
          })
      );
  }
}

module.exports = { HelperSetup, PhotoSettings };
