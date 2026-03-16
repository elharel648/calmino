//
//  CalmParentWidget.swift
//  CalmParentLiveActivity
//
//  Premium Home Screen Widget — Small, Medium & Large
//  Reads data written by updateWidgetData() via shared App Group.
//

import WidgetKit
import SwiftUI

// MARK: - Data Entry

struct BabyWidgetEntry: TimelineEntry {
    let date: Date
    let babyName: String
    let babyStatus: String
    // Feed
    let lastFeedTimestamp: Date?
    let lastFeedType: String
    let feedCount: Int
    // Sleep
    let lastSleepTimestamp: Date?
    let sleepMinutes: Int
    // Diaper
    let lastDiaperTimestamp: Date?
    let lastDiaperType: String
    let diaperCount: Int
    // Health
    let lastHealthTimestamp: Date?
    let healthCount: Int
    // Medication
    let lastMedicationTimestamp: Date?
    let medicationCount: Int
}

// MARK: - Timeline Provider

struct BabyWidgetProvider: TimelineProvider {

    func placeholder(in context: Context) -> BabyWidgetEntry {
        BabyWidgetEntry(
            date: Date(), babyName: "תינוק", babyStatus: "awake",
            lastFeedTimestamp: Date().addingTimeInterval(-3600), lastFeedType: "bottle", feedCount: 3,
            lastSleepTimestamp: Date().addingTimeInterval(-7200), sleepMinutes: 120,
            lastDiaperTimestamp: Date().addingTimeInterval(-5400), lastDiaperType: "wet", diaperCount: 4,
            lastHealthTimestamp: nil, healthCount: 0,
            lastMedicationTimestamp: nil, medicationCount: 0
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (BabyWidgetEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BabyWidgetEntry>) -> Void) {
        let entry = readEntry()
        let next = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func readEntry() -> BabyWidgetEntry {
        let d = UserDefaults(suiteName: "group.com.harel.calmparentapp")

        let feedTS = d?.double(forKey: "widget_lastFeedTimestamp") ?? 0
        let sleepTS = d?.double(forKey: "widget_lastSleepTimestamp") ?? 0
        let diaperTS = d?.double(forKey: "widget_lastDiaperTimestamp") ?? 0
        let healthTS = d?.double(forKey: "widget_lastHealthTimestamp") ?? 0
        let medTS = d?.double(forKey: "widget_lastMedicationTimestamp") ?? 0

        return BabyWidgetEntry(
            date: Date(),
            babyName:    d?.string(forKey: "widget_babyName") ?? "תינוק",
            babyStatus:  d?.string(forKey: "widget_babyStatus") ?? "awake",
            lastFeedTimestamp: feedTS > 0 ? Date(timeIntervalSince1970: feedTS) : nil,
            lastFeedType: d?.string(forKey: "widget_lastFeedType") ?? "",
            feedCount: d?.integer(forKey: "widget_feedCount") ?? 0,
            lastSleepTimestamp: sleepTS > 0 ? Date(timeIntervalSince1970: sleepTS) : nil,
            sleepMinutes: d?.integer(forKey: "widget_sleepMinutes") ?? 0,
            lastDiaperTimestamp: diaperTS > 0 ? Date(timeIntervalSince1970: diaperTS) : nil,
            lastDiaperType: d?.string(forKey: "widget_lastDiaperType") ?? "",
            diaperCount: d?.integer(forKey: "widget_diaperCount") ?? 0,
            lastHealthTimestamp: healthTS > 0 ? Date(timeIntervalSince1970: healthTS) : nil,
            healthCount: d?.integer(forKey: "widget_healthCount") ?? 0,
            lastMedicationTimestamp: medTS > 0 ? Date(timeIntervalSince1970: medTS) : nil,
            medicationCount: d?.integer(forKey: "widget_medicationCount") ?? 0
        )
    }
}

// MARK: - Design Tokens

private let feedColor   = Color(red: 0.96, green: 0.65, blue: 0.14) // warm amber
private let sleepColor  = Color(red: 0.55, green: 0.48, blue: 0.95) // rich purple
private let diaperColor = Color(red: 0.20, green: 0.78, blue: 0.72) // teal
private let healthColor = Color(red: 0.94, green: 0.35, blue: 0.45) // rose
private let medColor    = Color(red: 0.30, green: 0.68, blue: 0.95) // sky blue
private let awakeColor  = Color(red: 1.00, green: 0.82, blue: 0.20) // sunny yellow
private let sleepingColor = Color(red: 0.55, green: 0.48, blue: 0.95)

private let bgTop    = Color(red: 0.08, green: 0.06, blue: 0.14)
private let bgBottom = Color(red: 0.04, green: 0.03, blue: 0.09)

// MARK: - Helpers

private func timeAgo(from date: Date?) -> String {
    guard let date = date else { return "—" }
    let seconds = Int(Date().timeIntervalSince(date))
    if seconds < 60 { return "עכשיו" }
    let minutes = seconds / 60
    if minutes < 60 { return "\(minutes) דק'" }
    let hours = minutes / 60
    let remainMins = minutes % 60
    if hours < 24 {
        if remainMins > 0 { return "\(hours) שע' \(remainMins) דק'" }
        return "\(hours) שע'"
    }
    let days = hours / 24
    let remainHours = hours % 24
    if remainHours > 0 { return "\(days) יום \(remainHours) שע'" }
    return "\(days) ימים"
}

private func shortTimeAgo(from date: Date?) -> String {
    guard let date = date else { return "—" }
    let seconds = Int(Date().timeIntervalSince(date))
    if seconds < 60 { return "עכשיו" }
    let minutes = seconds / 60
    if minutes < 60 { return "\(minutes)ד'" }
    let hours = minutes / 60
    if hours < 24 { return "\(hours)ש'" }
    let days = hours / 24
    return "\(days)י'"
}

/// Progress 0→1 representing how "overdue" a category is (0 = just now, 1 = very overdue)
private func urgencyProgress(from date: Date?, intervalMinutes: Int = 180) -> Double {
    guard let date = date else { return 1.0 }
    let minutesPassed = Date().timeIntervalSince(date) / 60.0
    return min(1.0, minutesPassed / Double(intervalMinutes))
}

private func urgencyColor(_ progress: Double) -> Color {
    if progress < 0.4 { return Color(red: 0.30, green: 0.85, blue: 0.55) } // green
    if progress < 0.7 { return Color(red: 1.0, green: 0.78, blue: 0.20) }  // yellow
    return Color(red: 0.95, green: 0.35, blue: 0.35) // red
}

private func feedEmoji(type: String) -> String {
    let t = type.lowercased()
    if t.contains("breast") || t.contains("הנקה") { return "🤱" }
    if t.contains("pump") || t.contains("שאיבה") { return "🍼" }
    if t.contains("solid") || t.contains("מוצקים") { return "🥣" }
    return "🍼"
}

private func diaperEmoji(type: String) -> String {
    let t = type.lowercased()
    if t.contains("dirty") || t.contains("מלוכלך") { return "💩" }
    if t.contains("both") || t.contains("שניהם") { return "💩💧" }
    return "💧"
}

private var isSleeping: (BabyWidgetEntry) -> Bool = { entry in
    entry.babyStatus.lowercased().contains("sleep") || entry.babyStatus.contains("ישן")
}

// MARK: - Reusable Components

private struct CategoryIcon: View {
    let emoji: String
    let color: Color
    let size: CGFloat

    init(_ emoji: String, _ color: Color, size: CGFloat = 32) {
        self.emoji = emoji
        self.color = color
        self.size = size
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.3)
                .fill(color.opacity(0.18))
                .frame(width: size, height: size)
            Text(emoji)
                .font(.system(size: size * 0.5))
        }
    }
}

