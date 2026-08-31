import XCTest

/// Launches Gate Escape with `-autoplay` and lets the in-app bot (bot.js)
/// beat all 30 levels through the real engine inside iOS WebKit, then
/// exercise the fail/rescue flow. The bot reports through an accessibility
/// label the native shell keeps in sync with window.__botStatus.
///
/// Screenshots are attached to the result bundle; tools/playtest-ios.sh
/// exports them to shots/ios/.
final class GateEscapeBotTests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testAutoplayBeatsEveryLevelOnIOS() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-autoplay"]
        app.launch()

        let status = app.staticTexts["botStatus"]
        XCTAssertTrue(status.waitForExistence(timeout: 30), "bot status label never appeared — is bot.js in the build?")

        let deadline = Date().addingTimeInterval(300)
        var last = ""
        var shots = Set<String>()
        while Date() < deadline {
            let text = status.label
            if text != last {
                last = text
                NSLog("BOT> %@", text)
                if text.hasPrefix("BOT SHOT "), !shots.contains(text) {
                    shots.insert(text)
                    let name = String(text.dropFirst("BOT SHOT ".count))
                    snap(app, name: name)
                }
                if text.hasPrefix("BOT PASS") || text.hasPrefix("BOT FAIL") { break }
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        snap(app, name: "final")

        XCTAssertTrue(last.hasPrefix("BOT PASS"), "iOS autoplay verdict: \(last)")
        XCTAssertGreaterThanOrEqual(shots.count, 4, "expected screenshots at L1, L12, L22 and the fail offer; got \(shots)")
    }

    private func snap(_ app: XCUIApplication, name: String) {
        let att = XCTAttachment(screenshot: app.screenshot())
        att.name = name
        att.lifetime = .keepAlways
        add(att)
    }
}
