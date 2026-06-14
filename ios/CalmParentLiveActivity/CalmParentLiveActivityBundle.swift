import WidgetKit
import SwiftUI

@main
struct CalmParentLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        // Home-screen tracker: interactive quick-log + last-event times.
        // Editable + interactive → iOS 17+ (Button(intent:) / AppIntentConfiguration).
        if #available(iOS 17.0, *) {
            LastEventWidget()
        }
        if #available(iOS 16.2, *) {
            SleepLiveActivity()
            FeedingLiveActivity()
            BreastfeedingLiveActivity()
            WhiteNoiseLiveActivity()
        }
    }
}
