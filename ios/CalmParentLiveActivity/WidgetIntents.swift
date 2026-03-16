//
//  WidgetIntents.swift
//  CalmParentLiveActivity
//
//  AppIntents for quick-logging actions directly from the home screen widget.
//  Actions are stored in App Group UserDefaults; the React Native app reads
//  them on foreground and syncs to Firestore.
//

import AppIntents
import WidgetKit
import Foundation

// MARK: - Quick Log Feed Intent

@available(iOS 17.0, *)
struct QuickLogFeedIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Feed"
    static let description: IntentDescription = "Quick-log a bottle feed from the widget"
    static let openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.com.harel.calmparentapp")
        // Store the pending action
        shared?.set("feed", forKey: "calmino_widget_action")
        shared?.set("bottle", forKey: "calmino_widget_action_subtype")
        shared?.set(Date().timeIntervalSince1970, forKey: "calmino_widget_action_ts")

        // Optimistic update: bump feed count & timestamp for immediate widget refresh
        let currentCount = shared?.integer(forKey: "widget_feedCount") ?? 0
        shared?.set(currentCount + 1, forKey: "widget_feedCount")
        shared?.set(Date().timeIntervalSince1970, forKey: "widget_lastFeedTimestamp")
        shared?.set("bottle", forKey: "widget_lastFeedType")

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Quick Log Diaper Intent

@available(iOS 17.0, *)
struct QuickLogDiaperIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Diaper"
    static let description: IntentDescription = "Quick-log a wet diaper from the widget"
    static let openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.com.harel.calmparentapp")
        shared?.set("diaper", forKey: "calmino_widget_action")
        shared?.set("wet", forKey: "calmino_widget_action_subtype")
        shared?.set(Date().timeIntervalSince1970, forKey: "calmino_widget_action_ts")

        let currentCount = shared?.integer(forKey: "widget_diaperCount") ?? 0
        shared?.set(currentCount + 1, forKey: "widget_diaperCount")
        shared?.set(Date().timeIntervalSince1970, forKey: "widget_lastDiaperTimestamp")
        shared?.set("wet", forKey: "widget_lastDiaperType")

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Quick Start Sleep Intent

@available(iOS 17.0, *)
struct QuickStartSleepIntent: AppIntent {
    static let title: LocalizedStringResource = "Start Sleep"
    static let description: IntentDescription = "Start a sleep timer from the widget"
    static let openAppWhenRun: Bool = true  // Opens app to show sleep timer UI

    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.com.harel.calmparentapp")
        shared?.set("start_sleep", forKey: "calmino_widget_action")
        shared?.set(Date().timeIntervalSince1970, forKey: "calmino_widget_action_ts")
        return .result()
    }
}
