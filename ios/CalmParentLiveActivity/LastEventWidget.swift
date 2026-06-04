import WidgetKit
import SwiftUI
import AppIntents

// =====================================================================
// MARK: - Config
// =====================================================================

private let widgetAppGroupID = "group.com.calmparent.shared"

// Muted / pastel palette — pulled from the in-app Quick Actions design.
// Deliberately desaturated for a calm, premium feel (no candy colors).
private let bfAccent       = Color(red: 0.85, green: 0.35, blue: 0.55)  // warm pink (matches BreastfeedingLiveActivity)
private let bottleAccent   = Color(red: 0.56, green: 0.66, blue: 0.78)  // muted slate blue
private let diaperAccent   = Color(red: 0.48, green: 0.72, blue: 0.62)  // muted sage / teal
private let sleepAccent    = Color(red: 0.48, green: 0.72, blue: 0.62)  // same sage — moon family
private let medicineAccent = Color(red: 0.83, green: 0.60, blue: 0.42)  // muted amber

// Surface
private let surfaceHi = Color(red: 0.12, green: 0.12, blue: 0.14)
private let surfaceLo = Color(red: 0.06, green: 0.06, blue: 0.08)
private let rowHairline = Color.white.opacity(0.05)

// MARK: - Snapshot

struct LastEventsSnapshot {
    var babyName: String
    var babyStatus: String
    var lastFeedingAt: Double?
    var lastFeedingType: String?
    var lastSleepAt: Double?
    var lastDiaperAt: Double?
    var lastDiaperType: String?
    var lastMedicineAt: Double?
    var feedCount: Int
    var sleepMinutes: Int
    var diaperCount: Int

    var activeTimerType: String?
    var activeTimerStartedAt: Double?
    var activeTimerLabel: String?
    var activeTimerIsPaused: Bool

    var isSleeping: Bool { babyStatus == "sleeping" || activeTimerType == "sleep" }
    var hasActiveTimer: Bool { activeTimerType != nil && (activeTimerStartedAt ?? 0) > 0 }

    static let empty = LastEventsSnapshot(
        babyName: "התינוק שלי", babyStatus: "awake",
        lastFeedingAt: nil, lastFeedingType: nil,
        lastSleepAt: nil, lastDiaperAt: nil, lastDiaperType: nil,
        lastMedicineAt: nil,
        feedCount: 0, sleepMinutes: 0, diaperCount: 0,
        activeTimerType: nil, activeTimerStartedAt: nil,
        activeTimerLabel: nil, activeTimerIsPaused: false
    )
}

private func nonZero(_ v: Double) -> Double? { v > 0 ? v : nil }
private func nonEmpty(_ s: String?) -> String? {
    guard let s = s, !s.isEmpty else { return nil }
    return s
}

// MARK: - Provider

struct LastEventEntry: TimelineEntry {
    let date: Date
    let snapshot: LastEventsSnapshot
}

