import WidgetKit
import SwiftUI

@main
struct CalmParentLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        LastEventWidget() // Home-screen tracker: interactive quick-log + last-event times
        if #available(iOS 16.2, *) {
            SleepLiveActivity()
            FeedingLiveActivity()
            BreastfeedingLiveActivity()
            WhiteNoiseLiveActivity()
        }
    }
}
