import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Design Tokens

private let feedingAccent = Color(red: 0.96, green: 0.62, blue: 0.04) // Warm amber
private let feedingGlow = Color(red: 1.0, green: 0.72, blue: 0.15)
private let pureOledBlack = Color.black
private let subtleGray = Color(white: 0.1)

// MARK: - Feeding Live Activity Widget

@available(iOS 16.2, *)
struct FeedingLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MealActivityAttributes.self) { context in
            FeedingLockScreenView(context: context)
                .colorScheme(.dark)
        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: Expanded Region - Leading (Icon & Type)
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(context.state.isPaused ? Color.orange.opacity(0.15) : feedingAccent.opacity(0.15))
                                .frame(width: 32, height: 32)
                            
                            if #available(iOS 17.0, *) {
                                Image(systemName: context.state.isPaused ? "pause.fill" : feedingIconName(context.state.mealType))
                                    .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
                                    .font(.system(size: 14, weight: .bold))
                                    .symbolEffect(.bounce, value: context.state.isPaused)
                                    .symbolEffect(.pulse, isActive: !context.state.isPaused)
                            } else {
                                Image(systemName: context.state.isPaused ? "pause.fill" : feedingIconName(context.state.mealType))
                                    .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
                                    .font(.system(size: 14, weight: .bold))
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.babyName)
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(feedingTypeHebrew(context.state.mealType))
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundStyle(feedingAccent.opacity(0.9))
                        }
                        .contentTransition(.opacity)
                    }
                    .padding(.leading, 4)
                    .padding(.top, 4)
                }
                
                // MARK: Expanded Region - Trailing (Timer)
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 0) {
                        if context.state.isPaused {
                            Text("מושהה")
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundColor(.orange)
                                .transition(.blurReplace)
                        } else {
                            Text(context.state.startTime, style: .timer)
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundColor(feedingAccent)
                                .monospacedDigit()
                                .transition(.blurReplace)
                        }
                    }
                    .padding(.trailing, 4)
                    .padding(.top, 8)
                    .animation(.snappy, value: context.state.isPaused)
                }
                
                // MARK: Expanded Region - Bottom (Action Button)
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 12) {
                        // מפריד עדין ויוקרתי
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
                        
                        Link(destination: URL(string: "calmparentapp://stop-timer?type=\(feedingTypeASCII(context.state.mealType))")!) {
                            HStack(spacing: 6) {
                                Text("שמירה וסיום")
                                    .font(.system(size: 15, weight: .bold, design: .rounded))
                                Image(systemName: "stop.circle.fill")
                                    .font(.system(size: 16, weight: .bold))
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                Capsule()
                                    .fill(feedingAccent.opacity(0.85))
                            )
                            .overlay(
                                Capsule()
                                    .stroke(Color.white.opacity(0.2), lineWidth: 0.5)
                            )
                            .shadow(color: feedingAccent.opacity(0.25), radius: 8, y: 4)
                        }
                        .padding(.horizontal, 4)
                    }
                    .padding(.bottom, 6)
                }
            } compactLeading: {
                // MARK: Compact Leading
                HStack {
                    if #available(iOS 17.0, *) {
                        Image(systemName: context.state.isPaused ? "pause.fill" : feedingIconName(context.state.mealType))
                            .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
                            .font(.system(size: 12, weight: .medium))
                            .symbolEffect(.bounce, value: context.state.isPaused)
                    } else {
                        Image(systemName: context.state.isPaused ? "pause.fill" : feedingIconName(context.state.mealType))
                            .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
                            .font(.system(size: 12, weight: .medium))
                    }
                }
            } compactTrailing: {
                // MARK: Compact Trailing
                ZStack(alignment: .trailing) {
                    if context.state.isPaused {
                        Image(systemName: "pause.fill")
                            .foregroundStyle(.orange)
                            .font(.system(size: 12, weight: .black))
                            .transition(.scale.combined(with: .opacity))
                    } else {
                        Text(context.state.startTime, style: .timer)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(feedingAccent)
                            .monospacedDigit()
                            .fixedSize(horizontal: true, vertical: false)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
                .padding(.trailing, 4)
                .animation(.snappy, value: context.state.isPaused)
            } minimal: {
                // MARK: Minimal
                if #available(iOS 17.0, *) {
                    Image(systemName: feedingIconName(context.state.mealType))
                        .foregroundStyle(feedingAccent)
                        .symbolEffect(.pulse, isActive: !context.state.isPaused)
                } else {
                    Image(systemName: feedingIconName(context.state.mealType))
                        .foregroundStyle(feedingAccent)
                }
            }
            .widgetURL(URL(string: "calmparentapp://feeding")!)
            .keylineTint(feedingAccent)
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct FeedingLockScreenView: View {
    let context: ActivityViewContext<MealActivityAttributes>

    var body: some View {
        ZStack {
            // רקע נקי - OLED Black
            LinearGradient(
                colors: [subtleGray, pureOledBlack],
                startPoint: .top,
                endPoint: .bottom
            )
            
            // תאורת אווירה (Ambient Glow)
            GeometryReader { proxy in
                Circle()
                    .fill(context.state.isPaused ? Color.orange.opacity(0.12) : feedingGlow.opacity(0.12))
                    .frame(width: proxy.size.width * 0.8, height: proxy.size.width * 0.8)
                    .blur(radius: 60)
                    .position(x: proxy.size.width, y: 0)
                    .animation(.easeInOut(duration: 1.0), value: context.state.isPaused)
            }

            VStack(spacing: 20) {
                // חלק עליון: מידע וטיימר (RTL מותאם)
                HStack(alignment: .center) {
                    // כפתור עצירה/סיום מהיר בצד שמאל
                    Link(destination: URL(string: "calmparentapp://stop-timer?type=\(feedingTypeASCII(context.state.mealType))")!) {
                        ZStack {
                            Circle()
                                .fill(.white.opacity(0.1))
                                .frame(width: 44, height: 44)
                            
                            Image(systemName: "stop.fill")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                    
                    Spacer()
                    
                    // טקסטים בצד ימין
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 6) {
                            Text("\(context.attributes.babyName) · \(feedingTypeHebrew(context.state.mealType))")
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.6))
                            
                            if #available(iOS 17.0, *) {
                                Image(systemName: context.state.isPaused ? "pause.circle.fill" : feedingIconName(context.state.mealType))
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
                                    .symbolEffect(.pulse, isActive: !context.state.isPaused)
                            } else {
                                Image(systemName: context.state.isPaused ? "pause.circle.fill" : feedingIconName(context.state.mealType))
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(context.state.isPaused ? .orange : feedingAccent)
                            }
                        }

                        Group {
                            if context.state.isPaused {
                                Text("מושהה")
                                    .foregroundColor(.orange)
                            } else {
                                Text(context.state.startTime, style: .timer)
                                    .foregroundColor(.white)
                            }
                        }
                        .font(.system(size: 38, weight: .heavy, design: .rounded))
                        .monospacedDigit()
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

// MARK: - Helper Functions

func feedingTypeASCII(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק": return "bottle"
    case "pumping", "שאיבה": return "pumping"
    case let t where t.contains("breastfeeding") || t.contains("הנקה"): return "breastfeeding"
    default: return "food"
    }
}

@available(iOS 16.2, *)
func feedingIconName(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return "drop.fill"
    case let t where t.contains("breastfeeding") || t.contains("הנקה"):
        return "heart.fill"
    case "pumping", "שאיבה":
        return "waveform.path"
    default:
        return "fork.knife"
    }
}

@available(iOS 16.2, *)
func feedingColor(_ mealType: String) -> Color {
    return feedingAccent
}

@available(iOS 16.2, *)
func feedingTypeHebrew(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return "בקבוק"
    case "breastfeeding-right", "הנקה ימין":
        return "הנקה - צד ימין"
    case "breastfeeding-left", "הנקה שמאל":
        return "הנקה - צד שמאל"
    case "pumping", "שאיבה":
        return "שאיבה"
    default:
        return mealType
    }
}

@available(iOS 16.2, *)
func feedingTypeIcon(_ mealType: String) -> String {
    switch mealType.lowercased() {
    case "bottle", "בקבוק":
        return "🍼"
    case "breastfeeding-right", "הנקה ימין":
        return "👉"
    case "breastfeeding-left", "הנקה שמאל":
        return "👈"
    case "pumping", "שאיבה":
        return "🔄"
    default:
        return "🍽️"
    }
}