private struct ProgressRing: View {
    let progress: Double
    let color: Color
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.15), lineWidth: 2.5)
            Circle()
                .trim(from: 0, to: CGFloat(min(progress, 1.0)))
                .stroke(urgencyColor(progress), style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

private struct StatusBadge: View {
    let isSleeping: Bool

    var body: some View {
        HStack(spacing: 4) {
            Text(isSleeping ? "😴" : "👶")
                .font(.system(size: 10))
            Text(isSleeping ? "ישנ/ה" : "ער/ה")
                .font(.system(size: 10, weight: .semibold, design: .rounded))
        }
        .foregroundStyle(isSleeping ? sleepingColor : awakeColor)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background((isSleeping ? sleepingColor : awakeColor).opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Small Widget View

struct BabyWidgetSmallView: View {
    let entry: BabyWidgetEntry

    var body: some View {
        ZStack {
            LinearGradient(colors: [bgTop, bgBottom], startPoint: .topLeading, endPoint: .bottomTrailing)

            // Subtle accent glow
            RadialGradient(
                colors: [feedColor.opacity(0.08), .clear],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 100
            )

            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack(spacing: 6) {
                    Text("👶")
                        .font(.system(size: 14))
                    Text(entry.babyName)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Spacer()
                    StatusBadge(isSleeping: isSleeping(entry))
                }

                Spacer(minLength: 8)

                // Feed row
                SmallActivityRow(
                    emoji: feedEmoji(type: entry.lastFeedType),
                    color: feedColor,
                    timeAgo: shortTimeAgo(from: entry.lastFeedTimestamp),
                    count: entry.feedCount,
                    progress: urgencyProgress(from: entry.lastFeedTimestamp, intervalMinutes: 180)
                )

                Spacer(minLength: 5)

                // Sleep row
                SmallActivityRow(
                    emoji: "🌙",
                    color: sleepColor,
                    timeAgo: shortTimeAgo(from: entry.lastSleepTimestamp),
                    count: nil,
                    progress: urgencyProgress(from: entry.lastSleepTimestamp, intervalMinutes: 240)
                )

                Spacer(minLength: 5)

                // Diaper row
                SmallActivityRow(
                    emoji: diaperEmoji(type: entry.lastDiaperType),
                    color: diaperColor,
                    timeAgo: shortTimeAgo(from: entry.lastDiaperTimestamp),
                    count: entry.diaperCount,
                    progress: urgencyProgress(from: entry.lastDiaperTimestamp, intervalMinutes: 180)
                )
            }
            .padding(12)
            .environment(\.layoutDirection, .rightToLeft)
        }
        .widgetURL(URL(string: "calmino://home"))
    }
}

private struct SmallActivityRow: View {
    let emoji: String
    let color: Color
    let timeAgo: String
    let count: Int?
    let progress: Double

    var body: some View {
        HStack(spacing: 6) {
            ZStack {
                CategoryIcon(emoji, color, size: 26)
                ProgressRing(progress: progress, color: color, size: 30)
            }
            Text(timeAgo)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Spacer()
            if let count = count, count > 0 {
                Text("×\(count)")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(color.opacity(0.8))
            }
        }
    }
}

// MARK: - Medium Widget View

struct BabyWidgetMediumView: View {
    let entry: BabyWidgetEntry

    var body: some View {
        ZStack {
            LinearGradient(colors: [bgTop, bgBottom], startPoint: .topLeading, endPoint: .bottomTrailing)

            // Accent glows
            RadialGradient(colors: [sleepColor.opacity(0.08), .clear], center: .topLeading, startRadius: 0, endRadius: 140)
            RadialGradient(colors: [feedColor.opacity(0.06), .clear], center: .bottomTrailing, startRadius: 0, endRadius: 120)

            HStack(spacing: 0) {
                // Left — Baby avatar section
                VStack(spacing: 8) {
                    // Avatar circle
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [
                                        (isSleeping(entry) ? sleepingColor : awakeColor).opacity(0.3),
                                        (isSleeping(entry) ? sleepingColor : awakeColor).opacity(0.08)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 50, height: 50)
                        Circle()
                            .stroke((isSleeping(entry) ? sleepingColor : awakeColor).opacity(0.3), lineWidth: 1.5)
                            .frame(width: 50, height: 50)
                        Text(isSleeping(entry) ? "😴" : "👶")
                            .font(.system(size: 24))
                    }

                    Text(entry.babyName)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)

                    StatusBadge(isSleeping: isSleeping(entry))

                    Spacer()

                    // Branding
                    Text("Calmino")
                        .font(.system(size: 9, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.15))

                    // iOS 17+ quick action buttons
                    if #available(iOS 17.0, *) {
                        HStack(spacing: 6) {
                            Button(intent: QuickLogFeedIntent()) {
                                HStack(spacing: 3) {
                                    Text("🍼")
                                        .font(.system(size: 10))
                                    Text("+")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(feedColor)
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(feedColor.opacity(0.15))
                                .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)

                            Button(intent: QuickLogDiaperIntent()) {
                                HStack(spacing: 3) {
                                    Text("🧷")
                                        .font(.system(size: 10))
                                    Text("+")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundStyle(diaperColor)
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(diaperColor.opacity(0.15))
                                .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .frame(maxWidth: .infinity)

                // Divider
                Rectangle()
                    .fill(Color.white.opacity(0.06))
                    .frame(width: 1)
                    .padding(.vertical, 10)

                // Right — Activity rows
                VStack(spacing: 0) {
                    MediumActivityRow(
                        emoji: feedEmoji(type: entry.lastFeedType),
                        color: feedColor,
                        label: "האכלה",
                        agoDate: entry.lastFeedTimestamp,
                        count: entry.feedCount,
                        deepLink: "calmino://food"
                    )

                    Divider().background(Color.white.opacity(0.05))

                    MediumActivityRow(
                        emoji: "🌙",
                        color: sleepColor,
                        label: "שינה",
                        agoDate: entry.lastSleepTimestamp,
                        count: nil,
                        deepLink: "calmino://sleep"
                    )

                    Divider().background(Color.white.opacity(0.05))

                    MediumActivityRow(
                        emoji: diaperEmoji(type: entry.lastDiaperType),
                        color: diaperColor,
                        label: "חיתול",
                        agoDate: entry.lastDiaperTimestamp,
                        count: entry.diaperCount,
                        deepLink: "calmino://diaper"
                    )
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 8)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 4)
            .environment(\.layoutDirection, .rightToLeft)
        }
    }
}

private struct MediumActivityRow: View {
    let emoji: String
    let color: Color
    let label: String
    let agoDate: Date?
    let count: Int?
    let deepLink: String

    var body: some View {
        Link(destination: URL(string: deepLink)!) {
            HStack(spacing: 8) {
                CategoryIcon(emoji, color, size: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.45))
                    Text(timeAgo(from: agoDate))
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                }

                Spacer()

                if let count = count, count > 0 {
                    Text("×\(count)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(color)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(color.opacity(0.12))
                        .clipShape(Capsule())
                }
            }
            .padding(.vertical, 6)
        }
    }
}

// MARK: - Large Widget View

struct BabyWidgetLargeView: View {
    let entry: BabyWidgetEntry

    var body: some View {
        ZStack {
            LinearGradient(colors: [bgTop, bgBottom], startPoint: .top, endPoint: .bottom)

            // Multiple accent glows for depth
            RadialGradient(colors: [sleepColor.opacity(0.06), .clear], center: .topLeading, startRadius: 0, endRadius: 200)
            RadialGradient(colors: [feedColor.opacity(0.05), .clear], center: .bottomTrailing, startRadius: 0, endRadius: 160)
            RadialGradient(colors: [healthColor.opacity(0.04), .clear], center: .trailing, startRadius: 0, endRadius: 120)

            VStack(spacing: 0) {
                // ═══ Header ═══
                HStack(spacing: 12) {
                    // Baby avatar
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [
                                        (isSleeping(entry) ? sleepingColor : awakeColor).opacity(0.25),
                                        (isSleeping(entry) ? sleepingColor : awakeColor).opacity(0.05)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 52, height: 52)
                        Circle()
                            .stroke((isSleeping(entry) ? sleepingColor : awakeColor).opacity(0.25), lineWidth: 1.5)
                            .frame(width: 52, height: 52)
                        Text(isSleeping(entry) ? "😴" : "👶")
                            .font(.system(size: 26))
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(entry.babyName)
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        StatusBadge(isSleeping: isSleeping(entry))
                    }

                    Spacer()

                    // Calmino branding
                    VStack(spacing: 2) {
                        Text("Calmino")
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.2))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 14)
                .padding(.bottom, 10)

                // Separator
                Rectangle()
                    .fill(Color.white.opacity(0.06))
                    .frame(height: 0.5)
                    .padding(.horizontal, 16)

                // ═══ Activity Rows ═══
                VStack(spacing: 0) {
                    LargeActivityRow(
                        emoji: feedEmoji(type: entry.lastFeedType),
                        color: feedColor,
                        label: "האכלה",
                        agoDate: entry.lastFeedTimestamp,
                        count: entry.feedCount,
                        countLabel: "היום",
                        progress: urgencyProgress(from: entry.lastFeedTimestamp, intervalMinutes: 180),
                        deepLink: "calmino://food"
                    )

                    LargeRowSeparator()

                    LargeActivityRow(
                        emoji: "🌙",
                        color: sleepColor,
                        label: "שינה",
                        agoDate: entry.lastSleepTimestamp,
                        count: entry.sleepMinutes > 0 ? entry.sleepMinutes / 60 : nil,
                        countLabel: "שע'",
                        progress: urgencyProgress(from: entry.lastSleepTimestamp, intervalMinutes: 240),
                        deepLink: "calmino://sleep"
                    )

                    LargeRowSeparator()

                    LargeActivityRow(
                        emoji: diaperEmoji(type: entry.lastDiaperType),
                        color: diaperColor,
                        label: "חיתול",
                        agoDate: entry.lastDiaperTimestamp,
                        count: entry.diaperCount,
                        countLabel: "היום",
                        progress: urgencyProgress(from: entry.lastDiaperTimestamp, intervalMinutes: 180),
                        deepLink: "calmino://diaper"
                    )

                    LargeRowSeparator()

                    LargeActivityRow(
                        emoji: "❤️",
                        color: healthColor,
                        label: "בריאות",
                        agoDate: entry.lastHealthTimestamp,
                        count: entry.healthCount > 0 ? entry.healthCount : nil,
                        countLabel: "רשומות",
                        progress: nil,
                        deepLink: "calmino://health"
                    )

                    LargeRowSeparator()

                    LargeActivityRow(
                        emoji: "💊",
                        color: medColor,
                        label: "תרופות",
                        agoDate: entry.lastMedicationTimestamp,
                        count: entry.medicationCount > 0 ? entry.medicationCount : nil,
                        countLabel: "היום",
                        progress: nil,
                        deepLink: "calmino://medication"
                    )
                }
                .padding(.horizontal, 12)
                .padding(.top, 6)

                Spacer(minLength: 4)

                // ═══ Daily Summary Footer ═══
                HStack(spacing: 0) {
                    DailyStat(emoji: "🍼", value: "\(entry.feedCount)", label: "האכלות", color: feedColor)
                    Spacer()
                    DailyStat(emoji: "🌙", value: formatSleepHours(entry.sleepMinutes), label: "שינה", color: sleepColor)
                    Spacer()
                    DailyStat(emoji: "🧷", value: "\(entry.diaperCount)", label: "חיתולים", color: diaperColor)
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.03))
            }
            .environment(\.layoutDirection, .rightToLeft)
        }
    }
}

private func formatSleepHours(_ minutes: Int) -> String {
    if minutes == 0 { return "—" }
    let h = minutes / 60
    let m = minutes % 60
    if h > 0 && m > 0 { return "\(h):\(String(format: "%02d", m))" }
    if h > 0 { return "\(h)ש'" }
    return "\(m)ד'"
}

private struct LargeRowSeparator: View {
    var body: some View {
        Rectangle()
            .fill(Color.white.opacity(0.04))
            .frame(height: 0.5)
            .padding(.leading, 50)
    }
}

private struct LargeActivityRow: View {
    let emoji: String
    let color: Color
    let label: String
    let agoDate: Date?
    let count: Int?
    let countLabel: String
    let progress: Double?
    let deepLink: String

    var body: some View {
        Link(destination: URL(string: deepLink)!) {
            HStack(spacing: 10) {
                // Icon with optional progress ring
                ZStack {
                    CategoryIcon(emoji, color, size: 36)
                    if let progress = progress {
                        ProgressRing(progress: progress, color: color, size: 40)
                    }
                }

                // Label + time
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.45))
                    Text(timeAgo(from: agoDate))
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                }

                Spacer()

                // Count badge
                if let count = count, count > 0 {
                    HStack(spacing: 3) {
                        Text("\(count)")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                        Text(countLabel)
                            .font(.system(size: 9, weight: .medium, design: .rounded))
                    }
                    .foregroundStyle(color)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(color.opacity(0.12))
                    .clipShape(Capsule())
                }
            }
            .padding(.vertical, 7)
        }
    }
}

private struct DailyStat: View {
    let emoji: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 3) {
            Text(emoji)
                .font(.system(size: 14))
            Text(value)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 9, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.35))
        }
    }
}

// MARK: - Widget Entry View (routes to correct layout)

struct BabyWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: BabyWidgetEntry

    var body: some View {
        switch family {
        case .systemLarge:
            BabyWidgetLargeView(entry: entry)
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
        .description("מעקב תינוק במבט אחד — האכלות, שינה, חיתולים ועוד")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
