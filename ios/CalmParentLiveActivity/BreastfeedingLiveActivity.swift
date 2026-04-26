//
//  BreastfeedingLiveActivity.swift
//  Breastfeeding Live Activity with side switching
//
//  Premium design with pause/play/stop and left/right side controls
//

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Design Tokens

private let breastfeedingColor = Color(red: 0.85, green: 0.35, blue: 0.55) // Warm pink

// MARK: - Breastfeeding Live Activity Widget
@available(iOS 16.2, *)
struct BreastfeedingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BreastfeedingActivityAttributes.self) { context in
            BreastfeedingLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: context.state.isPaused ? "pause.circle.fill" : "heart.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(context.state.isPaused ? .orange : breastfeedingColor)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(context.attributes.babyName)
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(context.state.activeSide == "left" ? "שמאל" : context.state.activeSide == "right" ? "ימין" : "הנקה")
                                .font(.system(size: 10, design: .rounded))
                                .foregroundStyle(breastfeedingColor)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isPaused {
                        Text("מושהה")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.orange)
                            .multilineTextAlignment(.trailing)
                    } else if let sideStart = context.state.sideStartTime {
                        Text(sideStart, style: .timer)
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.trailing)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    let newSideDI = context.state.activeSide == "left" ? "right" : "left"
                    HStack(spacing: 10) {
                        Link(destination: URL(string: "calmparentapp://switch-side?side=\(newSideDI)")!) {
                            HStack(spacing: 5) {
                                Image(systemName: "arrow.left.arrow.right")
                                Text("החלף")
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(breastfeedingColor.opacity(0.6), in: Capsule())
                        }
                        Link(destination: URL(string: "calmparentapp://stop-timer?type=breast")!) {
                            HStack(spacing: 5) {
                                Image(systemName: "checkmark.circle.fill")
                                Text("שמירה")
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(breastfeedingColor, in: Capsule())
                        }
                    }
                    .environment(\.layoutDirection, .rightToLeft)
                }
            } compactLeading: {
                Image(systemName: context.state.isPaused ? "pause.fill" : "heart.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(context.state.isPaused ? .orange : breastfeedingColor)
            } compactTrailing: {
                if context.state.isPaused {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.orange)
                } else if let sideStart = context.state.sideStartTime {
                    Text(sideStart, style: .timer)
                        .font(.system(size: 11, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(breastfeedingColor)
                } else {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(breastfeedingColor)
                }
            } minimal: {
                Image(systemName: "heart.fill")
                    .foregroundStyle(breastfeedingColor)
            }
            .widgetURL(URL(string: "calmparentapp://breastfeeding")!)
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct BreastfeedingLockScreenView: View {
    let context: ActivityViewContext<BreastfeedingActivityAttributes>

    var body: some View {
        ZStack {
            // Background
            Rectangle()
                .fill(Color.black)
            RadialGradient(
                colors: [breastfeedingColor.opacity(0.18), .clear],
                center: .topTrailing,
                startRadius: 20,
                endRadius: 200
            )

            HStack(alignment: .center, spacing: 0) {
                // Left — info + timer
                VStack(alignment: .leading, spacing: 8) {
                    // Header
                    HStack(spacing: 8) {
                        Image(systemName: context.state.isPaused ? "pause.circle.fill" : "heart.fill")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(context.state.isPaused ? .orange : breastfeedingColor)
                        Text("\(context.attributes.babyName) · הנקה")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.75))
                    }

                    // Side indicator + timer
                    if context.state.isPaused {
                        Text("מושהה")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundStyle(.orange)
                    } else if let sideStart = context.state.sideStartTime {
                        HStack(spacing: 8) {
                            Text(context.state.activeSide == "left" ? "שמאל" : "ימין")
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                                .foregroundStyle(breastfeedingColor)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(breastfeedingColor.opacity(0.15), in: Capsule())
                            Text(sideStart, style: .timer)
                                .font(.system(size: 34, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white)
                        }
                    }

                    // Total time per side
                    HStack(spacing: 12) {
                        HStack(spacing: 4) {
                            Text("L")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.4))
                            Text("\(context.state.leftSideSeconds / 60):\(String(format: "%02d", context.state.leftSideSeconds % 60))")
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white.opacity(0.6))
                        }
                        HStack(spacing: 4) {
                            Text("R")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.4))
                            Text("\(context.state.rightSideSeconds / 60):\(String(format: "%02d", context.state.rightSideSeconds % 60))")
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white.opacity(0.6))
                        }
                    }
                }

                Spacer()

                // Right — controls
                VStack(spacing: 12) {
                    let newSide = context.state.activeSide == "left" ? "right" : "left"
                    // Switch side
                    Link(destination: URL(string: "calmparentapp://switch-side?side=\(newSide)")!) {
                        Image(systemName: "arrow.left.arrow.right")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(breastfeedingColor.opacity(0.5), in: Circle())
                    }
                    // Stop
                    Link(destination: URL(string: "calmparentapp://stop-timer?type=breast")!) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 52, height: 52)
                            .background(breastfeedingColor, in: Circle())
                            .shadow(color: breastfeedingColor.opacity(0.4), radius: 8, y: 4)
                    }
                }
                .environment(\.layoutDirection, .rightToLeft)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}
