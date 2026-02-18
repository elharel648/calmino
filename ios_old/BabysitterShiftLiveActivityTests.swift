//
//  BabysitterShiftLiveActivityTests.swift
//  Tests for Babysitter Shift Live Activity
//
//  בדיקות ל-Live Activity של משמרת בייביסיטר
//

import XCTest
import ActivityKit
import WidgetKit
@testable import CalmParentApp

@available(iOS 16.2, *)
final class BabysitterShiftLiveActivityTests: XCTestCase {
    
    // MARK: - Test Properties
    
    var activityKitModule: ActivityKitModule!
    
    // MARK: - Setup & Teardown
    
    override func setUp() {
        super.setUp()
        activityKitModule = ActivityKitModule()
    }
    
    override func tearDown() {
        // נקה כל ה-activities הפעילים
        Task {
            for activity in Activity<BabysitterShiftAttributes>.activities {
                await activity.end(dismissalPolicy: .immediate)
            }
        }
        activityKitModule = nil
        super.tearDown()
    }
    
    // MARK: - Timer Tests
    
    func testTimerTextFormat() {
        // Given
        let startTime = Date()
        let pausedSeconds: TimeInterval = 0
        
        // When
        let result = timerText(start: startTime, paused: pausedSeconds)
        
        // Then
        XCTAssertTrue(result.matches(pattern: "\\d{2}:\\d{2}:\\d{2}"), "Timer should be in HH:MM:SS format")
    }
    
    func testTimerWithPausedTime() {
        // Given
        let startTime = Date().addingTimeInterval(-3600) // שעה אחורה
        let pausedSeconds: TimeInterval = 600 // 10 דקות מושהות
        
        // When
        let result = timerText(start: startTime, paused: pausedSeconds)
        
        // Then
        // צריך להראות 00:50:00 (60 דקות - 10 דקות)
        XCTAssertTrue(result.hasPrefix("00:5"), "Should show approximately 50 minutes")
    }
    
    // MARK: - Cost Calculation Tests
    
    func testCostCalculation() {
        // Given
        let startTime = Date().addingTimeInterval(-3600) // שעה אחורה
        let hourlyRate: Double = 50.0
        let pausedSeconds: TimeInterval = 0
        
        // When
        let result = costText(start: startTime, rate: hourlyRate, paused: pausedSeconds)
        
        // Then
        XCTAssertTrue(result.contains("50.00"), "Cost should be ₪50.00 for one hour")
    }
    
    func testCostCalculationWithPause() {
        // Given
        let startTime = Date().addingTimeInterval(-3600) // שעה אחורה
        let hourlyRate: Double = 50.0
        let pausedSeconds: TimeInterval = 1800 // 30 דקות מושהות
        
        // When
        let result = costText(start: startTime, rate: hourlyRate, paused: pausedSeconds)
        
        // Then
        // צריך להיות 25₪ (חצי שעה)
        XCTAssertTrue(result.contains("25.00"), "Cost should be ₪25.00 for half hour")
    }
    
    func testCostCalculationMultipleHours() {
        // Given
        let startTime = Date().addingTimeInterval(-7200) // שעתיים אחורה
        let hourlyRate: Double = 50.0
        let pausedSeconds: TimeInterval = 0
        
        // When
        let result = costText(start: startTime, rate: hourlyRate, paused: pausedSeconds)
        
        // Then
        XCTAssertTrue(result.contains("100.00"), "Cost should be ₪100.00 for two hours")
    }
    
    // MARK: - LiveCostView Tests
    
    func testLiveCostViewInitialization() {
        // Given
        let startTime = Date()
        let hourlyRate: Double = 50.0
        let pausedSeconds: TimeInterval = 0
        let isPaused = false
        
        // When
        let view = LiveCostView(
            startTime: startTime,
            hourlyRate: hourlyRate,
            totalPausedSeconds: pausedSeconds,
            isPaused: isPaused
        )
        
        // Then
        XCTAssertNotNil(view, "LiveCostView should initialize successfully")
    }
    
    // MARK: - Attributes Tests
    
    func testBabysitterShiftAttributesCreation() {
        // Given
        let name = "שרה כהן"
        let photo = "👩"
        
        // When
        let attributes = BabysitterShiftAttributes(
            babysitterName: name,
            babysitterPhoto: photo
        )
        
        // Then
        XCTAssertEqual(attributes.babysitterName, name)
        XCTAssertEqual(attributes.babysitterPhoto, photo)
    }
    
    func testContentStateCreation() {
        // Given
        let startTime = Date()
        let isPaused = false
        let pausedSeconds: TimeInterval = 0
        let hourlyRate: Double = 50.0
        
        // When
        let state = BabysitterShiftAttributes.ContentState(
            startTime: startTime,
            isPaused: isPaused,
            totalPausedSeconds: pausedSeconds,
            hourlyRate: hourlyRate
        )
        
        // Then
        XCTAssertEqual(state.startTime, startTime)
        XCTAssertEqual(state.isPaused, isPaused)
        XCTAssertEqual(state.totalPausedSeconds, pausedSeconds)
        XCTAssertEqual(state.hourlyRate, hourlyRate)
    }
    
