import AppIntents
import SwiftUI
import WidgetKit

// Control Center / Lock Screen / Action button controls (iOS 18+).
// Each button runs a start intent from StartTimerIntents.swift; the app target
// has same-named copies, so iOS performs them in the app process where the
// Live Activity can actually be requested.

@available(iOS 18.0, *)
struct StartSleepControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.calmparent.control.sleep") {
            ControlWidgetButton(action: StartSleepIntent()) {
                Label("שינה", systemImage: "moon.fill")
            }
        }
        .displayName("התחל שינה")
        .description("מתחיל טיימר שינה שמופיע במסך הנעילה")
    }
}

@available(iOS 18.0, *)
struct StartBreastfeedingLeftControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.calmparent.control.breastfeeding-left") {
            ControlWidgetButton(action: StartBreastfeedingLeftIntent()) {
                Label("הנקה שמאל", systemImage: "heart.fill")
            }
        }
        .displayName("הנקה — צד שמאל")
        .description("מתחיל טיימר הנקה מצד שמאל")
    }
}

@available(iOS 18.0, *)
struct StartBreastfeedingRightControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.calmparent.control.breastfeeding-right") {
            ControlWidgetButton(action: StartBreastfeedingRightIntent()) {
                Label("הנקה ימין", systemImage: "heart.fill")
            }
        }
        .displayName("הנקה — צד ימין")
        .description("מתחיל טיימר הנקה מצד ימין")
    }
}

@available(iOS 18.0, *)
struct StartBottleControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.calmparent.control.bottle") {
            ControlWidgetButton(action: StartBottleIntent()) {
                Label("בקבוק", systemImage: "waterbottle.fill")
            }
        }
        .displayName("התחל בקבוק")
        .description("מתחיל טיימר בקבוק")
    }
}
