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
                // ── Expanded Leading ──
                DynamicIslandExpandedRegion(.leading) { EmptyView() }

                // ── Expanded Trailing ──
                DynamicIslandExpandedRegion(.trailing) { EmptyView() }

                // ── Expanded Bottom — Controls ──
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 12) {
                        // Header
                        HStack(spacing: 8) {
                            Image(systemName: context.state.isPaused ? "pause.circle.fill" : feedingIconName(context.state.mealType))
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
                            Text("\(context.attributes.babyName) · \(feedingTypeHebrew(context.state.mealType))")
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.75))
                            Spacer()
                        }
                        .environment(\.layoutDirection, .rightToLeft)

                        // Timer and Controls
                        HStack(alignment: .center, spacing: 0) {
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

                            Spacer()

                            if #available(iOS 17, *) {
                                HStack(spacing: 10) {
                                    if context.state.isPaused {
                                        Button(intent: ResumeTimerIntent()) {
                                            Image(systemName: "play.fill")
                                                .font(.system(size: 19, weight: .bold))
                                                .foregroundStyle(.black)
                                                .frame(width: 52, height: 52)
                                                .background(.white, in: Circle())
                                        }
                                    } else {
                                        Button(intent: PauseTimerIntent()) {
                                            Image(systemName: "pause.fill")
                                                .font(.system(size: 19, weight: .bold))
                                                .foregroundStyle(.black)
                                                .frame(width: 52, height: 52)
                                                .background(.white, in: Circle())
                                        }
                                    }

                                    Button(intent: StopTimerIntent()) {
                                        Image(systemName: "stop.fill")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundStyle(.white.opacity(0.8))
                                            .frame(width: 36, height: 36)
                                            .background(Color(white: 0.18), in: Circle())
                                    }
                                }
                                .environment(\.layoutDirection, .rightToLeft)
                            }
                        }
                        .environment(\.layoutDirection, .rightToLeft)
                    }
                    .padding(.top, 8)
                    .padding(.bottom, 8)
                }
            } compactLeading: {
                Image(systemName: context.state.isPaused ? "pause.circle.fill" : feedingIconName(context.state.mealType))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
            } compactTrailing: {
                if context.state.isPaused {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.orange)
                } else {
                    Text(context.state.startTime, style: .timer)
                        .monospacedDigit()
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                }
            } minimal: {
                Image(systemName: feedingIconName(context.state.mealType))
                    .font(.system(size: 13))
                    .foregroundStyle(feedingAccent)
            }
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
                if #available(iOS 17, *) {
                    VStack(spacing: 10) {
                        if context.state.isPaused {
                            Button(intent: ResumeTimerIntent()) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 19, weight: .bold))
                                    .foregroundStyle(.black)
                                    .frame(width: 52, height: 52)
                                    .background(.white, in: Circle())
                            }
                        } else {
                            Button(intent: PauseTimerIntent()) {
                                Image(systemName: "pause.fill")
                                    .font(.system(size: 19, weight: .bold))
                                    .foregroundStyle(.black)
                                    .frame(width: 52, height: 52)
                                    .background(.white, in: Circle())
                            }
                        }

                        Button(intent: StopTimerIntent()) {
                            Image(systemName: "stop.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white.opacity(0.8))
                                .frame(width: 36, height: 36)
                                .background(Color(white: 0.18), in: Circle())
                        }
                    }
                    .environment(\.layoutDirection, .rightToLeft)
                } else {
                    Image(systemName: feedingIconName(context.state.mealType))
                        .font(.system(size: 32, weight: .thin))
                        .foregroundStyle(feedingAccent.opacity(0.35))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}

// MARK: - Helper Functions

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
