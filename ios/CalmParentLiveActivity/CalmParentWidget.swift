//
//  CalmParentWidget.swift
//  CalmParentLiveActivity
//
//  Home Screen Widget — Small & Medium
//  Reads data written by updateWidgetData() via shared App Group.
//

import WidgetKit
import SwiftUI

// MARK: - Data Entry

struct BabyWidgetEntry: TimelineEntry {
    let date: Date
    let babyName: String
    let lastFeedAgo: String
    let lastSleepAgo: String
    let babyStatus: String
}

// MARK: - Timeline Provider

struct BabyWidgetProvider: TimelineProvider {

    func placeholder(in context: Context) -> BabyWidgetEntry {
        BabyWidgetEntry(date: Date(), babyName: "תינוק", lastFeedAgo: "לפני שעה", lastSleepAgo: "לפני שעתיים", babyStatus: "ער")
    }

    func getSnapshot(in context: Context, completion: @escaping (BabyWidgetEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BabyWidgetEntry>) -> Void) {
        let entry = readEntry()
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func readEntry() -> BabyWidgetEntry {
        let d = UserDefaults(suiteName: "group.com.harel.calmparentapp")
        return BabyWidgetEntry(
            date: Date(),
            babyName:    d?.string(forKey: "widget_babyName")    ?? "תינוק",
            lastFeedAgo: d?.string(forKey: "widget_lastFeedAgo") ?? "—",
            lastSleepAgo:d?.string(forKey: "widget_lastSleepAgo") ?? "—",
            babyStatus:  d?.string(forKey: "widget_babyStatus")  ?? "ער"
        )
    }
}

// MARK: - Design Tokens

private let feedColor  = Color(red: 0.96, green: 0.62, blue: 0.04) // amber
private let sleepColor = Color(red: 0.58, green: 0.52, blue: 1.0)  // purple
private let bgTop      = Color(red: 0.10, green: 0.08, blue: 0.20)
private let bgBottom   = Color(red: 0.06, green: 0.05, blue: 0.13)

// MARK: - Small Widget View

struct BabyWidgetSmallView: View {
    let entry: BabyWidgetEntry

    var statusIcon: String {
        entry.babyStatus.contains("ישן") || entry.babyStatus.lowercased().contains("sleep") ? "moon.zzz.fill" : "sun.max.fill"
    }
    var statusColor: Color {
        entry.babyStatus.contains("ישן") || entry.babyStatus.lowercased().contains("sleep") ? sleepColor : Color(red: 1.0, green: 0.82, blue: 0.2)
    }

    var body: some View {
        ZStack {
            LinearGradient(colors: [bgTop, bgBottom], startPoint: .topLeading, endPoint: .bottomTrailing)

            VStack(alignment: .trailing, spacing: 0) {
                // Header
                HStack(alignment: .center, spacing: 6) {
                    Image(systemName: statusIcon)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(statusColor)
                    Text(entry.babyName)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }

                Spacer()

                // Feed row
                HStack(spacing: 6) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("האכלה")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundStyle(.white.opacity(0.45))
                        Text(entry.lastFeedAgo)
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    ZStack {
                        Circle().fill(feedColor.opacity(0.18)).frame(width: 28, height: 28)
                        Image(systemName: "drop.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(feedColor)
                    }
                }

                Spacer().frame(height: 8)

                // Sleep row
                HStack(spacing: 6) {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("שינה")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundStyle(.white.opacity(0.45))
                        Text(entry.lastSleepAgo)
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    ZStack {
                        Circle().fill(sleepColor.opacity(0.18)).frame(width: 28, height: 28)
                        Image(systemName: "moon.zzz.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(sleepColor)
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
            .environment(\.layoutDirection, .rightToLeft)
        }
    }
}

// MARK: - Medium Widget View

struct BabyWidgetMediumView: View {
    let entry: BabyWidgetEntry

    var statusIcon: String {
        entry.babyStatus.contains("ישן") || entry.babyStatus.lowercased().contains("sleep") ? "moon.zzz.fill" : "sun.max.fill"
    }
    var statusColor: Color {
        entry.babyStatus.contains("ישן") || entry.babyStatus.lowercased().contains("sleep") ? sleepColor : Color(red: 1.0, green: 0.82, blue: 0.2)
    }

    var body: some View {
        ZStack {
            LinearGradient(colors: [bgTop, bgBottom], startPoint: .topLeading, endPoint: .bottomTrailing)

            HStack(spacing: 0) {
                Spacer()

                // Right side — baby name & status
                VStack(alignment: .trailing, spacing: 4) {
                    Text(entry.babyName)
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)

                    HStack(spacing: 5) {
                        Text(entry.babyStatus)
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(.white.opacity(0.6))
                        Image(systemName: statusIcon)
                            .font(.system(size: 13))
                            .foregroundStyle(statusColor)
                    }
                }
                .padding(.trailing, 16)

                // Divider
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 1, height: 52)

                Spacer()

                // Left side — feed + sleep stats
                VStack(alignment: .leading, spacing: 12) {
                    // Feed
                    HStack(spacing: 8) {
                        ZStack {
                            Circle().fill(feedColor.opacity(0.18)).frame(width: 32, height: 32)
                            Image(systemName: "drop.fill")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(feedColor)
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text("האכלה אחרונה")
                                .font(.system(size: 10, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.45))
                            Text(entry.lastFeedAgo)
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white)
                        }
                    }

                    // Sleep
                    HStack(spacing: 8) {
                        ZStack {
                            Circle().fill(sleepColor.opacity(0.18)).frame(width: 32, height: 32)
                            Image(systemName: "moon.zzz.fill")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(sleepColor)
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text("שינה אחרונה")
                                .font(.system(size: 10, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.45))
                            Text(entry.lastSleepAgo)
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                                .foregroundStyle(.white)
                        }
                    }
                }
                .padding(.leading, 16)

                Spacer()
            }
            .padding(.vertical, 16)
            .environment(\.layoutDirection, .rightToLeft)
        }
    }
}

// MARK: - Widget Entry View (routes to correct layout)

struct BabyWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: BabyWidgetEntry

    var body: some View {
        switch family {
        case .systemMedium:
            BabyWidgetMediumView(entry: entry)
        default:
            BabyWidgetSmallView(entry: entry)
        }
    }
}

// MARK: - Widget Definition

@available(iOS 16.0, *)
struct CalmParentWidget: Widget {
    let kind: String = "CalmParentWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BabyWidgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                BabyWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                BabyWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Calmino")
        .description("מעקב אחר האכלות ושינה של התינוק")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