struct LastEventProvider: TimelineProvider {
    func placeholder(in context: Context) -> LastEventEntry {
        LastEventEntry(date: Date(), snapshot: .empty)
    }
    func getSnapshot(in context: Context, completion: @escaping (LastEventEntry) -> Void) {
        completion(LastEventEntry(date: Date(), snapshot: loadSnapshot()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LastEventEntry>) -> Void) {
        let snap = loadSnapshot()
        let now = Date()
        let refresh = snap.hasActiveTimer
            ? Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now
            : Calendar.current.date(byAdding: .minute, value: 10, to: now) ?? now
        completion(Timeline(entries: [LastEventEntry(date: now, snapshot: snap)], policy: .after(refresh)))
    }
    private func loadSnapshot() -> LastEventsSnapshot {
        guard let d = UserDefaults(suiteName: widgetAppGroupID) else { return .empty }
        return LastEventsSnapshot(
            babyName: nonEmpty(d.string(forKey: "widget_babyName")) ?? "התינוק שלי",
            babyStatus: d.string(forKey: "widget_babyStatus") ?? "awake",
            lastFeedingAt:   nonZero(d.double(forKey: "widget_lastFeedTimestamp")),
            lastFeedingType: nonEmpty(d.string(forKey: "widget_lastFeedType")),
            lastSleepAt:     nonZero(d.double(forKey: "widget_lastSleepTimestamp")),
            lastDiaperAt:    nonZero(d.double(forKey: "widget_lastDiaperTimestamp")),
            lastDiaperType:  nonEmpty(d.string(forKey: "widget_lastDiaperType")),
            lastMedicineAt:  nonZero(d.double(forKey: "widget_lastMedicationTimestamp")),
            feedCount:    d.integer(forKey: "widget_feedCount"),
            sleepMinutes: d.integer(forKey: "widget_sleepMinutes"),
            diaperCount:  d.integer(forKey: "widget_diaperCount"),
            activeTimerType:      nonEmpty(d.string(forKey: "widget_activeTimerType")),
            activeTimerStartedAt: nonZero(d.double(forKey: "widget_activeTimerStartedAt")),
            activeTimerLabel:     nonEmpty(d.string(forKey: "widget_activeTimerLabel")),
            activeTimerIsPaused:  d.bool(forKey: "widget_activeTimerIsPaused")
        )
    }
}

// MARK: - Widget Definition

struct LastEventWidget: Widget {
    let kind: String = "LastEventWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LastEventProvider()) { entry in
            BackgroundWrap { LastEventWidgetView(entry: entry) }
        }
        .configurationDisplayName("המעקב של התינוק")
        .description("הנקה, בקבוק, חיתול, שינה — במבט אחד.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

private struct BackgroundWrap<Content: View>: View {
    @ViewBuilder let content: () -> Content
    var body: some View {
        if #available(iOS 17.0, *) {
            content().containerBackground(for: .widget) { gradient }
        } else {
            ZStack { gradient.ignoresSafeArea(); content() }
        }
    }
    private var gradient: some View {
        LinearGradient(colors: [surfaceHi, surfaceLo], startPoint: .top, endPoint: .bottom)
    }
}

// MARK: - Top-level switcher

struct LastEventWidgetView: View {
    let entry: LastEventEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        switch family {
        case .systemSmall:  SmallView(snapshot: entry.snapshot)
        case .systemMedium: MediumView(snapshot: entry.snapshot)
        default:            LargeView(snapshot: entry.snapshot)
        }
    }
}

// =====================================================================
// MARK: - Row model
// =====================================================================

private enum RowKind { case breastfeeding, bottle, diaper, sleep, medicine }

private struct EventRow {
    let kind: RowKind
    let label: String
    let iconName: String
    let accent: Color
    let lastAt: Double?
    let isActive: Bool
    let activeStart: Double?
    let isPaused: Bool
    let actions: [RowAction]
    let openURL: String
}

private struct RowAction {
    let symbol: String
    let url: String
}

