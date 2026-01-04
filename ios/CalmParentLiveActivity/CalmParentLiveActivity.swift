import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Type Mapping
@available(iOS 16.1, *)
enum ActivityIconType: String {
    case feed, sleep, diaper, pump, medicine, doctor, breast, other
    
    var systemImage: String {
        switch self {
        case .feed: return "fork.knife"
        case .sleep: return "moon.zzz.fill"
        case .diaper: return "drop.fill"
        case .pump: return "drop.triangle.fill"
        case .breast: return "heart.fill"
        case .medicine: return "pills.fill"
        case .doctor: return "stethoscope"
        case .other: return "timer"
        }
    }
    
    var color: Color {
        switch self {
        case .feed: return Color(red: 1.0, green: 0.6, blue: 0.2) // Warm orange
        case .sleep: return Color(red: 0.4, green: 0.35, blue: 0.85) // Soft indigo
        case .diaper: return Color(red: 0.3, green: 0.75, blue: 0.5) // Fresh green
        case .pump: return Color(red: 0.95, green: 0.45, blue: 0.6) // Soft pink
        case .breast: return Color(red: 0.95, green: 0.5, blue: 0.55) // Warm pink
        case .medicine: return Color(red: 0.9, green: 0.35, blue: 0.4) // Soft red
        case .doctor: return Color(red: 0.35, green: 0.6, blue: 0.95) // Medical blue
        case .other: return Color(red: 0.6, green: 0.4, blue: 0.9) // Purple
        }
    }
    
    var displayName: String {
        switch self {
        case .feed: return "האכלה"
        case .sleep: return "שינה"
        case .diaper: return "החלפה"
        case .pump: return "שאיבת חלב"
        case .breast: return "הנקה"
        case .medicine: return "תרופה"
        case .doctor: return "רופא"
        case .other: return "טיימר"
        }
    }
    
    static func from(_ type: String) -> ActivityIconType {
        let lowercased = type.lowercased()
        if ["האכלה", "אוכל", "feeding", "feed", "food", "bottle", "בקבוק"].contains(where: { lowercased.contains($0) }) {
            return .feed
        }
        if ["שינה", "sleep", "nap", "ישן"].contains(where: { lowercased.contains($0) }) {
            return .sleep
        }
        if ["טיטול", "חיתול", "diaper", "החלפה"].contains(where: { lowercased.contains($0) }) {
            return .diaper
        }
        if ["שאיבה", "pump", "pumping"].contains(where: { lowercased.contains($0) }) {
            return .pump
        }
        if ["הנקה", "breast", "nursing", "יונק"].contains(where: { lowercased.contains($0) }) {
            return .breast
        }
        if ["תרופה", "medicine", "medication", "vitamin", "ויטמין"].contains(where: { lowercased.contains($0) }) {
            return .medicine
        }
        if ["רופא", "doctor"].contains(where: { lowercased.contains($0) }) {
            return .doctor
        }
        return .other
    }
}

// MARK: - Premium Icon View
@available(iOS 16.1, *)
struct PremiumIconView: View {
    let type: String
    let size: CGFloat
    let showGlow: Bool
    
    init(type: String, size: CGFloat, showGlow: Bool = false) {
        self.type = type
        self.size = size
        self.showGlow = showGlow
    }
    
