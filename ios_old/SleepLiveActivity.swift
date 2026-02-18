//
//  SleepLiveActivity.swift
//  CalmParentApp
//
//  Live Activity for tracking baby sleep
//

import ActivityKit
import SharedAttributes
import WidgetKit
import SwiftUI

@available(iOS 16.2, *)
struct SleepLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SleepActivityAttributes.self) { context in
            // Lock Screen UI
            SleepLockScreenViewWidget(context: context)
                .activityBackgroundTint(Color.black)
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: - Expanded View
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(context.attributes.babyEmoji)
                                .font(.title3)
                            Text(context.state.babyName)
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        Text(context.state.sleepType)
                            .font(.caption2)
                            .foregroundColor(.blue)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        // Timer
                        if !context.state.isAwake {
                            Text(context.state.startTime, style: .timer)
                                .font(.title2)
                                .fontWeight(.bold)
                                .monospacedDigit()
                        } else {
                            Text("ער")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                        
                        // Quality
                        if let quality = context.state.quality {
                            Text(qualityEmoji(quality))
                                .font(.title3)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: context.state.isAwake ? "sun.max.fill" : "moon.zzz.fill")
                            .foregroundColor(context.state.isAwake ? .orange : .blue)
                        Text(context.state.isAwake ? "התעורר" : "ישן")
                            .font(.caption)
                        
                        Spacer()
                        
                        if let quality = context.state.quality {
                            HStack(spacing: 4) {
                                Text("איכות:")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(quality)
                                    .font(.caption)
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Text(context.attributes.babyEmoji)
                        .font(.caption2)
                    Image(systemName: context.state.isAwake ? "sun.max.fill" : "moon.zzz.fill")
                        .foregroundColor(context.state.isAwake ? .orange : .blue)
                }
            } compactTrailing: {
                if !context.state.isAwake {
                    Text(context.state.startTime, style: .timer)
                        .monospacedDigit()
                        .font(.caption2)
                } else {
                    Image(systemName: "sun.max.fill")
                        .font(.caption2)
                        .foregroundColor(.orange)
                }
            } minimal: {
                Image(systemName: context.state.isAwake ? "sun.max.fill" : "moon.zzz.fill")
                    .foregroundColor(context.state.isAwake ? .orange : .blue)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct SleepLockScreenViewWidget: View {
    let context: ActivityViewContext<SleepActivityAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(context.attributes.babyEmoji)
                    .font(.title)
                
                VStack(alignment: .leading) {
                    Text(context.state.babyName)
                        .font(.headline)
                    Text(context.state.sleepType)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Status
                HStack(spacing: 4) {
                    Image(systemName: context.state.isAwake ? "sun.max.fill" : "moon.zzz.fill")
                        .foregroundColor(context.state.isAwake ? .orange : .blue)
                    Text(context.state.isAwake ? "ער" : "ישן")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    (context.state.isAwake ? Color.orange : Color.blue).opacity(0.2)
                )
                .cornerRadius(8)
            }
            
            Divider()
            
            // Timer
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("זמן שינה")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if !context.state.isAwake {
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    } else {
                        Text(sleepDuration(start: context.state.startTime))
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                }
                
                Spacer()
                
                // Quality rating
                if let quality = context.state.quality {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("איכות")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        VStack {
                            Text(qualityEmoji(quality))
                                .font(.largeTitle)
                            Text(quality)
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                    }
                }
            }
            
            // Sleep info
            if context.state.isAwake {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("התעורר \(relativeTime(from: Date()))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 4)
            }
        }
        .padding()
    }
}

// MARK: - Helper Functions

@available(iOS 16.2, *)
func qualityEmoji(_ quality: String) -> String {
    switch quality {
    case "טוב":
        return "😊"
    case "רגיל":
        return "😐"
    case "לא טוב":
        return "😔"
    default:
        return "😴"
    }
}

@available(iOS 16.2, *)
func sleepDuration(start: Date) -> String {
    let elapsed = Date().timeIntervalSince(start)
    let hours = Int(elapsed) / 3600
    let minutes = (Int(elapsed) % 3600) / 60
    return String(format: "%02d:%02d", hours, minutes)
}

@available(iOS 16.2, *)
func relativeTime(from date: Date) -> String {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .full
    return formatter.localizedString(for: date, relativeTo: Date())
}
