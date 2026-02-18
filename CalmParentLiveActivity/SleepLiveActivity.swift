import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Sleep Live Activity Widget
@available(iOS 16.2, *)
struct SleepLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SleepActivityAttributes.self) { context in
            // Lock Screen UI
            SleepLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack {
                        Text(context.attributes.babyEmoji)
                        Text(context.attributes.babyName)
                            .font(.headline)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.startTime, style: .timer)
                        .font(.title2)
                        .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.sleepType)
                        .font(.caption)
                }
            } compactLeading: {
                Text(context.attributes.babyEmoji)
            } compactTrailing: {
                Text(context.state.startTime, style: .timer)
                    .monospacedDigit()
                    .font(.caption2)
            } minimal: {
                Text(context.attributes.babyEmoji)
            }
        }
    }
}

@available(iOS 16.2, *)
struct SleepLockScreenView: View {
    let context: ActivityViewContext<SleepActivityAttributes>

    var body: some View {
        VStack(spacing: 10) {
            // Header with moon icon
            HStack(spacing: 8) {
                Image(systemName: "moon.fill")
                    .font(.system(size: 20))
                    .foregroundColor(.indigo)

                Text(context.attributes.babyName)
                    .font(.system(size: 18, weight: .bold))

                Spacer()
            }

            Text(context.state.sleepType)
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Divider()
                .padding(.vertical, 2)

            // Timer - Large and prominent
            VStack(spacing: 4) {
                Text("זמן שינה")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(context.state.startTime, style: .timer)
                    .font(.system(size: 42, weight: .heavy, design: .rounded))
                    .monospacedDigit()
            }
        }
        .padding()
    }
}
