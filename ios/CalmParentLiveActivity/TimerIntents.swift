import Foundation
import ActivityKit
import UIKit

#if canImport(AppIntents)
import AppIntents

@available(iOS 17.0, *)
struct PauseTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Pause Timer"
    static var description = IntentDescription("Pauses the running timer")
    
    @Parameter(title: "Activity ID")
    var activityId: String
    
    init() {
        self.activityId = ""
    }
    
    init(activityId: String) {
        self.activityId = activityId
    }
    
    func perform() async throws -> some IntentResult {
        guard let activity = Activity<CalmParentLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            return .result()
        }
        
        var state = activity.contentState
        
        // Already paused - no-op
        guard !state.isPaused else {
            return .result()
        }
        
        state.isPaused = true
        state.pauseDate = Date()
        
        await activity.update(using: state)
        
        // Notify React Native app via URL Scheme
        if let url = URL(string: "calmparentapp://pause-timer?activityId=\(activityId)") {
            await UIApplication.shared.open(url)
        }
        
        return .result()
    }
}

@available(iOS 17.0, *)
struct ResumeTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Resume Timer"
    static var description = IntentDescription("Resumes the paused timer")
    
    @Parameter(title: "Activity ID")
    var activityId: String
    
    init() {
        self.activityId = ""
    }
    
    init(activityId: String) {
        self.activityId = activityId
    }
    
    func perform() async throws -> some IntentResult {
        guard let activity = Activity<CalmParentLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            return .result()
        }
        
        var state = activity.contentState
        
        // Not paused - no-op
        guard state.isPaused else {
            return .result()
        }
        
        // Accumulate paused time
        if let pauseDate = state.pauseDate {
            state.accumulatedPausedSeconds += Date().timeIntervalSince(pauseDate)
        }
        
        state.isPaused = false
        state.pauseDate = nil
        
        await activity.update(using: state)
        
        // Notify React Native app via URL Scheme
        if let url = URL(string: "calmparentapp://resume-timer?activityId=\(activityId)") {
            await UIApplication.shared.open(url)
        }
        
        return .result()
    }
}

@available(iOS 17.0, *)
struct SaveTimerIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Save Timer"
    static var description = IntentDescription("Saves the timer data to the app")
    
    @Parameter(title: "Activity ID")
    var activityId: String
    
    init() {
        self.activityId = ""
    }
    
    init(activityId: String) {
        self.activityId = activityId
    }
    
    func perform() async throws -> some IntentResult {
        guard let activity = Activity<CalmParentLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            return .result()
        }
        
        let state = activity.contentState
        let attributes = activity.attributes
        
        // Calculate elapsed time
        let elapsed = state.isPaused && state.pauseDate != nil
            ? state.pauseDate!.timeIntervalSince(state.startDate) - state.accumulatedPausedSeconds
            : Date().timeIntervalSince(state.startDate) - state.accumulatedPausedSeconds
        
        let elapsedSeconds = max(0, Int(elapsed))
        
        // Notify React Native app via URL Scheme with timer data
        let type = state.type.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let childName = attributes.childName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let side = (state.side ?? "").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        
        if let url = URL(string: "calmparentapp://save-timer?activityId=\(activityId)&type=\(type)&elapsedSeconds=\(elapsedSeconds)&childName=\(childName)&side=\(side)") {
            await UIApplication.shared.open(url)
        }
        
        return .result()
    }
}
#endif

