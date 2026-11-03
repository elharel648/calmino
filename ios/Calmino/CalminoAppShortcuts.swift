import AppIntents
import ActivityKit
import WidgetKit
import Foundation
import ActivityKitModule

// Start-timer intents in the MAIN APP target, exposed to Siri, Spotlight and
// the Action button through CalminoShortcuts below.
//
// The widget extension has same-named copies (StartTimerIntents.swift). Keeping
// the type names identical lets iOS run widget and Control Center taps of these
// LiveActivityIntents here, in the app process — the only place
// Activity.request() is allowed — same as TimerAppIntents.swift does for
// pause/resume/stop.

private let kShortcutsAppGroup = "group.com.calmparent.shared"

@available(iOS 16.2, *)
private enum ShortcutStartHelpers {
    static var defaults: UserDefaults? { UserDefaults(suiteName: kShortcutsAppGroup) }

    static func babyName() -> String {
        defaults?.string(forKey: "widget_babyName") ?? "התינוק"
    }

    /// Mirrors the running timer into the App Group so the home-screen widget counts it.
    static func writeWidgetActiveTimer(type: String, label: String) {
        let d = defaults
        d?.set(type, forKey: "widget_activeTimerType")
        d?.set(Date().timeIntervalSince1970, forKey: "widget_activeTimerStartedAt")
        d?.set(label, forKey: "widget_activeTimerLabel")
        d?.set(false, forKey: "widget_activeTimerIsPaused")
        d?.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: "LastEventWidget")
    }

    /// Records the start for the JS app. There is a single pending slot, so never
    /// overwrite an unsynced action (e.g. a lock-screen stop that still has to be
    /// saved) with a start, which JS doesn't act on anyway.
    static func writePendingStart(timerType: String, side: String? = nil) {
        let d = defaults
        if d?.string(forKey: "pendingTimerAction") != nil { return }
        d?.set("start", forKey: "pendingTimerAction")
        d?.set(timerType, forKey: "pendingTimerType")
        d?.set(Date().timeIntervalSince1970, forKey: "pendingTimerTimestamp")
        if let s = side { d?.set(s, forKey: "pendingTimerSide") }
    }
}

// MARK: - Start Sleep

@available(iOS 16.2, *)
struct StartSleepIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "התחל שינה"
    static var description = IntentDescription("התחל מעקב שינה לתינוק")

    init() {}

    func perform() async throws -> some IntentResult {
        if !Activity<SleepActivityAttributes>.activities.isEmpty {
            return .result()
        }

        let baby = ShortcutStartHelpers.babyName()
        let attributes = SleepActivityAttributes(babyName: baby, babyEmoji: "👶")
        let state = SleepActivityAttributes.ContentState(
            startTime: Date(),
            babyName: baby,
            sleepType: "שינה",
            isAwake: false,
            isPaused: false,
            activeSeconds: 0,
            quality: nil
        )
        do {
            _ = try Activity.request(attributes: attributes, content: .init(state: state, staleDate: nil))
        } catch {
            // ActivityKit can refuse (e.g. Live Activities disabled); the widget still updates.
        }

        ShortcutStartHelpers.writeWidgetActiveTimer(type: "sleep", label: "שינה")
        ShortcutStartHelpers.writePendingStart(timerType: "sleep")
        return .result()
    }
}

// MARK: - Start Breastfeeding (Left / Right)

@available(iOS 16.2, *)
struct StartBreastfeedingLeftIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "התחל הנקה — צד שמאל"
    init() {}
    func perform() async throws -> some IntentResult {
        await startBreastfeeding(side: "left")
        return .result()
    }
}

@available(iOS 16.2, *)
struct StartBreastfeedingRightIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "התחל הנקה — צד ימין"
    init() {}
    func perform() async throws -> some IntentResult {
        await startBreastfeeding(side: "right")
        return .result()
    }
}

