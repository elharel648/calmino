//
//  CalmParentActivityAttributes.swift
//  CalmParentApp
//
//  Activity Attributes definition for Live Activities
//

import Foundation
import ActivityKit

struct CalmParentActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Timer information
        var timerType: String // "pumping", "bottle", "sleep", "breast"
        var startTime: Date
        var elapsedSeconds: Int
        var isPaused: Bool
        
        // Parent & Child info
        var parentName: String
        var childName: String
        
        // Breastfeeding specific
        var side: String? // "left" or "right"
        
        // Computed property for display
        var formattedTime: String {
            let hours = elapsedSeconds / 3600
            let minutes = (elapsedSeconds % 3600) / 60
            let seconds = elapsedSeconds % 60
            
            if hours > 0 {
                return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
            } else {
                return String(format: "%02d:%02d", minutes, seconds)
            }
        }
        
        var activityTitle: String {
            switch timerType {
            case "pumping":
                return "🍼 שאיבה"
            case "bottle":
                return "🍼 בקבוק"
            case "sleep":
                return "😴 שינה"
            case "breast":
                let sideEmoji = side == "left" ? "👈" : "👉"
                return "\(sideEmoji) הנקה"
            default:
                return "⏱️ טיימר"
            }
        }
    }
    
    // Fixed attributes (won't change during activity lifetime)
    var activityName: String
}
