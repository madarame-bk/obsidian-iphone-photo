# Compatibility and known limitations

Requires macOS, Obsidian 1.13.7 or later, and Continuity Camera working in Finder. The helper includes Apple Silicon and Intel builds.

The current implementation has been checked on macOS 27.0 and Obsidian 1.13.7 on Apple Silicon. Real iPhone startup and cancellation have been verified. Photo conversion, saving, insertion, and undo have been tested with simulated captures; a complete real photo through the current direct-request implementation has not been verified. Intel builds have not yet been tested on Intel hardware.

The helper uses the Mac's private `SidecarCore` Continuity Camera interface. It checks the expected methods at runtime and reports an error if they are missing. A macOS update may require a helper update. If several devices are available, it uses the first one reported by macOS.

Only one capture can run at a time. A request times out after three minutes.

If you move the note during capture, the photo saves in the `iPhone Photos` subfolder of its current folder. If you close the editor, the plugin embeds the photo only when it can recover the location safely. Otherwise it saves the photo and shows its location. Closed-note writes don't have an editor undo history.
