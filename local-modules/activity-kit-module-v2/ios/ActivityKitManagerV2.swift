//
//  ActivityKitModule.swift
//  CalmParentApp
//
//  Native module for controlling Live Activities from React Native
//

import ExpoModulesCore
import ActivityKit
import Foundation
import SharedAttributes

public class ActivityKitManager: Module {
    private var babysitterActivity: Any?
    private var mealActivity: Any?
    private var sleepActivity: Any?
    
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
        
        AsyncFunction("wakeUp") { () -> Bool in
            if #available(iOS 16.2, *) {
                guard let activity = self.sleepActivity as? Activity<SleepActivityAttributes> else { return false }
                let updatedState = SleepActivityAttributes.ContentState(
                    startTime: activity.content.state.startTime,
                    babyName: activity.content.state.babyName,
                    sleepType: activity.content.state.sleepType,
                    isAwake: true,
                    quality: activity.content.state.quality
                )
                Task { await activity.update(.init(state: updatedState, staleDate: nil)) }
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
        
        AsyncFunction("isLiveActivitySupported") { () -> Bool in
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            }
            return false
        }
    }
}
