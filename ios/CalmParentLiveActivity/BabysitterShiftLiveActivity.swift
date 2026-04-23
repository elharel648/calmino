//
//  BabysitterShiftLiveActivity.swift
//  Babysitter Shift Live Activity
//
//  Created for tracking active babysitter shifts with live cost and timer
//

import ActivityKit
import WidgetKit
import SwiftUI



@available(iOS 16.2, *)
struct BabysitterShiftLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BabysitterShiftAttributes.self) { context in
            // Lock Screen UI
            BabysitterShiftLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: "person.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(.blue)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(context.attributes.babysitterName)
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text("בייביסיטר פעילה")
                                .font(.system(size: 10, design: .rounded))
                                .foregroundStyle(.blue)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isPaused {
                        Text("מושהה")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.orange)
                            .multilineTextAlignment(.trailing)
                    } else {
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.trailing)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isPaused ? "pause.fill" : "person.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(context.state.isPaused ? .orange : .blue)
            } compactTrailing: {
                if context.state.isPaused {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.orange)
                } else {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 11, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(.blue)
                }
            } minimal: {
                Image(systemName: "person.fill")
                    .foregroundStyle(.blue)
            }
            .widgetURL(URL(string: "calmparentapp://babysitter")!)
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct BabysitterShiftLockScreenView: View {
    let context: ActivityViewContext<BabysitterShiftAttributes>

    var body: some View {
        VStack(spacing: 10) {
            // Name - Clean and centered
            Text(context.attributes.babysitterName)
                .font(.system(size: 18, weight: .bold))

            Text("בייביסיטר פעילה")
                .font(.caption)
                .foregroundColor(.secondary)

            Divider()
                .padding(.vertical, 2)

            // Timer - Large and prominent
            VStack(spacing: 4) {
                Text("זמן")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(timerText(start: context.state.startTime, paused: context.state.totalPausedSeconds))
                    .font(.system(size: 42, weight: .heavy, design: .rounded))
                    .monospacedDigit()
            }
        }
        .padding()
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
