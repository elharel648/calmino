import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Design Tokens

private let noiseColor = Color(red: 0.15, green: 0.65, blue: 0.85)
private let noiseGlow = Color(red: 0.25, green: 0.75, blue: 0.95)
private let pureOledBlack = Color.black
private let subtleGray = Color(white: 0.1)

// MARK: - White Noise Live Activity

@available(iOS 16.2, *)
struct WhiteNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WhiteNoiseActivityAttributes.self) { context in
            WhiteNoiseLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: Expanded Region - Leading
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(noiseColor.opacity(0.15))
                                .frame(width: 28, height: 28)
                            
                            if #available(iOS 17.0, *) {
                                Image(systemName: "speaker.wave.3.fill")
                                    .foregroundStyle(noiseColor)
                                    .font(.system(size: 14, weight: .bold))
                                    .symbolEffect(.pulse)
                            } else {
                                Image(systemName: "speaker.wave.3.fill")
                                    .foregroundStyle(noiseColor)
                                    .font(.system(size: 14, weight: .bold))
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.soundName)
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                                .contentTransition(.opacity)
                            Text("רעש לבן")
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(noiseColor.opacity(0.9))
                        }
                    }
                    .padding(.leading, 4)
                    .padding(.top, 4)
                }
                
                // MARK: Expanded Region - Trailing
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 0) {
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundColor(noiseColor)
                            .monospacedDigit()
                            .transition(.blurReplace)
                    }
                    .padding(.trailing, 4)
                    .padding(.top, 8)
                }
                
                // MARK: Expanded Region - Bottom
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 12) {
                        Rectangle()
                            .fill(
                                LinearGradient(
                                    colors: [.clear, .white.opacity(0.15), .clear],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(height: 0.5)
                            .padding(.top, 4)
                        
                        Link(destination: URL(string: "calmparentapp://stop-whitenoise")!) {
                            HStack(spacing: 6) {
                                Text("כיבוי")
                                    .font(.system(size: 15, weight: .bold, design: .rounded))
                                Image(systemName: "stop.circle.fill")
                                    .font(.system(size: 16, weight: .bold))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                Capsule()
                                    .fill(Color.red.opacity(0.85))
                            )
                            .overlay(
                                Capsule()
                                    .stroke(Color.white.opacity(0.2), lineWidth: 0.5)
                            )
                            .shadow(color: Color.red.opacity(0.25), radius: 8, y: 4)
                        }
                        .padding(.horizontal, 4)
                    }
                    .padding(.bottom, 6)
                }
            } compactLeading: {
                // MARK: Compact Leading
                HStack {
                    if #available(iOS 17.0, *) {
                        Image(systemName: "speaker.wave.2.fill")
                            .foregroundStyle(noiseColor)
                            .font(.system(size: 12, weight: .medium))
                            .symbolEffect(.pulse)
                    } else {
                        Image(systemName: "speaker.wave.2.fill")
                            .foregroundStyle(noiseColor)
                            .font(.system(size: 12, weight: .medium))
                    }
                }
            } compactTrailing: {
                // MARK: Compact Trailing
                ZStack(alignment: .trailing) {
                    Text(context.state.startTime, style: .timer)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(noiseColor)
                        .monospacedDigit()
                        .fixedSize(horizontal: true, vertical: false)
                        .transition(.scale.combined(with: .opacity))
                }
                .padding(.trailing, 4)
            } minimal: {
                // MARK: Minimal
                if #available(iOS 17.0, *) {
                    Image(systemName: "speaker.wave.2.fill")
                        .foregroundStyle(noiseColor)
                        .symbolEffect(.pulse)
                } else {
                    Image(systemName: "speaker.wave.2.fill")
                        .foregroundStyle(noiseColor)
                }
            }
            .widgetURL(URL(string: "calmparentapp://white-noise")!)
            .keylineTint(noiseColor)
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct WhiteNoiseLockScreenView: View {
    let context: ActivityViewContext<WhiteNoiseActivityAttributes>
    
    var body: some View {
        ZStack {
            // OLED Black Background
            LinearGradient(
                colors: [subtleGray, pureOledBlack],
                startPoint: .top,
                endPoint: .bottom
            )
            
            // Ambient Glow
            GeometryReader { proxy in
                Circle()
                    .fill(noiseGlow.opacity(0.12))
                    .frame(width: proxy.size.width * 0.8, height: proxy.size.width * 0.8)
                    .blur(radius: 60)
                    .position(x: proxy.size.width, y: 0)
            }
            
            VStack(spacing: 20) {
                // Header & Timer (RTL Optimized)
                HStack(alignment: .center) {
                    // Quick Stop Button (Left Side)
                    Link(destination: URL(string: "calmparentapp://stop-whitenoise")!) {
                        ZStack {
                            Circle()
                                .fill(.white.opacity(0.1))
                                .frame(width: 44, height: 44)
                            
                            Image(systemName: "stop.fill")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(Color.red.opacity(0.9))
                        }
                    }
                    
                    Spacer()
                    
                    // Info (Right Side)
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 6) {
                            Text(context.attributes.soundName)
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.6))
                            
                            if #available(iOS 17.0, *) {
                                Image(systemName: "speaker.wave.3.fill")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(noiseColor)
                                    .symbolEffect(.pulse)
                            } else {
                                Image(systemName: "speaker.wave.3.fill")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(noiseColor)
                            }
                        }
                        
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 38, weight: .heavy, design: .rounded))
                            .monospacedDigit()
                            .foregroundStyle(.white)
                            .shadow(color: .black.opacity(0.8), radius: 2, y: 1)
                            .contentTransition(.numericText())
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 20)
        }
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.1), lineWidth: 0.5)
        )
    }
}
