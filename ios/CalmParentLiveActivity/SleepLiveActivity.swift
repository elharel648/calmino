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
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.babyName)
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(context.state.sleepType)
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(sleepColor)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isPaused {
                        Text("מושהה")
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundStyle(.orange)
                            .multilineTextAlignment(.trailing)
                    } else {
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.trailing)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 0) {
                        Rectangle()
                            .fill(Color.white.opacity(0.12))
                            .frame(height: 0.5)
                            .padding(.bottom, 10)
                        Link(destination: URL(string: "calmparentapp://stop-timer?type=sleep")!) {
                            Text("שמירה")
                                .font(.system(size: 16, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(sleepColor.opacity(0.9), in: Capsule())
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isPaused ? "pause.fill" : "moon.zzz.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
            } compactTrailing: {
                if context.state.isPaused {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.orange)
                } else {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 11, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(sleepColor)
                }
            } minimal: {
                Image(systemName: "moon.zzz.fill")
                    .foregroundStyle(sleepColor)
            }
            .widgetURL(URL(string: "calmparentapp://sleep")!)
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
                VStack(spacing: 10) {
                    Link(destination: URL(string: "calmparentapp://stop-timer?type=sleep")!) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 58, height: 58)
                            .background(sleepColor, in: Circle())
                            .shadow(color: sleepColor.opacity(0.4), radius: 8, y: 4)
                    }
                    Text("שמירה")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.8))
                }
                .environment(\.layoutDirection, .rightToLeft)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}