private func rowsFor(_ s: LastEventsSnapshot) -> [EventRow] {
    [
        EventRow(
            kind: .breastfeeding,
            label: "הנקה",
            iconName: "heart.fill",   // matches FeedingLiveActivity / BreastfeedingLiveActivity
            accent: bfAccent,
            lastAt: s.lastFeedingAt,
            isActive: s.activeTimerType == "breastfeeding",
            activeStart: s.activeTimerType == "breastfeeding" ? s.activeTimerStartedAt : nil,
            isPaused: s.activeTimerIsPaused,
            actions: [
                // SF Symbols letter glyphs are lower-case ("l.circle.fill" / "r.circle.fill").
                // Using "L.circle" would render as an empty circle.
                RowAction(symbol: "l.circle.fill", url: "calmparentapp://track/food?subType=breast-left"),
                RowAction(symbol: "r.circle.fill", url: "calmparentapp://track/food?subType=breast-right")
            ],
            openURL: "calmparentapp://track/food"
        ),
        EventRow(
            kind: .bottle,
            label: "בקבוק",
            iconName: "drop.fill",
            accent: bottleAccent,
            lastAt: s.lastFeedingAt,
            isActive: s.activeTimerType == "bottle" || s.activeTimerType == "feeding" || s.activeTimerType == "pumping",
            activeStart: (s.activeTimerType == "bottle" || s.activeTimerType == "feeding" || s.activeTimerType == "pumping") ? s.activeTimerStartedAt : nil,
            isPaused: s.activeTimerIsPaused,
            actions: [
                RowAction(symbol: "plus", url: "calmparentapp://track/food")
            ],
            openURL: "calmparentapp://track/food"
        ),
        EventRow(
            kind: .diaper,
            label: "חיתול",
            iconName: "leaf.fill",
            accent: diaperAccent,
            lastAt: s.lastDiaperAt,
            isActive: false,
            activeStart: nil,
            isPaused: false,
            actions: [
                RowAction(symbol: "drop", url: "calmparentapp://track/diaper?subType=wet"),
                RowAction(symbol: "leaf", url: "calmparentapp://track/diaper?subType=poo")
            ],
            openURL: "calmparentapp://track/diaper"
        ),
        EventRow(
            kind: .sleep,
            label: "שינה",
            iconName: "moon.fill",
            accent: sleepAccent,
            lastAt: s.lastSleepAt,
            isActive: s.activeTimerType == "sleep",
            activeStart: s.activeTimerType == "sleep" ? s.activeTimerStartedAt : nil,
            isPaused: s.activeTimerIsPaused,
            actions: [
                RowAction(symbol: "play", url: "calmparentapp://track/sleep")
            ],
            openURL: "calmparentapp://track/sleep"
        ),
        EventRow(
            kind: .medicine,
            label: "תרופה",
            iconName: "pills.fill",
            accent: medicineAccent,
            lastAt: s.lastMedicineAt,
            isActive: false,
            activeStart: nil,
            isPaused: false,
            actions: [
                RowAction(symbol: "plus", url: "calmparentapp://track/medication")
            ],
            openURL: "calmparentapp://track/medication"
        )
    ]
}

// =====================================================================
// MARK: - Header
// =====================================================================

private struct WidgetHeader: View {
    let babyName: String
    let isSleeping: Bool

    var body: some View {
        HStack(spacing: 8) {
            Spacer()
            Text(babyName)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(Color.white.opacity(0.92))
                .lineLimit(1)
            Image(systemName: isSleeping ? "moon.stars.fill" : "moon.stars")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(sleepAccent)
        }
    }
}

// =====================================================================
// MARK: - Bottom status / timer row
// =====================================================================

private struct StatusRow: View {
    let snapshot: LastEventsSnapshot

    var body: some View {
        let active = snapshot.hasActiveTimer
        let tint = active ? accentForActive(snapshot.activeTimerType) : sleepAccent
        let label = active
            ? (snapshot.activeTimerLabel ?? labelFor(snapshot.activeTimerType))
            : (snapshot.isSleeping ? "שינה" : "סטטוס")

        HStack(spacing: 10) {
            // LEFT: pause / resume / stop when active, else play to start sleep
            HStack(spacing: 6) {
                if active {
                    if #available(iOS 17.0, *) {
                        if snapshot.activeTimerIsPaused {
                            Button(intent: ResumeTimerIntent()) { miniIcon("play.fill", tint: tint, filled: true) }
                                .buttonStyle(.plain)
                        } else {
                            Button(intent: PauseTimerIntent()) { miniIcon("pause.fill", tint: tint, filled: false) }
                                .buttonStyle(.plain)
                        }
                        Button(intent: StopTimerIntent()) { miniIcon("stop.fill", tint: tint, filled: true) }
                            .buttonStyle(.plain)
                    } else {
                        Link(destination: URL(string: "calmparentapp://home")!) { miniIcon("pause.fill", tint: tint, filled: false) }
                        Link(destination: URL(string: "calmparentapp://home")!) { miniIcon("stop.fill", tint: tint, filled: true) }
                    }
                } else {
                    Link(destination: URL(string: "calmparentapp://track/sleep")!) { miniIcon("play.fill", tint: tint, filled: false) }
                }
            }

            // CENTER: timer or status
            VStack(alignment: .center, spacing: 1) {
                if active, let start = snapshot.activeTimerStartedAt {
                    if snapshot.activeTimerIsPaused {
                        Text("מושהה")
                            .font(.system(size: 16, weight: .heavy, design: .rounded))
                            .foregroundStyle(Color.orange)
                            .monospacedDigit()
                    } else {
                        Text(Date(timeIntervalSince1970: start), style: .timer)
                            .font(.system(size: 18, weight: .heavy, design: .rounded))
                            .foregroundStyle(Color.white)
                            .monospacedDigit()
                            .lineLimit(1)
                            .minimumScaleFactor(0.65)
                    }
                } else {
                    Text(relativeShort(snapshot.lastSleepAt))
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color.white.opacity(0.9))
                        .monospacedDigit()
                }
                Text(label)
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)

