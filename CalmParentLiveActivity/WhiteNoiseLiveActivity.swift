import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Design Tokens
private let noiseColor   = Color(red: 0.35, green: 0.75, blue: 0.95)   // sky blue
private let noiseBg      = Color(red: 0.08, green: 0.08, blue: 0.12)   // near-black

// MARK: - White Noise Live Activity

@available(iOS 16.2, *)
struct WhiteNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WhiteNoiseActivityAttributes.self) { context in
            WhiteNoiseLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // ── Expanded ──────────────────────────────────────────────
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .fill(noiseColor.opacity(0.18))
                                .frame(width: 36, height: 36)
                            Image(systemName: "speaker.wave.3.fill")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(noiseColor)
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text("רעש לבן")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(.white.opacity(0.5))
                            Text(context.attributes.soundName)
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white)
                                .lineLimit(1)
                        }
                    }
                    .padding(.leading, 2)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    // X button — stops without opening app (Button(intent:) requires iOS 17+)
                    if #available(iOS 17.0, *) {
                        Button(intent: StopTimerIntent()) {
                            ZStack {
                                Circle()
                                    .fill(.white.opacity(0.12))
                                    .frame(width: 36, height: 36)
                                Image(systemName: "xmark")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(.white.opacity(0.85))
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.trailing, 2)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack(alignment: .bottom, spacing: 0) {
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)

                        Spacer()

                        HStack(spacing: 3) {
                            ForEach(0..<5, id: \.self) { i in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(noiseColor.opacity(0.6 + Double(i) * 0.08))
                                    .frame(width: 3, height: CGFloat([8, 14, 20, 14, 8][i]))
                            }
                        }
                        .frame(height: 24)
                        .padding(.bottom, 8)
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 4)
                }

            } compactLeading: {
                // ── Compact ───────────────────────────────────────────────
                Image(systemName: "speaker.wave.2.fill")
                    .foregroundColor(noiseColor)

            } compactTrailing: {
                Text(context.state.startTime, style: .timer)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 40)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(noiseColor)

            } minimal: {
                // ── Minimal (two activities open) ─────────────────────────
                Image(systemName: "speaker.wave.2.fill")
                    .foregroundColor(noiseColor)
            }
            .widgetURL(URL(string: "calmparentapp://whitenoise"))
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
            noiseBg
            RadialGradient(
                colors: [noiseColor.opacity(0.20), .clear],
                center: .topTrailing,
                startRadius: 10,
                endRadius: 220
            )

            HStack(alignment: .center, spacing: 16) {

                // ── Left: icon + waveform bars ─────────────────────────
                ZStack {
                    Circle()
                        .fill(noiseColor.opacity(0.15))
                        .frame(width: 52, height: 52)
                    Image(systemName: "speaker.wave.3.fill")
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(noiseColor)
                }

                // ── Center: name + timer ───────────────────────────────
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.soundName)
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.75))

                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }

                Spacer()

                // ── Right: stop button ─────────────────────────────────
                if #available(iOS 17.0, *) {
                    Button(intent: StopTimerIntent()) {
                        ZStack {
                            Circle()
                                .fill(.white.opacity(0.10))
                                .frame(width: 44, height: 44)
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white.opacity(0.9))
                        }
                    }
                    .buttonStyle(.plain)
                } else {
                    ZStack {
                        Circle()
                            .fill(.white.opacity(0.10))
                            .frame(width: 44, height: 44)
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white.opacity(0.9))
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .colorScheme(.dark)
    }
}
