//
//  BabysitterShiftLiveActivity.swift
//  Babysitter Shift Live Activity
//
//  Created for tracking active babysitter shifts with live cost and timer
//

import ActivityKit
import WidgetKit
import SwiftUI
import Combine
import SharedAttributes

// Note: BabysitterShiftAttributes is now defined in SharedAttributes module

// MARK: - Widget

@available(iOS 16.2, *)
struct BabysitterShiftLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BabysitterShiftAttributes.self) { context in
            // Lock Screen UI
            BabysitterShiftLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: - Expanded View
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            if let photo = context.attributes.babysitterPhoto, photo.count == 1 {
                                Text(photo) // Emoji
                                    .font(.title3)
                            } else {
                                Image(systemName: "person.fill")
                                    .foregroundColor(.purple)
                            }
                            Text(context.attributes.babysitterName)
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        Text(context.state.isPaused ? "מושהה" : "פעיל")
                            .font(.caption2)
                            .foregroundColor(context.state.isPaused ? .orange : .green)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        // Timer - עם עדכון אוטומטי
                        if !context.state.isPaused {
                            Text(
                                context.state.startTime.addingTimeInterval(-context.state.totalPausedSeconds),
                                style: .timer
                            )
                            .font(.title2)
                            .fontWeight(.bold)
                            .monospacedDigit()
                        } else {
                            Text(timerText(start: context.state.startTime, paused: context.state.totalPausedSeconds))
                                .font(.title2)
                                .fontWeight(.bold)
                                .monospacedDigit()
                        }
                        
                        // Cost
                        LiveCostView(
                            startTime: context.state.startTime,
                            hourlyRate: context.state.hourlyRate,
                            totalPausedSeconds: context.state.totalPausedSeconds,
                            isPaused: context.state.isPaused
                        )
                        .font(.caption)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "creditcard.fill")
                            .foregroundColor(.purple)
                        Text("₪\(String(format: "%.2f", context.state.hourlyRate))/שעה")
                            .font(.caption)
                        
                        Spacer()
                        
                        if context.state.isPaused {
                            HStack(spacing: 4) {
                                Image(systemName: "pause.circle.fill")
                                    .foregroundColor(.orange)
                                Text("מושהה")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                // Compact Leading
                Image(systemName: "person.fill.checkmark")
                    .foregroundColor(.purple)
            } compactTrailing: {
                // Compact Trailing - Timer (עם עדכון אוטומטי)
                if !context.state.isPaused {
                    Text(
                        context.state.startTime.addingTimeInterval(-context.state.totalPausedSeconds),
                        style: .timer
                    )
                    .monospacedDigit()
                    .font(.caption2)
                } else {
                    HStack(spacing: 2) {
                        Image(systemName: "pause.fill")
                            .font(.caption2)
                            .foregroundColor(.orange)
                        Text(timerText(start: context.state.startTime, paused: context.state.totalPausedSeconds))
                            .monospacedDigit()
                            .font(.caption2)
                    }
                }
            } minimal: {
                // Minimal
                Image(systemName: "person.fill.checkmark")
                    .foregroundColor(.purple)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct BabysitterShiftLockScreenView: View {
    let context: ActivityViewContext<BabysitterShiftAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                if let photo = context.attributes.babysitterPhoto, photo.count == 1 {
                    Text(photo)
                        .font(.title)
                } else {
                    Image(systemName: "person.fill.checkmark")
                        .font(.title2)
                        .foregroundColor(.purple)
                }
                
                VStack(alignment: .leading) {
                    Text(context.attributes.babysitterName)
                        .font(.headline)
                    Text("בייביסיטר פעילה")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Status badge
                Text(context.state.isPaused ? "⏸️ מושהה" : "✅ פעיל")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        context.state.isPaused 
                            ? Color.orange.opacity(0.2) 
                            : Color.green.opacity(0.2)
                    )
                    .cornerRadius(8)
            }
            
            Divider()
            
            // Timer (BIG)
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("זמן")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    // שימוש ב-Text.Timer לעדכון אוטומטי
                    if !context.state.isPaused {
                        Text(
                            context.state.startTime.addingTimeInterval(-context.state.totalPausedSeconds), 
                            style: .timer
                        )
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    } else {
                        Text(timerText(start: context.state.startTime, paused: context.state.totalPausedSeconds))
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("לתשלום")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    // עדכון העלות באופן דינמי
                    LiveCostView(
                        startTime: context.state.startTime,
                        hourlyRate: context.state.hourlyRate,
                        totalPausedSeconds: context.state.totalPausedSeconds,
                        isPaused: context.state.isPaused
                    )
                }
            }
            
            // Rate
            Text("₪\(String(format: "%.2f", context.state.hourlyRate))/שעה")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

// MARK: - Live Cost View

@available(iOS 16.2, *)
struct LiveCostView: View {
    let startTime: Date
    let hourlyRate: Double
    let totalPausedSeconds: TimeInterval
    let isPaused: Bool
    
    @State private var currentCost: Double = 0.0
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        Text("₪\(String(format: "%.2f", currentCost))")
            .font(.system(size: 28, weight: .bold, design: .rounded))
            .foregroundColor(.green)
            .onReceive(timer) { _ in
                updateCost()
            }
            .onAppear {
                updateCost()
            }
    }
    
    private func updateCost() {
        let elapsed = Date().timeIntervalSince(startTime) - totalPausedSeconds
        let hours = elapsed / 3600.0
        currentCost = max(0, hours * hourlyRate)
    }
}

// MARK: - Helper Functions

@available(iOS 16.2, *)
func timerText(start: Date, paused: TimeInterval) -> String {
    let elapsed = Date().timeIntervalSince(start) - paused
    let hours = Int(elapsed) / 3600
    let minutes = (Int(elapsed) % 3600) / 60
    let seconds = Int(elapsed) % 60
    return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
}

@available(iOS 16.2, *)
func costText(start: Date, rate: Double, paused: TimeInterval) -> String {
    let elapsed = Date().timeIntervalSince(start) - paused
    let hours = elapsed / 3600.0
    let cost = hours * rate
    return "₪\(String(format: "%.2f", cost))"
}
