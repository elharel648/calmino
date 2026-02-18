//
//  CalmParentWidgetBundle.swift
//  CalmParentWidget
//
//  Created by הראל אליהו on 28 Shevat 5786 AM.
//

import WidgetKit
import SwiftUI

@main
struct CalmParentWidgetBundle: WidgetBundle {
    var body: some Widget {
        CalmParentWidget()
        CalmParentWidgetControl()
        CalmParentWidgetLiveActivity()
    }
}
