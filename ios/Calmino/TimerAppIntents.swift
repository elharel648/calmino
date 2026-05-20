import AppIntents
import ActivityKit
import Foundation
import CoreFoundation
import ActivityKitModule

// iOS executes LiveActivityIntent.perform() in the MAIN APP process.
// These intents handle Sleep, Meal, and Breastfeeding timer buttons
// without opening the app.

private let kTimerAppGroup = "group.com.calmparent.shared"

private func writeTimerDefaults(action: String, type: String, elapsed: Int = 0, side: String? = nil) {
    let d = UserDefaults(suiteName: kTimerAppGroup)
    d?.set(action, forKey: "pendingTimerAction")
    d?.set(type, forKey: "pendingTimerType")
    d?.set(Date().timeIntervalSince1970, forKey: "pendingTimerTimestamp")
    d?.set(elapsed, forKey: "pendingTimerElapsed")
    if let s = side { d?.set(s, forKey: "pendingTimerSide") }
}

private func postDarwinTimer(_ name: String) {
    CFNotificationCenterPostNotification(
        CFNotificationCenterGetDarwinNotifyCenter(),
        CFNotificationName(name as CFString),
        nil, nil, true
    )
}

private func normalizeMealType(_ mealType: String) -> String {
    let lower = mealType.lowercased()
    if lower == "bottle" || lower.contains("בקבוק") { return "bottle" }
    if lower == "pumping" || lower.contains("שאיבה") { return "pumping" }
    return "breastfeeding"
}

// MARK: - PauseTimerIntent

