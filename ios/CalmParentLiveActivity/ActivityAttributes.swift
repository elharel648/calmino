//
//  ActivityAttributes.swift
//  CalmParentApp
//
//  Shared Activity Attributes for Main App and Widget Extension
//  This file MUST match the one in SharedAttributes local module!
//

import ActivityKit
import Foundation

// MARK: - Babysitter Shift Attributes

@available(iOS 16.2, *)
public struct BabysitterShiftAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var startTime: Date
        public var isPaused: Bool
        public var totalPausedSeconds: TimeInterval
        public var hourlyRate: Double
        
        public init(startTime: Date, isPaused: Bool, totalPausedSeconds: TimeInterval, hourlyRate: Double) {
            self.startTime = startTime
            self.isPaused = isPaused
            self.totalPausedSeconds = totalPausedSeconds
            self.hourlyRate = hourlyRate
        }
    }
    
    // Static attributes
    public var babysitterName: String
    public var babysitterPhoto: String? // URL or emoji
    
    public init(babysitterName: String, babysitterPhoto: String? = nil) {
        self.babysitterName = babysitterName
        self.babysitterPhoto = babysitterPhoto
    }
}

// MARK: - Meal Activity Attributes

@available(iOS 16.2, *)
public struct MealActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var startTime: Date
        public var mealType: String // "ארוחת בוקר", "צהריים", "ערב", "חטיף"
        public var babyName: String
        public var foodItems: [String]
        public var isPaused: Bool
        public var progress: Double // 0.0 - 1.0
        
        public init(startTime: Date, mealType: String, babyName: String, foodItems: [String], isPaused: Bool, progress: Double) {
            self.startTime = startTime
            self.mealType = mealType
            self.babyName = babyName
            self.foodItems = foodItems
            self.isPaused = isPaused
            self.progress = progress
        }
    }
    
    public var babyName: String
    public var babyEmoji: String
    
    public init(babyName: String, babyEmoji: String) {
        self.babyName = babyName
        self.babyEmoji = babyEmoji
    }
}

// MARK: - Sleep Activity Attributes

@available(iOS 16.2, *)
public struct SleepActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var startTime: Date
        public var babyName: String
        public var sleepType: String // "תנומת צהריים", "שינת לילה"
        public var isAwake: Bool
        public var isPaused: Bool
        public var activeSeconds: Int
        public var quality: String? // "טוב", "רגיל", "לא טוב"
        
        public init(startTime: Date, babyName: String, sleepType: String, isAwake: Bool, isPaused: Bool = false, activeSeconds: Int = 0, quality: String? = nil) {
            self.startTime = startTime
            self.babyName = babyName
            self.sleepType = sleepType
            self.isAwake = isAwake
            self.isPaused = isPaused
            self.activeSeconds = activeSeconds
            self.quality = quality
        }
    }
    
    public var babyName: String
    public var babyEmoji: String
    
    public init(babyName: String, babyEmoji: String) {
        self.babyName = babyName
        self.babyEmoji = babyEmoji
    }
}

// MARK: - Breastfeeding Activity Attributes

@available(iOS 16.2, *)
public struct BreastfeedingActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var leftSideSeconds: Int     // Accumulated left side active seconds
        public var rightSideSeconds: Int    // Accumulated right side active seconds
        public var activeSide: String?      // "left", "right", nil = between sides
        public var sideStartTime: Date?     // When current active side timer started
        public var isPaused: Bool

        public init(leftSideSeconds: Int = 0, rightSideSeconds: Int = 0, activeSide: String? = nil, sideStartTime: Date? = nil, isPaused: Bool = false) {
            self.leftSideSeconds = leftSideSeconds
            self.rightSideSeconds = rightSideSeconds
            self.activeSide = activeSide
            self.sideStartTime = sideStartTime
            self.isPaused = isPaused
        }
    }

    public var babyName: String

    public init(babyName: String) {
        self.babyName = babyName
    }
}

// MARK: - Play Activity Attributes

@available(iOS 16.2, *)
public struct PlayActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var startTime: Date
        public var babyName: String
        public var activityType: String // "משחק חופשי", "קריאה", "שירה", "משחק חוץ"
        public var isPaused: Bool
        
        public init(startTime: Date, babyName: String, activityType: String, isPaused: Bool) {
            self.startTime = startTime
            self.babyName = babyName
            self.activityType = activityType
            self.isPaused = isPaused
        }
    }
    
    public var babyName: String
    public var babyEmoji: String
    
    public init(babyName: String, babyEmoji: String) {
        self.babyName = babyName
        self.babyEmoji = babyEmoji
    }
}

// MARK: - White Noise Activity Attributes

@available(iOS 16.2, *)
public struct WhiteNoiseActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var startTime: Date

        public init(startTime: Date) {
            self.startTime = startTime
        }
    }

    public var soundId: String    // "lullaby" | "gentle" | "birds" | "rain"
    public var soundName: String  // Hebrew display name

    public init(soundId: String, soundName: String) {
        self.soundId = soundId
        self.soundName = soundName
    }
}

// MARK: - Meditation Activity Attributes

@available(iOS 16.2, *)
public struct ParentMeditationAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var startTime: Date
        public var duration: TimeInterval // משך במילישניות
        public var meditationType: String // "נשימות", "סריקת גוף", "הרפיה"
        public var isActive: Bool
        
        public init(startTime: Date, duration: TimeInterval, meditationType: String, isActive: Bool) {
            self.startTime = startTime
            self.duration = duration
            self.meditationType = meditationType
            self.isActive = isActive
        }
    }
    
    public var parentName: String
    
    public init(parentName: String) {
        self.parentName = parentName
    }
}
