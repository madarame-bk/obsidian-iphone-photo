# Manual installation

To install from a GitHub release:

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/madarame-bk/obsidian-iphone-photo/releases/latest).
2. Create `<vault>/.obsidian/plugins/iphone-photo/` and put both files inside it.
3. Restart Obsidian and enable **Photo from iPhone** in Settings → Community plugins.
4. [Download the camera helper](https://github.com/madarame-bk/obsidian-iphone-photo/releases/latest/download/ContinuityPhoto-macOS.zip), unzip it, and drag `ContinuityPhoto.app` into Applications.

The plugin finds the helper in `/Applications` or `~/Applications`. To keep it elsewhere, set its full `.app` path in Settings → Photo from iPhone. Update the helper manually when a release asks you to.
