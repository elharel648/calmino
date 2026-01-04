import WidgetKit
import SwiftUI

/// Widget Bundle Entry Point
@main
struct CalmParentLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.1, *) {
            CalmParentLiveActivity()
        }
    }
}