            // RIGHT: status icon
            Image(systemName: snapshot.isSleeping ? "moon.zzz.fill" : "moon.stars")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(tint)
        }
        .padding(.top, 6)
    }

    private func accentForActive(_ type: String?) -> Color {
        switch type {
        case "breastfeeding": return bfAccent
        case "bottle", "feeding", "pumping": return bottleAccent
        case "sleep": return sleepAccent
        default: return sleepAccent
        }
    }

    private func labelFor(_ type: String?) -> String {
        switch type {
        case "breastfeeding": return "הנקה"
        case "bottle", "feeding": return "בקבוק"
        case "pumping": return "שאיבה"
        case "sleep": return "שינה"
        default: return "—"
        }
    }
}

// =====================================================================
// MARK: - Event row view
// =====================================================================

private struct EventRowView: View {
    let row: EventRow

    var body: some View {
        HStack(spacing: 10) {
            // LEFT: action buttons (interactive when active)
            HStack(spacing: 6) {
                if row.isActive {
                    activeControls
                } else {
                    ForEach(0..<row.actions.count, id: \.self) { i in
                        deepLinkButton(row.actions[i])
                    }
                }
            }

            // CENTER: time / live timer
            timeContent
                .frame(maxWidth: .infinity, alignment: .trailing)

            // RIGHT: label + type icon
            HStack(spacing: 8) {
                Text(row.label)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.92))
                ZStack {
                    Circle()
                        .fill(row.accent.opacity(0.20))
                        .frame(width: 26, height: 26)
                    Image(systemName: row.iconName)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(row.accent)
                }
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var timeContent: some View {
        if row.isActive, let start = row.activeStart {
            if row.isPaused {
                Text("מושהה")
                    .font(.system(size: 13, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color.orange)
            } else {
                Text(Date(timeIntervalSince1970: start), style: .timer)
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color.white)
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        } else {
            Text(relativeShort(row.lastAt))
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(Color.white.opacity(0.85))
                .monospacedDigit()
        }
    }

    @ViewBuilder
    private var activeControls: some View {
        if #available(iOS 17.0, *) {
            if row.isPaused {
                Button(intent: ResumeTimerIntent()) { miniIcon("play.fill", tint: row.accent, filled: true) }
                    .buttonStyle(.plain)
            } else {
                Button(intent: PauseTimerIntent()) { miniIcon("pause.fill", tint: row.accent, filled: false) }
                    .buttonStyle(.plain)
            }
            Button(intent: StopTimerIntent()) { miniIcon("stop.fill", tint: row.accent, filled: true) }
                .buttonStyle(.plain)
        } else {
            Link(destination: URL(string: row.openURL)!) { miniIcon("pause.fill", tint: row.accent, filled: false) }
            Link(destination: URL(string: row.openURL)!) { miniIcon("stop.fill", tint: row.accent, filled: true) }
        }
    }

    @ViewBuilder
    private func deepLinkButton(_ action: RowAction) -> some View {
        Link(destination: URL(string: action.url)!) {
            miniIcon(action.symbol, tint: row.accent, filled: false)
        }
    }
}

// Small consistent action pill — outlined when secondary, filled when destructive/primary.
private func miniIcon(_ symbol: String, tint: Color, filled: Bool) -> some View {
    ZStack {
        Circle()
            .fill(filled ? tint.opacity(0.85) : Color.white.opacity(0.04))
            .frame(width: 24, height: 24)
        Circle()
            .stroke(tint.opacity(filled ? 0 : 0.55), lineWidth: 1)
            .frame(width: 24, height: 24)
        Image(systemName: symbol)
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(filled ? Color.white : tint)
    }
}

// =====================================================================
// MARK: - Small
// =====================================================================

private struct SmallView: View {
    let snapshot: LastEventsSnapshot

