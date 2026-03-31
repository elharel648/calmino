//
//  ActivityKitModule.swift
//  CalmParentApp
//
//  Native module for controlling Live Activities from React Native
//

import ExpoModulesCore
import ActivityKit
import Foundation
import WidgetKit

public class ActivityKitManager: Module {
    private var babysitterActivity: Any?
    private var mealActivity: Any?
    private var sleepActivity: Any?
    private var breastfeedingActivity: Any?
    private var whiteNoiseActivity: Any?
    
    public func definition() -> ModuleDefinition {
        Name("ActivityKitManager")
        
        // MARK: - Babysitter Shift Methods
        
        AsyncFunction("startBabysitterShift") { (babysitterName: String, hourlyRate: Double) -> String in
            if #available(iOS 16.2, *) {
                let attributes = BabysitterShiftAttributes(
                    babysitterName: babysitterName,
                    babysitterPhoto: "👩"
                )
                
                let initialState = BabysitterShiftAttributes.ContentState(
                    startTime: Date(),
                    isPaused: false,
                    totalPausedSeconds: 0,
                    hourlyRate: hourlyRate
                )
                
                do {
                    let activity = try Activity<BabysitterShiftAttributes>.request(
                        attributes: attributes,
                        content: .init(state: initialState, staleDate: nil),
                        pushType: nil
                    )
                    
                    self.babysitterActivity = activity
                    return activity.id
                } catch {
                    throw Exception(name: "ACTIVITY_ERROR", description: "Failed to start: \(error.localizedDescription)")
                }
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("updateBabysitterShift") { (isPaused: Bool, totalPausedSeconds: Double) -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.babysitterActivity as? Activity<BabysitterShiftAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active babysitter shift")
                }
                
                let updatedState = BabysitterShiftAttributes.ContentState(
                    startTime: activity.content.state.startTime,
                    isPaused: isPaused,
                    totalPausedSeconds: totalPausedSeconds,
                    hourlyRate: activity.content.state.hourlyRate
                )
                
                Task {
                    await activity.update(.init(state: updatedState, staleDate: nil))
                }
                return true
            }
            return false
        }
        
