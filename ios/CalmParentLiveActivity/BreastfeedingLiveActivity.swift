//
//  BreastfeedingLiveActivity.swift
//  CalmParentLiveActivity
//
//  Live Activity + Dynamic Island for breastfeeding (left / right side timers)
//

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Design Tokens

private let activeColor  = Color(red: 1.0,  green: 0.62, blue: 0.0)   // amber – active side
private let idleColor    = Color(red: 0.55, green: 0.55, blue: 0.60)   // grey  – idle side
private let accentPurple = Color(red: 0.38, green: 0.40, blue: 0.95)   // purple – total

// MARK: - Widget

@available(iOS 16.2, *)
struct BreastfeedingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BreastfeedingActivityAttributes.self) { context in
            BreastfeedingLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // ── Expanded Leading: left side ──
                DynamicIslandExpandedRegion(.leading) {
                    SideBlock(
                        label: "שמאל",
                        seconds: context.state.leftSideSeconds,
                        activeSide: context.state.activeSide,
                        thisSide: "left",
                        sideStartTime: context.state.sideStartTime
                    )
                    .padding(.leading, 6)
                }

                // ── Expanded Trailing: right side ──
                DynamicIslandExpandedRegion(.trailing) {
                    SideBlock(
                        label: "ימין",
                        seconds: context.state.rightSideSeconds,
                        activeSide: context.state.activeSide,
                        thisSide: "right",
                        sideStartTime: context.state.sideStartTime
                    )
                    .padding(.trailing, 6)
                }

                // ── Expanded Bottom: baby name + total ──
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.attributes.babyName)
                            .font(.system(size: 12, weight: .medium, design: .rounded))
                            .foregroundStyle(.white.opacity(0.55))
                        Spacer()
                        TotalLabel(
                            leftSec: context.state.leftSideSeconds,
                            rightSec: context.state.rightSideSeconds,
                            activeSide: context.state.activeSide,
                            sideStartTime: context.state.sideStartTime
                        )
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 4)
                    .environment(\.layoutDirection, .rightToLeft)
                }
            } compactLeading: {
                Image(systemName: "drop.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(activeColor)
            } compactTrailing: {
                ActiveSideTimer(
                    activeSide: context.state.activeSide,
                    leftSec: context.state.leftSideSeconds,
                    rightSec: context.state.rightSideSeconds,
                    sideStartTime: context.state.sideStartTime
                )
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.white)
            } minimal: {
                Image(systemName: "drop.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(activeColor)
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
            Color.black
            LinearGradient(
                colors: [activeColor.opacity(0.18), activeColor.opacity(0.04), .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 10) {
                // Baby name
                Text(context.attributes.babyName)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.55))

                // Left / Right blocks
                HStack(spacing: 14) {
                    SideCard(
                        label: "ימין",
                        seconds: context.state.rightSideSeconds,
                        activeSide: context.state.activeSide,
                        thisSide: "right",
                        sideStartTime: context.state.sideStartTime
                    )
                    SideCard(
                        label: "שמאל",
                        seconds: context.state.leftSideSeconds,
                        activeSide: context.state.activeSide,
                        thisSide: "left",
                        sideStartTime: context.state.sideStartTime
                    )
                }

                // Total
                TotalLabel(
                    leftSec: context.state.leftSideSeconds,
                    rightSec: context.state.rightSideSeconds,
                    activeSide: context.state.activeSide,
                    sideStartTime: context.state.sideStartTime
                )
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .environment(\.layoutDirection, .rightToLeft)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - SideCard (lock screen)

@available(iOS 16.2, *)
private struct SideCard: View {
    let label: String
    let seconds: Int
    let activeSide: String?
    let thisSide: String
    let sideStartTime: Date?

    private var isActive: Bool { activeSide == thisSide }

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(isActive ? activeColor : idleColor)

            if isActive, let start = sideStartTime {
                // Live counting timer (adds accumulated seconds as offset)
                Text(Date(timeIntervalSince1970: start.timeIntervalSince1970 - Double(seconds)), style: .timer)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
            } else {
                Text(formatSeconds(seconds))
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(seconds > 0 ? Color.white.opacity(0.85) : idleColor.opacity(0.5))
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(isActive ? activeColor.opacity(0.18) : Color.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(isActive ? activeColor.opacity(0.5) : Color.clear, lineWidth: 1)
                )
        )
    }
}

// MARK: - SideBlock (Dynamic Island expanded)

@available(iOS 16.2, *)
private struct SideBlock: View {
    let label: String
    let seconds: Int
    let activeSide: String?
    let thisSide: String
    let sideStartTime: Date?

    private var isActive: Bool { activeSide == thisSide }

    var body: some View {
        VStack(alignment: .center, spacing: 2) {
            Text(label)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundStyle(isActive ? activeColor : idleColor)

            if isActive, let start = sideStartTime {
                Text(Date(timeIntervalSince1970: start.timeIntervalSince1970 - Double(seconds)), style: .timer)
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
            } else {
                Text(formatSeconds(seconds))
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(seconds > 0 ? Color.white.opacity(0.8) : idleColor.opacity(0.5))
            }
        }
    }
}

// MARK: - ActiveSideTimer (compact trailing)

@available(iOS 16.2, *)
private struct ActiveSideTimer: View {
    let activeSide: String?
    let leftSec: Int
    let rightSec: Int
    let sideStartTime: Date?

    var body: some View {
        if let side = activeSide, let start = sideStartTime {
            let accumulated = side == "left" ? leftSec : rightSec
            Text(Date(timeIntervalSince1970: start.timeIntervalSince1970 - Double(accumulated)), style: .timer)
        } else {
            Text(formatSeconds(leftSec + rightSec))
        }
    }
}

// MARK: - TotalLabel

@available(iOS 16.2, *)
private struct TotalLabel: View {
    let leftSec: Int
    let rightSec: Int
    let activeSide: String?
    let sideStartTime: Date?

    var body: some View {
        // We can't do live-sum easily — show static total of accumulated only
        let total = leftSec + rightSec
        HStack(spacing: 4) {
            Image(systemName: "sum")
                .font(.system(size: 10))
                .foregroundStyle(accentPurple.opacity(0.8))
            Text(formatSeconds(total))
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(accentPurple.opacity(0.9))
        }
    }
}

// MARK: - Helpers

private func formatSeconds(_ s: Int) -> String {
    let m = s / 60
    let sec = s % 60
    return String(format: "%d:%02d", m, sec)
}
