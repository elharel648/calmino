//
//  CalmParentWidgetLiveActivity.swift
//  CalmParentWidget
//
//  Created by הראל אליהו on 28 Shevat 5786 AM.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct CalmParentWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct CalmParentWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CalmParentWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension CalmParentWidgetAttributes {
    fileprivate static var preview: CalmParentWidgetAttributes {
        CalmParentWidgetAttributes(name: "World")
    }
}

extension CalmParentWidgetAttributes.ContentState {
    fileprivate static var smiley: CalmParentWidgetAttributes.ContentState {
        CalmParentWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: CalmParentWidgetAttributes.ContentState {
         CalmParentWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: CalmParentWidgetAttributes.preview) {
   CalmParentWidgetLiveActivity()
} contentStates: {
    CalmParentWidgetAttributes.ContentState.smiley
    CalmParentWidgetAttributes.ContentState.starEyes
}
