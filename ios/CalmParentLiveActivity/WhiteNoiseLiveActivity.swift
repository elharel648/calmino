import ActivityKit
import WidgetKit
import SwiftUI

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
                        Image(systemName: "speaker.wave.2.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(noiseColor)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("מנגן כרגע")
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(context.attributes.soundName)
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.5))
                        }
                    }
                    .padding(.leading, 4)
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                        .padding(.trailing, 4)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    if #available(iOS 17, *) {
                        HStack {
                            Spacer()
                            Link(destination: URL(string: "calmino://stop-timer?type=white_noise")!) {
                                HStack(spacing: 6) {
                                    Image(systemName: "stop.fill")
                                        .font(.system(size: 12, weight: .bold))
                                    Text("סגור")
                                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                                }
                                .foregroundStyle(.white.opacity(0.75))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.white.opacity(0.08), in: Capsule())
                            }
                        }
                        .padding(.horizontal, 8)
                        .padding(.bottom, 4)
                        .environment(\.layoutDirection, .rightToLeft)
                    }
                }
            } compactLeading: {
                Image(systemName: "speaker.wave.2.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(noiseColor)
            } compactTrailing: {
                Text(context.state.startTime, style: .timer)
                    .monospacedDigit()
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
            } minimal: {
                Image(systemName: "speaker.wave.3.fill")
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
                
                if #available(iOS 17, *) {
                    Link(destination: URL(string: "calmino://stop-timer?type=white_noise")!) {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white.opacity(0.8))
                            .frame(width: 36, height: 36)
                            .background(Color(white: 0.18), in: Circle())
                    }
                    .environment(\.layoutDirection, .rightToLeft)
                } else {
                    Image(systemName: "music.note")
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