        AsyncFunction("stopBabysitterShift") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.babysitterActivity as? Activity<BabysitterShiftAttributes> else {
                    return false
                }
                Task { await activity.end(dismissalPolicy: .immediate) }
                self.babysitterActivity = nil
                return true
            }
            return false
        }
        
        // MARK: - Meal Methods
        
        AsyncFunction("startMeal") { (babyName: String, babyEmoji: String, mealType: String, foodItems: [String], progress: Double) -> String in
            if #available(iOS 16.2, *) {
                let attributes = MealActivityAttributes(babyName: babyName, babyEmoji: babyEmoji)
                let initialState = MealActivityAttributes.ContentState(
                    startTime: Date(),
                    mealType: mealType,
                    babyName: babyName,
                    foodItems: foodItems,
                    isPaused: false,
                    progress: progress
                )
                do {
                    let activity = try Activity<MealActivityAttributes>.request(
                        attributes: attributes,
                        content: .init(state: initialState, staleDate: nil),
                        pushType: nil
                    )
                    self.mealActivity = activity
                    return activity.id
                } catch {
                    throw Exception(name: "ACTIVITY_ERROR", description: error.localizedDescription)
                }
            }
            return ""
        }
        
        AsyncFunction("stopMeal") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.mealActivity as? Activity<MealActivityAttributes> else { return false }
                Task { await activity.end(dismissalPolicy: .immediate) }
                self.mealActivity = nil
                return true
            }
            return false
        }

        AsyncFunction("pauseTimer") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.mealActivity as? Activity<MealActivityAttributes> else { return false }
                let updatedState = MealActivityAttributes.ContentState(
                    startTime: activity.content.state.startTime,
                    mealType: activity.content.state.mealType,
                    babyName: activity.content.state.babyName,
                    foodItems: activity.content.state.foodItems,
                    isPaused: true,
                    progress: activity.content.state.progress
                )
                Task { await activity.update(.init(state: updatedState, staleDate: nil)) }
                return true
            }
            return false
        }

        AsyncFunction("resumeTimer") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.mealActivity as? Activity<MealActivityAttributes> else { return false }
                let updatedState = MealActivityAttributes.ContentState(
                    startTime: activity.content.state.startTime,
                    mealType: activity.content.state.mealType,
                    babyName: activity.content.state.babyName,
                    foodItems: activity.content.state.foodItems,
                    isPaused: false,
                    progress: activity.content.state.progress
                )
                Task { await activity.update(.init(state: updatedState, staleDate: nil)) }
                return true
            }
            return false
        }

        // MARK: - Sleep Methods
        
        AsyncFunction("startSleep") { (babyName: String, babyEmoji: String, sleepType: String, isAwake: Bool) -> String in
            if #available(iOS 16.2, *) {
                let attributes = SleepActivityAttributes(babyName: babyName, babyEmoji: babyEmoji)
                let initialState = SleepActivityAttributes.ContentState(
                    startTime: Date(),
                    babyName: babyName,
                    sleepType: sleepType,
                    isAwake: isAwake,
                    isPaused: false,
                    activeSeconds: 0,
                    quality: nil
                )
                do {
                    let activity = try Activity<SleepActivityAttributes>.request(
                        attributes: attributes,
                        content: .init(state: initialState, staleDate: nil),
                        pushType: nil
                    )
                    self.sleepActivity = activity
                    return activity.id
                } catch {
                    throw Exception(name: "ACTIVITY_ERROR", description: error.localizedDescription)
                }
            }
            return ""
        }

        AsyncFunction("pauseSleep") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.sleepActivity as? Activity<SleepActivityAttributes> else { return false }
                var state = activity.content.state
                let elapsed = Int(Date().timeIntervalSince(state.startTime))
                state.activeSeconds = elapsed
                state.isPaused = true
                Task { await activity.update(.init(state: state, staleDate: nil)) }
                return true
            }
            return false
        }

        AsyncFunction("resumeSleep") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.sleepActivity as? Activity<SleepActivityAttributes> else { return false }
                var state = activity.content.state
                state.startTime = Date().addingTimeInterval(-TimeInterval(state.activeSeconds))
                state.isPaused = false
                Task { await activity.update(.init(state: state, staleDate: nil)) }
                return true
            }
            return false
        }

        AsyncFunction("wakeUp") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.sleepActivity as? Activity<SleepActivityAttributes> else { return false }
                var state = activity.content.state
                state.isAwake = true
                Task { await activity.update(.init(state: state, staleDate: nil)) }
                return true
            }
            return false
        }

        AsyncFunction("stopSleep") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.sleepActivity as? Activity<SleepActivityAttributes> else { return false }
                Task { await activity.end(dismissalPolicy: .immediate) }
                self.sleepActivity = nil
                return true
            }
            return false
        }

        // MARK: - Breastfeeding Methods

        AsyncFunction("startBreastfeeding") { (babyName: String, side: String) -> String in
            if #available(iOS 16.2, *) {
                let attributes = BreastfeedingActivityAttributes(babyName: babyName)
                let initialState = BreastfeedingActivityAttributes.ContentState(
                    leftSideSeconds: 0,
                    rightSideSeconds: 0,
                    activeSide: side,
                    sideStartTime: Date(),
                    isPaused: false
                )
                do {
                    let activity = try Activity<BreastfeedingActivityAttributes>.request(
                        attributes: attributes,
                        content: .init(state: initialState, staleDate: nil),
                        pushType: nil
                    )
                    self.breastfeedingActivity = activity
                    return activity.id
                } catch {
                    throw Exception(name: "ACTIVITY_ERROR", description: error.localizedDescription)
                }
            }
            return ""
        }

        AsyncFunction("pauseBreastfeeding") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.breastfeedingActivity as? Activity<BreastfeedingActivityAttributes> else { return false }
                var state = activity.content.state
                let now = Date()
                if let sideStart = state.sideStartTime, let side = state.activeSide {
                    let elapsed = Int(now.timeIntervalSince(sideStart))
                    if side == "left" { state.leftSideSeconds += elapsed }
                    else { state.rightSideSeconds += elapsed }
                }
                state.isPaused = true
                state.sideStartTime = nil
                Task { await activity.update(.init(state: state, staleDate: nil)) }
                return true
            }
            return false
        }

        AsyncFunction("resumeBreastfeeding") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.breastfeedingActivity as? Activity<BreastfeedingActivityAttributes> else { return false }
                var state = activity.content.state
                state.isPaused = false
                state.sideStartTime = Date()
                Task { await activity.update(.init(state: state, staleDate: nil)) }
                return true
            }
            return false
        }

        AsyncFunction("switchBreastSide") { (newSide: String) -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.breastfeedingActivity as? Activity<BreastfeedingActivityAttributes> else { return false }
                var state = activity.content.state
                let now = Date()
                if let sideStart = state.sideStartTime, let side = state.activeSide {
                    let elapsed = Int(now.timeIntervalSince(sideStart))
                    if side == "left" { state.leftSideSeconds += elapsed }
                    else { state.rightSideSeconds += elapsed }
                }
                state.activeSide = newSide
                state.sideStartTime = now
                state.isPaused = false
                Task { await activity.update(.init(state: state, staleDate: nil)) }
                return true
            }
            return false
        }

        AsyncFunction("stopBreastfeeding") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.breastfeedingActivity as? Activity<BreastfeedingActivityAttributes> else { return false }
                Task { await activity.end(dismissalPolicy: .immediate) }
                self.breastfeedingActivity = nil
                return true
            }
            return false
        }
        
        // MARK: - White Noise Methods

        AsyncFunction("startWhiteNoise") { (soundId: String, soundName: String) -> String in
            if #available(iOS 16.2, *) {
                // End any existing white noise activity first
                if let existing = self.whiteNoiseActivity as? Activity<WhiteNoiseActivityAttributes> {
                    Task { await existing.end(dismissalPolicy: .immediate) }
                }
                self.whiteNoiseActivity = nil

                let attributes = WhiteNoiseActivityAttributes(soundId: soundId, soundName: soundName)
                let initialState = WhiteNoiseActivityAttributes.ContentState(startTime: Date())
                do {
                    let activity = try Activity<WhiteNoiseActivityAttributes>.request(
                        attributes: attributes,
                        content: .init(state: initialState, staleDate: nil),
                        pushType: nil
                    )
                    self.whiteNoiseActivity = activity
                    return activity.id
                } catch {
                    throw Exception(name: "ACTIVITY_ERROR", description: error.localizedDescription)
                }
            }
            return ""
        }

        AsyncFunction("stopWhiteNoise") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.whiteNoiseActivity as? Activity<WhiteNoiseActivityAttributes> else { return false }
                Task { await activity.end(dismissalPolicy: .immediate) }
                self.whiteNoiseActivity = nil
                return true
            }
            return false
        }

        AsyncFunction("isLiveActivitySupported") { () -> Bool in
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }

        // MARK: - Widget Data

        AsyncFunction("updateWidgetData") { (babyName: String, lastFeedTime: String, lastFeedAgo: String, lastSleepTime: String, lastSleepAgo: String, babyStatus: String, lastDiaperAgo: String, lastDiaperType: String, lastFeedType: String, feedCount: Int, sleepMinutes: Int, diaperCount: Int, lastFeedTimestamp: Double, lastSleepTimestamp: Double, lastDiaperTimestamp: Double, lastHealthTimestamp: Double, healthCount: Int, lastMedicationTimestamp: Double, medicationCount: Int) -> Bool in
            let defaults = UserDefaults(suiteName: "group.com.harel.calmparentapp")
            defaults?.set(babyName, forKey: "widget_babyName")
            defaults?.set(lastFeedTime, forKey: "widget_lastFeedTime")
            defaults?.set(lastFeedAgo, forKey: "widget_lastFeedAgo")
            defaults?.set(lastSleepTime, forKey: "widget_lastSleepTime")
            defaults?.set(lastSleepAgo, forKey: "widget_lastSleepAgo")
            defaults?.set(babyStatus, forKey: "widget_babyStatus")
            defaults?.set(lastDiaperAgo, forKey: "widget_lastDiaperAgo")
            defaults?.set(lastDiaperType, forKey: "widget_lastDiaperType")
            defaults?.set(lastFeedType, forKey: "widget_lastFeedType")
            defaults?.set(feedCount, forKey: "widget_feedCount")
            defaults?.set(sleepMinutes, forKey: "widget_sleepMinutes")
            defaults?.set(diaperCount, forKey: "widget_diaperCount")
            defaults?.set(lastFeedTimestamp, forKey: "widget_lastFeedTimestamp")
            defaults?.set(lastSleepTimestamp, forKey: "widget_lastSleepTimestamp")
            defaults?.set(lastDiaperTimestamp, forKey: "widget_lastDiaperTimestamp")
            // Health & Medication
            defaults?.set(lastHealthTimestamp, forKey: "widget_lastHealthTimestamp")
            defaults?.set(healthCount, forKey: "widget_healthCount")
            defaults?.set(lastMedicationTimestamp, forKey: "widget_lastMedicationTimestamp")
            defaults?.set(medicationCount, forKey: "widget_medicationCount")
            defaults?.set(Date().timeIntervalSince1970, forKey: "widget_lastUpdate")
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            return true
        }

        // MARK: - App Intent Pending Actions

        Function("getPendingTimerAction") { () -> [String: Any]? in
            let defaults = UserDefaults(suiteName: "group.com.harel.calmparentapp")
            guard let action = defaults?.string(forKey: "pendingTimerAction") else { return nil }
            let timerType = defaults?.string(forKey: "pendingTimerType") ?? ""
            let timestamp = defaults?.double(forKey: "pendingTimerTimestamp") ?? 0
            let elapsedSeconds = defaults?.integer(forKey: "pendingTimerElapsed") ?? 0
            
            return [
                "action": action,
                "timerType": timerType,
                "timestamp": String(timestamp),
                "elapsedSeconds": elapsedSeconds
            ]
        }

        Function("clearPendingTimerAction") { () -> Void in
            let defaults = UserDefaults(suiteName: "group.com.harel.calmparentapp")
            defaults?.removeObject(forKey: "pendingTimerAction")
            defaults?.removeObject(forKey: "pendingTimerType")
            defaults?.removeObject(forKey: "pendingTimerElapsed")
            defaults?.removeObject(forKey: "pendingTimerTimestamp")
            defaults?.synchronize()
        }
    }

}
