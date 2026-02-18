//
//  QuickActionsModule.swift
//  CalmParentApp
//
//  Native module לניהול Live Activities של פעולות מהירות
//

import ExpoModulesCore
import ActivityKit
import Foundation
import SharedAttributes

public class QuickActionsModule: Module {
    // MARK: - Properties
    
    private var mealActivity: Any?
    private var sleepActivity: Any?
    private var playActivity: Any?
    private var meditationActivity: Any?
    
    // MARK: - Module Definition
    
    public func definition() -> ModuleDefinition {
        Name("QuickActionsManager")
        
        // MARK: - Meal Activity Methods
        
        AsyncFunction("startMeal") { (
            babyName: String,
            babyEmoji: String,
            mealType: String,
            foodItems: [String]
        ) -> String in
            if #available(iOS 16.2, *) {
                let attributes = MealActivityAttributes(
                    babyName: babyName,
                    babyEmoji: babyEmoji
                )
                
                let initialState = MealActivityAttributes.ContentState(
                    startTime: Date(),
                    mealType: mealType,
                    babyName: babyName,
                    foodItems: foodItems,
                    isPaused: false,
                    progress: 0.0
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
                    throw Exception(name: "ACTIVITY_ERROR", description: "Failed to start meal: \(error.localizedDescription)")
                }
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("updateMeal") { (progress: Double, foodItems: [String]) -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.mealActivity as? Activity<MealActivityAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active meal")
                }
                
                let updatedState = MealActivityAttributes.ContentState(
                    startTime: activity.content.state.startTime,
                    mealType: activity.content.state.mealType,
                    babyName: activity.content.state.babyName,
                    foodItems: foodItems,
                    isPaused: activity.content.state.isPaused,
                    progress: progress
                )
                
                Task {
                    await activity.update(.init(state: updatedState, staleDate: nil))
                }
                
                return true
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("stopMeal") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.mealActivity as? Activity<MealActivityAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active meal")
                }
                
                Task {
                    await activity.end(dismissalPolicy: .immediate)
                }
                
                self.mealActivity = nil
                return true
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        // MARK: - Sleep Activity Methods
        
        AsyncFunction("startSleep") { (
            babyName: String,
            babyEmoji: String,
            sleepType: String
        ) -> String in
            if #available(iOS 16.2, *) {
                let attributes = SleepActivityAttributes(
                    babyName: babyName,
                    babyEmoji: babyEmoji
                )
                
                let initialState = SleepActivityAttributes.ContentState(
                    startTime: Date(),
                    babyName: babyName,
                    sleepType: sleepType,
                    isAwake: false,
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
                    throw Exception(name: "ACTIVITY_ERROR", description: "Failed to start sleep: \(error.localizedDescription)")
                }
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("wakeUp") { (quality: String?) -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.sleepActivity as? Activity<SleepActivityAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active sleep")
                }
                
                let updatedState = SleepActivityAttributes.ContentState(
                    startTime: activity.content.state.startTime,
                    babyName: activity.content.state.babyName,
                    sleepType: activity.content.state.sleepType,
                    isAwake: true,
                    quality: quality
                )
                
                Task {
                    await activity.update(.init(state: updatedState, staleDate: nil))
                }
                
                return true
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("stopSleep") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.sleepActivity as? Activity<SleepActivityAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active sleep")
                }
                
                Task {
                    await activity.end(dismissalPolicy: .immediate)
                }
                
                self.sleepActivity = nil
                return true
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        // MARK: - Play Activity Methods
        
        AsyncFunction("startPlay") { (
            babyName: String,
            babyEmoji: String,
            activityType: String
        ) -> String in
            if #available(iOS 16.2, *) {
                let attributes = PlayActivityAttributes(
                    babyName: babyName,
                    babyEmoji: babyEmoji
                )
                
                let initialState = PlayActivityAttributes.ContentState(
                    startTime: Date(),
                    babyName: babyName,
                    activityType: activityType,
                    isPaused: false
                )
                
                do {
                    let activity = try Activity<PlayActivityAttributes>.request(
                        attributes: attributes,
                        content: .init(state: initialState, staleDate: nil),
                        pushType: nil
                    )
                    
                    self.playActivity = activity
                    return activity.id
                } catch {
                    throw Exception(name: "ACTIVITY_ERROR", description: "Failed to start play: \(error.localizedDescription)")
                }
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("togglePlayPause") { (isPaused: Bool) -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.playActivity as? Activity<PlayActivityAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active play")
                }
                
                let updatedState = PlayActivityAttributes.ContentState(
                    startTime: activity.content.state.startTime,
                    babyName: activity.content.state.babyName,
                    activityType: activity.content.state.activityType,
                    isPaused: isPaused
                )
                
                Task {
                    await activity.update(.init(state: updatedState, staleDate: nil))
                }
                
                return true
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("stopPlay") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.playActivity as? Activity<PlayActivityAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active play")
                }
                
                Task {
                    await activity.end(dismissalPolicy: .immediate)
                }
                
                self.playActivity = nil
                return true
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        // MARK: - Meditation Activity Methods
        
        AsyncFunction("startMeditation") { (
            parentName: String,
            duration: Double,
            meditationType: String
        ) -> String in
            if #available(iOS 16.2, *) {
                let attributes = ParentMeditationAttributes(
                    parentName: parentName
                )
                
                let initialState = ParentMeditationAttributes.ContentState(
                    startTime: Date(),
                    duration: duration,
                    meditationType: meditationType,
                    isActive: true
                )
                
                do {
                    let activity = try Activity<ParentMeditationAttributes>.request(
                        attributes: attributes,
                        content: .init(state: initialState, staleDate: nil),
                        pushType: nil
                    )
                    
                    self.meditationActivity = activity
                    return activity.id
                } catch {
                    throw Exception(name: "ACTIVITY_ERROR", description: "Failed to start meditation: \(error.localizedDescription)")
                }
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("completeMeditation") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.meditationActivity as? Activity<ParentMeditationAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active meditation")
                }
                
                let updatedState = ParentMeditationAttributes.ContentState(
                    startTime: activity.content.state.startTime,
                    duration: activity.content.state.duration,
                    meditationType: activity.content.state.meditationType,
                    isActive: false
                )
                
                Task {
                    await activity.update(.init(state: updatedState, staleDate: nil))
                }
                
                return true
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        AsyncFunction("stopMeditation") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.meditationActivity as? Activity<ParentMeditationAttributes> else {
                    throw Exception(name: "NO_ACTIVITY", description: "No active meditation")
                }
                
                Task {
                    await activity.end(dismissalPolicy: .immediate)
                }
                
                self.meditationActivity = nil
                return true
            } else {
                throw Exception(name: "NOT_SUPPORTED", description: "Live Activities require iOS 16.2+")
            }
        }
        
        // MARK: - Utility Methods
        
        AsyncFunction("isLiveActivitySupported") { () -> Bool in
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }
        
        AsyncFunction("stopAllActivities") { () -> Bool in
            if #available(iOS 16.2, *) {
                Task {
                    if let activity = self.mealActivity as? Activity<MealActivityAttributes> {
                        await activity.end(dismissalPolicy: .immediate)
                        self.mealActivity = nil
                    }
                    
                    if let activity = self.sleepActivity as? Activity<SleepActivityAttributes> {
                        await activity.end(dismissalPolicy: .immediate)
                        self.sleepActivity = nil
                    }
                    
                    if let activity = self.playActivity as? Activity<PlayActivityAttributes> {
                        await activity.end(dismissalPolicy: .immediate)
                        self.playActivity = nil
                    }
                    
                    if let activity = self.meditationActivity as? Activity<ParentMeditationAttributes> {
                        await activity.end(dismissalPolicy: .immediate)
                        self.meditationActivity = nil
                    }
                }
                
                return true
            }
            return false
        }
    }
}