    var body: some View {
        let iconType = ActivityIconType.from(type)
        ZStack {
            // Glow effect
            if showGlow {
                Circle()
                    .fill(iconType.color.opacity(0.4))
                    .blur(radius: size * 0.3)
                    .frame(width: size * 1.2, height: size * 1.2)
            }
            
            // Main circle with gradient
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            iconType.color,
                            iconType.color.opacity(0.7)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: iconType.color.opacity(0.5), radius: size * 0.15, x: 0, y: size * 0.05)
            
            // Icon
            Image(systemName: iconType.systemImage)
                .font(.system(size: size * 0.45, weight: .semibold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Side Indicator for Breastfeeding
@available(iOS 16.1, *)
struct SideIndicator: View {
    let side: String?
    let compact: Bool
    
    init(side: String?, compact: Bool = false) {
        self.side = side
        self.compact = compact
    }
    
    var body: some View {
        if let side = side, !side.isEmpty {
            HStack(spacing: compact ? 2 : 4) {
                // Left arrow (highlighted if left side)
                Image(systemName: "chevron.left")
                    .font(.system(size: compact ? 10 : 12, weight: side == "left" ? .bold : .regular))
                    .foregroundColor(side == "left" ? Color(red: 0.95, green: 0.5, blue: 0.55) : .white.opacity(0.3))
                    .scaleEffect(side == "left" ? 1.1 : 0.9)
                
                if !compact {
                    Text(side == "left" ? "שמאל" : "ימין")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                }
                
                // Right arrow (highlighted if right side)
                Image(systemName: "chevron.right")
                    .font(.system(size: compact ? 10 : 12, weight: side == "right" ? .bold : .regular))
                    .foregroundColor(side == "right" ? Color(red: 0.95, green: 0.5, blue: 0.55) : .white.opacity(0.3))
                    .scaleEffect(side == "right" ? 1.1 : 0.9)
            }
            .padding(.horizontal, compact ? 4 : 6)
            .padding(.vertical, compact ? 2 : 3)
            .background(
                Capsule()
                    .fill(Color.white.opacity(0.1))
            )
        }
    }
}

// MARK: - Live Timer Text (Auto-updating!)
@available(iOS 16.1, *)
struct LiveTimerText: View {
    let state: CalmParentLiveActivityAttributes.ContentState
    let fontSize: CGFloat
    let color: Color
    let showRunningIndicator: Bool
    
    init(state: CalmParentLiveActivityAttributes.ContentState, fontSize: CGFloat, color: Color, showRunningIndicator: Bool = true) {
        self.state = state
        self.fontSize = fontSize
        self.color = color
        self.showRunningIndicator = showRunningIndicator
    }
    
    var body: some View {
        HStack(spacing: fontSize * 0.15) {
            // Running indicator
            if showRunningIndicator && !state.isPaused {
                Circle()
                    .fill(Color.green)
                    .frame(width: fontSize * 0.25, height: fontSize * 0.25)
                    .shadow(color: .green.opacity(0.6), radius: 3)
            } else if showRunningIndicator && state.isPaused {
                Circle()
                    .fill(Color.orange)
                    .frame(width: fontSize * 0.25, height: fontSize * 0.25)
            }
            
            if state.isPaused {
                Text(formatPausedTime())
                    .font(.system(size: fontSize, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundColor(color.opacity(0.7))
            } else {
                Text(timerInterval: state.startDate.addingTimeInterval(-state.accumulatedPausedSeconds)...Date.distantFuture, countsDown: false)
                    .font(.system(size: fontSize, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundColor(color)
            }
        }
    }
    
    private func formatPausedTime() -> String {
        guard let pauseDate = state.pauseDate else { return "00:00" }
        let elapsed = pauseDate.timeIntervalSince(state.startDate) - state.accumulatedPausedSeconds
        let totalSeconds = max(0, Int(elapsed))
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let secs = totalSeconds % 60
        
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        }
        return String(format: "%02d:%02d", minutes, secs)
    }
}

// MARK: - Compact Timer (Dynamic Island)
@available(iOS 16.1, *)
struct CompactTimerText: View {
    let state: CalmParentLiveActivityAttributes.ContentState
    
    var body: some View {
        if state.isPaused {
            Text(formatPausedTime())
                .font(.system(size: 14, weight: .semibold, design: .rounded).monospacedDigit())
                .foregroundColor(.white.opacity(0.8))
        } else {
            Text(timerInterval: state.startDate.addingTimeInterval(-state.accumulatedPausedSeconds)...Date.distantFuture, countsDown: false)
                .font(.system(size: 14, weight: .semibold, design: .rounded).monospacedDigit())
                .foregroundColor(.white)
                .multilineTextAlignment(.trailing)
        }
    }
    
    private func formatPausedTime() -> String {
        guard let pauseDate = state.pauseDate else { return "00:00" }
        let elapsed = pauseDate.timeIntervalSince(state.startDate) - state.accumulatedPausedSeconds
        let totalSeconds = max(0, Int(elapsed))
        let minutes = (totalSeconds % 3600) / 60
        let secs = totalSeconds % 60
        return String(format: "%02d:%02d", minutes, secs)
    }
}

// MARK: - Premium Play/Pause Button
@available(iOS 16.1, *)
struct PremiumPlayPauseButton: View {
    let context: ActivityViewContext<CalmParentLiveActivityAttributes>
    let size: CGFloat
    
    var body: some View {
        if #available(iOS 17.0, *) {
            Group {
                if context.state.isPaused {
                    Button(intent: ResumeTimerIntent(activityId: context.activityID)) {
                        buttonContent(isPaused: true)
                    }
                    .buttonStyle(.plain)
                } else {
                    Button(intent: PauseTimerIntent(activityId: context.activityID)) {
                        buttonContent(isPaused: false)
                    }
                    .buttonStyle(.plain)
                }
            }
        } else {
            // iOS 16: Elegant indicator
            ZStack {
                Circle()
                    .fill(context.state.isPaused ? Color.orange.opacity(0.15) : Color.green.opacity(0.15))
                    .frame(width: size, height: size)
                
                Circle()
                    .fill(context.state.isPaused ? Color.orange : Color.green)
                    .frame(width: size * 0.4, height: size * 0.4)
            }
        }
    }
    
    @ViewBuilder
    func buttonContent(isPaused: Bool) -> some View {
        ZStack {
            // Outer glow
            Circle()
                .fill(isPaused ? Color.green.opacity(0.3) : Color.orange.opacity(0.3))
                .frame(width: size * 1.15, height: size * 1.15)
                .blur(radius: 4)
            
            // Main button with gradient
            Circle()
                .fill(
                    LinearGradient(
                        colors: isPaused 
                            ? [Color(red: 0.2, green: 0.85, blue: 0.4), Color(red: 0.15, green: 0.7, blue: 0.35)]
                            : [Color(red: 1.0, green: 0.6, blue: 0.2), Color(red: 0.95, green: 0.45, blue: 0.15)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: isPaused ? Color.green.opacity(0.4) : Color.orange.opacity(0.4), radius: 6, y: 2)
            
            // Icon
            Image(systemName: isPaused ? "play.fill" : "pause.fill")
                .font(.system(size: size * 0.38, weight: .bold))
                .foregroundColor(.white)
                .offset(x: isPaused ? size * 0.03 : 0) // Optical centering for play icon
        }
    }
}

// MARK: - Premium Save Button
@available(iOS 16.1, *)
struct PremiumSaveButton: View {
    let context: ActivityViewContext<CalmParentLiveActivityAttributes>
    let size: CGFloat
    
    var body: some View {
        if #available(iOS 17.0, *) {
            Button(intent: SaveTimerIntent(activityId: context.activityID)) {
                buttonContent()
            }
            .buttonStyle(.plain)
        } else {
            // iOS 16: Elegant indicator
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.15))
                    .frame(width: size, height: size)
                
                Circle()
                    .fill(Color.blue)
                    .frame(width: size * 0.4, height: size * 0.4)
            }
        }
    }
    
    @ViewBuilder
    func buttonContent() -> some View {
        ZStack {
            // Outer glow
            Circle()
                .fill(Color.blue.opacity(0.3))
                .frame(width: size * 1.15, height: size * 1.15)
                .blur(radius: 4)
            
            // Main button with gradient
            Circle()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.2, green: 0.5, blue: 0.95),
                            Color(red: 0.15, green: 0.4, blue: 0.85)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: Color.blue.opacity(0.4), radius: 6, y: 2)
            
            // Icon
            Image(systemName: "checkmark")
                .font(.system(size: size * 0.38, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Main Widget
@available(iOS 16.1, *)
@main
struct CalmParentLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CalmParentLiveActivityAttributes.self) { context in
            LockScreenView(context: context)
        } dynamicIsland: { context in
            let iconType = ActivityIconType.from(context.state.type)
            
          return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    PremiumIconView(type: context.state.type, size: 48, showGlow: true)
                        .padding(.leading, 4)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 4) {
                        Text(context.attributes.childName)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                        
                        Text(iconType.displayName)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(spacing: 8) {
                        PremiumPlayPauseButton(context: context, size: 40)
                        PremiumSaveButton(context: context, size: 32)
                    }
                    .padding(.trailing, 4)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Spacer()
                        LiveTimerText(state: context.state, fontSize: 34, color: .white, showRunningIndicator: true)
                        Spacer()
                    }
                    .padding(.top, 8)
                }
            } compactLeading: {
                PremiumIconView(type: context.state.type, size: 26)
            } compactTrailing: {
                CompactTimerText(state: context.state)
            } minimal: {
                Image(systemName: iconType.systemImage)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(iconType.color)
            }
            .keylineTint(iconType.color)
        }
    }
}

// MARK: - Premium Lock Screen View
@available(iOS 16.1, *)
struct LockScreenView: View {
    let context: ActivityViewContext<CalmParentLiveActivityAttributes>
    
