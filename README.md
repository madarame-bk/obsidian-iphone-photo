# Photo from iPhone

Take a photo on your iPhone and insert it into the note you're editing. The image saves in an `iPhone Photos` subfolder beside the note. The plugin creates it on the first capture and reuses it for other notes in the same folder.

Requires macOS, Obsidian 1.13.7 or later, and a separate Mac camera helper. Continuity Camera must already work in Finder.

## Setup

1. Install and enable **Photo from iPhone** in Obsidian.
2. [Download the camera helper](https://github.com/madarame-bk/obsidian-iphone-photo/releases/latest/download/ContinuityPhoto-macOS.zip). Unzip it and drag `ContinuityPhoto.app` into Applications.
3. Use **⌘⌥P** (Command–Option–P) in an editable note to take a photo. You can change it in Settings → Hotkeys under **Photo from iPhone: Take photo from iPhone**.

For manual installation, download `main.js` and `manifest.json` from the [latest release](https://github.com/madarame-bk/obsidian-iphone-photo/releases/latest), put them in `<vault>/.obsidian/plugins/iphone-photo/`, then restart Obsidian and enable the plugin in Settings → Community plugins.

If you keep the helper elsewhere, set its full `.app` path in Settings → Photo from iPhone. The plugin looks in `/Applications` and `~/Applications` by default.

The plugin doesn't download, install, or update the helper. Its setup window opens a direct link to the ZIP in your browser. Update the helper manually when a release asks you to.

## Taking a photo

Place the cursor in an editable note and run **Take photo from iPhone**, using your shortcut, the command palette, or the editor's right-click menu. Take the photo on your iPhone and tap **Use Photo**.

To cancel, tap **Cancel** on the iPhone, run the command again, or choose **Cancel iPhone photo** in the editor's right-click menu.

The helper has no capture window or Dock icon. It runs for one capture, then quits. No iPhone app is required.

## Editor behavior

- Selected text is replaced by the image embed.
- Undo removes the whole embed; redo restores it. The PNG remains in your vault, as with other attachments.
- You can keep typing while taking the photo. The insertion point moves with edits to the note.
- If you move the note during capture, the photo saves in the `iPhone Photos` subfolder of its current folder.
- If you close the editor, the plugin embeds the photo only when it can recover the location safely. Otherwise it saves the photo and shows its location. Closed-note writes don't have an editor undo history.
- Only one capture can run at a time. A request times out after three minutes.

The default photo shortcut is **⌘⌥P**. Obsidian's command palette keeps **⌘P**.

## Compatibility

The helper uses the Mac's private `SidecarCore` Continuity Camera interface. It checks the expected methods at runtime and reports an error if they are missing. A macOS update may require a helper update.

The current implementation has been checked on macOS 27.0 and Obsidian 1.13.7. Real iPhone startup and cancellation have been verified. Photo conversion, saving, insertion, and undo have been tested with simulated captures; a complete real photo through the current direct-request implementation has not been verified. Intel builds are included but have not yet been tested on Intel hardware.

If several devices are available, the helper uses the first one reported by macOS.

## Privacy

The plugin sends no notes or photos to a server and has no telemetry. It makes no network requests. The download button opens the helper ZIP hosted on GitHub in your browser; macOS manages the local Continuity connection to your iPhone.

Outside the vault, the plugin checks the configured helper location or the Applications folders and runs the helper executable. Captures are written into a private temporary folder before being copied to the vault. The helper uses a private pasteboard, leaving your clipboard unchanged.

Temporary photos are deleted after saving or cancellation. If the vault can't save a completed photo, the plugin keeps the temporary image and shows its path so you can recover it.

## License

MIT. See [LICENSE](LICENSE).
