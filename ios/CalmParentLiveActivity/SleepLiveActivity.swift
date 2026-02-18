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
        HStack {
            VStack(alignment: .leading) {
                Text("\(context.attributes.babyName) ב\(context.state.sleepType)")
                    .font(.headline)
                Text(context.state.startTime, style: .timer)
                    .font(.title)
                    .monospacedDigit()
            }
            Spacer()
            Text(context.attributes.babyEmoji)
                .font(.largeTitle)
        }
        .padding()
    }
}
