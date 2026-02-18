//
//  QuickActionsLiveActivities.swift
//  CalmParentApp
//
//  Live Activities לפעולות מהירות: אוכל, שינה, משחק, מדיטציה
//

import ActivityKit
import WidgetKit
import SwiftUI
import Combine

// Note: All Activity Attributes are now defined in SharedActivityAttributes.swift



// MARK: - Sleep Live Activity Widget

@available(iOS 16.2, *)
struct SleepLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SleepActivityAttributes.self) { context in
            SleepLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(context.attributes.babyEmoji)
                                .font(.title2)
                            Text(context.attributes.babyName)
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        HStack(spacing: 4) {
                            Image(systemName: context.state.isAwake ? "sun.max.fill" : "moon.stars.fill")
                                .font(.caption2)
                            Text(context.state.isAwake ? "ער/ה" : "ישן/ה")
                                .font(.caption2)
                        }
                        .foregroundColor(context.state.isAwake ? .orange : .indigo)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        if !context.state.isAwake {
                            Text(
                                context.state.startTime,
                                style: .timer
                            )
                            .font(.title2)
                            .fontWeight(.bold)
                            .monospacedDigit()
                        } else {
                            Text(sleepDuration(from: context.state.startTime))
                                .font(.title3)
                                .fontWeight(.bold)
                        }
                        
                        if let quality = context.state.quality {
                            Text(quality)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "bed.double.fill")
                            .foregroundColor(.indigo)
                        Text(context.state.sleepType)
                            .font(.caption)
                        
                        Spacer()
                        
                        if !context.state.isAwake {
                            HStack(spacing: 4) {
                                Image(systemName: "zzz")
                                    .foregroundColor(.indigo)
                                Text("ישן/ה")
                                    .font(.caption)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Text(context.attributes.babyEmoji)
                        .font(.caption)
                    Image(systemName: context.state.isAwake ? "sun.max" : "moon.stars.fill")
                        .foregroundColor(context.state.isAwake ? .orange : .indigo)
                }
            } compactTrailing: {
                if !context.state.isAwake {
                    Text(
                        context.state.startTime,
                        style: .timer
                    )
                    .monospacedDigit()
                    .font(.caption2)
                } else {
                    Text("✓")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            } minimal: {
                Image(systemName: "moon.stars.fill")
                    .foregroundColor(.indigo)
            }
        }
    }
}

// MARK: - Play Live Activity Widget

@available(iOS 16.2, *)
struct PlayLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PlayActivityAttributes.self) { context in
            PlayLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(context.attributes.babyEmoji)
                                .font(.title2)
                            Text(context.attributes.babyName)
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        Text(context.state.activityType)
                            .font(.caption2)
                            .foregroundColor(.pink)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        if !context.state.isPaused {
                            Text(
                                context.state.startTime,
                                style: .timer
                            )
                            .font(.title2)
                            .fontWeight(.bold)
                            .monospacedDigit()
                        } else {
                            Text(elapsedTime(from: context.state.startTime))
                                .font(.title3)
                                .fontWeight(.bold)
                                .monospacedDigit()
                        }
                        
                        Text(context.state.isPaused ? "מושהה" : "פעיל")
                            .font(.caption2)
                            .foregroundColor(context.state.isPaused ? .orange : .green)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: getPlayIcon(for: context.state.activityType))
                            .foregroundColor(.pink)
                        Text(context.state.activityType)
                            .font(.caption)
                        
                        Spacer()
                        
                        if context.state.isPaused {
                            HStack(spacing: 4) {
                                Image(systemName: "pause.circle.fill")
                                    .foregroundColor(.orange)
                                Text("מושהה")
                                    .font(.caption)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Text(context.attributes.babyEmoji)
                        .font(.caption)
                    Image(systemName: "gamecontroller")
                        .foregroundColor(.pink)
                }
            } compactTrailing: {
                if !context.state.isPaused {
                    Text(
                        context.state.startTime,
                        style: .timer
                    )
                    .monospacedDigit()
                    .font(.caption2)
                } else {
                    Image(systemName: "pause.fill")
                        .font(.caption2)
                        .foregroundColor(.orange)
                }
            } minimal: {
                Image(systemName: "gamecontroller.fill")
                    .foregroundColor(.pink)
            }
        }
    }
}

// MARK: - Meditation Live Activity Widget

@available(iOS 16.2, *)
struct ParentMeditationLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ParentMeditationAttributes.self) { context in
            MeditationLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "leaf.fill")
                                .foregroundColor(.green)
                            Text(context.attributes.parentName)
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        Text(context.state.meditationType)
                            .font(.caption2)
                            .foregroundColor(.green)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        if context.state.isActive {
                            Text(
                                context.state.startTime.addingTimeInterval(context.state.duration),
                                style: .timer
                            )
                            .font(.title2)
                            .fontWeight(.bold)
                            .monospacedDigit()
                        } else {
                            Text("✓")
                                .font(.title)
                                .foregroundColor(.green)
                        }
                        
                        Text(context.state.isActive ? "מדיטציה" : "הושלם")
                            .font(.caption2)
                            .foregroundColor(context.state.isActive ? .green : .secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "sparkles")
                            .foregroundColor(.green)
                        Text(context.state.meditationType)
                            .font(.caption)
                        
                        Spacer()
                        
                        if context.state.isActive {
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(Color.green)
                                    .frame(width: 8, height: 8)
                                Text("פעיל")
                                    .font(.caption)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                Image(systemName: "leaf.fill")
                    .foregroundColor(.green)
            } compactTrailing: {
                if context.state.isActive {
                    Text(
                        context.state.startTime.addingTimeInterval(context.state.duration),
                        style: .timer
                    )
                    .monospacedDigit()
                    .font(.caption2)
                } else {
                    Text("✓")
                        .foregroundColor(.green)
                }
            } minimal: {
                Image(systemName: "leaf.fill")
                    .foregroundColor(.green)
            }
        }
    }
}