@available(iOS 16.2, *)
private func startBreastfeeding(side: String) async {
    // A running session just switches sides instead of starting a duplicate.
    if let existing = Activity<BreastfeedingActivityAttributes>.activities.first {
        let s = existing.content.state
        var l = s.leftSideSeconds
        var r = s.rightSideSeconds
        if let start = s.sideStartTime, !s.isPaused {
            let e = Int(Date().timeIntervalSince(start))
            if s.activeSide == "left" { l += e } else { r += e }
        }
        let newState = BreastfeedingActivityAttributes.ContentState(
            leftSideSeconds: l,
            rightSideSeconds: r,
            activeSide: side,
            sideStartTime: Date(),
            isPaused: false
        )
        await existing.update(ActivityContent(state: newState, staleDate: nil))
    } else {
        let attributes = BreastfeedingActivityAttributes(babyName: ShortcutStartHelpers.babyName())
        let state = BreastfeedingActivityAttributes.ContentState(
            leftSideSeconds: 0,
            rightSideSeconds: 0,
            activeSide: side,
            sideStartTime: Date(),
            isPaused: false
        )
        do {
            _ = try Activity.request(attributes: attributes, content: .init(state: state, staleDate: nil))
        } catch {
            // Same fallback as StartSleepIntent.
        }
    }

    let label = side == "left" ? "הנקה — צד שמאל" : "הנקה — צד ימין"
    ShortcutStartHelpers.writeWidgetActiveTimer(type: "breastfeeding", label: label)
    ShortcutStartHelpers.writePendingStart(timerType: "breastfeeding", side: side)
}

// MARK: - Start Bottle

@available(iOS 16.2, *)
struct StartBottleIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "התחל בקבוק"
    init() {}

    func perform() async throws -> some IntentResult {
        if !Activity<MealActivityAttributes>.activities.isEmpty {
            return .result()
        }

        let baby = ShortcutStartHelpers.babyName()
        let attributes = MealActivityAttributes(babyName: baby, babyEmoji: "👶")
        let state = MealActivityAttributes.ContentState(
            startTime: Date(),
            mealType: "בקבוק",
            babyName: baby,
            foodItems: [],
            isPaused: false,
            progress: 0
        )
        do {
            _ = try Activity.request(attributes: attributes, content: .init(state: state, staleDate: nil))
        } catch {
            // Same fallback as StartSleepIntent.
        }

        ShortcutStartHelpers.writeWidgetActiveTimer(type: "bottle", label: "בקבוק")
        ShortcutStartHelpers.writePendingStart(timerType: "bottle")
        return .result()
    }
}

// MARK: - App Shortcuts (Siri, Spotlight, Action button)

// Phrases are keyed in English; Hebrew lives in AppShortcuts.xcstrings.
// Every phrase must contain the app name exactly once.
@available(iOS 17.0, *)
struct CalminoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StartSleepIntent(),
            phrases: [
                "Start sleep in \(.applicationName)",
                "Start a nap in \(.applicationName)",
                "\(.applicationName) sleep",
            ],
            shortTitle: "שינה",
            systemImageName: "moon.fill"
        )
        AppShortcut(
            intent: StartBreastfeedingLeftIntent(),
            phrases: [
                "Start breastfeeding left in \(.applicationName)",
                "\(.applicationName) left side",
            ],
            shortTitle: "הנקה שמאל",
            systemImageName: "heart.fill"
        )
        AppShortcut(
            intent: StartBreastfeedingRightIntent(),
            phrases: [
                "Start breastfeeding right in \(.applicationName)",
                "\(.applicationName) right side",
            ],
            shortTitle: "הנקה ימין",
            systemImageName: "heart.fill"
        )
        AppShortcut(
            intent: StartBottleIntent(),
            phrases: [
                "Start a bottle in \(.applicationName)",
                "\(.applicationName) bottle",
            ],
            shortTitle: "בקבוק",
            systemImageName: "waterbottle.fill"
        )
    }
}
