import UIKit
import WebKit
import Capacitor
import CoreHaptics

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // MARK: - Autoplay bot (launch with `-autoplay`; used by AppUITests)
    //
    // The web layer ships tools/bot-runtime.js as bot.js. When the app is
    // launched with the `-autoplay` argument we (1) wait for the game engine
    // and bot to exist inside the WKWebView, (2) call GE_BOT.run(), and
    // (3) mirror window.__botStatus into a small accessibility label so the
    // XCUITest can read progress and the final BOT PASS / BOT FAIL verdict.
    private var botLabel: UILabel?
    private var botTimer: Timer?
    private var botStarted = false

    private var botEnabled: Bool {
        ProcessInfo.processInfo.arguments.contains("-autoplay")
    }

    private var webView: WKWebView? {
        (window?.rootViewController as? CAPBridgeViewController)?.bridge?.webView
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if botEnabled {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.startBot() }
        }
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-studio"), i + 1 < args.count, let url = URL(string: args[i + 1]) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.startStudio(url) }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in self?.attachHaptics() }
        return true
    }

    private func startBot() {
        guard let root = window?.rootViewController else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.startBot() }
            return
        }
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = UIFont.monospacedSystemFont(ofSize: 11, weight: .semibold)
        label.textColor = .white
        label.backgroundColor = UIColor(white: 0, alpha: 0.55)
        label.textAlignment = .center
        label.numberOfLines = 2
        label.isUserInteractionEnabled = false
        label.isAccessibilityElement = true
        label.accessibilityIdentifier = "botStatus"
        label.text = "BOT waiting for engine"
        root.view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: root.view.leadingAnchor),
            label.trailingAnchor.constraint(equalTo: root.view.trailingAnchor),
            label.bottomAnchor.constraint(equalTo: root.view.safeAreaLayoutGuide.bottomAnchor),
            label.heightAnchor.constraint(greaterThanOrEqualToConstant: 18),
        ])
        botLabel = label
        botTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in self?.botTick() }
        NSLog("BOT armed")
    }

    private func botTick() {
        guard let wv = webView else { return }
        if !botStarted {
            wv.evaluateJavaScript("!!(window.GE && window.GE.L && window.GE_BOT)") { [weak self] result, _ in
                guard let self = self, (result as? Bool) == true, !self.botStarted else { return }
                self.botStarted = true
                NSLog("BOT starting")
                wv.evaluateJavaScript("window.GE_BOT.run(); true", completionHandler: nil)
            }
            return
        }
        wv.evaluateJavaScript("String(window.__botStatus || '')") { [weak self] result, _ in
            guard let self = self, let s = result as? String, !s.isEmpty, s != self.botLabel?.text else { return }
            self.botLabel?.text = s
            // store-quality screenshots: the status strip goes invisible while a shot is staged
            // (the accessibility label still carries the text, so the XCUITest keeps reading it)
            let hide = s.hasPrefix("BOT SHOT")
            self.botLabel?.textColor = hide ? .clear : .white
            self.botLabel?.backgroundColor = hide ? .clear : UIColor(white: 0, alpha: 0.55)
            NSLog("BOT %@", s)
            if s.hasPrefix("BOT PASS") || s.hasPrefix("BOT FAIL") {
                self.botTimer?.invalidate()
                self.botTimer = nil
            }
        }
    }

    // MARK: - Haptics bridge
    //
    // game.js posts beat names ('pick', 'step', 'settle', 'exit', 'win', 'low', 'fail') to
    // window.webkit.messageHandlers.haptics; HapticsDriver below plays them on prepared,
    // reused UIKit feedback generators. Registered unconditionally: with no handler (web,
    // or before attach) the JS side is a silent no-op.
    private let haptics = HapticsDriver()
    private func attachHaptics() {
        guard let wv = webView else {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in self?.attachHaptics() }
            return
        }
        wv.configuration.userContentController.add(haptics, name: "haptics")
        NSLog("HAPTICS bridge attached")
    }

    // MARK: - Studio bridge (launch with `-studio http://127.0.0.1:7411`)
    //
    // Lets the reviewer studio console drive this app in the Simulator: the app polls
    // the console for JavaScript to run in the WKWebView (state reads, button taps,
    // synthetic pointer gestures) and posts each result back. Screenshots are taken
    // host-side with `xcrun simctl io`. Debug/simulator use only.
    private var studioURL: URL?
    private var studioTimer: Timer?
    private var studioBusy = false

    private func startStudio(_ url: URL) {
        studioURL = url
        studioTimer = Timer.scheduledTimer(withTimeInterval: 0.06, repeats: true) { [weak self] _ in self?.studioTick() }
        NSLog("STUDIO bridge polling %@", url.absoluteString)
    }

    private func studioTick() {
        guard !studioBusy, let base = studioURL, let wv = webView else { return }
        studioBusy = true
        let task = URLSession.shared.dataTask(with: base.appendingPathComponent("bridge/next")) { [weak self] data, resp, _ in
            guard let self = self else { return }
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200, let data = data,
                  let cmd = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let id = cmd["id"] as? String, let js = cmd["js"] as? String else {
                self.studioBusy = false
                return
            }
            DispatchQueue.main.async {
                wv.evaluateJavaScript(js) { result, error in
                    var body: [String: Any] = ["id": id]
                    if let error = error { body["error"] = error.localizedDescription }
                    else if let r = result as? String { body["result"] = r }
                    else if let r = result as? NSNumber { body["result"] = r.stringValue }
                    var post = URLRequest(url: base.appendingPathComponent("bridge/result"))
                    post.httpMethod = "POST"
                    post.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    post.httpBody = try? JSONSerialization.data(withJSONObject: body)
                    URLSession.shared.dataTask(with: post) { _, _, _ in self.studioBusy = false }.resume()
                }
            }
        }
        task.resume()
    }

    // MARK: - Standard lifecycle

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// MARK: - Haptics driver
//
// UIKit feedback generators as the default (selection < impact < notification), instances
// reused and prepare()d around predictable follow-ups, per the hybrid-casual design playbook.
// Core Haptics is reserved for the ONE signature material pattern — the gate-exit "whoosh"
// (a soft transient into a short decaying slide); anywhere it is unsupported or fails, the
// exit falls back to the plain medium impact forever. Simulators and non-haptic devices
// no-op safely at the UIKit layer.
final class HapticsDriver: NSObject, WKScriptMessageHandler {
    private let selection = UISelectionFeedbackGenerator()
    private let impactLight = UIImpactFeedbackGenerator(style: .light)
    private let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private let notification = UINotificationFeedbackGenerator()
    private var engine: CHHapticEngine?
    private var engineFailed = false

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let kind = message.body as? String else { return }
        DispatchQueue.main.async { [weak self] in self?.play(kind) }
    }

    private func play(_ kind: String) {
        switch kind {
        case "pick":
            selection.selectionChanged()
            selection.prepare()      // cell steps usually follow immediately
            impactMedium.prepare()   // and an exit may end this very drag
        case "step":
            selection.selectionChanged()
            selection.prepare()
        case "settle":
            impactLight.impactOccurred()
            impactLight.prepare()
        case "exit":
            if !playWhoosh() { impactMedium.impactOccurred() }
            impactMedium.prepare()
            notification.prepare()   // a win or the fail sheet may be next
        case "win":
            notification.notificationOccurred(.success)
        case "low":
            notification.notificationOccurred(.warning)
            notification.prepare()
        case "fail":
            notification.notificationOccurred(.error)
        default:
            break
        }
    }

    private func playWhoosh() -> Bool {
        guard !engineFailed, CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return false }
        do {
            if engine == nil {
                let e = try CHHapticEngine()
                e.resetHandler = { [weak self] in try? self?.engine?.start() }
                e.stoppedHandler = { _ in }
                engine = e
            }
            guard let engine = engine else { return false }
            try engine.start()
            let events = [
                CHHapticEvent(eventType: .hapticTransient, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.7),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.55),
                ], relativeTime: 0),
                CHHapticEvent(eventType: .hapticContinuous, parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.3),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.25),
                ], relativeTime: 0.012, duration: 0.16),
            ]
            let player = try engine.makePlayer(with: CHHapticPattern(events: events, parameters: []))
            try player.start(atTime: 0)
            return true
        } catch {
            engineFailed = true
            return false
        }
    }
}
