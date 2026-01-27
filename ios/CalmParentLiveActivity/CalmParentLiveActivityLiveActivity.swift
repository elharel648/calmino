//
//  CalmParentLiveActivityLiveActivity.swift
//  CalmParentLiveActivity
//
//  SwiftUI Views for Live Activities - Lock Screen & Dynamic Island
//

import ActivityKit
import WidgetKit
import SwiftUI

@main
struct CalmParentLiveActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CalmParentActivityAttributes.self) { context in
            // Lock Screen / Banner UI
            LockScreenLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Image(systemName: iconName(for: context.state.timerType))
                            .font(.title2)
                            .foregroundColor(.blue)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.state.activityTitle)
                                .font(.caption)
                                .fontWeight(.semibold)
                            Text(context.state.childName)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    // Empty - timer handles itself
                }
                
                DynamicIslandExpandedRegion(.center) {
                    // Large timer display
                    VStack(spacing: 8) {
                        Text(context.state.isPaused ? "⏸" : "⏱")
                            .font(.title3)
                        
                        Text(timerInterval: context.state.startTime...Date().addingTimeInterval(Double(context.state.elapsedSeconds)), countsDown: false)
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundColor(context.state.isPaused ? .orange : .primary)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Label(context.state.parentName, systemImage: "person.fill")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        if let side = context.state.side {
                            Label(side == "left" ? "Left" : "Right", systemImage: "circle.fill")
                                .font(.caption2)
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                // Compact Leading (left side of Dynamic Island)
                Image(systemName: iconName(for: context.state.timerType))
                    .foregroundColor(.blue)
            } compactTrailing: {
                // Compact Trailing (right side of Dynamic Island)
                Text(timerInterval: context.state.startTime...Date().addingTimeInterval(Double(context.state.elapsedSeconds)), countsDown: false)
                    .font(.caption2.monospacedDigit())
                    .frame(width: 50)
            } minimal: {
                // Minimal view (when multiple activities)
                Image(systemName: iconName(for: context.state.timerType))
                    .foregroundColor(.blue)
            }
            .widgetURL(URL(string: "calmparent://timer"))
            .keylineTint(.blue)
        }
    }
    
    private func iconName(for timerType: String) -> String {
        switch timerType {
        case "pumping":
            return "drop.fill"
        case "bottle":
            return "cylinder.fill"
        case "sleep":
            return "moon.fill"
        case "breast":
            return "heart.fill"
        default:
            return "clock.fill"
        }
    }
}

// MARK: - Lock Screen View

struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<CalmParentActivityAttributes>
    
    var body: some View {
        VStack(spacing: 12) {
            // Header with icon and title
            HStack {
                Image(systemName: iconName(for: context.state.timerType))
                    .font(.title2)
                    .foregroundColor(.blue)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.activityTitle)
                        .font(.headline)
                        .fontWeight(.semibold)
                    Text(context.state.childName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if context.state.isPaused {
                    Image(systemName: "pause.circle.fill")
                        .foregroundColor(.orange)
                        .font(.title3)
                }
            }
            
            // Timer Display
            HStack {
                Text(timerInterval: context.state.startTime...Date().addingTimeInterval(Double(context.state.elapsedSeconds)), countsDown: false)
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(context.state.isPaused ? .orange : .primary)
            }
            .frame(maxWidth: .infinity)
            
            // Footer info
            HStack {
                Label(context.state.parentName, systemImage: "person.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                if let side = context.state.side {
                    Label(side == "left" ? "שמאל" : "ימין", systemImage: "circle.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
        }
        .padding()
        .activityBackgroundTint(Color.blue.opacity(0.1))
        .activitySystemActionForegroundColor(.blue)
    }
    
    private func iconName(for timerType: String) -> String {
        switch timerType {
        case "pumping":
            return "drop.fill"
        case "bottle":
            return "cylinder.fill"
        case "sleep":
            return "moon.fill"
        case "breast":
            return "heart.fill"
        default:
            return "clock.fill"
        }
    }
}
