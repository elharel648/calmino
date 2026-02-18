//
//  FeedingLiveActivity.swift
//  Feeding Live Activity - Bottle, Breastfeeding, Pumping
//
//  Premium minimalistic design with icons and timer
//

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Feeding Live Activity Widget
@available(iOS 16.2, *)
struct FeedingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MealActivityAttributes.self) { context in
            // Lock Screen UI
            FeedingLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Text(context.attributes.babyEmoji)
                        Text(context.attributes.babyName)
                            .font(.headline)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(context.state.startTime, style: .timer)
                            .font(.title2)
                            .monospacedDigit()

                        if context.state.isPaused {
                            Label("מושהה", systemImage: "pause.circle.fill")
                                .font(.caption2)
                                .foregroundColor(.orange)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(feedingTypeIcon(context.state.mealType))
                        .font(.title3)
                }
            } compactLeading: {
                Text(feedingTypeIcon(context.state.mealType))
            } compactTrailing: {
                Text(context.state.startTime, style: .timer)
                    .monospacedDigit()
                    .font(.caption2)
            } minimal: {
                Text(feedingTypeIcon(context.state.mealType))
            }
        }
    }
}

@available(iOS 16.2, *)
struct FeedingLockScreenView: View {
    let context: ActivityViewContext<MealActivityAttributes>

    var body: some View {
        VStack(spacing: 10) {
            // Header with feeding icon
            HStack(spacing: 8) {
                Image(systemName: feedingIconName(context.state.mealType))
                    .font(.system(size: 20))
                    .foregroundColor(feedingColor(context.state.mealType))

                Text(context.attributes.babyName)
                    .font(.system(size: 18, weight: .bold))

                Spacer()
            }

            Text(feedingTypeHebrew(context.state.mealType))
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Divider()
                .padding(.vertical, 2)

            // Timer - Large and prominent
            VStack(spacing: 4) {
                HStack(spacing: 6) {
                    Text("זמן האכלה")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    if context.state.isPaused {
                        Image(systemName: "pause.circle.fill")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }

                Text(context.state.startTime, style: .timer)
                    .font(.system(size: 42, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .opacity(context.state.isPaused ? 0.6 : 1.0)
            }
        }
        .padding()
    }
}

// MARK: - Helper Functions

@available(iOS 16.2, *)
func feedingIconName(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return "drop.fill"
    case "breastfeeding_right", "הנקה ימין":
        return "arrow.forward.circle.fill"
    case "breastfeeding_left", "הנקה שמאל":
        return "arrow.backward.circle.fill"
    case "pumping", "שאיבה":
        return "waveform.path"
    default:
        return "fork.knife"
    }
}

@available(iOS 16.2, *)
func feedingColor(_ mealType: String) -> Color {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return .blue
    case "breastfeeding_right", "הנקה ימין":
        return .pink
    case "breastfeeding_left", "הנקה שמאל":
        return .purple
    case "pumping", "שאיבה":
        return .orange
    default:
        return .green
    }
}

@available(iOS 16.2, *)
func feedingTypeHebrew(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return "בקבוק"
    case "breastfeeding_right", "הנקה ימין":
        return "הנקה - צד ימין"
    case "breastfeeding_left", "הנקה שמאל":
        return "הנקה - צד שמאל"
    case "pumping", "שאיבה":
        return "שאיבה"
    default:
        return mealType
    }
}

@available(iOS 16.2, *)
func feedingTypeIcon(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return "🍼"
    case "breastfeeding_right", "הנקה ימין":
        return "👉"
    case "breastfeeding_left", "הנקה שמאל":
        return "👈"
    case "pumping", "שאיבה":
        return "🔄"
    default:
        return "🍽️"
    }
}