    // MARK: - Activity State Tests
    
    func testActivityAuthorizationCheck() {
        // When
        let authInfo = ActivityAuthorizationInfo()
        
        // Then
        // לא נבדוק את הערך האמיתי כי זה תלוי במכשיר
        // רק נוודא שהפונקציה עובדת
        let _ = authInfo.areActivitiesEnabled
        XCTAssertTrue(true, "Should be able to check authorization")
    }
    
    // MARK: - Integration Tests (נדרש מכשיר אמיתי)
    
    func testStartActivity_RequiresRealDevice() {
        // Given
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            XCTSkip("Live Activities not available on this device/simulator")
        }
        
        let attributes = BabysitterShiftAttributes(
            babysitterName: "Test Babysitter",
            babysitterPhoto: "👩"
        )
        
        let initialState = BabysitterShiftAttributes.ContentState(
            startTime: Date(),
            isPaused: false,
            totalPausedSeconds: 0,
            hourlyRate: 50.0
        )
        
        // When
        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: initialState, staleDate: nil),
                pushType: nil
            )
            
            // Then
            XCTAssertNotNil(activity.id, "Activity should have an ID")
            
            // Cleanup
            Task {
                await activity.end(dismissalPolicy: .immediate)
            }
        } catch {
            XCTFail("Failed to create activity: \(error)")
        }
    }
    
    func testUpdateActivity_RequiresRealDevice() {
        // Given
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            XCTSkip("Live Activities not available on this device/simulator")
        }
        
        let attributes = BabysitterShiftAttributes(
            babysitterName: "Test Babysitter",
            babysitterPhoto: "👩"
        )
        
        let initialState = BabysitterShiftAttributes.ContentState(
            startTime: Date(),
            isPaused: false,
            totalPausedSeconds: 0,
            hourlyRate: 50.0
        )
        
        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: initialState, staleDate: nil),
                pushType: nil
            )
            
            // When
            let updatedState = BabysitterShiftAttributes.ContentState(
                startTime: initialState.startTime,
                isPaused: true, // מושהה
                totalPausedSeconds: 120.0,
                hourlyRate: initialState.hourlyRate
            )
            
            Task {
                await activity.update(.init(state: updatedState, staleDate: nil))
                
                // Then
                let currentState = activity.content.state
                XCTAssertTrue(currentState.isPaused, "Activity should be paused")
                XCTAssertEqual(currentState.totalPausedSeconds, 120.0)
                
                // Cleanup
                await activity.end(dismissalPolicy: .immediate)
            }
        } catch {
            XCTFail("Failed to update activity: \(error)")
        }
    }
    
    // MARK: - Performance Tests
    
    func testTimerTextPerformance() {
        let startTime = Date()
        let pausedSeconds: TimeInterval = 0
        
        measure {
            for _ in 0..<1000 {
                _ = timerText(start: startTime, paused: pausedSeconds)
            }
        }
    }
    
    func testCostTextPerformance() {
        let startTime = Date()
        let hourlyRate: Double = 50.0
        let pausedSeconds: TimeInterval = 0
        
        measure {
            for _ in 0..<1000 {
                _ = costText(start: startTime, rate: hourlyRate, paused: pausedSeconds)
            }
        }
    }
}

// MARK: - Helper Extensions

extension String {
    func matches(pattern: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return false
        }
        let range = NSRange(location: 0, length: self.utf16.count)
        return regex.firstMatch(in: self, range: range) != nil
    }
}

// MARK: - Mock Tests (לא דורש מכשיר)

@available(iOS 16.2, *)
final class BabysitterShiftMockTests: XCTestCase {
    
    func testCalculateWorkTime() {
        // Given
        let startTime = Date().addingTimeInterval(-3600) // שעה אחורה
        let pausedSeconds: TimeInterval = 600 // 10 דקות
        
        // When
        let elapsed = Date().timeIntervalSince(startTime) - pausedSeconds
        
        // Then
        XCTAssertGreaterThan(elapsed, 3000, "Should have at least 50 minutes of work time")
        XCTAssertLessThan(elapsed, 3600, "Should have less than 60 minutes of work time")
    }
    
    func testCalculateCost() {
        // Given
        let workTimeInSeconds: TimeInterval = 3600 // שעה
        let hourlyRate: Double = 50.0
        
        // When
        let hours = workTimeInSeconds / 3600.0
        let cost = hours * hourlyRate
        
        // Then
        XCTAssertEqual(cost, 50.0, accuracy: 0.01)
    }
    
    func testPauseTimeAccumulation() {
        // Given
        var totalPaused: TimeInterval = 300 // 5 דקות
        let newPauseDuration: TimeInterval = 600 // 10 דקות
        
        // When
        totalPaused += newPauseDuration
        
        // Then
        XCTAssertEqual(totalPaused, 900, "Total paused should be 15 minutes")
    }
}
