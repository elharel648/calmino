import Foundation
import ActivityKit
#if canImport(React)
import React
#else
// הגדרות דמי למקרה שהקוד רץ מחוץ לקונטקסט של ריאקט (למניעת שגיאות קומפילציה)
public typealias RCTPromiseResolveBlock = (Any?) -> Void
public typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void
#endif

@available(iOS 16.1, *)
@objc(ActivityKitManager)
class ActivityKitManager: NSObject {
    
    // שומרים את הפעילות הנוכחית בזיכרון
    private var currentActivity: Activity<CalmParentLiveActivityAttributes>?
    private var activityStartDate: Date?
    
    // MARK: - Generic Timer Start
    private func startTimer(type: String, parentName: String, childName: String, side: String? = nil, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        // 1. בדיקה שהפיצ'ר מאופשר במכשיר
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("E_ACTIVITIES_DISABLED", "Activities are disabled", NSError(domain: "ActivityKitManager", code: 1, userInfo: nil))
            return
        }
        
        // Stop any existing activity first
        if let existing = currentActivity {
            Task {
                await existing.end(dismissalPolicy: .immediate)
            }
        }
        
        let now = Date()
        activityStartDate = now
        
        // 2. הגדרת המצב ההתחלתי (דינמי)
        let initialContentState = CalmParentLiveActivityAttributes.ContentState(
            type: type,
            startDate: now,
            isPaused: false,
            pauseDate: nil,
            accumulatedPausedSeconds: 0,
            side: side
        )
        
        // 3. הגדרת המאפיינים הקבועים (סטטי)
        let activityAttributes = CalmParentLiveActivityAttributes(
            parentName: parentName,
            childName: childName,
            activityType: type
        )
        
        do {
            // 4. יצירת הפעילות
            let activity = try Activity<CalmParentLiveActivityAttributes>.request(
                attributes: activityAttributes,
                contentState: initialContentState,
                pushType: nil
            )
            
            self.currentActivity = activity
            print("Live Activity Started: \(activity.id) - Type: \(type)")
            resolve(activity.id)
            
        } catch {
            print("Error starting activity: \(error.localizedDescription)")
            reject("E_START_FAILED", "Failed to start activity: \(error.localizedDescription)", error)
        }
    }
    
    // MARK: - Pumping Timer
    @objc func startPumpingTimer(_ parentName: String, childName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        startTimer(type: "שאיבה", parentName: parentName, childName: childName, resolve: resolve, reject: reject)
    }
    
    @objc func updatePumpingTimer(_ elapsedSeconds: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // Timer auto-updates via SwiftUI - no action needed
        resolve("Timer running - auto-updating")
    }
    
    @objc func stopPumpingTimer(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        stopTimer(resolve: resolve)
    }
    
    // MARK: - Sleep Timer
    @objc func startSleepTimer(_ parentName: String, childName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        startTimer(type: "שינה", parentName: parentName, childName: childName, resolve: resolve, reject: reject)
    }
    
    @objc func updateSleepTimer(_ elapsedSeconds: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // Timer auto-updates via SwiftUI - no action needed
        resolve("Timer running - auto-updating")
    }
    
    @objc func stopSleepTimer(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        stopTimer(resolve: resolve)
    }
    
    // MARK: - Breastfeeding Timer
    @objc func startBreastfeedingTimer(_ parentName: String, childName: String, side: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        startTimer(type: "הנקה", parentName: parentName, childName: childName, side: side, resolve: resolve, reject: reject)
    }
    
    @objc func stopBreastfeedingTimer(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        stopTimer(resolve: resolve)
    }
    
    // MARK: - Generic Timer Controls
    private func stopTimer(resolve: @escaping RCTPromiseResolveBlock) {
        guard let activity = currentActivity else {
            resolve("No activity to stop")
            return
        }
        
        Task {
            await activity.end(dismissalPolicy: .immediate)
            self.currentActivity = nil
            self.activityStartDate = nil
            resolve("Activity Ended")
        }
    }
    
    @objc func pauseTimer(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        
        guard let activity = currentActivity else {
            reject("E_NO_ACTIVITY", "No active activity found", nil)
            return
        }
        
        var state = activity.contentState
        guard !state.isPaused else {
            resolve("Already paused")
            return
        }
        
        state.isPaused = true
        state.pauseDate = Date()
        
        Task {
            await activity.update(using: state)
            resolve("Paused")
        }
    }
    
    @objc func resumeTimer(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        
        guard let activity = currentActivity else {
            reject("E_NO_ACTIVITY", "No active activity found", nil)
            return
        }
        
        var state = activity.contentState
        guard state.isPaused else {
            resolve("Already running")
            return
        }
        
        // Accumulate paused time
        if let pauseDate = state.pauseDate {
            state.accumulatedPausedSeconds += Date().timeIntervalSince(pauseDate)
        }
        
        state.isPaused = false
        state.pauseDate = nil
        
        Task {
            await activity.update(using: state)
            resolve("Resumed")
        }
    }
    
    // Legacy aliases for backward compatibility
    @objc func pausePumpingTimer(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        pauseTimer(resolve, rejecter: reject)
    }
    
    @objc func resumePumpingTimer(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resumeTimer(resolve, rejecter: reject)
    }
    
    // MARK: - Utility
    @objc func isLiveActivitySupported(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
    }
    
    @objc static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
