//
//  ActivityKitManager.swift
//  CalmParentApp
//
//  Native Module for Live Activities integration with React Native
//

import Foundation
import ActivityKit
import React

@objc(ActivityKitManager)
class ActivityKitManager: NSObject {
    
    private var currentActivity: Activity<CalmParentActivityAttributes>?
    
    // MARK: - Module Setup
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc
    func constantsToExport() -> [AnyHashable : Any]! {
        return [
            "isSupported": ActivityAuthorizationInfo().areActivitiesEnabled
        ]
    }
    
    // MARK: - Pumping Timer
    
    @objc
    func startPumpingTimer(
        _ parentName: String,
        _ childName: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("NOT_SUPPORTED", "Live Activities not enabled", nil)
            return
        }
        
        let attributes = CalmParentActivityAttributes(activityName: "Pumping")
        let contentState = CalmParentActivityAttributes.ContentState(
            timerType: "pumping",
            startTime: Date(),
            elapsedSeconds: 0,
            isPaused: false,
            parentName: parentName,
            childName: childName,
            side: nil
        )
        
        do {
            let activity = try Activity<CalmParentActivityAttributes>.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )
            self.currentActivity = activity
            resolve(activity.id)
        } catch {
            reject("START_FAILED", "Failed to start pumping activity: \(error.localizedDescription)", error)
        }
    }
    
    @objc
    func stopPumpingTimer(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            await activity.end(dismissalPolicy: .immediate)
            self.currentActivity = nil
            resolve(true)
        }
    }
    
    @objc
    func updatePumpingTimer(
        _ elapsedSeconds: NSNumber,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            var updatedState = activity.contentState
            updatedState.elapsedSeconds = elapsedSeconds.intValue
            
            await activity.update(using: updatedState)
            resolve(true)
        }
    }
    
    // MARK: - Bottle Timer
    
    @objc
    func startBottleTimer(
        _ parentName: String,
        _ childName: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("NOT_SUPPORTED", "Live Activities not enabled", nil)
            return
        }
        
        let attributes = CalmParentActivityAttributes(activityName: "Bottle")
        let contentState = CalmParentActivityAttributes.ContentState(
            timerType: "bottle",
            startTime: Date(),
            elapsedSeconds: 0,
            isPaused: false,
            parentName: parentName,
            childName: childName,
            side: nil
        )
        
        do {
            let activity = try Activity<CalmParentActivityAttributes>.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )
            self.currentActivity = activity
            resolve(activity.id)
        } catch {
            reject("START_FAILED", "Failed to start bottle activity: \(error.localizedDescription)", error)
        }
    }
    
    @objc
    func stopBottleTimer(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            await activity.end(dismissalPolicy: .immediate)
            self.currentActivity = nil
            resolve(true)
        }
    }
    
    @objc
    func updateBottleTimer(
        _ elapsedSeconds: NSNumber,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            var updatedState = activity.contentState
            updatedState.elapsedSeconds = elapsedSeconds.intValue
            
            await activity.update(using: updatedState)
            resolve(true)
        }
    }
    
    // MARK: - Sleep Timer
    
    @objc
    func startSleepTimer(
        _ parentName: String,
        _ childName: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("NOT_SUPPORTED", "Live Activities not enabled", nil)
            return
        }
        
        let attributes = CalmParentActivityAttributes(activityName: "Sleep")
        let contentState = CalmParentActivityAttributes.ContentState(
            timerType: "sleep",
            startTime: Date(),
            elapsedSeconds: 0,
            isPaused: false,
            parentName: parentName,
            childName: childName,
            side: nil
        )
        
        do {
            let activity = try Activity<CalmParentActivityAttributes>.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )
            self.currentActivity = activity
            resolve(activity.id)
        } catch {
            reject("START_FAILED", "Failed to start sleep activity: \(error.localizedDescription)", error)
        }
    }
    
    @objc
    func updateSleepTimer(
        _ elapsedSeconds: NSNumber,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            var updatedState = activity.contentState
            updatedState.elapsedSeconds = elapsedSeconds.intValue
            
            await activity.update(using: updatedState)
            resolve(true)
        }
    }
    
    @objc
    func stopSleepTimer(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            await activity.end(dismissalPolicy: .immediate)
            self.currentActivity = nil
            resolve(true)
        }
    }
    
    // MARK: - Breastfeeding Timer
    
    @objc
    func startBreastfeedingTimer(
        _ parentName: String,
        _ childName: String,
        _ side: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("NOT_SUPPORTED", "Live Activities not enabled", nil)
            return
        }
        
        let attributes = CalmParentActivityAttributes(activityName: "Breastfeeding")
        let contentState = CalmParentActivityAttributes.ContentState(
            timerType: "breast",
            startTime: Date(),
            elapsedSeconds: 0,
            isPaused: false,
            parentName: parentName,
            childName: childName,
            side: side
        )
        
        do {
            let activity = try Activity<CalmParentActivityAttributes>.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )
            self.currentActivity = activity
            resolve(activity.id)
        } catch {
            reject("START_FAILED", "Failed to start breastfeeding activity: \(error.localizedDescription)", error)
        }
    }
    
    @objc
    func stopBreastfeedingTimer(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            await activity.end(dismissalPolicy: .immediate)
            self.currentActivity = nil
            resolve(true)
        }
    }
    
    // MARK: - Generic Controls
    
    @objc
    func pauseTimer(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            var updatedState = activity.contentState
            updatedState.isPaused = true
            
            await activity.update(using: updatedState)
            resolve(true)
        }
    }
    
    @objc
    func resumeTimer(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            guard let activity = currentActivity else {
                resolve(false)
                return
            }
            
            var updatedState = activity.contentState
            updatedState.isPaused = false
            
            await activity.update(using: updatedState)
            resolve(true)
        }
    }
    
    // MARK: - Utility
    
    @objc
    func isLiveActivitySupported(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let isSupported = ActivityAuthorizationInfo().areActivitiesEnabled
        resolve(isSupported)
    }
}