// MARK: - Lock Screen Views

@available(iOS 16.2, *)
struct SleepLockScreenView: View {
    let context: ActivityViewContext<SleepActivityAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(context.attributes.babyEmoji)
                    .font(.title)
                
                VStack(alignment: .leading) {
                    Text(context.attributes.babyName)
                        .font(.headline)
                    Text(context.state.sleepType)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                HStack(spacing: 4) {
                    Image(systemName: context.state.isAwake ? "sun.max.fill" : "moon.stars.fill")
                        .foregroundColor(context.state.isAwake ? .orange : .indigo)
                    Text(context.state.isAwake ? "ער/ה" : "ישן/ה")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            (context.state.isAwake ? Color.orange : Color.indigo).opacity(0.2)
                        )
                        .cornerRadius(8)
                }
            }
            
            Divider()
            
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("זמן שינה")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if !context.state.isAwake {
                        Text(
                            context.state.startTime,
                            style: .timer
                        )
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    } else {
                        Text(sleepDuration(from: context.state.startTime))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                    }
                }
                
                Spacer()
                
                if let quality = context.state.quality {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("איכות")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(quality)
                            .font(.headline)
                            .foregroundColor(qualityColor(quality))
                    }
                }
            }
        }
        .padding()
    }
}

@available(iOS 16.2, *)
struct PlayLockScreenView: View {
    let context: ActivityViewContext<PlayActivityAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(context.attributes.babyEmoji)
                    .font(.title)
                
                VStack(alignment: .leading) {
                    Text(context.attributes.babyName)
                        .font(.headline)
                    Text(context.state.activityType)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text(context.state.isPaused ? "⏸️ מושהה" : "▶️ פעיל")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        (context.state.isPaused ? Color.orange : Color.pink).opacity(0.2)
                    )
                    .cornerRadius(8)
            }
            
            Divider()
            
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("זמן משחק")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if !context.state.isPaused {
                        Text(
                            context.state.startTime,
                            style: .timer
                        )
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    } else {
                        Text(elapsedTime(from: context.state.startTime))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                }
                
                Spacer()
                
                Image(systemName: getPlayIcon(for: context.state.activityType))
                    .font(.system(size: 40))
                    .foregroundColor(.pink)
            }
        }
        .padding()
    }
}

@available(iOS 16.2, *)
struct MeditationLockScreenView: View {
    let context: ActivityViewContext<ParentMeditationAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "leaf.fill")
                    .font(.title)
                    .foregroundColor(.green)
                
                VStack(alignment: .leading) {
                    Text(context.attributes.parentName)
                        .font(.headline)
                    Text(context.state.meditationType)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text(context.state.isActive ? "🧘 פעיל" : "✅ הושלם")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        Color.green.opacity(0.2)
                    )
                    .cornerRadius(8)
            }
            
            Divider()
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("זמן מדיטציה")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if context.state.isActive {
                        Text(
                            context.state.startTime.addingTimeInterval(context.state.duration),
                            style: .timer
                        )
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    } else {
                        Text(formatDuration(context.state.duration))
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                    }
                }
                
                Spacer()
                
                VStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 30))
                        .foregroundColor(.green)
                    Text("שקט")
                        .font(.caption)
                        .foregroundColor(.green)
                }
            }
        }
        .padding()
    }
}

// MARK: - Helper Functions

@available(iOS 16.2, *)
func elapsedTime(from startTime: Date) -> String {
    let elapsed = Date().timeIntervalSince(startTime)
    let hours = Int(elapsed) / 3600
    let minutes = (Int(elapsed) % 3600) / 60
    let seconds = Int(elapsed) % 60
    
    if hours > 0 {
        return String(format: "%d:%02d:%02d", hours, minutes, seconds)
    } else {
        return String(format: "%02d:%02d", minutes, seconds)
    }
}

@available(iOS 16.2, *)
func sleepDuration(from startTime: Date) -> String {
    let elapsed = Date().timeIntervalSince(startTime)
    let hours = Int(elapsed) / 3600
    let minutes = (Int(elapsed) % 3600) / 60
    
    return String(format: "%dש %dד", hours, minutes)
}

@available(iOS 16.2, *)
func formatDuration(_ duration: TimeInterval) -> String {
    let minutes = Int(duration / 60)
    return "\(minutes) דקות"
}

@available(iOS 16.2, *)
func getPlayIcon(for activityType: String) -> String {
    switch activityType {
    case "קריאה": return "book.fill"
    case "שירה": return "music.note"
    case "משחק חוץ": return "figure.run"
    default: return "gamecontroller.fill"
    }
}

@available(iOS 16.2, *)
func qualityColor(_ quality: String) -> Color {
    switch quality {
    case "טוב": return .green
    case "רגיל": return .orange
    case "לא טוב": return .red
    default: return .secondary
    }
}


