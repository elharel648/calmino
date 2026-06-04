//
//  StartTimerIntents.swift
//  CalmParentLiveActivity
//
//  App Intents that START timers directly from the Home Screen Widget —
//  no app launch required. They create the matching Live Activity (so the
//  lock screen / Dynamic Island stay in sync) and mirror the running timer
//  state into the App Group so the widget can render a live counting timer.
//
//  IMPORTANT: each intent is `LiveActivityIntent` because it needs to call
//  `Activity.request(...)`, which runs in the main app process. Tapping a
//  widget button will wake the app silently and run the intent there.
//

import AppIntents
import ActivityKit
import WidgetKit
import Foundation

// MARK: - Shared helpers

@available(iOS 16.2, *)
private struct WidgetStartHelpers {
    /// Reads the active baby's display name from the shared App Group.
    static func babyName() -> String {
        return UserDefaults(suiteName: appGroupID)?.string(forKey: "widget_babyName") ?? "התינוק"
    }

    /// Writes the running-timer state so the widget shows a live counting
    /// timer immediately and reloads the widget timeline.
    static func writeWidgetActiveTimer(type: String, label: String, startedAt: Date = Date()) {
        let d = UserDefaults(suiteName: appGroupID)
        d?.set(type, forKey: "widget_activeTimerType")
        d?.set(startedAt.timeIntervalSince1970, forKey: "widget_activeTimerStartedAt")
        d?.set(label, forKey: "widget_activeTimerLabel")
        d?.set(false, forKey: "widget_activeTimerIsPaused")
        d?.synchronize()
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "LastEventWidget")
        }
    }

    /// Writes a pending "start" action so the JS app can sync on next foreground.
    static func writePendingStart(timerType: String, side: String? = nil) {
        let d = UserDefaults(suiteName: appGroupID)
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
        // Don't start a duplicate — if there's already a running sleep activity, just return.
        if !Activity<SleepActivityAttributes>.activities.isEmpty {
            return .result()
        }

        let baby = WidgetStartHelpers.babyName()
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
            _ = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: nil)
            )
        } catch {
            // ActivityKit can reject the request (e.g. no permission). We still
            // write widget state so the widget feels responsive, and JS will
            // reconcile when the app foregrounds next.
        }

        WidgetStartHelpers.writeWidgetActiveTimer(type: "sleep", label: "שינה")
        WidgetStartHelpers.writePendingStart(timerType: "sleep")
        return .result()
    }
}

// MARK: - Start Breastfeeding (Left / Right)

@available(iOS 16.2, *)
struct StartBreastfeedingLeftIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "התחל הנקה — צד שמאל"
    init() {}
    func perform() async throws -> some IntentResult {
        try await startBreastfeeding(side: "left")
        return .result()
    }
}

@available(iOS 16.2, *)
struct StartBreastfeedingRightIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "התחל הנקה — צד ימין"
    init() {}
    func perform() async throws -> some IntentResult {
        try await startBreastfeeding(side: "right")
        return .result()
    }
}

@available(iOS 16.2, *)
private func startBreastfeeding(side: String) async throws {
    let baby = WidgetStartHelpers.babyName()

    // If there's a running breastfeeding activity, just switch sides instead of duplicating.
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
        let attributes = BreastfeedingActivityAttributes(babyName: baby)
        let state = BreastfeedingActivityAttributes.ContentState(
            leftSideSeconds: 0,
            rightSideSeconds: 0,
            activeSide: side,
            sideStartTime: Date(),
            isPaused: false
        )
        do {
            _ = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: nil)
            )
        } catch {
            // Same fallback as StartSleepIntent: widget still updates.
        }
    }

    let label = side == "left" ? "הנקה — צד שמאל" : "הנקה — צד ימין"
    WidgetStartHelpers.writeWidgetActiveTimer(type: "breastfeeding", label: label)
    WidgetStartHelpers.writePendingStart(timerType: "breastfeeding", side: side)
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

        let baby = WidgetStartHelpers.babyName()
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
            _ = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: nil)
            )
        } catch {
            // fall through — widget still updates
        }

        WidgetStartHelpers.writeWidgetActiveTimer(type: "bottle", label: "בקבוק")
        WidgetStartHelpers.writePendingStart(timerType: "bottle")
        return .result()
    }
}
