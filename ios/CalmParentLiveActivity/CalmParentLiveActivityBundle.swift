import WidgetKit
import SwiftUI

@main
struct CalmParentLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        // LastEventWidget() — home-screen widget hidden from this release (not ready yet).
        // Re-add this line while developing it; keep hidden for store builds.
        if #available(iOS 16.2, *) {
            SleepLiveActivity()
            FeedingLiveActivity()
            BreastfeedingLiveActivity()
            WhiteNoiseLiveActivity()
        }
    }
}
