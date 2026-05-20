import AppIntents
import ActivityKit
import Foundation
import CoreFoundation
import AVFoundation
import ActivityKitModule

// iOS executes LiveActivityIntent.perform() in the MAIN APP process.
// Stop intent — has full implementation.
@available(iOS 16.2, *)
struct StopWhiteNoiseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "עצור רעש לבן"
    static var isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        for activity in Activity<WhiteNoiseActivityAttributes>.activities {
            await activity.end(
                ActivityContent(state: activity.content.state, staleDate: nil),
                dismissalPolicy: .immediate
            )
        }
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        let defaults = UserDefaults(suiteName: "group.com.calmparent.shared")
        defaults?.set("stop", forKey: "pendingTimerAction")
        defaults?.set("white_noise", forKey: "pendingTimerType")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingTimerTimestamp")
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName("com.calmparent.stop-white-noise" as CFString),
            nil, nil, true
        )
        return .result()
    }
}

// Pause intent — signals the main app to pause audio.
@available(iOS 16.2, *)
struct PauseWhiteNoiseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "השהה רעש לבן"
    static var isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        for activity in Activity<WhiteNoiseActivityAttributes>.activities {
            let s = activity.content.state
            if !s.isPaused {
                let elapsed = s.elapsedSeconds + Int(Date().timeIntervalSince(s.startTime))
                let newState = WhiteNoiseActivityAttributes.ContentState(
                    startTime: s.startTime,
                    isPaused: true,
                    elapsedSeconds: elapsed
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
            }
        }
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName("com.calmparent.pause-white-noise" as CFString),
            nil, nil, true
        )
        return .result()
    }
}

// Resume intent — signals the main app to resume audio.
@available(iOS 16.2, *)
struct ResumeWhiteNoiseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "המשך רעש לבן"
    static var isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        for activity in Activity<WhiteNoiseActivityAttributes>.activities {
            let s = activity.content.state
            if s.isPaused {
                let newStart = Date().addingTimeInterval(-Double(s.elapsedSeconds))
                let newState = WhiteNoiseActivityAttributes.ContentState(
                    startTime: newStart,
                    isPaused: false,
                    elapsedSeconds: s.elapsedSeconds
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
            }
        }
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName("com.calmparent.resume-white-noise" as CFString),
            nil, nil, true
        )
        return .result()
    }
}
