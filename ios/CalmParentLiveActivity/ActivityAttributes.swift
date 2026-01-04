import ActivityKit
import Foundation

struct CalmParentLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic state - time-based model
        var type: String                      // Activity type (Hebrew/English)
        var startDate: Date                   // When timer started
        var isPaused: Bool                    // Current pause state
        var pauseDate: Date?                  // When paused (nil if running)
        var accumulatedPausedSeconds: Double  // Total paused time before current pause
        var side: String?                     // For breastfeeding: "left" or "right"
    }

    // Static attributes (fixed for entire activity lifecycle)
    var parentName: String
    var childName: String
    var activityType: String // Legacy compatibility
}