    var body: some View {
        let iconType = ActivityIconType.from(context.state.type)
        
        HStack(spacing: 16) {
            // Leading: Premium Icon with glow
            PremiumIconView(type: context.state.type, size: 56, showGlow: true)
            
            // Center: Info
            VStack(alignment: .leading, spacing: 3) {
                Text(context.attributes.childName)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                
                HStack(spacing: 6) {
                    Image(systemName: iconType.systemImage)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(iconType.color)
                    
                    Text(iconType.displayName)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                    
                    // Side indicator for breastfeeding
                    if iconType == .breast {
                        SideIndicator(side: context.state.side, compact: false)
                    }
                }
            }
            
            Spacer()
            
            // Timer: Large and prominent
            LiveTimerText(state: context.state, fontSize: 34, color: .white, showRunningIndicator: true)
            
            // Trailing: Play/Pause and Save
            VStack(spacing: 8) {
                PremiumPlayPauseButton(context: context, size: 48)
                PremiumSaveButton(context: context, size: 40)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(
            // Premium dark gradient background
            ZStack {
                // Base dark color
                Color.black.opacity(0.85)
                
                // Subtle gradient with activity color
                LinearGradient(
                    colors: [
                        iconType.color.opacity(0.25),
                        iconType.color.opacity(0.05),
                        Color.clear
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                
                // Glass-like shine
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.08),
                        Color.clear
                    ],
                    startPoint: .top,
                    endPoint: .center
                )
            }
        )
    }
}

// MARK: - Preview
#if DEBUG
@available(iOS 16.1, *)
struct CalmParentLiveActivity_Previews: PreviewProvider {
    static var previews: some View {
        if #available(iOS 16.2, *) {
            let attributes = CalmParentLiveActivityAttributes(
                parentName: "הורה",
                childName: "תינוק",
                activityType: "הנקה"
            )
            let contentState = CalmParentLiveActivityAttributes.ContentState(
                type: "הנקה",
                startDate: Date().addingTimeInterval(-125),
                isPaused: false,
                pauseDate: nil,
                accumulatedPausedSeconds: 0,
                side: "left"
            )
            return attributes
                .previewContext(contentState, viewKind: .content)
        } else {
            return Text("Live Activity preview requires iOS 16.2+")
        }
    }
}
#endif
