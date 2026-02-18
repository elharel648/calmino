//
//  CalmParentWidgets.swift
//  CalmParentApp
//
//  Widget Bundle for all widgets including Live Activities
//  NOTE: This file is NOT active - @main is in CalmParentWidgetsBundle.swift
//

import SwiftUI
import WidgetKit

// @main - REMOVED: Using CalmParentWidgetsBundle.swift as the main entry point
struct CalmParentWidgets: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            BabysitterShiftLiveActivity()
        }
    }
}
