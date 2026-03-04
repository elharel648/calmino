//
//  HomeWidget.swift
//  Baby Dashboard Home Screen Widget
//
//  Premium dark design showing baby status at a glance
//

import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct BabyDashboardProvider: TimelineProvider {
    func placeholder(in context: Context) -> BabyDashboardEntry {
        BabyDashboardEntry(
            date: Date(),
            babyName: "תינוק",
            lastFeedTime: "10:30",
            lastFeedAgo: "לפני שעה",
            lastSleepTime: "08:00",
            lastSleepAgo: "לפני 3 שעות",
            babyStatus: "ער"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (BabyDashboardEntry) -> Void) {
        let entry = loadEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BabyDashboardEntry>) -> Void) {
        let entry = loadEntry()
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadEntry() -> BabyDashboardEntry {
        let defaults = UserDefaults(suiteName: "group.com.harel.calmparentapp")
        return BabyDashboardEntry(
            date: Date(),
            babyName: defaults?.string(forKey: "widget_babyName") ?? "תינוק",
            lastFeedTime: defaults?.string(forKey: "widget_lastFeedTime") ?? "--:--",
            lastFeedAgo: defaults?.string(forKey: "widget_lastFeedAgo") ?? "",
            lastSleepTime: defaults?.string(forKey: "widget_lastSleepTime") ?? "--:--",
            lastSleepAgo: defaults?.string(forKey: "widget_lastSleepAgo") ?? "",
            babyStatus: defaults?.string(forKey: "widget_babyStatus") ?? ""
        )
    }
}

// MARK: - Timeline Entry

struct BabyDashboardEntry: TimelineEntry {
    let date: Date
    let babyName: String
    let lastFeedTime: String
    let lastFeedAgo: String
    let lastSleepTime: String
    let lastSleepAgo: String
    let babyStatus: String

    var hebrewStatus: String {
        switch babyStatus.lowercased() {
        case "sleeping": return "ישן 😴"
        case "awake": return "ער 👶"
        default: return babyStatus.isEmpty ? "" : babyStatus
        }
    }

    var isSleeping: Bool {
        babyStatus.lowercased() == "sleeping" || babyStatus.contains("ישן")
    }
}

// MARK: - Design Tokens

private let accentBlue = Color(red: 0.35, green: 0.55, blue: 1.0)
private let accentPurple = Color(red: 0.55, green: 0.35, blue: 0.85)
private let bgDark = Color(red: 0.08, green: 0.08, blue: 0.12)
private let cardBg = Color(white: 0.13)

// MARK: - Widget Entry View (auto-adapts to size)

struct BabyDashboardWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: BabyDashboardEntry

    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Small Widget View

struct SmallWidgetView: View {
    let entry: BabyDashboardEntry

    var body: some View {
        ZStack {
            bgDark
            RadialGradient(
                colors: [accentBlue.opacity(0.12), .clear],
                center: .topTrailing,
                startRadius: 10,
                endRadius: 120
            )

            VStack(alignment: .leading, spacing: 10) {
                // Baby name
                HStack(spacing: 6) {
                    Text("👶")
                        .font(.system(size: 16))
                    Text(entry.babyName)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Spacer()
                    if !entry.hebrewStatus.isEmpty {
                        Text(entry.hebrewStatus)
                            .font(.system(size: 9, weight: .semibold, design: .rounded))
                            .foregroundStyle(entry.isSleeping ? accentPurple : accentBlue)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(
                                (entry.isSleeping ? accentPurple : accentBlue).opacity(0.15),
                                in: Capsule()
                            )
                    }
                }

                Spacer()

                // Last feed
                HStack(spacing: 6) {
                    Image(systemName: "fork.knife")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(accentBlue)
                        .frame(width: 18)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(entry.lastFeedTime)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        if !entry.lastFeedAgo.isEmpty {
                            Text(entry.lastFeedAgo)
                                .font(.system(size: 9, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.4))
                        }
                    }
                }

                // Last sleep
                HStack(spacing: 6) {
                    Image(systemName: "moon.zzz.fill")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(accentPurple)
                        .frame(width: 18)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(entry.lastSleepTime)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                        if !entry.lastSleepAgo.isEmpty {
                            Text(entry.lastSleepAgo)
                                .font(.system(size: 9, weight: .medium, design: .rounded))
                                .foregroundStyle(.white.opacity(0.4))
                        }
                    }
                }
            }
            .padding(14)
        }
    }
}

// MARK: - Medium Widget View

struct MediumWidgetView: View {
    let entry: BabyDashboardEntry

    var body: some View {
        ZStack {
            bgDark
            RadialGradient(
                colors: [accentBlue.opacity(0.1), .clear],
                center: .topTrailing,
                startRadius: 20,
                endRadius: 200
            )

            HStack(spacing: 16) {
                // Left — Baby info
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Text("👶")
                            .font(.system(size: 22))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.babyName)
                                .font(.system(size: 18, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            if !entry.hebrewStatus.isEmpty {
                                Text(entry.hebrewStatus)
                                    .font(.system(size: 11, weight: .medium, design: .rounded))
                                    .foregroundStyle(entry.isSleeping ? accentPurple : accentBlue)
                            }
                        }
                    }

                    Spacer()

                    // Calmino branding
                    Text("Calmino")
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.2))
                }

                Spacer()

                // Right — Stats cards
                VStack(spacing: 8) {
                    // Feed card
                    HStack(spacing: 8) {
                        Image(systemName: "fork.knife")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(accentBlue)
                            .frame(width: 20)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(entry.lastFeedTime)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            if !entry.lastFeedAgo.isEmpty {
                                Text(entry.lastFeedAgo)
                                    .font(.system(size: 10, weight: .medium, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.4))
                            }
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(cardBg, in: RoundedRectangle(cornerRadius: 10))

                    // Sleep card
                    HStack(spacing: 8) {
                        Image(systemName: "moon.zzz.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(accentPurple)
                            .frame(width: 20)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(entry.lastSleepTime)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            if !entry.lastSleepAgo.isEmpty {
                                Text(entry.lastSleepAgo)
                                    .font(.system(size: 10, weight: .medium, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.4))
                            }
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(cardBg, in: RoundedRectangle(cornerRadius: 10))
                }
                .frame(width: 150)
            }
            .padding(16)
        }
    }
}

// MARK: - Widget Definition

struct BabyDashboardWidget: Widget {
    let kind: String = "BabyDashboardWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BabyDashboardProvider()) { entry in
            if #available(iOS 17.0, *) {
                BabyDashboardWidgetView(entry: entry)
                    .containerBackground(bgDark, for: .widget)
            } else {
                BabyDashboardWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Calmino")
        .description("מעקב תינוק במבט אחד")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
