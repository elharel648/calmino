import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Design Tokens

private let noiseColor = Color(red: 0.25, green: 0.72, blue: 0.85)

// MARK: - White Noise Live Activity

@available(iOS 16.2, *)
struct WhiteNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WhiteNoiseActivityAttributes.self) { context in
            WhiteNoiseLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                // ── Expanded Leading ──────────────────────────────────────
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: "waveform")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(noiseColor)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("רעש לבן")
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(context.attributes.soundName)
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.5))
                        }
                    }
                    .padding(.leading, 4)
                }

                // ── Expanded Trailing ─────────────────────────────────────
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .padding(.trailing, 4)
                }

                // ── Expanded Bottom ───────────────────────────────────────
                DynamicIslandExpandedRegion(.bottom) {
                    if #available(iOS 17, *) {
                        HStack(spacing: 10) {
                            Spacer()
                            Link(destination: URL(string: "calmino://stop-whitenoise")!) {
                                HStack(spacing: 6) {
                                    Image(systemName: "stop.fill")
                                        .font(.system(size: 12, weight: .bold))
                                    Text("עצור")
                                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                                }
                                .foregroundStyle(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(noiseColor.opacity(0.25), in: Capsule())
                                .overlay(Capsule().stroke(noiseColor.opacity(0.5), lineWidth: 1))
                            }
                        }
                        .padding(.horizontal, 8)
                        .padding(.bottom, 4)
                        .environment(\.layoutDirection, .rightToLeft)
                    }
                }
            } compactLeading: {
                Image(systemName: "waveform")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(noiseColor)

            } compactTrailing: {
                Text(context.state.startTime, style: .timer)
                    .monospacedDigit()
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
            } minimal: {
                Image(systemName: "waveform")
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
            Rectangle()
                .fill(Color.black)
            RadialGradient(
                colors: [noiseColor.opacity(0.18), .clear],
                center: .topLeading,
                startRadius: 20,
                endRadius: 200
            )

            HStack(alignment: .center, spacing: 0) {
                // Left — info + timer
                VStack(alignment: .leading, spacing: 8) {
                    // Header
                    HStack(spacing: 8) {
                        Image(systemName: "waveform")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(noiseColor)

                        Text(context.attributes.soundName)
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.75))
                    }

                    // Timer
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }

                Spacer()

                // Right — Stop button
                if #available(iOS 17, *) {
                    Link(destination: URL(string: "calmino://stop-whitenoise")!) {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 19, weight: .bold))
                            .foregroundStyle(.black)
                            .frame(width: 52, height: 52)
                            .background(.white, in: Circle())
                    }
                } else {
                    Image(systemName: "waveform.badge.magnifyingglass")
                        .font(.system(size: 32, weight: .thin))
                        .foregroundStyle(noiseColor.opacity(0.35))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}
