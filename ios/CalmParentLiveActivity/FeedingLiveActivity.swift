//
//  FeedingLiveActivity.swift
//  Feeding Live Activity - Bottle, Pumping
//
//  Premium design with pause/play/stop controls
//

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Design Tokens

private let feedingAccent = Color(red: 0.96, green: 0.62, blue: 0.04) // Warm amber

// MARK: - Feeding Live Activity Widget
@available(iOS 16.2, *)
struct FeedingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MealActivityAttributes.self) { context in
            FeedingLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: feedingIconName(context.state.mealType))
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(feedingAccent)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.babyName)
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(feedingTypeHebrew(context.state.mealType))
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(feedingAccent)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isPaused {
                        Text("מושהה")
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(.orange)
                            .multilineTextAlignment(.trailing)
                    } else {
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.trailing)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 0) {
                        Rectangle()
                            .fill(Color.white.opacity(0.12))
                            .frame(height: 0.5)
                            .padding(.bottom, 10)
                        Link(destination: URL(string: "calmparentapp://stop-timer?type=\(feedingTypeASCII(context.state.mealType))")!) {
                            Text("שמירה")
                                .font(.system(size: 16, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(feedingAccent.opacity(0.9), in: Capsule())
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isPaused ? "pause.fill" : feedingIconName(context.state.mealType))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
            } compactTrailing: {
                if context.state.isPaused {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.orange)
                } else {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 11, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(feedingAccent)
                }
            } minimal: {
                Image(systemName: feedingIconName(context.state.mealType))
                    .foregroundStyle(feedingAccent)
            }
            .widgetURL(URL(string: "calmparentapp://feeding")!)
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct FeedingLockScreenView: View {
    let context: ActivityViewContext<MealActivityAttributes>

    var body: some View {
        ZStack {
            // Background
            Rectangle()
                .fill(Color.black)
            RadialGradient(
                colors: [feedingAccent.opacity(0.18), .clear],
                center: .topTrailing,
                startRadius: 20,
                endRadius: 200
            )

            HStack(alignment: .center, spacing: 0) {
                // Left — info + timer
                VStack(alignment: .leading, spacing: 8) {
                    // Header
                    HStack(spacing: 8) {
                        Image(systemName: context.state.isPaused ? "pause.circle.fill" : feedingIconName(context.state.mealType))
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
                        Text("\(context.attributes.babyName) · \(feedingTypeHebrew(context.state.mealType))")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.75))
                    }

                    // Timer
                    if context.state.isPaused {
                        Text("מושהה")
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundStyle(.orange)
                    } else {
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                    }
                }

                Spacer()

                // Right — controls
                VStack(spacing: 10) {
                    Link(destination: URL(string: "calmparentapp://stop-timer?type=\(feedingTypeASCII(context.state.mealType))")!) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 58, height: 58)
                            .background(feedingAccent, in: Circle())
                            .shadow(color: feedingAccent.opacity(0.4), radius: 8, y: 4)
                    }
                    Text("שמירה")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.8))
                }
                .environment(\.layoutDirection, .rightToLeft)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}

// MARK: - Helper Functions

func feedingTypeASCII(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק": return "bottle"
    case "pumping", "שאיבה": return "pumping"
    case let t where t.contains("breastfeeding") || t.contains("הנקה"): return "breastfeeding"
    default: return "food"
    }
}

@available(iOS 16.2, *)
func feedingIconName(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return "drop.fill"
    case let t where t.contains("breastfeeding") || t.contains("הנקה"):
        return "heart.fill"
    case "pumping", "שאיבה":
        return "waveform.path"
    default:
        return "fork.knife"
    }
}

@available(iOS 16.2, *)
func feedingColor(_ mealType: String) -> Color {
    return feedingAccent
}

@available(iOS 16.2, *)
func feedingTypeHebrew(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return "בקבוק"
    case "breastfeeding-right", "הנקה ימין":
        return "הנקה - צד ימין"
    case "breastfeeding-left", "הנקה שמאל":
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
    case "breastfeeding-right", "הנקה ימין":
        return "👉"
    case "breastfeeding-left", "הנקה שמאל":
        return "👈"
    case "pumping", "שאיבה":
        return "🔄"
    default:
        return "🍽️"
    }
}
