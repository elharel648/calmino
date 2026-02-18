//
//  CalmParentWidgetsBundle.swift
//  CalmParentApp
//
//  Widget Bundle for all Widgets and Live Activities
//  This is the MAIN entry point (@main) for the Widget Extension
//

import SwiftUI
import WidgetKit

@main
struct CalmParentWidgetsBundle: WidgetBundle {
    var body: some Widget {
        // Widget רגיל
        CalmParentWidget()
        
        // Live Activities - Only the ones that exist
        BabysitterShiftLiveActivity()  // 1. בייביסיטר
        // MealLiveActivity()              // 2. ארוחה - REMOVED: Not implemented yet
        // SleepLiveActivity()             // 3. שינה - REMOVED: Not implemented yet
    }
}
