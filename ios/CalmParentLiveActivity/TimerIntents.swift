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

// MARK: - Shared UserDefaults Helper

struct SharedTimerState {
    static let defaults = UserDefaults(suiteName: appGroupID)
    
    static func writePendingAction(_ action: TimerAction, timerType: String = "") {
        defaults?.set(action.rawValue, forKey: "pendingTimerAction")
        defaults?.set(timerType, forKey: "pendingTimerType")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingTimerTimestamp")
        defaults?.synchronize()
    }
    
    static func readPendingAction() -> (action: TimerAction, timerType: String)? {
        guard let raw = defaults?.string(forKey: "pendingTimerAction"),
              let action = TimerAction(rawValue: raw) else { return nil }
        let timerType = defaults?.string(forKey: "pendingTimerType") ?? ""
        return (action, timerType)
    }
    
    static func clearPendingAction() {
        defaults?.removeObject(forKey: "pendingTimerAction")
        defaults?.removeObject(forKey: "pendingTimerType")
        defaults?.removeObject(forKey: "pendingTimerTimestamp")
        defaults?.synchronize()
    }
}

// MARK: - Pause Timer Intent

@available(iOS 16.2, *)
struct PauseTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "השהה טיימר"
    static var description = IntentDescription("השהה את הטיימר הפעיל")
    
    func perform() async throws -> some IntentResult {
        // 1. Write pending action for React Native to pick up
        SharedTimerState.writePendingAction(.pause)
        
        // 2. Update all running Live Activities to paused state
        if #available(iOS 16.2, *) {
            // Sleep
            for activity in Activity<SleepActivityAttributes>.activities {
                let currentState = activity.content.state
                if !currentState.isPaused {
                    let elapsed = Int(Date().timeIntervalSince(currentState.startTime)) + currentState.activeSeconds
                    let newState = SleepActivityAttributes.ContentState(
                        startTime: currentState.startTime,
                        babyName: currentState.babyName,
                        sleepType: currentState.sleepType,
                        isAwake: false,
                        isPaused: true,
                        activeSeconds: elapsed
                    )
                    await activity.update(ActivityContent(state: newState, staleDate: nil))
                }
            }
            
            // Feeding (Meal)
            for activity in Activity<MealActivityAttributes>.activities {
                let currentState = activity.content.state
                if !currentState.isPaused {
                    let newState = MealActivityAttributes.ContentState(
                        startTime: currentState.startTime,
                        mealType: currentState.mealType,
                        babyName: currentState.babyName,
                        foodItems: currentState.foodItems,
                        isPaused: true,
                        progress: currentState.progress
                    )
                    await activity.update(ActivityContent(state: newState, staleDate: nil))
                }
            }
            
            // Breastfeeding
            for activity in Activity<BreastfeedingActivityAttributes>.activities {
                let currentState = activity.content.state
                if !currentState.isPaused {
                    // Calculate accumulated seconds for active side
                    var leftSecs = currentState.leftSideSeconds
                    var rightSecs = currentState.rightSideSeconds
                    if let sideStart = currentState.sideStartTime {
                        let elapsed = Int(Date().timeIntervalSince(sideStart))
                        if currentState.activeSide == "left" {
                            leftSecs += elapsed
                        } else if currentState.activeSide == "right" {
                            rightSecs += elapsed
                        }
                    }
                    let newState = BreastfeedingActivityAttributes.ContentState(
                        leftSideSeconds: leftSecs,
                        rightSideSeconds: rightSecs,
                        activeSide: currentState.activeSide,
                        sideStartTime: nil,
                        isPaused: true
                    )
                    await activity.update(ActivityContent(state: newState, staleDate: nil))
                }
            }
        }
        
        return .result()
    }
}

// MARK: - Resume Timer Intent

@available(iOS 16.2, *)
struct ResumeTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "המשך טיימר"
    static var description = IntentDescription("המשך את הטיימר המושהה")
    
    func perform() async throws -> some IntentResult {
        SharedTimerState.writePendingAction(.resume)
        
        if #available(iOS 16.2, *) {
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
                        activeSeconds: currentState.activeSeconds
                    )
                    await activity.update(ActivityContent(state: newState, staleDate: nil))
                }
            }
            
            // Feeding
            for activity in Activity<MealActivityAttributes>.activities {
                let currentState = activity.content.state
                if currentState.isPaused {
                    let newState = MealActivityAttributes.ContentState(
                        startTime: Date(),
                        mealType: currentState.mealType,
                        babyName: currentState.babyName,
                        foodItems: currentState.foodItems,
                        isPaused: false,
                        progress: currentState.progress
                    )
                    await activity.update(ActivityContent(state: newState, staleDate: nil))
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
                }
            }
        }
        
        return .result()
    }
}

// MARK: - Stop Timer Intent

@available(iOS 16.2, *)
struct StopTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "עצור טיימר"
    static var description = IntentDescription("עצור את הטיימר ושמור")
    
    func perform() async throws -> some IntentResult {
        SharedTimerState.writePendingAction(.stop)
        
        if #available(iOS 16.2, *) {
            // End all running Live Activities
            for activity in Activity<SleepActivityAttributes>.activities {
                let finalState = activity.content.state
                await activity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
            }
            for activity in Activity<MealActivityAttributes>.activities {
                let finalState = activity.content.state
                await activity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
            }
            for activity in Activity<BreastfeedingActivityAttributes>.activities {
                let finalState = activity.content.state
                await activity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
            }
            for activity in Activity<WhiteNoiseActivityAttributes>.activities {
                let finalState = activity.content.state
                await activity.end(ActivityContent(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
            }
        }
        
        return .result()
    }
}

// MARK: - Switch Breastfeeding Side Intent

@available(iOS 16.2, *)
struct SwitchSideIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "החלף צד"
    static var description = IntentDescription("החלף צד הנקה")
    
    func perform() async throws -> some IntentResult {
        SharedTimerState.writePendingAction(.switchSide)
        
        if #available(iOS 16.2, *) {
            for activity in Activity<BreastfeedingActivityAttributes>.activities {
                let currentState = activity.content.state
                
                // Accumulate time from current side
                var leftSecs = currentState.leftSideSeconds
                var rightSecs = currentState.rightSideSeconds
                if let sideStart = currentState.sideStartTime, !currentState.isPaused {
                    let elapsed = Int(Date().timeIntervalSince(sideStart))
                    if currentState.activeSide == "left" {
                        leftSecs += elapsed
                    } else {
                        rightSecs += elapsed
                    }
                }
                
                // Switch to the other side
                let newSide = currentState.activeSide == "left" ? "right" : "left"
                
                let newState = BreastfeedingActivityAttributes.ContentState(
                    leftSideSeconds: leftSecs,
                    rightSideSeconds: rightSecs,
                    activeSide: newSide,
                    sideStartTime: Date(),
                    isPaused: false
                )
                await activity.update(ActivityContent(state: newState, staleDate: nil))
            }
        }
        
        return .result()
    }
}
