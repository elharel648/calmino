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

// MARK: - Shared Constants

let appGroupID = "group.com.harel.calmparentapp"

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
        defaults?.set(action.rawValue, forKey: "pendingAction")
        defaults?.set(timerType, forKey: "pendingTimerType")
        if let s = elapsedSeconds {
            defaults?.set(s, forKey: "pendingElapsedSeconds")
        }
        if let s = side {
            defaults?.set(s, forKey: "pendingSide")
        }
    }
}

// MARK: - App Intents

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
                    activeSide: currentState.activeSide,
                    isPaused: true,
                    sideStartTime: nil,
                    leftSideSeconds: l,
                    rightSideSeconds: r
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.pause, timerType: "breastfeeding")
            }
        }

        // Babysitter
        for activity in Activity<BabysitterShiftAttributes>.activities {
            let currentState = activity.content.state
            if !currentState.isPaused {
                let newState = BabysitterShiftAttributes.ContentState(
                    startTime: currentState.startTime,
                    isPaused: true,
                    totalPausedSeconds: currentState.totalPausedSeconds,
                    hourlyRate: currentState.hourlyRate
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.pause, timerType: "babysitter")
            }
        }
        
        // WhiteNoise (Only Stop supported usually, but just in case)
        
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
                    activeSide: currentState.activeSide,
                    isPaused: false,
                    sideStartTime: Date(),
                    leftSideSeconds: currentState.leftSideSeconds,
                    rightSideSeconds: currentState.rightSideSeconds
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.resume, timerType: "breastfeeding")
            }
        }

        // Babysitter
        for activity in Activity<BabysitterShiftAttributes>.activities {
            let currentState = activity.content.state
            if currentState.isPaused {
                let newState = BabysitterShiftAttributes.ContentState(
                    startTime: currentState.startTime,
                    isPaused: false,
                    totalPausedSeconds: currentState.totalPausedSeconds,
                    hourlyRate: currentState.hourlyRate
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
                SharedTimerState.writePendingAction(.resume, timerType: "babysitter")
            }
        }

        return .result()
    }
}

@available(iOS 16.2, *)
struct StopTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "סיים טיימר"
    
    init() {}
    
    func perform() async throws -> some IntentResult {
        // Stop all active Live Activities natively
        for activity in Activity<SleepActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        for activity in Activity<MealActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        for activity in Activity<BreastfeedingActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        for activity in Activity<BabysitterShiftAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        
        SharedTimerState.writePendingAction(.stop, timerType: "stop")
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
                activeSide: newSide,
                isPaused: false,
                sideStartTime: Date(),
                leftSideSeconds: l,
                rightSideSeconds: r
            )
            await activity.update(ActivityContent(state: newState, staleDate: nil))
            SharedTimerState.writePendingAction(.switchSide, timerType: "breastfeeding", side: newSide)
        }
        return .result()
    }
}
