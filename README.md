# Photo from iPhone

Take a photo on your iPhone and insert it into the note you're editing. The image saves in the same folder as the note.

Requires macOS, Obsidian 1.13.7 or later, and a separate Mac camera helper. Continuity Camera must already work in Finder.

## Setup

1. Install and enable **Photo from iPhone** in Obsidian.
2. Download `ContinuityPhoto-macOS.zip` from the [releases page](https://github.com/madarame-bk/obsidian-iphone-photo/releases). Unzip it and drag `ContinuityPhoto.app` into Applications.
3. In Settings → Hotkeys, assign a shortcut to **Photo from iPhone: Take photo from iPhone**.

If you keep the helper elsewhere, set its full `.app` path in Settings → Photo from iPhone. The plugin looks in `/Applications` and `~/Applications` by default.

The plugin doesn't download, install, or update the helper. Its setup window links to the releases page. Update the helper manually when a release asks you to.

## Taking a photo

Place the cursor in an editable note and run **Take photo from iPhone**, using your shortcut, the command palette, or the editor's right-click menu. Take the photo on your iPhone and tap **Use Photo**.

To cancel, tap **Cancel** on the iPhone, run the command again, or choose **Cancel iPhone photo** in the editor's right-click menu.

The helper has no capture window or Dock icon. It runs for one capture, then quits. No iPhone app is required.

## Editor behavior

- Selected text is replaced by the image embed.
- Undo removes the whole embed; redo restores it. The PNG remains in your vault, as with other attachments.
- You can keep typing while taking the photo. The insertion point moves with edits to the note.
- If you move the note during capture, the photo saves in its current folder.
- If you close the editor, the plugin embeds the photo only when it can recover the location safely. Otherwise it saves the photo and shows its location. Closed-note writes don't have an editor undo history.
- Only one capture can run at a time. A request times out after three minutes.

No shortcut is assigned automatically. If you choose ⌘P, reassign Obsidian's command-palette shortcut to avoid a conflict.

## Compatibility

The helper uses the Mac's private `SidecarCore` Continuity Camera interface. It checks the expected methods at runtime and reports an error if they are missing. A macOS update may require a helper update.

The current implementation has been checked on macOS 27.0 and Obsidian 1.13.7. Real iPhone startup and cancellation have been verified. Photo conversion, saving, insertion, and undo have been tested with simulated captures; a complete real photo through the current direct-request implementation has not been verified. Intel builds are included but have not yet been tested on Intel hardware.

If several devices are available, the helper uses the first one reported by macOS.

## Privacy

The plugin sends no notes or photos to a server and has no telemetry. It makes no network requests. The download button opens GitHub in your browser; macOS manages the local Continuity connection to your iPhone.

Outside the vault, the plugin checks the configured helper location or the Applications folders and runs the helper executable. Captures are written into a private temporary folder before being copied to the vault. The helper uses a private pasteboard, leaving your clipboard unchanged.

Temporary photos are deleted after saving or cancellation. If the vault can't save a completed photo, the plugin keeps the temporary image and shows its path so you can recover it.

## License

MIT. See [LICENSE](LICENSE).
