//
//  TimerIntents.swift
//  CalmParentLiveActivity
//
//  App Intents for Live Activity buttons — execute WITHOUT opening the app.
//  Uses App Groups shared UserDefaults for state sync with React Native.
//

import AppIntents
import ActivityKit
import Foundation
import CoreFoundation
import WidgetKit

// MARK: - Shared Constants

let appGroupID = "group.com.calmparent.shared"

enum TimerAction: String {
    case pause
    case resume
    case stop
    case switchSide
}

// MARK: - Shared State (UserDefaults)

struct SharedTimerState {
    static let defaults = UserDefaults(suiteName: appGroupID)

    static func writePendingAction(_ action: TimerAction, timerType: String, elapsedSeconds: Int? = nil, side: String? = nil) {
        defaults?.set(action.rawValue, forKey: "pendingTimerAction")
        defaults?.set(timerType, forKey: "pendingTimerType")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingTimerTimestamp")
        if let s = elapsedSeconds {
            defaults?.set(s, forKey: "pendingTimerElapsed")
        }
        if let s = side {
            defaults?.set(s, forKey: "pendingTimerSide")
        }
    }

    // ───── Home Screen Widget mirror ────────────────────────────────────────
    // The Home Screen Widget reads widget_activeTimer* keys. Live Activity
    // intents must mirror their state changes here too, otherwise the widget
    // keeps showing the old pause/run state until the user re-opens the app.

    static func setWidgetTimerPaused(_ isPaused: Bool) {
        defaults?.set(isPaused, forKey: "widget_activeTimerIsPaused")
        defaults?.synchronize()
        reloadWidget()
    }

    static func clearWidgetActiveTimer() {
        defaults?.removeObject(forKey: "widget_activeTimerType")
        defaults?.removeObject(forKey: "widget_activeTimerStartedAt")
        defaults?.removeObject(forKey: "widget_activeTimerLabel")
        defaults?.removeObject(forKey: "widget_activeTimerIsPaused")
        defaults?.synchronize()
        reloadWidget()
    }

    // When resuming after a pause we need to push the start time forward by the
    // paused duration so the widget's `Text(_, style: .timer)` keeps counting
    // from the right place — otherwise it would jump to include paused time.
    static func adjustWidgetStartForResume(elapsedSecondsBeforePause: Int) {
        let newStart = Date().timeIntervalSince1970 - Double(elapsedSecondsBeforePause)
        defaults?.set(newStart, forKey: "widget_activeTimerStartedAt")
        defaults?.set(false, forKey: "widget_activeTimerIsPaused")
        defaults?.synchronize()
        reloadWidget()
    }

    private static func reloadWidget() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: "LastEventWidget")
        }
    }
}

// MARK: - App Intents

// ──────────────────────────────────────────────────────────────────────────────
// StopWhiteNoiseIntent
// Zero-parameter intent — stops ALL white noise activities and signals the main
// app's audio engine. No @Parameter means no serialization edge-cases.
// ──────────────────────────────────────────────────────────────────────────────
@available(iOS 16.2, *)
struct StopWhiteNoiseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "עצור רעש לבן"
    static var isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        for activity in Activity<WhiteNoiseActivityAttributes>.activities {
            SharedTimerState.writePendingAction(.stop, timerType: "white_noise", elapsedSeconds: 0)
            await activity.end(
                ActivityContent(state: activity.content.state, staleDate: nil),
                dismissalPolicy: .immediate
            )
            CFNotificationCenterPostNotification(
                CFNotificationCenterGetDarwinNotifyCenter(),
                CFNotificationName("com.calmparent.stop-white-noise" as CFString),
                nil, nil, true
            )
        }
        return .result()
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// PauseWhiteNoiseIntent — pauses the white noise audio
// ──────────────────────────────────────────────────────────────────────────────
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
                SharedTimerState.writePendingAction(.pause, timerType: "white_noise", elapsedSeconds: elapsed)
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

// ──────────────────────────────────────────────────────────────────────────────
// ResumeWhiteNoiseIntent — resumes the white noise audio
// ──────────────────────────────────────────────────────────────────────────────
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
                SharedTimerState.writePendingAction(.resume, timerType: "white_noise")
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

