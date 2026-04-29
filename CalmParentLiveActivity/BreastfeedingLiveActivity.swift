//
//  BreastfeedingLiveActivity.swift
//  Breastfeeding Live Activity with side switching
//
//  Premium design with pause/play/stop and left/right side controls
//  Upgraded with Liquid Glass UI and Dynamic Island support
//

import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Design Tokens

private let breastfeedingColor = Color(red: 0.85, green: 0.35, blue: 0.55) // Warm pink
private let darkBg = Color(red: 0.05, green: 0.02, blue: 0.04)

// MARK: - Breastfeeding Live Activity Widget
@available(iOS 16.2, *)
struct BreastfeedingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BreastfeedingActivityAttributes.self) { context in
            BreastfeedingLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Region
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        if #available(iOS 17.0, *) {
                            Image(systemName: context.state.isPaused ? "pause.circle.fill" : "heart.fill")
                                .foregroundStyle(context.state.isPaused ? .orange : breastfeedingColor)
                                .symbolEffect(.pulse, isActive: !context.state.isPaused)
                        } else {
                            Image(systemName: context.state.isPaused ? "pause.circle.fill" : "heart.fill")
                                .foregroundStyle(context.state.isPaused ? .orange : breastfeedingColor)
                        }
                        Text("הנקה")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                    .padding(.leading, 8)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let sideStart = context.state.sideStartTime, !context.state.isPaused {
                        Text(sideStart, style: .timer)
                            .multilineTextAlignment(.trailing)
                            .monospacedDigit()
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(breastfeedingColor)
                            .padding(.trailing, 8)
                    } else {
                        Text("מושהה")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundColor(.orange)
                            .padding(.trailing, 8)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    // Controls and stats
                    HStack(spacing: 24) {
                        if #available(iOS 17.0, *) {
                            // Switch Side (Background Intent)
                            Button(intent: SwitchSideIntent()) {
                                HStack {
                                    Image(systemName: "arrow.left.arrow.right")
                                    Text(context.state.activeSide == "left" ? "שמאל" : "ימין")
                                        .font(.system(size: 15, weight: .bold, design: .rounded))
                                }
                                .padding(.horizontal, 20)
                                .padding(.vertical, 12)
                                .background(breastfeedingColor.opacity(0.3), in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                        
                        // Stop (Deep Link - opens app)
                        Link(destination: URL(string: "calmparentapp://stop-timer?type=breast")!) {
                            Image(systemName: "stop.fill")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .padding(14)
                                .background(Color.red.opacity(0.8), in: Circle())
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.top, 12)
                    .padding(.bottom, 8)
                    .environment(\.layoutDirection, .rightToLeft)
                }
            } compactLeading: {
                if #available(iOS 17.0, *) {
                    Image(systemName: "heart.fill")
                        .foregroundColor(breastfeedingColor)
                        .symbolEffect(.pulse, isActive: !context.state.isPaused)
                } else {
                    Image(systemName: "heart.fill")
                        .foregroundColor(breastfeedingColor)
                }
            } compactTrailing: {
                if let sideStart = context.state.sideStartTime, !context.state.isPaused {
                    Text(sideStart, style: .timer)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 40)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(breastfeedingColor)
                } else {
                    Image(systemName: "pause.fill")
                        .foregroundColor(.orange)
                }
            } minimal: {
                if #available(iOS 17.0, *) {
                    Image(systemName: "heart.fill")
                        .foregroundColor(breastfeedingColor)
                        .symbolEffect(.pulse, isActive: !context.state.isPaused)
                } else {
                    Image(systemName: "heart.fill")
                        .foregroundColor(breastfeedingColor)
                }
            }
            .widgetURL(URL(string: "calmparentapp://breastfeeding"))
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct BreastfeedingLockScreenView: View {
    let context: ActivityViewContext<BreastfeedingActivityAttributes>

    var body: some View {
        ZStack {
            // Liquid Glass Background
            LinearGradient(
                colors: [darkBg, Color.black],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            // Glowing orbs for depth
            Circle()
                .fill(breastfeedingColor.opacity(0.2))
                .frame(width: 150, height: 150)
                .blur(radius: 40)
                .offset(x: 100, y: -50)
                
            Circle()
                .fill(Color.purple.opacity(0.15))
                .frame(width: 120, height: 120)
                .blur(radius: 30)
                .offset(x: -100, y: 50)

            HStack(alignment: .center, spacing: 0) {
                // Left — info + timer
                VStack(alignment: .leading, spacing: 8) {
                    // Header
                    HStack(spacing: 8) {
                        if #available(iOS 17.0, *) {
                            Image(systemName: context.state.isPaused ? "pause.circle.fill" : "heart.fill")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(context.state.isPaused ? .orange : breastfeedingColor)
                                .symbolEffect(.pulse, isActive: !context.state.isPaused)
                        } else {
                            Image(systemName: context.state.isPaused ? "pause.circle.fill" : "heart.fill")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(context.state.isPaused ? .orange : breastfeedingColor)
                        }
                        
                        Text("\(context.attributes.babyName) · הנקה")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.9))
                    }

                    // Side indicator + timer
                    if context.state.isPaused {
                        Text("מושהה")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(.orange)
                            .shadow(color: .orange.opacity(0.4), radius: 8, y: 2)
                    } else if let sideStart = context.state.sideStartTime {
                        HStack(spacing: 10) {
                            Text(context.state.activeSide == "left" ? "שמאל" : "ימין")
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(breastfeedingColor)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(breastfeedingColor.opacity(0.2), in: Capsule())
                                
                            Text(sideStart, style: .timer)
                                .font(.system(size: 38, weight: .heavy, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white)
                                .shadow(color: .white.opacity(0.3), radius: 5, y: 2)
                        }
                    }

                    // Total time per side
                    HStack(spacing: 16) {
                        HStack(spacing: 6) {
                            Text("L")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.5))
                            Text("\(context.state.leftSideSeconds / 60):\(String(format: "%02d", context.state.leftSideSeconds % 60))")
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white.opacity(0.8))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 6))
                        
                        HStack(spacing: 6) {
                            Text("R")
                                .font(.system(size: 11, weight: .bold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.5))
                            Text("\(context.state.rightSideSeconds / 60):\(String(format: "%02d", context.state.rightSideSeconds % 60))")
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white.opacity(0.8))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 6))
                    }
                    .padding(.top, 4)
                }

                Spacer()

                // Right — controls
                VStack(spacing: 14) {
                    if #available(iOS 17.0, *) {
                        // Switch side (Pill shape)
                        Button(intent: SwitchSideIntent()) {
                            Image(systemName: "arrow.left.arrow.right")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 46, height: 46)
                                .background(.ultraThinMaterial, in: Circle())
                                .overlay(Circle().stroke(Color.white.opacity(0.3), lineWidth: 1))
                        }
                    }

                    // Stop (Distinct red shape)
                    Link(destination: URL(string: "calmparentapp://stop-timer?type=breast")!) {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 46, height: 46)
                            .background(Color.red.opacity(0.8), in: Circle())
                            .shadow(color: Color.red.opacity(0.4), radius: 8, y: 4)
                    }
                }
                .environment(\.layoutDirection, .rightToLeft)
            }
            .padding(.horizontal, 22)
            .padding(.vertical, 18)
        }
        .frame(maxWidth: .infinity)
        .clipShape(ContainerRelativeShape())
    }
}

