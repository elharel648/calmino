import Foundation
import ActivityKit
import UIKit

/// Manager class for handling Live Activities from the main app
/// This bridges between React Native and ActivityKit
@available(iOS 16.1, *)
@objc(ActivityKitManager)
class ActivityKitManager: NSObject {
    
    // MARK: - Properties
    
    private var currentActivity: Activity<CalmParentAttributes>?
    private let appGroupIdentifier = "group.com.harel.calmparentapp"
    
    // MARK: - Initialization
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // MARK: - Public Methods
    
    /// Start a new Live Activity for pumping timer
    @objc
    func startPumpingTimer(
        parentName: String,
        childName: String?,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            do {
                // Check if Live Activities are supported
                guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                    reject("NOT_SUPPORTED", "Live Activities are not enabled on this device", nil)
                    return
                }
                
                // Create attributes
                let attributes = CalmParentAttributes.Attributes(
                    parentName: parentName,
                    activityType: .pumping,
                    childName: childName
                )
                
                // Create initial content state
                let contentState = CalmParentAttributes.ContentState(
                    startTime: Date(),
                    elapsedSeconds: 0,
                    isRunning: true,
                    status: nil
                )
                
                // Create activity content
                let activityContent = ActivityContent(
                    state: contentState,
                    staleDate: nil
                )
                
                // Request the activity
                let activity = try Activity<CalmParentAttributes>.request(
                    attributes: attributes,
                    content: activityContent,
                    pushType: nil
                )
                
                self.currentActivity = activity
                resolve(activity.id)
                
                print("✅ Live Activity started: \(activity.id)")
            } catch {
                print("❌ Failed to start Live Activity: \(error.localizedDescription)")
                reject("ACTIVITY_ERROR", "Failed to start Live Activity: \(error.localizedDescription)", error)
            }
        }
    }
    
    /// Update the Live Activity with new elapsed time
    @objc
    func updatePumpingTimer(
        elapsedSeconds: NSNumber,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let activity = self.currentActivity else {
                reject("NO_ACTIVITY", "No active Live Activity", nil)
                return
            }
            
            // Create updated content state
            let updatedState = CalmParentAttributes.ContentState(
                startTime: activity.contentState.startTime,
                elapsedSeconds: elapsedSeconds.intValue,
                isRunning: true,
                status: nil
            )
            
            let activityContent = ActivityContent(
                state: updatedState,
                staleDate: nil
            )
            
            Task {
                do {
                    await activity.update(activityContent)
                    resolve(true)
                } catch {
                    reject("UPDATE_ERROR", "Failed to update Live Activity: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    /// Stop and end the Live Activity
    @objc
    func stopPumpingTimer(
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let activity = self.currentActivity else {
                resolve(true) // Already stopped
                return
            }
            
            // Create final state
            let finalState = CalmParentAttributes.ContentState(
                startTime: activity.contentState.startTime,
                elapsedSeconds: activity.contentState.elapsedSeconds,
                isRunning: false,
                status: "הושלם"
            )
            
            let activityContent = ActivityContent(
                state: finalState,
                staleDate: Date()
            )
            
            Task {
                do {
                    await activity.end(activityContent, dismissalPolicy: .immediate)
                    self.currentActivity = nil
                    resolve(true)
                    print("✅ Live Activity stopped")
                } catch {
                    reject("STOP_ERROR", "Failed to stop Live Activity: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    /// Check if Live Activities are supported on this device
    @objc
    func isLiveActivitySupported(
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        if #available(iOS 16.1, *) {
            let isSupported = ActivityAuthorizationInfo().areActivitiesEnabled
            resolve(isSupported)
        } else {
            resolve(false)
        }
    }
}

