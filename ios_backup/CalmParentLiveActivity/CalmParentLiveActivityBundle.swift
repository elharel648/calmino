import WidgetKit
import SwiftUI
import ActivityKit

@main
struct CalmParentLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            SleepLiveActivity()
            FeedingLiveActivity()
            BreastfeedingLiveActivity()
            WhiteNoiseLiveActivity()
        }
    }
}