    var body: some View {
        VStack(spacing: 4) {
            WidgetHeader(babyName: snapshot.babyName, isSleeping: snapshot.isSleeping)
                .padding(.bottom, 2)

            let rows = rowsFor(snapshot)
            let primary = rows.first(where: { $0.isActive }) ?? rows.first(where: { $0.lastAt != nil }) ?? rows[0]

            HStack(spacing: 6) {
                Spacer()
                Text(primary.label)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(Color.white.opacity(0.55))
                Image(systemName: primary.iconName)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(primary.accent)
            }

            HStack {
                Spacer()
                if primary.isActive, let start = primary.activeStart {
                    Text(Date(timeIntervalSince1970: start), style: .timer)
                        .font(.system(size: 34, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color.white)
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                } else {
                    Text(relativeShort(primary.lastAt))
                        .font(.system(size: 34, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color.white)
                        .monospacedDigit()
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                }
            }

            Spacer(minLength: 0)
            StatusRow(snapshot: snapshot)
        }
        .widgetURL(URL(string: "calmparentapp://home"))
    }
}

// =====================================================================
// MARK: - Medium — header + 3 rows
// =====================================================================

private struct MediumView: View {
    let snapshot: LastEventsSnapshot

    var body: some View {
        let rows = rowsFor(snapshot).filter { $0.kind != .medicine && $0.kind != .sleep }
        VStack(spacing: 4) {
            WidgetHeader(babyName: snapshot.babyName, isSleeping: snapshot.isSleeping)
                .padding(.bottom, 2)

            ForEach(0..<rows.count, id: \.self) { idx in
                EventRowView(row: rows[idx])
                if idx < rows.count - 1 {
                    Divider().background(rowHairline)
                }
            }

            Spacer(minLength: 0)
            StatusRow(snapshot: snapshot)
        }
    }
}

// =====================================================================
// MARK: - Large — header + 4 rows + status
// =====================================================================

private struct LargeView: View {
    let snapshot: LastEventsSnapshot

    var body: some View {
        let rows = rowsFor(snapshot).filter { $0.kind != .sleep }
        VStack(spacing: 4) {
            WidgetHeader(babyName: snapshot.babyName, isSleeping: snapshot.isSleeping)
                .padding(.bottom, 4)

            ForEach(0..<rows.count, id: \.self) { idx in
                EventRowView(row: rows[idx])
                if idx < rows.count - 1 {
                    Divider().background(rowHairline)
                }
            }

            Spacer(minLength: 0)
            StatusRow(snapshot: snapshot)
        }
    }
}

// =====================================================================
// MARK: - Formatters
// =====================================================================

private func relativeShort(_ epoch: Double?) -> String {
    guard let epoch, epoch > 0 else { return "—" }
    let diff = max(0, Date().timeIntervalSince1970 - epoch)
    if diff < 60 { return "עכשיו" }
    let m = Int(diff / 60)
    if m < 60 { return "\(m) דק'" }
    let h = Int(diff / 3600)
    if h < 24 {
        let remMin = (Int(diff) % 3600) / 60
        if remMin == 0 { return "\(h) שע'" }
        return "\(h):\(String(format: "%02d", remMin))"
    }
    return "\(Int(diff / 86400)) ימים"
}

// Previews removed — `#Preview` requires iOS 17+ at compile time and the
// CalmParentLiveActivity target deploys to iOS 16.1.
