import Foundation
import ActivityKit

/// Activity Attributes for CalmParent Live Activities
/// This defines the static and dynamic data for the Live Activity
struct CalmParentAttributes: ActivityAttributes {
    /// Static data that doesn't change during the activity lifecycle
    public struct Attributes: Codable, Hashable {
        var parentName: String
        var activityType: ActivityType
        var childName: String?
        
        enum ActivityType: String, Codable {
            case pumping = "שאיבה"
            case breastfeeding = "הנקה"
            case sleep = "שינה"
            case feeding = "האכלה"
        }
    }
    
    /// Dynamic state that updates during the activity
    public struct ContentState: Codable, Hashable {
        var startTime: Date
        var elapsedSeconds: Int
        var isRunning: Bool
        var status: String?
        
        /// Formatted time string (e.g., "12:34" or "1:23:45")
        var formattedTime: String {
            let hours = elapsedSeconds / 3600
            let minutes = (elapsedSeconds % 3600) / 60
            let seconds = elapsedSeconds % 60
            
            if hours > 0 {
                return String(format: "%d:%02d:%02d", hours, minutes, seconds)
            }
            return String(format: "%d:%02d", minutes, seconds)
        }
    }
    
    var attributes: Attributes
    var contentState: ContentState
}

