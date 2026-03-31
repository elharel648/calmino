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
                DynamicIslandExpandedRegion(.leading) { EmptyView() }

                // ── Expanded Trailing ───────────────────────────────────
                DynamicIslandExpandedRegion(.trailing) { EmptyView() }

                // ── Expanded Bottom ─────────────────────────────────────
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 12) {
                        // Header
                        HStack(spacing: 8) {
                            Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
                            Text("\(context.attributes.babyName) · \(context.state.sleepType)")
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
