import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Design Tokens

private let sleepColor = Color(red: 0.45, green: 0.42, blue: 1.0)
private let darkBg = Color(red: 0.02, green: 0.02, blue: 0.08)

// MARK: - Sleep Live Activity

@available(iOS 16.2, *)
struct SleepLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SleepActivityAttributes.self) { context in
            SleepLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Region
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        if #available(iOS 17.0, *) {
                            Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                                .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
                                .symbolEffect(.pulse, isActive: !context.state.isPaused)
                        } else {
                            Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                                .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
                        }
                        Text(context.state.sleepType)
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                    .padding(.leading, 8)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isPaused {
                        Text("מושהה")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundColor(.orange)
                            .padding(.trailing, 8)
                    } else {
                        Text(context.state.startTime, style: .timer)
                            .multilineTextAlignment(.trailing)
                            .monospacedDigit()
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(sleepColor)
                            .padding(.trailing, 8)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 0) {
                        Rectangle()
                            .fill(Color.white.opacity(0.12))
                            .frame(height: 0.5)
                            .padding(.bottom, 10)
                        Link(destination: URL(string: "calmparentapp://stop-timer?type=sleep")!) {
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 15, weight: .bold))
                                Text("שמירה וסיום")
                                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(sleepColor.opacity(0.9), in: Capsule())
                        }
                    }
                    .padding(.bottom, 4)
                }
            } compactLeading: {
                if #available(iOS 17.0, *) {
                    Image(systemName: "moon.zzz.fill")
                        .foregroundColor(sleepColor)
                        .symbolEffect(.pulse, isActive: !context.state.isPaused)
                } else {
                    Image(systemName: "moon.zzz.fill")
                        .foregroundColor(sleepColor)
                }
            } compactTrailing: {
                if context.state.isPaused {
                    Image(systemName: "pause.fill")
                        .foregroundColor(.orange)
                } else {
                    Text(context.state.startTime, style: .timer)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 40)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(sleepColor)
                }
            } minimal: {
                if #available(iOS 17.0, *) {
                    Image(systemName: "moon.zzz.fill")
                        .foregroundColor(sleepColor)
                        .symbolEffect(.pulse, isActive: !context.state.isPaused)
                } else {
                    Image(systemName: "moon.zzz.fill")
                        .foregroundColor(sleepColor)
                }
            }
            .widgetURL(URL(string: "calmparentapp://sleep"))
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct SleepLockScreenView: View {
    let context: ActivityViewContext<SleepActivityAttributes>

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
                .fill(sleepColor.opacity(0.2))
                .frame(width: 150, height: 150)
                .blur(radius: 40)
                .offset(x: 100, y: -50)
                
            Circle()
                .fill(Color.blue.opacity(0.15))
                .frame(width: 120, height: 120)
                .blur(radius: 30)
                .offset(x: -100, y: 50)

            VStack(spacing: 12) {
                HStack(alignment: .center, spacing: 0) {
                    Spacer()
                    // Right side — info + timer (RTL)
                    VStack(alignment: .trailing, spacing: 6) {
                        HStack(spacing: 8) {
                            Text("\(context.attributes.babyName) · \(context.state.sleepType)")
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.9))
                            if #available(iOS 17.0, *) {
                                Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
                                    .symbolEffect(.pulse, isActive: !context.state.isPaused)
                            } else {
                                Image(systemName: context.state.isPaused ? "pause.circle.fill" : "moon.zzz.fill")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundStyle(context.state.isPaused ? .orange : sleepColor)
                            }
                        }

                        if context.state.isPaused {
                            Text("מושהה")
                                .font(.system(size: 38, weight: .bold, design: .rounded))
                                .foregroundStyle(.orange)
                                .shadow(color: .orange.opacity(0.4), radius: 8, y: 2)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        } else {
                            Text(context.state.startTime, style: .timer)
                                .font(.system(size: 40, weight: .heavy, design: .rounded))
                                .monospacedDigit()
                                .foregroundStyle(.white)
                                .shadow(color: .white.opacity(0.3), radius: 5, y: 2)
                                .multilineTextAlignment(.trailing)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }
                }

                // Full-width stop capsule
                Link(destination: URL(string: "calmparentapp://stop-timer?type=sleep")!) {
                    HStack(spacing: 8) {
                        Text("שמירה וסיום")
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(sleepColor.opacity(0.9), in: Capsule())
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .clipShape(ContainerRelativeShape())
    }
}

