import WidgetKit
import SwiftUI

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
