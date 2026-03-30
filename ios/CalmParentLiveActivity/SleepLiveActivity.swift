import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Design Tokens

private let sleepColor = Color(red: 0.45, green: 0.42, blue: 1.0)

// MARK: - Sleep Live Activity

@available(iOS 16.2, *)
struct SleepLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SleepActivityAttributes.self) { context in
            SleepLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                // ── Expanded Leading ────────────────────────────────────
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(sleepColor)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.babyName)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(context.state.sleepType)
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.5))
                        }
                    }
                    .padding(.leading, 4)
                }

                // ── Expanded Trailing ───────────────────────────────────
                DynamicIslandExpandedRegion(.trailing) {
                    Group {
                        if context.state.isPaused {
                            Text("מושהה")
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                                .foregroundStyle(.orange)
                        } else {
                            Text(context.state.startTime, style: .timer)
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white)
                        }
                    }
                    .padding(.trailing, 4)
                }

                // ── Expanded Bottom ─────────────────────────────────────
                DynamicIslandExpandedRegion(.bottom) {
                    if #available(iOS 17, *) {
                        HStack(spacing: 10) {
                            if context.state.isPaused {
                                Button(intent: ResumeTimerIntent()) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "play.fill")
                                            .font(.system(size: 12, weight: .bold))
                                        Text("המשך")
                                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                                    }
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(sleepColor.opacity(0.25), in: Capsule())
                                    .overlay(Capsule().stroke(sleepColor.opacity(0.5), lineWidth: 1))
                                }
                                .buttonStyle(.plain)
                            } else {
                                Button(intent: PauseTimerIntent()) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "pause.fill")
                                            .font(.system(size: 12, weight: .bold))
                                        Text("השהה")
                                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                                    }
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(Color.white.opacity(0.12), in: Capsule())
                                    .overlay(Capsule().stroke(Color.white.opacity(0.2), lineWidth: 1))
                                }
                                .buttonStyle(.plain)
                            }

                            Spacer()

                            Button(intent: StopTimerIntent()) {
                                HStack(spacing: 6) {
                                    Image(systemName: "stop.fill")
                                        .font(.system(size: 12, weight: .bold))
                                    Text("סיים")
                                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                                }
                                .foregroundStyle(.white.opacity(0.75))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
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
                Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
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
                Image(systemName: "moon.zzz.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(sleepColor)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct SleepLockScreenView: View {
    let context: ActivityViewContext<SleepActivityAttributes>

    var body: some View {
        ZStack {
            // Background
            Rectangle()
                .fill(Color.black)
            RadialGradient(
                colors: [sleepColor.opacity(0.18), .clear],
                center: .topTrailing,
                startRadius: 20,
                endRadius: 200
            )

            HStack(alignment: .center, spacing: 0) {
                // Left — info + timer
                VStack(alignment: .leading, spacing: 8) {
                    // Header
                    HStack(spacing: 8) {
                        Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
                        Text("\(context.attributes.babyName) · \(context.state.sleepType)")
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
                            .buttonStyle(.plain)
                        } else {
                            Button(intent: PauseTimerIntent()) {
                                Image(systemName: "pause.fill")
                                    .font(.system(size: 19, weight: .bold))
                                    .foregroundStyle(.black)
                                    .frame(width: 52, height: 52)
                                    .background(.white, in: Circle())
                            }
                            .buttonStyle(.plain)
                        }

                        Button(intent: StopTimerIntent()) {
                            Image(systemName: "stop.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white.opacity(0.8))
                                .frame(width: 36, height: 36)
                                .background(Color(white: 0.18), in: Circle())
                        }
                        .buttonStyle(.plain)
                    }
                    .environment(\.layoutDirection, .rightToLeft)
                } else {
                    Image(systemName: "moon.stars.fill")
                        .font(.system(size: 32, weight: .thin))
                        .foregroundStyle(sleepColor.opacity(0.35))
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}