@available(iOS 16.2, *)
struct PauseTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "השהה טיימר"
    static var isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        // Sleep
        for activity in Activity<SleepActivityAttributes>.activities {
            let s = activity.content.state
            if !s.isPaused {
                let elapsed = s.activeSeconds + Int(Date().timeIntervalSince(s.startTime))
                let newState = SleepActivityAttributes.ContentState(
                    startTime: s.startTime,
                    babyName: s.babyName,
                    sleepType: s.sleepType,
                    isAwake: true,
                    isPaused: true,
                    activeSeconds: elapsed,
                    quality: s.quality
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                writeTimerDefaults(action: "pause", type: "sleep", elapsed: elapsed)
            }
        }

        // Meal (bottle / pumping)
        for activity in Activity<MealActivityAttributes>.activities {
            let s = activity.content.state
            if !s.isPaused {
                let elapsed = Int(Date().timeIntervalSince(s.startTime))
                let newState = MealActivityAttributes.ContentState(
                    startTime: s.startTime,
                    mealType: s.mealType,
                    babyName: s.babyName,
                    foodItems: s.foodItems,
                    isPaused: true,
                    progress: Double(elapsed)
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                writeTimerDefaults(action: "pause", type: normalizeMealType(s.mealType), elapsed: elapsed)
            }
        }

        // Breastfeeding
        for activity in Activity<BreastfeedingActivityAttributes>.activities {
            let s = activity.content.state
            if !s.isPaused, let start = s.sideStartTime {
                let elapsed = Int(Date().timeIntervalSince(start))
                let l = s.leftSideSeconds + (s.activeSide == "left" ? elapsed : 0)
                let r = s.rightSideSeconds + (s.activeSide == "right" ? elapsed : 0)
                let newState = BreastfeedingActivityAttributes.ContentState(
                    leftSideSeconds: l,
                    rightSideSeconds: r,
                    activeSide: s.activeSide,
                    sideStartTime: nil,
                    isPaused: true
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                writeTimerDefaults(action: "pause", type: "breastfeeding", elapsed: l + r)
            }
        }

        postDarwinTimer("com.calmparent.pause-timer")
        return .result()
    }
}

// MARK: - ResumeTimerIntent

@available(iOS 16.2, *)
struct ResumeTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "המשך טיימר"
    static var isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        // Sleep
        for activity in Activity<SleepActivityAttributes>.activities {
            let s = activity.content.state
            if s.isPaused {
                let newState = SleepActivityAttributes.ContentState(
                    startTime: Date(),
                    babyName: s.babyName,
                    sleepType: s.sleepType,
                    isAwake: false,
                    isPaused: false,
                    activeSeconds: s.activeSeconds,
                    quality: s.quality
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                writeTimerDefaults(action: "resume", type: "sleep")
            }
        }

        // Meal
        for activity in Activity<MealActivityAttributes>.activities {
            let s = activity.content.state
            if s.isPaused {
                let newStart = Date().addingTimeInterval(-s.progress)
                let newState = MealActivityAttributes.ContentState(
                    startTime: newStart,
                    mealType: s.mealType,
                    babyName: s.babyName,
                    foodItems: s.foodItems,
                    isPaused: false,
                    progress: 0
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                writeTimerDefaults(action: "resume", type: normalizeMealType(s.mealType))
            }
        }

        // Breastfeeding
        for activity in Activity<BreastfeedingActivityAttributes>.activities {
            let s = activity.content.state
            if s.isPaused {
                let newState = BreastfeedingActivityAttributes.ContentState(
                    leftSideSeconds: s.leftSideSeconds,
                    rightSideSeconds: s.rightSideSeconds,
                    activeSide: s.activeSide,
                    sideStartTime: Date(),
                    isPaused: false
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                writeTimerDefaults(action: "resume", type: "breastfeeding")
            }
        }

        postDarwinTimer("com.calmparent.resume-timer")
        return .result()
    }
}

// MARK: - StopTimerIntent

@available(iOS 16.2, *)
struct StopTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "סיים טיימר"
    static var isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        // Sleep
        for activity in Activity<SleepActivityAttributes>.activities {
            let s = activity.content.state
            let elapsed = s.activeSeconds + (s.isPaused ? 0 : Int(Date().timeIntervalSince(s.startTime)))
            writeTimerDefaults(action: "stop", type: "sleep", elapsed: elapsed)
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
        }

        // Meal
        for activity in Activity<MealActivityAttributes>.activities {
            let s = activity.content.state
            let elapsed = s.isPaused ? Int(s.progress) : Int(Date().timeIntervalSince(s.startTime))
            writeTimerDefaults(action: "stop", type: normalizeMealType(s.mealType), elapsed: elapsed)
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
            writeTimerDefaults(action: "stop", type: "breastfeeding", elapsed: l + r, side: "L\(l)R\(r)")
            await activity.end(ActivityContent(state: s, staleDate: nil), dismissalPolicy: .immediate)
        }

        postDarwinTimer("com.calmparent.stop-timer")
        return .result()
    }
}

// MARK: - SwitchSideIntent

@available(iOS 16.2, *)
struct SwitchSideIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "החלף צד"
    static var isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        for activity in Activity<BreastfeedingActivityAttributes>.activities {
            let s = activity.content.state
            let newSide = s.activeSide == "left" ? "right" : "left"

            var l = s.leftSideSeconds
            var r = s.rightSideSeconds
            if !s.isPaused, let start = s.sideStartTime {
                let elapsed = Int(Date().timeIntervalSince(start))
                if s.activeSide == "left" { l += elapsed } else { r += elapsed }
            }

            let newState = BreastfeedingActivityAttributes.ContentState(
                leftSideSeconds: l,
                rightSideSeconds: r,
                activeSide: newSide,
                sideStartTime: Date(),
                isPaused: false
            )
            await activity.update(ActivityContent(state: newState, staleDate: nil))
            writeTimerDefaults(action: "switchSide", type: "breastfeeding", side: newSide)
            let d = UserDefaults(suiteName: kTimerAppGroup)
            d?.set(newSide, forKey: "pendingBreastSide")
        }

        postDarwinTimer("com.calmparent.switch-side")
        return .result()
    }
}