// ──────────────────────────────────────────────────────────────────────────────
// EndActivityIntent
// Ends a specific Live Activity by ID — used by Sleep / Feeding / Breastfeeding
// buttons. White Noise uses StopWhiteNoiseIntent (no parameters) instead.
// ──────────────────────────────────────────────────────────────────────────────
@available(iOS 17.0, *)
struct EndActivityIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "סיים פעילות"
    static var isDiscoverable: Bool = false

    @Parameter(title: "Activity ID")
    var activityId: String

    init() { activityId = "" }
    init(activityId: String) { self.activityId = activityId }

    func perform() async throws -> some IntentResult {
        // ── Sleep ─────────────────────────────────────────────────────────
        for activity in Activity<SleepActivityAttributes>.activities
            where activity.id == activityId
        {
            let s = activity.content.state
            let elapsed = s.activeSeconds + (s.isPaused ? 0 : Int(Date().timeIntervalSince(s.startTime)))
            SharedTimerState.writePendingAction(.stop, timerType: "sleep", elapsedSeconds: elapsed)
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
            return .result()
        }

        // ── Breastfeeding ─────────────────────────────────────────────────
        for activity in Activity<BreastfeedingActivityAttributes>.activities
            where activity.id == activityId
        {
            let s = activity.content.state
            var l = s.leftSideSeconds
            var r = s.rightSideSeconds
            if !s.isPaused, let start = s.sideStartTime {
                let e = Int(Date().timeIntervalSince(start))
                if s.activeSide == "left" { l += e } else { r += e }
            }
            SharedTimerState.writePendingAction(.stop, timerType: "הנקה", elapsedSeconds: l + r)
            SharedTimerState.defaults?.set("L\(l)R\(r)", forKey: "pendingSide")
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
            return .result()
        }

        // ── Feeding (bottle / pumping) ─────────────────────────────────────
        for activity in Activity<MealActivityAttributes>.activities
            where activity.id == activityId
        {
            let s = activity.content.state
            let elapsed = s.isPaused ? Int(s.progress) : Int(Date().timeIntervalSince(s.startTime))
            SharedTimerState.writePendingAction(.stop, timerType: s.mealType, elapsedSeconds: elapsed)
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
            return .result()
        }

        return .result()
    }
}

@available(iOS 16.2, *)
struct PauseTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "השהה טיימר"
    static var description = IntentDescription("השהה את הטיימר המופעל")
    
    init() {}
    
    func perform() async throws -> some IntentResult {
        // Sleep
        for activity in Activity<SleepActivityAttributes>.activities {
            let currentState = activity.content.state
            if !currentState.isPaused {
                let elapsed = Int(Date().timeIntervalSince(currentState.startTime)) + currentState.activeSeconds
                let newState = SleepActivityAttributes.ContentState(
                    startTime: currentState.startTime,
                    babyName: currentState.babyName,
                    sleepType: currentState.sleepType,
                    isAwake: true,
                    isPaused: true,
                    activeSeconds: elapsed,
                    quality: currentState.quality
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.pause, timerType: "sleep", elapsedSeconds: elapsed)
            }
        }
        
        // Feeding
        for activity in Activity<MealActivityAttributes>.activities {
            let currentState = activity.content.state
            if !currentState.isPaused {
                let elapsed = Int(Date().timeIntervalSince(currentState.startTime))
                let newState = MealActivityAttributes.ContentState(
                    startTime: currentState.startTime,
                    mealType: currentState.mealType,
                    babyName: currentState.babyName,
                    foodItems: currentState.foodItems,
                    isPaused: true,
                    progress: Double(elapsed)
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.pause, timerType: currentState.mealType, elapsedSeconds: elapsed)
            }
        }
        
        // Breastfeeding
        for activity in Activity<BreastfeedingActivityAttributes>.activities {
            let currentState = activity.content.state
            if !currentState.isPaused, let start = currentState.sideStartTime {
                let elapsed = Int(Date().timeIntervalSince(start))
                let l = currentState.leftSideSeconds + (currentState.activeSide == "left" ? elapsed : 0)
                let r = currentState.rightSideSeconds + (currentState.activeSide == "right" ? elapsed : 0)

                let newState = BreastfeedingActivityAttributes.ContentState(
                    leftSideSeconds: l,
                    rightSideSeconds: r,
                    activeSide: currentState.activeSide,
                    sideStartTime: nil,
                    isPaused: true
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.pause, timerType: "breastfeeding")
            }
        }

        // WhiteNoise (Only Stop supported usually, but just in case)

        // Mirror paused state into the Home Screen Widget so the widget swaps
        // its Pause button for a Resume button immediately.
        SharedTimerState.setWidgetTimerPaused(true)

        return .result()
    }
}

