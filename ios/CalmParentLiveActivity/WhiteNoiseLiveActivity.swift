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
                    HStack(spacing: 6) {
                        Image(systemName: "speaker.wave.3.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(noiseColor)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(context.attributes.soundName)
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text("רעש לבן")
                                .font(.system(size: 10, design: .rounded))
                                .foregroundStyle(noiseColor)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Link(destination: URL(string: "calmparentapp://stop-whitenoise")!) {
                        HStack(spacing: 6) {
                            Image(systemName: "stop.fill")
                            Text("כיבוי")
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.8), in: Capsule())
                    }
                    .environment(\.layoutDirection, .rightToLeft)
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
            
            HStack(alignment: .center, spacing: 0) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Image(systemName: "speaker.wave.3.fill")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(noiseColor)
                        Text(context.attributes.soundName)
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.75))
                    }
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 38, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
                
                Spacer()
                
                Link(destination: URL(string: "calmparentapp://stop-whitenoise")!) {
                    HStack(spacing: 6) {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 12, weight: .bold))
                        Text("כיבוי")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.red.opacity(0.8), in: Capsule())
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 0))
    }
}
