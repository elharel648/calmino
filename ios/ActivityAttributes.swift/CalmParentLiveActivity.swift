import ActivityKit
import WidgetKit
import SwiftUI

/// Main Live Activity Widget Implementation
/// Handles both Lock Screen and Dynamic Island presentations
@available(iOS 16.1, *)
struct CalmParentLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CalmParentAttributes.self) { context in
            // MARK: - Lock Screen View
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 12) {
                    // Icon based on activity type
                    Image(systemName: iconForActivityType(context.attributes.activityType))
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(colorForActivityType(context.attributes.activityType))
                        .frame(width: 40, height: 40)
                        .background(
                            Circle()
                                .fill(colorForActivityType(context.attributes.activityType).opacity(0.15))
                        )
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.attributes.activityType.rawValue)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primary)
                        
                        if let childName = context.attributes.childName {
                            Text(childName)
                                .font(.system(size: 12, weight: .regular))
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    // Timer display
                    Text(context.contentState.formattedTime)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(.primary)
                }
                
                // Status text if available
                if let status = context.contentState.status {
                    Text(status)
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(.secondary)
                }
            }
            .padding(16)
            .activityBackgroundTint(
                colorForActivityType(context.attributes.activityType).opacity(0.1)
            )
            
        } dynamicIsland: { context in
            // MARK: - Dynamic Island Implementation
            DynamicIsland {
                // Expanded Region - Leading (Left side)
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 12) {
                        Image(systemName: iconForActivityType(context.attributes.activityType))
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundColor(colorForActivityType(context.attributes.activityType))
                            .frame(width: 40, height: 40)
                            .background(
                                Circle()
                                    .fill(colorForActivityType(context.attributes.activityType).opacity(0.15))
                            )
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(context.attributes.activityType.rawValue)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.primary)
                            
                            if let childName = context.attributes.childName {
                                Text(childName)
                                    .font(.system(size: 12, weight: .regular))
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(.leading, 8)
                }
                
                // Expanded Region - Trailing (Right side)
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(context.contentState.formattedTime)
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundColor(.primary)
                        
                        if let status = context.contentState.status {
                            Text(status)
                                .font(.system(size: 11, weight: .regular))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.trailing, 8)
                }
                
                // Expanded Region - Bottom (Additional info)
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text("על ידי \(context.attributes.parentName)")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        if context.contentState.isRunning {
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(Color.green)
                                    .frame(width: 6, height: 6)
                                Text("פעיל")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                }
            } compactLeading: {
                // Compact Leading - Left side of Dynamic Island
                Image(systemName: iconForActivityType(context.attributes.activityType))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(colorForActivityType(context.attributes.activityType))
            } compactTrailing: {
                // Compact Trailing - Right side (shows timer)
                Text(context.contentState.formattedTime)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(.primary)
            } minimal: {
                // Minimal View - When multiple activities are active
                Image(systemName: iconForActivityType(context.attributes.activityType))
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(colorForActivityType(context.attributes.activityType))
            }
        }
    }
    
    // MARK: - Helper Functions
    
    private func iconForActivityType(_ type: CalmParentAttributes.Attributes.ActivityType) -> String {
        switch type {
        case .pumping:
            return "drop.fill"
        case .breastfeeding:
            return "heart.fill"
        case .sleep:
            return "moon.fill"
        case .feeding:
            return "fork.knife"
        }
    }
    
    private func colorForActivityType(_ type: CalmParentAttributes.Attributes.ActivityType) -> Color {
        switch type {
        case .pumping:
            return Color(red: 0.96, green: 0.62, blue: 0.04) // #F59E0B - Orange
        case .breastfeeding:
            return Color(red: 0.06, green: 0.73, blue: 0.51) // #10B981 - Green
        case .sleep:
            return Color(red: 0.55, green: 0.36, blue: 0.96) // #8B5CF6 - Purple
        case .feeding:
            return Color(red: 0.37, green: 0.51, blue: 0.95) // #6366F1 - Indigo
        }
    }
}

