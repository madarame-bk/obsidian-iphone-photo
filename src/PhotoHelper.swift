import AppKit
import Darwin

final class PhotoApp: NSObject, NSApplicationDelegate {
    private let capture = PhotoCapture()
    private var signalSources: [DispatchSourceSignal] = []
    private var parentTimer: Timer?
    private var finished = false

    private func finish(_ result: [String: Any]) {
        guard !finished else { return }
        finished = true
        parentTimer?.invalidate()
        if let data = try? JSONSerialization.data(withJSONObject: result),
           let line = String(data: data, encoding: .utf8) {
            print(line)
            fflush(stdout)
        }
        DispatchQueue.main.async { NSApp.terminate(nil) }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let arguments = Array(CommandLine.arguments.dropFirst())
        if arguments.isEmpty {
            showSetupMessage()
            return
        }
        if arguments == ["--diagnose"] {
            finish(PhotoCapture.diagnostics())
            return
        }
        guard let outputPath = arguments.first, !outputPath.hasPrefix("--") else {
            finish(["status": "error", "message": "Missing output file."])
            return
        }

        var simulation: String?
        if arguments.count > 1 {
#if PHOTO_SIMULATION
            guard arguments.count == 3, arguments[1] == "--simulate",
                  ["success", "cancel", "error", "wait"].contains(arguments[2]) else {
                finish(["status": "error", "message": "Invalid test arguments."])
                return
            }
            simulation = arguments[2]
#else
            finish(["status": "error", "message": "Unexpected capture arguments."])
            return
#endif
        }
        watchCancellation()
        capture.start(withSimulation: simulation) { status, image, message in
            guard status == "done", let image else {
                var result: [String: Any] = ["status": status]
                if let message { result["message"] = message }
                self.finish(result)
                return
            }
            do {
                try image.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
                self.finish(["status": "done"])
            } catch {
                self.finish(["status": "error", "message": error.localizedDescription])
            }
        }
    }

    private func watchCancellation() {
        for signalNumber in [SIGTERM, SIGINT] {
            signal(signalNumber, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: signalNumber, queue: .main)
            source.setEventHandler { self.capture.cancel() }
            source.resume()
            signalSources.append(source)
        }

        // A crashed Obsidian process cannot send SIGTERM.
        let parent = getppid()
        parentTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if getppid() != parent { self.capture.cancel() }
        }
    }

    private func showSetupMessage() {
        NSApp.setActivationPolicy(.accessory)
        NSApp.activate(ignoringOtherApps: true)
        let alert = NSAlert()
        alert.messageText = "The camera helper is ready"
        alert.informativeText = "Keep ContinuityPhoto.app in Applications. In Obsidian, enable Photo from iPhone and use Take photo from iPhone from an editable note."
        alert.addButton(withTitle: "OK")
        alert.runModal()
        NSApp.terminate(nil)
    }
}

let app = NSApplication.shared
let delegate = PhotoApp()
app.delegate = delegate
app.setActivationPolicy(.prohibited)
app.run()
