import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Design Tokens
private let noiseColor   = Color(red: 0.35, green: 0.75, blue: 0.95)   // sky blue
private let noiseBg      = Color(red: 0.08, green: 0.08, blue: 0.12)   // near-black

// MARK: - Button style with press feedback
private struct XButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.84 : 1.0)
            .opacity(configuration.isPressed ? 0.55 : 1.0)
            .animation(.easeOut(duration: 0.10), value: configuration.isPressed)
    }
}

// MARK: - Elapsed time formatter
private func formatElapsed(_ seconds: Int) -> String {
    let h = seconds / 3600
    let m = (seconds % 3600) / 60
    let s = seconds % 60
    if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
    return String(format: "%02d:%02d", m, s)
}

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
                                .fill(noiseColor.opacity(context.state.isPaused ? 0.10 : 0.18))
                                .frame(width: 36, height: 36)
                            Image(systemName: "speaker.wave.3.fill")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(noiseColor.opacity(context.state.isPaused ? 0.5 : 1.0))
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text("רעש לבן")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(.white.opacity(0.5))
                            Text(context.attributes.soundName)
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white.opacity(context.state.isPaused ? 0.5 : 1.0))
                                .lineLimit(1)
                        }
                    }
                    .padding(.leading, 2)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    if #available(iOS 17.0, *) {
                        HStack(spacing: 8) {
                            // Pause / Resume button
                            if context.state.isPaused {
                                Button(intent: ResumeWhiteNoiseIntent()) {
                                    ZStack {
                                        Circle()
                                            .fill(noiseColor.opacity(0.25))
                                            .frame(width: 36, height: 36)
                                        Image(systemName: "play.fill")
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundStyle(noiseColor)
                                    }
                                }
                                .buttonStyle(XButtonStyle())
                            } else {
                                Button(intent: PauseWhiteNoiseIntent()) {
                                    ZStack {
                                        Circle()
                                            .fill(.white.opacity(0.10))
                                            .frame(width: 36, height: 36)
                                        Image(systemName: "pause.fill")
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundStyle(.white.opacity(0.85))
                                    }
                                }
                                .buttonStyle(XButtonStyle())
                            }

                            // X / Stop button
                            Button(intent: StopWhiteNoiseIntent()) {
                                ZStack {
                                    Circle()
                                        .fill(.white.opacity(0.12))
                                        .frame(width: 36, height: 36)
                                    Image(systemName: "xmark")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(.white.opacity(0.85))
                                }
                            }
                            .buttonStyle(XButtonStyle())
                        }
                        .padding(.trailing, 2)
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack(alignment: .bottom, spacing: 0) {
                        Group {
                            if context.state.isPaused {
                                Text(formatElapsed(context.state.elapsedSeconds))
                                    .foregroundStyle(.white.opacity(0.45))
                            } else {
                                Text(context.state.startTime, style: .timer)
                                    .foregroundStyle(.white)
                            }
                        }
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .monospacedDigit()

                        Spacer()

                        HStack(spacing: 3) {
                            ForEach(0..<5, id: \.self) { i in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(noiseColor.opacity(
                                        context.state.isPaused
                                            ? 0.25
                                            : (0.6 + Double(i) * 0.08)
                                    ))
                                    .frame(
                                        width: 3,
                                        height: context.state.isPaused
                                            ? CGFloat([4, 6, 8, 6, 4][i])
                                            : CGFloat([8, 14, 20, 14, 8][i])
                                    )
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
                Image(systemName: context.state.isPaused ? "speaker.slash.fill" : "speaker.wave.2.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(context.state.isPaused ? .white.opacity(0.4) : noiseColor)
                    .padding(.leading, 2)

            } compactTrailing: {
                if context.state.isPaused {
                    Text(formatElapsed(context.state.elapsedSeconds))
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white.opacity(0.45))
                        .frame(minWidth: 36)
                        .padding(.trailing, 2)
                } else {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .frame(minWidth: 36)
                        .padding(.trailing, 2)
                }

            } minimal: {
                Image(systemName: context.state.isPaused ? "speaker.slash.fill" : "speaker.wave.2.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(context.state.isPaused ? .white.opacity(0.4) : noiseColor)
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
            noiseBg
            RadialGradient(
                colors: [noiseColor.opacity(context.state.isPaused ? 0.08 : 0.20), .clear],
                center: .topTrailing,
                startRadius: 10,
                endRadius: 220
            )

            HStack(alignment: .center, spacing: 16) {

                // ── Left: icon ─────────────────────────────────────────
                ZStack {
                    Circle()
                        .fill(noiseColor.opacity(context.state.isPaused ? 0.08 : 0.15))
                        .frame(width: 52, height: 52)
                    Image(systemName: "speaker.wave.3.fill")
                        .font(.system(size: 22, weight: .medium))
                        .foregroundStyle(noiseColor.opacity(context.state.isPaused ? 0.45 : 1.0))
                }

                // ── Center: name + timer ───────────────────────────────
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.attributes.soundName)
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(context.state.isPaused ? 0.4 : 0.75))

                    Group {
                        if context.state.isPaused {
                            Text(formatElapsed(context.state.elapsedSeconds))
                                .foregroundStyle(.white.opacity(0.45))
                        } else {
                            Text(context.state.startTime, style: .timer)
                                .foregroundStyle(.white)
                        }
                    }
                    .font(.system(size: 38, weight: .bold, design: .rounded))
                    .monospacedDigit()
                }

                Spacer()

                // ── Right: pause/resume + stop buttons ─────────────────
                if #available(iOS 17.0, *) {
                    HStack(spacing: 10) {
                        // Pause / Resume
                        if context.state.isPaused {
                            Button(intent: ResumeWhiteNoiseIntent()) {
                                ZStack {
                                    Circle()
                                        .fill(noiseColor.opacity(0.22))
                                        .frame(width: 44, height: 44)
                                    Image(systemName: "play.fill")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(noiseColor)
                                }
                            }
                            .buttonStyle(XButtonStyle())
                        } else {
                            Button(intent: PauseWhiteNoiseIntent()) {
                                ZStack {
                                    Circle()
                                        .fill(.white.opacity(0.10))
                                        .frame(width: 44, height: 44)
                                    Image(systemName: "pause.fill")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(.white.opacity(0.9))
                                }
                            }
                            .buttonStyle(XButtonStyle())
                        }

                        // Stop (X)
                        Button(intent: StopWhiteNoiseIntent()) {
                            ZStack {
                                Circle()
                                    .fill(.white.opacity(0.10))
                                    .frame(width: 44, height: 44)
                                Image(systemName: "xmark")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(.white.opacity(0.9))
                            }
                        }
                        .buttonStyle(XButtonStyle())
                    }
                } else {
                    // iOS 16 — no interactive buttons
                    HStack(spacing: 10) {
                        ZStack {
                            Circle().fill(.white.opacity(0.10)).frame(width: 44, height: 44)
                            Image(systemName: "pause.fill")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.white.opacity(0.35))
                        }
                        ZStack {
                            Circle().fill(.white.opacity(0.10)).frame(width: 44, height: 44)
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white.opacity(0.35))
                        }
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