@available(iOS 16.2, *)
struct ResumeTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "המשך טיימר"
    
    init() {}
    
    func perform() async throws -> some IntentResult {
        // Sleep
        for activity in Activity<SleepActivityAttributes>.activities {
            let currentState = activity.content.state
            if currentState.isPaused {
                let newState = SleepActivityAttributes.ContentState(
                    startTime: Date(),
                    babyName: currentState.babyName,
                    sleepType: currentState.sleepType,
                    isAwake: false,
                    isPaused: false,
                    activeSeconds: currentState.activeSeconds,
                    quality: currentState.quality
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.resume, timerType: "sleep")
            }
        }
        
        // Feeding
        for activity in Activity<MealActivityAttributes>.activities {
            let currentState = activity.content.state
            if currentState.isPaused {
                let newStart = Date().addingTimeInterval(-currentState.progress)
                let newState = MealActivityAttributes.ContentState(
                    startTime: newStart,
                    mealType: currentState.mealType,
                    babyName: currentState.babyName,
                    foodItems: currentState.foodItems,
                    isPaused: false,
                    progress: 0
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.resume, timerType: currentState.mealType)
            }
        }
        
        // Breastfeeding
        for activity in Activity<BreastfeedingActivityAttributes>.activities {
            let currentState = activity.content.state
            if currentState.isPaused {
                let newState = BreastfeedingActivityAttributes.ContentState(
                    leftSideSeconds: currentState.leftSideSeconds,
                    rightSideSeconds: currentState.rightSideSeconds,
                    activeSide: currentState.activeSide,
                    sideStartTime: Date(),
                    isPaused: false
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.resume, timerType: "breastfeeding")
            }
        }

        // Mirror resume into the Home Screen Widget. Push the start timestamp
        // back by the elapsed seconds we tracked so the running timer picks up
        // from where it left off (and not from 00:00).
        let elapsedBeforePause = SharedTimerState.defaults?.integer(forKey: "pendingTimerElapsed") ?? 0
        SharedTimerState.adjustWidgetStartForResume(elapsedSecondsBeforePause: elapsedBeforePause)

        return .result()
    }
}

@available(iOS 16.2, *)
struct StopTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "סיים טיימר"

    init() {}

    func perform() async throws -> some IntentResult {
        // Sleep
        for activity in Activity<SleepActivityAttributes>.activities {
            let s = activity.content.state
            let elapsed = s.activeSeconds + (s.isPaused ? 0 : Int(Date().timeIntervalSince(s.startTime)))
            SharedTimerState.writePendingAction(.stop, timerType: "sleep", elapsedSeconds: elapsed)
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
        }
        // Feeding
        for activity in Activity<MealActivityAttributes>.activities {
            let s = activity.content.state
            let elapsed = s.isPaused ? Int(s.progress) : Int(Date().timeIntervalSince(s.startTime))
            SharedTimerState.writePendingAction(.stop, timerType: s.mealType, elapsedSeconds: elapsed)
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
        }
        // Breastfeeding
        for activity in Activity<BreastfeedingActivityAttributes>.activities {
            let s = activity.content.state
            var l = s.leftSideSeconds
            var r = s.rightSideSeconds
            if !s.isPaused, let start = s.sideStartTime {
                let e = Int(Date().timeIntervalSince(start))
                if s.activeSide == "left" { l += e } else { r += e }
            }
            SharedTimerState.writePendingAction(.stop, timerType: "הנקה", elapsedSeconds: l + r)
            SharedTimerState.defaults?.set("L\(l)R\(r)", forKey: "pendingSide")
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
        }
        // White Noise
        for activity in Activity<WhiteNoiseActivityAttributes>.activities {
            let s = activity.content.state
            SharedTimerState.writePendingAction(.stop, timerType: "white_noise", elapsedSeconds: 0)
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
            // Signal main app (running in background with audio session) to stop audio immediately
            CFNotificationCenterPostNotification(
                CFNotificationCenterGetDarwinNotifyCenter(),
                CFNotificationName("com.calmparent.stop-white-noise" as CFString),
                nil, nil, true
            )
        }

        // Clear the Home Screen Widget's running-timer state so the row falls
        // back to "last X ago" right away.
        SharedTimerState.clearWidgetActiveTimer()

        return .result()
    }
}

@available(iOS 16.2, *)
struct SwitchSideIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "החלף צד"
    
    init() {}
    
    func perform() async throws -> some IntentResult {
        for activity in Activity<BreastfeedingActivityAttributes>.activities {
            let currentState = activity.content.state
            let newSide = currentState.activeSide == "left" ? "right" : "left"
            
            var l = currentState.leftSideSeconds
            var r = currentState.rightSideSeconds
            if !currentState.isPaused, let start = currentState.sideStartTime {
                let elapsed = Int(Date().timeIntervalSince(start))
                if currentState.activeSide == "left" { l += elapsed } else { r += elapsed }
            }
            
            let newState = BreastfeedingActivityAttributes.ContentState(
                leftSideSeconds: l,
                rightSideSeconds: r,
                activeSide: newSide,
                sideStartTime: Date(),
                isPaused: false
            )
            await activity.update(ActivityContent(state: newState, staleDate: nil))
            SharedTimerState.writePendingAction(.switchSide, timerType: "breastfeeding", side: newSide)
        }
        return .result()
    }
}
