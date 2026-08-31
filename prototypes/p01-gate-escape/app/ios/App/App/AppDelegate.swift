import UIKit
import WebKit
import Capacitor

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
            NSLog("BOT %@", s)
            if s.hasPrefix("BOT PASS") || s.hasPrefix("BOT FAIL") {
                self.botTimer?.invalidate()
                self.botTimer = nil
            }
        }
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
