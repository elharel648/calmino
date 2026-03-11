//
//  TimerIntents.swift
//  CalmParentLiveActivity
//
//  AppIntents for pause/resume without opening the app.
//

import AppIntents
import ActivityKit
import Foundation

// MARK: - Pause Timer Intent

@available(iOS 17.0, *)
struct PauseTimerIntent: AppIntent {
    static let title: LocalizedStringResource = "Pause Timer"
    static let openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult {
        // Update Meal activities
        for activity in Activity<MealActivityAttributes>.activities {
            var state = activity.content.state
            state.isPaused = true
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
        // Update Sleep activities
        for activity in Activity<SleepActivityAttributes>.activities {
            var state = activity.content.state
            state.isPaused = true
            state.activeSeconds = state.activeSeconds + Int(Date().timeIntervalSince(state.startTime))
            state.startTime = Date()
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
        // Store intent in shared App Group so RN app can sync on next foreground
        let shared = UserDefaults(suiteName: "group.com.harel.calmparentapp")
        shared?.set("paused", forKey: "calmino_timer_intent")
        shared?.set(Date().timeIntervalSince1970, forKey: "calmino_timer_intent_ts")
        return .result()
    }
}

// MARK: - Resume Timer Intent

@available(iOS 17.0, *)
struct ResumeTimerIntent: AppIntent {
    static let title: LocalizedStringResource = "Resume Timer"
    static let openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult {
        // Update Meal activities
        for activity in Activity<MealActivityAttributes>.activities {
            var state = activity.content.state
            state.isPaused = false
            state.startTime = Date()
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
        // Update Sleep activities
        for activity in Activity<SleepActivityAttributes>.activities {
            var state = activity.content.state
            state.isPaused = false
            state.startTime = Date()
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
        // Store intent in shared App Group so RN app can sync on next foreground
        let shared = UserDefaults(suiteName: "group.com.harel.calmparentapp")
        shared?.set("resumed", forKey: "calmino_timer_intent")
        shared?.set(Date().timeIntervalSince1970, forKey: "calmino_timer_intent_ts")
        return .result()
    }
}
