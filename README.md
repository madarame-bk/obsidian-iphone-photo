# Photo from iPhone

Take a photo on your iPhone and insert it at the cursor in your Obsidian note. Press **⌘⌥P**, take the photo, and tap **Use Photo**. You can also choose **Take photo from iPhone** from the editor's right-click menu or the command palette.

For Mac only. Requires Obsidian 1.13.7 or later and Continuity Camera working in Finder. No iPhone app is needed.

## Setup

After enabling the plugin:

1. [Download the camera helper](https://github.com/madarame-bk/obsidian-iphone-photo/releases/latest/download/ContinuityPhoto-macOS.zip).
2. Unzip it and drag **ContinuityPhoto.app** into **Applications**.
3. Open a note, place your cursor, and press **⌘⌥P** (Command–Option–P).

The helper is signed with Developer ID and notarized by Apple. It runs while you're taking a photo, then quits, without a window or Dock icon. Install it once; the plugin finds it automatically.

To change the shortcut, open **Settings → Hotkeys** and search for **Photo from iPhone**. **⌘P** still opens Obsidian's command palette.

If you keep the helper somewhere else, enter its full `.app` path in **Settings → Photo from iPhone**. Helper installation and updates are manual; the plugin's download button opens the ZIP in your browser.

## Photos in your notes

Photos save as PNGs in an **iPhone Photos** subfolder beside the note. The plugin creates the folder when needed and reuses it for notes in the same folder.

Selected text is replaced by the photo. **Undo** removes the whole embed; **Redo** brings it back. The image file stays in your vault, as with other attachments.

You can keep typing while the camera is open. To cancel, tap **Cancel** on your iPhone, press the shortcut again, or choose **Cancel iPhone photo** from the right-click menu.

## Compatibility and privacy

The helper uses a private macOS camera interface, so a macOS update may require a helper update. If you have several devices, it uses the first one macOS reports. See [compatibility and known limitations](https://github.com/madarame-bk/obsidian-iphone-photo/blob/main/docs/compatibility.md) before installing.

There are no uploads or telemetry. The plugin runs the helper from Applications or the location you choose, and saves captures in a temporary folder outside your vault before importing them. Your clipboard is unchanged. The download button opens GitHub; macOS handles the connection to your iPhone.

Temporary photos are deleted after saving or cancellation. If saving fails, the photo is kept and a notice shows where to recover it.

[Report a problem](https://github.com/madarame-bk/obsidian-iphone-photo/issues) · [Manual installation](https://github.com/madarame-bk/obsidian-iphone-photo/blob/main/docs/installation.md)
