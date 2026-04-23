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
                DynamicIslandExpandedRegion(.leading) { EmptyView() }
                DynamicIslandExpandedRegion(.trailing) { EmptyView() }
            } compactLeading: {
                EmptyView()
            } compactTrailing: {
                EmptyView()
            } minimal: {
                EmptyView()
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
                    HStack {
                        Spacer()
                        
                        // Close/Turn-off (Deep Link to open the app)
                        Link(destination: URL(string: "calmino://white-noise?action=stop")!) {
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
                        
                        Spacer()
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
