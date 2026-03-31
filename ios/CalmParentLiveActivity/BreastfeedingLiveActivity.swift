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
                // ── Expanded Leading ──
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: context.state.isPaused ? "pause.circle.fill" : "heart.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(breastfeedingColor)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.babyName)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(context.state.activeSide == "left" ? "צד שמאל" : "צד ימין")
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.5))
                        }
                    }
                    .padding(.leading, 4)
                }

                // ── Expanded Trailing ──
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        if context.state.isPaused {
                            Text("מושהה")
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                                .foregroundStyle(.orange)
                        } else if let sideStart = context.state.sideStartTime {
                            Text(sideStart, style: .timer)
                                .font(.system(size: 22, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white)
                        }
                        // Show total
                        let total = context.state.leftSideSeconds + context.state.rightSideSeconds
                        if total > 0 {
                            Text("סה״כ \(total / 60):\(String(format: "%02d", total % 60))")
                                .font(.system(size: 10, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.4))
                        }
                    }
                    .padding(.trailing, 4)
                }

                // ── Expanded Bottom — Controls ──
                DynamicIslandExpandedRegion(.bottom) {
                    if #available(iOS 17, *) {
                        HStack(spacing: 8) {
                            // Pause/Resume
                            if context.state.isPaused {
                                Button(intent: ResumeTimerIntent()) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "play.fill")
                                            .font(.system(size: 11, weight: .bold))
                                        Text("המשך")
                                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                                    }
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 7)
                                    .background(breastfeedingColor.opacity(0.25), in: Capsule())
                                    .overlay(Capsule().stroke(breastfeedingColor.opacity(0.5), lineWidth: 1))
                                }
                                .buttonStyle(.plain)
                            } else {
                                Button(intent: PauseTimerIntent()) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "pause.fill")
                                            .font(.system(size: 11, weight: .bold))
                                        Text("השהה")
                                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                                    }
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 7)
                                    .background(Color.white.opacity(0.12), in: Capsule())
                                    .overlay(Capsule().stroke(Color.white.opacity(0.2), lineWidth: 1))
                                }
                                .buttonStyle(.plain)
                            }

                            // Switch Side
                            Button(intent: SwitchSideIntent()) {
                                HStack(spacing: 4) {
                                    Image(systemName: "arrow.left.arrow.right")
                                        .font(.system(size: 11, weight: .bold))
                                    Text(context.state.activeSide == "left" ? "ימין" : "שמאל")
                                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                                }
                                .foregroundStyle(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(breastfeedingColor.opacity(0.15), in: Capsule())
                            }
                            .buttonStyle(.plain)

                            Spacer()

                            // Stop
                            Button(intent: StopTimerIntent()) {
                                HStack(spacing: 4) {
                                    Image(systemName: "stop.fill")
                                        .font(.system(size: 11, weight: .bold))
                                    Text("סיים")
                                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                                }
                                .foregroundStyle(.white.opacity(0.75))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(Color.white.opacity(0.08), in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.horizontal, 8)
                        .padding(.bottom, 4)
                        .environment(\.layoutDirection, .rightToLeft)
                    }
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Image(systemName: context.state.isPaused ? "pause.circle.fill" : "heart.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(context.state.isPaused ? .orange : breastfeedingColor)
                    Text(context.state.activeSide == "left" ? "L" : "R")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.6))
                }
            } compactTrailing: {
                if context.state.isPaused {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.orange)
                } else if let sideStart = context.state.sideStartTime {
                    Text(sideStart, style: .timer)
                        .monospacedDigit()
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)
                }
            } minimal: {
                Image(systemName: "heart.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(breastfeedingColor)
            }
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
                if #available(iOS 17, *) {
                    VStack(spacing: 8) {
                        // Pause/Resume
                        if context.state.isPaused {
                            Button(intent: ResumeTimerIntent()) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 19, weight: .bold))
                                    .foregroundStyle(.black)
                                    .frame(width: 48, height: 48)
                                    .background(.white, in: Circle())
                            }
                            .buttonStyle(.plain)
                        } else {
                            Button(intent: PauseTimerIntent()) {
                                Image(systemName: "pause.fill")
                                    .font(.system(size: 19, weight: .bold))
                                    .foregroundStyle(.black)
                                    .frame(width: 48, height: 48)
                                    .background(.white, in: Circle())
                            }
                            .buttonStyle(.plain)
                        }

                        // Switch side
                        Button(intent: SwitchSideIntent()) {
                            Image(systemName: "arrow.left.arrow.right")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white.opacity(0.8))
                                .frame(width: 36, height: 36)
                                .background(breastfeedingColor.opacity(0.3), in: Circle())
                        }
                        .buttonStyle(.plain)

                        // Stop
                        Button(intent: StopTimerIntent()) {
                            Image(systemName: "stop.fill")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white.opacity(0.8))
                                .frame(width: 32, height: 32)
                                .background(Color(white: 0.18), in: Circle())
                        }
                        .buttonStyle(.plain)
                    }
                    .environment(\.layoutDirection, .rightToLeft)
                } else {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 32, weight: .thin))
                        .foregroundStyle(breastfeedingColor.opacity(0.35))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}
