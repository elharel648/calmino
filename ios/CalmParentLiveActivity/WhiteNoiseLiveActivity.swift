//
//  WhiteNoiseLiveActivity.swift
//  CalmParentLiveActivity
//
//  Live Activity for white-noise / sleep-music playback.
//

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Design Token

private let noiseColor = Color(red: 0.58, green: 0.45, blue: 0.95) // Soft purple

// MARK: - White Noise Live Activity Widget

@available(iOS 16.2, *)
struct WhiteNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WhiteNoiseActivityAttributes.self) { context in
            WhiteNoiseLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                // ── Expanded Center: icon + name left, timer right ──
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 3) {
                        ZStack {
                            Circle()
                                .fill(noiseColor.opacity(0.2))
                                .frame(width: 32, height: 32)
                            Image(systemName: noiseIconName(context.attributes.soundId))
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(noiseColor)
                        }
                        Text(context.attributes.soundName)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                    }
                    .padding(.leading, 4)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .padding(.trailing, 4)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    Link(destination: URL(string: "calmparentapp://stop-whitenoise")!) {
                        HStack(spacing: 6) {
                            Image(systemName: "stop.fill")
                                .font(.system(size: 11, weight: .bold))
                            Text("עצור")
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                        }
                        .foregroundStyle(.white.opacity(0.85))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.1), in: Capsule())
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 4)
                    .environment(\.layoutDirection, .rightToLeft)
                }
            } compactLeading: {
                Image(systemName: noiseIconName(context.attributes.soundId))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(noiseColor)
            } compactTrailing: {
                Text(context.state.startTime, style: .timer)
                    .monospacedDigit()
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
            } minimal: {
                Image(systemName: noiseIconName(context.attributes.soundId))
                    .font(.system(size: 13))
                    .foregroundStyle(noiseColor)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct WhiteNoiseLockScreenView: View {
    let context: ActivityViewContext<WhiteNoiseActivityAttributes>

    var body: some View {
        ZStack {
            // Background
            Color.black
            LinearGradient(
                colors: [noiseColor.opacity(0.22), noiseColor.opacity(0.05), .clear],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            HStack(alignment: .center, spacing: 0) {

                // Right: icon + sound name (RTL = visually right)
                VStack(alignment: .trailing, spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(noiseColor.opacity(0.18))
                            .frame(width: 44, height: 44)
                        Image(systemName: noiseIconName(context.attributes.soundId))
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(noiseColor)
                    }
                    Text(context.attributes.soundName)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }
                .frame(minWidth: 90)

                Spacer()

                // Center: big timer
                Text(context.state.startTime, style: .timer)
                    .font(.system(size: 52, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)

                Spacer()

                // Left: stop button
                Link(destination: URL(string: "calmparentapp://stop-whitenoise")!) {
                    ZStack {
                        Circle()
                            .fill(Color.white.opacity(0.1))
                            .frame(width: 44, height: 44)
                        Image(systemName: "stop.fill")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white.opacity(0.8))
                    }
                }
                .frame(minWidth: 90, alignment: .leading)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .environment(\.layoutDirection, .rightToLeft)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Helper

@available(iOS 16.2, *)
func noiseIconName(_ soundId: String) -> String {
    switch soundId {
    case "rain":    return "cloud.rain.fill"
    case "gentle":  return "music.note"
    case "birds":   return "bird.fill"
    case "lullaby": return "moon.zzz.fill"
    default:        return "music.note"
    }
}
