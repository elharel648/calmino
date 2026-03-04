import WidgetKit
import SwiftUI

@main
struct CalmParentLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        BabyDashboardWidget()
        if #available(iOS 16.2, *) {
            BabysitterShiftLiveActivity()
            SleepLiveActivity()
            FeedingLiveActivity()
            BreastfeedingLiveActivity()
        }
    }
}
