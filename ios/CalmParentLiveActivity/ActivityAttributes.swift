import ActivityKit
import Foundation

/// Attributes for the advanced Live Activity UI
struct CalmParentLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var type: String
        var startDate: Date
        var isPaused: Bool
        var pauseDate: Date?
        var accumulatedPausedSeconds: Double
        var side: String?
    }

    var parentName: String
    var childName: String
    var activityType: String
}

