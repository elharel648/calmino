import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Design Tokens
private let noiseColor = Color(red: 0.15, green: 0.65, blue: 0.85)

// MARK: - White Noise Live Activity

@available(iOS 16.2, *)
struct WhiteNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WhiteNoiseActivityAttributes.self) { context in
            WhiteNoiseLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: "speaker.wave.3.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(noiseColor)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.soundName)
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text("רעש לבן")
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(noiseColor)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 0) {
                        Rectangle()
                            .fill(Color.white.opacity(0.12))
                            .frame(height: 0.5)
                            .padding(.bottom, 10)
                        Link(destination: URL(string: "calmparentapp://stop-whitenoise")!) {
                            HStack(spacing: 8) {
                                Image(systemName: "stop.fill")
                                    .font(.system(size: 14, weight: .bold))
                                Text("כיבוי")
                                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color.red.opacity(0.75), in: Capsule())
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "speaker.wave.2.fill")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(noiseColor)
            } compactTrailing: {
                Text(context.state.startTime, style: .timer)
                    .font(.system(size: 11, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(noiseColor)
            } minimal: {
                Image(systemName: "speaker.wave.2.fill")
                    .foregroundStyle(noiseColor)
            }
            .widgetURL(URL(string: "calmparentapp://white-noise")!)
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct WhiteNoiseLockScreenView: View {
    let context: ActivityViewContext<WhiteNoiseActivityAttributes>
    
    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color.black)
            RadialGradient(
                colors: [noiseColor.opacity(0.25), .clear],
                center: .topLeading,
                startRadius: 20,
                endRadius: 200
            )
            
            VStack(spacing: 12) {
                HStack(alignment: .center, spacing: 0) {
                    Spacer()
                    // Right side — info + timer (RTL)
                    VStack(alignment: .trailing, spacing: 6) {
                        HStack(spacing: 8) {
                            Text(context.attributes.soundName)
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white.opacity(0.75))
                            Image(systemName: "speaker.wave.3.fill")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(noiseColor)
                        }
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                }

                // Full-width stop capsule
                Link(destination: URL(string: "calmparentapp://stop-whitenoise")!) {
                    HStack(spacing: 8) {
                        Text("כיבוי")
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                        Image(systemName: "stop.fill")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(noiseColor.opacity(0.8), in: Capsule())
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .clipShape(ContainerRelativeShape())
    }
}
