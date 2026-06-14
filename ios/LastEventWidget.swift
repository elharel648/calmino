import WidgetKit
import SwiftUI
import AppIntents

// =====================================================================
// MARK: - Config
// =====================================================================

private let widgetAppGroupID = "group.com.calmparent.shared"

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

// The app's actionColors palette (context/ThemeContext.tsx) — the widget speaks
// the exact same color language as the in-app quick actions and timeline.
private let bfAccent       = Color(hex: 0xB5838D) // breastfeeding mauve
private let bottleAccent   = Color(hex: 0x6A8EAE) // bottle periwinkle
private let diaperAccent   = Color(hex: 0x6A9C89) // diaper sage
private let sleepAccent    = Color(hex: 0x4A6572) // sleep navy
private let primaryTint    = Color(hex: 0xC8806A) // terracotta primary

// Warm, light surface — matches the app's #F8F6F4 background, not a dark card.
private let surfaceTop    = Color(hex: 0xFBF9F7)
private let surfaceBot    = Color(hex: 0xF1EBE5)
private let inkPrimary    = Color(hex: 0x2B2B2E)
private let inkSecondary  = Color.black.opacity(0.45)
private let inkTertiary   = Color.black.opacity(0.30)

// =====================================================================
// MARK: - User configuration (editable widget)
// =====================================================================

// The set of actions a user can place in a widget slot. Long-press the widget
// → "Edit Widget" → pick which rows to show (e.g. swap Diaper for White Noise).
@available(iOS 17.0, *)
enum WidgetRowKind: String, AppEnum {
    case breastfeeding, bottle, diaper, sleep, whiteNoise, pumping, medicine, none

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "פעולה"
    static var caseDisplayRepresentations: [WidgetRowKind: DisplayRepresentation] = [
        .breastfeeding: "הנקה",
        .bottle:        "בקבוק",
        .diaper:        "חיתול",
        .sleep:         "שינה",
        .whiteNoise:    "רעש לבן",
        .pumping:       "שאיבה",
        .medicine:      "תרופה",
        .none:          "— ריק —",
    ]
}

@available(iOS 17.0, *)
struct SelectRowsIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "התאמת הווידג'ט"
    static var description = IntentDescription("בחר אילו פעולות יופיעו במעקב התינוק.")

    @Parameter(title: "שורה 1", default: .breastfeeding) var row1: WidgetRowKind
    @Parameter(title: "שורה 2", default: .bottle)        var row2: WidgetRowKind
    @Parameter(title: "שורה 3", default: .diaper)        var row3: WidgetRowKind
    @Parameter(title: "שורה 4", default: .sleep)         var row4: WidgetRowKind

    var rows: [WidgetRowKind] { [row1, row2, row3, row4] }
}

// =====================================================================
// MARK: - Snapshot
// =====================================================================

struct LastEventsSnapshot {
    var babyName: String
    var babyStatus: String
    var lastFeedingAt: Double?
    var lastFeedingType: String?
    var lastSleepAt: Double?
    var lastDiaperAt: Double?
    var lastDiaperType: String?
    var lastMedicineAt: Double?
    var lastWhiteNoiseAt: Double?
    var lastPumpingAt: Double?
    var feedCount: Int
    var sleepMinutes: Int
    var diaperCount: Int

    var activeTimerType: String?
    var activeTimerStartedAt: Double?
    var activeTimerLabel: String?
    var activeTimerIsPaused: Bool

    var isSleeping: Bool { babyStatus == "sleeping" || (activeTimerType == "sleep" && hasActiveTimer) }
    // A "running" timer older than 12h is stale state the app failed to clear
    // (force-quit mid-timer) — a 168h timer is worse than none.
    var hasActiveTimer: Bool {
        guard let t = activeTimerType, !t.isEmpty,
              let start = activeTimerStartedAt, start > 0 else { return false }
        return Date().timeIntervalSince1970 - start < 12 * 3600
    }

    static let empty = LastEventsSnapshot(
        babyName: "התינוק שלי", babyStatus: "awake",
        lastFeedingAt: nil, lastFeedingType: nil,
        lastSleepAt: nil, lastDiaperAt: nil, lastDiaperType: nil,
        lastMedicineAt: nil, lastWhiteNoiseAt: nil, lastPumpingAt: nil,
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

// =====================================================================
// MARK: - Provider
// =====================================================================

struct LastEventEntry: TimelineEntry {
    let date: Date
    let snapshot: LastEventsSnapshot
    var rows: [String] = []  // user-chosen row kinds (raw values), empty = default order
}

// Shared loader so both the static (iOS 16) and configurable (iOS 17+) providers
// read the exact same App Group data.
private func loadWidgetSnapshot() -> LastEventsSnapshot {
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
        lastWhiteNoiseAt: nonZero(d.double(forKey: "widget_lastWhiteNoiseTimestamp")),
        lastPumpingAt:    nonZero(d.double(forKey: "widget_lastPumpingTimestamp")),
        feedCount:    d.integer(forKey: "widget_feedCount"),
        sleepMinutes: d.integer(forKey: "widget_sleepMinutes"),
        diaperCount:  d.integer(forKey: "widget_diaperCount"),
        activeTimerType:      nonEmpty(d.string(forKey: "widget_activeTimerType")),
        activeTimerStartedAt: nonZero(d.double(forKey: "widget_activeTimerStartedAt")),
        activeTimerLabel:     nonEmpty(d.string(forKey: "widget_activeTimerLabel")),
        activeTimerIsPaused:  d.bool(forKey: "widget_activeTimerIsPaused")
    )
}

private func refreshDate(for snap: LastEventsSnapshot) -> Date {
    let now = Date()
    return snap.hasActiveTimer
        ? Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now
        : Calendar.current.date(byAdding: .minute, value: 10, to: now) ?? now
}

// iOS 17+: configurable provider — reads the user's row selection.
@available(iOS 17.0, *)
struct LastEventConfigurableProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> LastEventEntry {
        LastEventEntry(date: Date(), snapshot: .empty)
    }
    func snapshot(for configuration: SelectRowsIntent, in context: Context) async -> LastEventEntry {
        LastEventEntry(date: Date(), snapshot: loadWidgetSnapshot(), rows: configuration.rows.map { $0.rawValue })
    }
    func timeline(for configuration: SelectRowsIntent, in context: Context) async -> Timeline<LastEventEntry> {
        let snap = loadWidgetSnapshot()
        let entry = LastEventEntry(date: Date(), snapshot: snap, rows: configuration.rows.map { $0.rawValue })
        return Timeline(entries: [entry], policy: .after(refreshDate(for: snap)))
    }
}

// iOS 16 fallback: static provider, default rows.
struct LastEventProvider: TimelineProvider {
    func placeholder(in context: Context) -> LastEventEntry {
        LastEventEntry(date: Date(), snapshot: .empty)
    }
    func getSnapshot(in context: Context, completion: @escaping (LastEventEntry) -> Void) {
        completion(LastEventEntry(date: Date(), snapshot: loadWidgetSnapshot()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LastEventEntry>) -> Void) {
        let snap = loadWidgetSnapshot()
        completion(Timeline(entries: [LastEventEntry(date: Date(), snapshot: snap)], policy: .after(refreshDate(for: snap))))
    }
}

// =====================================================================
// MARK: - SVG path porting (exact app icons)
// =====================================================================

// Minimal SVG path → SwiftUI Path parser (M/L/H/V/C/S/Q/T/Z, abs+rel).
// Lets the widget render the app's own custom glyphs pixel-for-pixel.
private func svgPath(_ d: String) -> Path {
    var path = Path()
    let chars = Array(d)
    var i = 0
    var cur = CGPoint.zero
    var startPt = CGPoint.zero
    var lastCtrl = CGPoint.zero
    var lastCmd: Character = " "

    func skipSep() { while i < chars.count, " ,\n\t\r".contains(chars[i]) { i += 1 } }
    func readNum() -> CGFloat {
        skipSep()
        var s = ""
        if i < chars.count, chars[i] == "-" || chars[i] == "+" { s.append(chars[i]); i += 1 }
        while i < chars.count, chars[i].isNumber || chars[i] == "." { s.append(chars[i]); i += 1 }
        return CGFloat(Double(s) ?? 0)
    }
    func isCmd(_ c: Character) -> Bool { "MmLlHhVvCcSsQqTtZz".contains(c) }

    while i < chars.count {
        skipSep()
        guard i < chars.count else { break }
        var cmd = chars[i]
        if isCmd(cmd) { i += 1 }
        else {
            cmd = lastCmd == "M" ? "L" : (lastCmd == "m" ? "l" : lastCmd) // implicit repeat
            if !isCmd(cmd) { break }
        }
        switch cmd {
        case "M": cur = CGPoint(x: readNum(), y: readNum()); path.move(to: cur); startPt = cur
        case "m": cur = CGPoint(x: cur.x + readNum(), y: cur.y + readNum()); path.move(to: cur); startPt = cur
        case "L": cur = CGPoint(x: readNum(), y: readNum()); path.addLine(to: cur)
        case "l": cur = CGPoint(x: cur.x + readNum(), y: cur.y + readNum()); path.addLine(to: cur)
        case "H": cur.x = readNum(); path.addLine(to: cur)
        case "h": cur.x += readNum(); path.addLine(to: cur)
        case "V": cur.y = readNum(); path.addLine(to: cur)
        case "v": cur.y += readNum(); path.addLine(to: cur)
        case "C", "c":
            let rel = cmd == "c"
            let c1 = CGPoint(x: (rel ? cur.x : 0) + readNum(), y: (rel ? cur.y : 0) + readNum())
            let c2 = CGPoint(x: (rel ? cur.x : 0) + readNum(), y: (rel ? cur.y : 0) + readNum())
            let end = CGPoint(x: (rel ? cur.x : 0) + readNum(), y: (rel ? cur.y : 0) + readNum())
            path.addCurve(to: end, control1: c1, control2: c2); lastCtrl = c2; cur = end
        case "S", "s":
            let rel = cmd == "s"
            let c1 = "CcSs".contains(lastCmd) ? CGPoint(x: 2*cur.x - lastCtrl.x, y: 2*cur.y - lastCtrl.y) : cur
            let c2 = CGPoint(x: (rel ? cur.x : 0) + readNum(), y: (rel ? cur.y : 0) + readNum())
            let end = CGPoint(x: (rel ? cur.x : 0) + readNum(), y: (rel ? cur.y : 0) + readNum())
            path.addCurve(to: end, control1: c1, control2: c2); lastCtrl = c2; cur = end
        case "Q", "q":
            let rel = cmd == "q"
            let c1 = CGPoint(x: (rel ? cur.x : 0) + readNum(), y: (rel ? cur.y : 0) + readNum())
            let end = CGPoint(x: (rel ? cur.x : 0) + readNum(), y: (rel ? cur.y : 0) + readNum())
            path.addQuadCurve(to: end, control: c1); lastCtrl = c1; cur = end
        case "T", "t":
            let rel = cmd == "t"
            let c1 = "QqTt".contains(lastCmd) ? CGPoint(x: 2*cur.x - lastCtrl.x, y: 2*cur.y - lastCtrl.y) : cur
            let end = CGPoint(x: (rel ? cur.x : 0) + readNum(), y: (rel ? cur.y : 0) + readNum())
            path.addQuadCurve(to: end, control: c1); lastCtrl = c1; cur = end
        case "Z", "z": path.closeSubpath(); cur = startPt
        default: break
        }
        lastCmd = cmd
    }
    return path
}

// Fit an SVG-space path into a target square frame.
private func fitted(_ path: Path, viewBox: CGRect, into side: CGFloat) -> Path {
    let s = min(side / viewBox.width, side / viewBox.height)
    let tx = (side - viewBox.width * s) / 2 - viewBox.minX * s
    let ty = (side - viewBox.height * s) / 2 - viewBox.minY * s
    return path.applying(CGAffineTransform(a: s, b: 0, c: 0, d: s, tx: tx, ty: ty))
}

private enum AppIconKind { case breastfeeding, diaper }

// The two icons SF Symbols can't represent — rendered from the app's own SVG.
private struct AppIcon: View {
    let kind: AppIconKind
    var side: CGFloat = 20
    var color: Color = .white

    var body: some View {
        switch kind {
        case .breastfeeding:
            let d = "M477-80q-42 0-81.5-9T324-112q-46-20-75-48.5T220-224v-231q0-31 23.5-57t60.5-46q38-20 83.5-31t92.5-11q47 0 92.5 11t83.5 31q38 20 61 46t23 57v231q0 17-7.5 33T711-161q-14 14-32.5 26.5T637-112q1-5 3-28 0-58-41-99t-99-41q-43 0-76 23t-50 59q32 8 58.5 11t46.5 3q17 0 27.5-1t13.5-1v104q-11 1-21.5 1.5T477-80Zm123-220q33 0 56.5-23.5T680-380q0-33-23.5-56.5T600-460q-33 0-56.5 23.5T520-380q0 33 23.5 56.5T600-300ZM480-640q50 0 85-34.5t35-85.5q0-50-35-85T480-960q-51 0-85.5 35T360-760q0 51 34.5 85.5T480-640Z"
            fitted(svgPath(d), viewBox: CGRect(x: 0, y: -960, width: 960, height: 960), into: side)
                .fill(color)
                .frame(width: side, height: side)
        case .diaper:
            let lw = side / 24 * 1.9
            let vb = CGRect(x: 0, y: 0, width: 24, height: 24)
            let waist = "M5 4 C4.4 4 4 4.4 4 5 L4 8.5 L20 8.5 L20 5 C20 4.4 19.6 4 19 4 Z"
            let body  = "M4 8.5 L4 17.5 C4 20 6 22 8.5 22 L15.5 22 C18 22 20 20 20 17.5 L20 8.5 Z"
            let lTab  = "M4 7 L1.5 7 C1 7 1 7.5 1 8 L1 10.5 C1 11 1.5 11.5 2 11.5 L4 11.5"
            let rTab  = "M20 7 L22.5 7 C23 7 23 7.5 23 8 L23 10.5 C23 11 22.5 11.5 22 11.5 L20 11.5"
            let heart = "M12 18 C12 18 9 15.8 9 13.8 C9 12.6 9.9 12 10.8 12.5 C11.2 12.7 11.6 13.1 12 13.6 C12.4 13.1 12.8 12.7 13.2 12.5 C14.1 12 15 12.6 15 13.8 C15 15.8 12 18 12 18 Z"
            ZStack {
                fitted(svgPath(waist), viewBox: vb, into: side).stroke(color, style: StrokeStyle(lineWidth: lw, lineCap: .round, lineJoin: .round))
                fitted(svgPath(body), viewBox: vb, into: side).stroke(color, style: StrokeStyle(lineWidth: lw, lineCap: .round, lineJoin: .round))
                fitted(svgPath(lTab), viewBox: vb, into: side).stroke(color, style: StrokeStyle(lineWidth: lw * 0.85, lineCap: .round, lineJoin: .round))
                fitted(svgPath(rTab), viewBox: vb, into: side).stroke(color, style: StrokeStyle(lineWidth: lw * 0.85, lineCap: .round, lineJoin: .round))
                fitted(svgPath(heart), viewBox: vb, into: side).fill(color)
            }
            .frame(width: side, height: side)
        }
    }
}

// =====================================================================
// MARK: - Tile model
// =====================================================================

private enum IconSource { case app(AppIconKind); case sf(String) }

// A quick sub-action shown as a small circle on the leading edge of a row
// (e.g. L/R for breastfeeding, wet/dirty for diaper, stop for a live timer).
private struct QuickAction {
    enum Kind { case sf(String); case sfColor(String, Color); case text(String) }
    let kind: Kind
    let timerStart: String?  // non-nil → StartHomeTimerIntent(timerType:)
    let logEvent: String?    // non-nil → LogHomeEventIntent(event:)
    let isStop: Bool         // true → StopHomeTimerIntent
    var showsPlay: Bool = false  // render a tiny ▶ next to the label (= "starts a timer")
    var wide: Bool = false       // pill instead of circle (for L ▶ / R ▶)
    var filled: Bool = false     // solid pastel fill + white glyph (primary Play button)
}

private struct Tile {
    let icon: IconSource
    let accent: Color
    let label: String
    let lastAt: Double?
    let isLive: Bool
    let liveStart: Double?
    let isPaused: Bool
    let timerType: String?   // non-nil → tappable timer (start/stop)
    let logEvent: String?    // non-nil → instant LogHomeEventIntent payload
    let fallbackURL: String  // iOS 16 deep-link fallback
    var quickActions: [QuickAction] = []  // leading-edge sub-action buttons (rows)
}

private func bottleSF() -> String {
    if #available(iOS 17.0, *) { return "waterbottle.fill" }
    return "drop.fill"
}

// Build a single tile for a given row kind, wired to live-timer state.
private func tileFor(_ kind: String, _ s: LastEventsSnapshot) -> Tile? {
    let live = s.hasActiveTimer
    func liveFor(_ types: [String]) -> (Bool, Double?) {
        guard live, let t = s.activeTimerType, types.contains(t) else { return (false, nil) }
        return (true, s.activeTimerStartedAt)
    }
    let stop = QuickAction(kind: .sf("stop.fill"), timerStart: nil, logEvent: nil, isStop: true)
    func play(_ type: String) -> QuickAction {
        QuickAction(kind: .sf("play.fill"), timerStart: type, logEvent: nil, isStop: false, filled: true)
    }

    switch kind {
    case "breastfeeding":
        let l = liveFor(["breastfeeding"])
        let actions: [QuickAction] = l.0 ? [stop] : [
            QuickAction(kind: .text("R"), timerStart: "breastfeeding:right", logEvent: nil, isStop: false, showsPlay: true, wide: true),
            QuickAction(kind: .text("L"), timerStart: "breastfeeding:left",  logEvent: nil, isStop: false, showsPlay: true, wide: true),
        ]
        return Tile(icon: .app(.breastfeeding), accent: bfAccent, label: "הנקה",
                    lastAt: s.lastFeedingAt, isLive: l.0, liveStart: l.1, isPaused: l.0 && s.activeTimerIsPaused,
                    timerType: "breastfeeding", logEvent: nil, fallbackURL: "calmparentapp://track/food", quickActions: actions)
    case "bottle":
        let l = liveFor(["bottle", "feeding"])
        return Tile(icon: .sf(bottleSF()), accent: bottleAccent, label: "בקבוק",
                    lastAt: s.lastFeedingAt, isLive: l.0, liveStart: l.1, isPaused: l.0 && s.activeTimerIsPaused,
                    timerType: "bottle", logEvent: nil, fallbackURL: "calmparentapp://track/food",
                    quickActions: l.0 ? [stop] : [play("bottle")])
    case "diaper":
        let actions = [
            QuickAction(kind: .sfColor("drop.fill", Color(hex: 0x6A8EAE)), timerStart: nil, logEvent: "diaper:wet",   isStop: false),
            QuickAction(kind: .sfColor("hurricane", Color(hex: 0xA9744F)), timerStart: nil, logEvent: "diaper:dirty", isStop: false),
        ]
        return Tile(icon: .app(.diaper), accent: diaperAccent, label: "חיתול",
                    lastAt: s.lastDiaperAt, isLive: false, liveStart: nil, isPaused: false,
                    timerType: nil, logEvent: "diaper", fallbackURL: "calmparentapp://track/diaper", quickActions: actions)
    case "sleep":
        let l = liveFor(["sleep"])
        return Tile(icon: .sf("moon.fill"), accent: sleepAccent, label: "שינה",
                    lastAt: s.lastSleepAt, isLive: l.0, liveStart: l.1, isPaused: l.0 && s.activeTimerIsPaused,
                    timerType: "sleep", logEvent: nil, fallbackURL: "calmparentapp://track/sleep",
                    quickActions: l.0 ? [stop] : [play("sleep")])
    case "whiteNoise":
        let l = liveFor(["white_noise", "whitenoise"])
        return Tile(icon: .sf("waveform"), accent: Color(hex: 0x7E8CA8), label: "רעש לבן",
                    lastAt: s.lastWhiteNoiseAt, isLive: l.0, liveStart: l.1, isPaused: l.0 && s.activeTimerIsPaused,
                    timerType: "white_noise", logEvent: nil, fallbackURL: "calmparentapp://whitenoise",
                    quickActions: l.0 ? [stop] : [play("white_noise")])
    case "pumping":
        let l = liveFor(["pumping"])
        return Tile(icon: .sf("drop.triangle.fill"), accent: Color(hex: 0x9C8AAE), label: "שאיבה",
                    lastAt: s.lastPumpingAt, isLive: l.0, liveStart: l.1, isPaused: l.0 && s.activeTimerIsPaused,
                    timerType: "pumping", logEvent: nil, fallbackURL: "calmparentapp://track/food",
                    quickActions: l.0 ? [stop] : [play("pumping")])
    case "medicine":
        return Tile(icon: .sf("pills.fill"), accent: Color(hex: 0xC8806A), label: "תרופה",
                    lastAt: s.lastMedicineAt, isLive: false, liveStart: nil, isPaused: false,
                    timerType: nil, logEvent: "medicine", fallbackURL: "calmparentapp://track/health",
                    quickActions: [QuickAction(kind: .sf("plus"), timerStart: nil, logEvent: "medicine", isStop: false)])
    default:
        return nil  // "none" → empty slot
    }
}

// Default order when the user hasn't configured the widget (or on iOS 16).
private let defaultRowKinds = ["breastfeeding", "bottle", "diaper", "sleep"]

private func tilesFor(_ s: LastEventsSnapshot, rows: [String] = []) -> [Tile] {
    let kinds = rows.isEmpty ? defaultRowKinds : rows
    return kinds.compactMap { tileFor($0, s) }
}

// =====================================================================
// MARK: - Building blocks
// =====================================================================

// Renders either a ported app icon or an SF Symbol, white, centered.
private struct Glyph: View {
    let icon: IconSource
    let side: CGFloat
    var body: some View {
        switch icon {
        case .app(let kind): AppIcon(kind: kind, side: side, color: .white)
        case .sf(let name):
            Image(systemName: name)
                .font(.system(size: side, weight: .semibold))
                .foregroundStyle(Color.white)
        }
    }
}

// Filled pastel circle + white glyph — the app-wide icon language.
private struct IconBadge: View {
    let tile: Tile
    var size: CGFloat = 40
    var body: some View {
        ZStack {
            Circle()
                .fill(tile.accent.gradient)
                .frame(width: size, height: size)
                .shadow(color: tile.accent.opacity(0.35), radius: tile.isLive ? 6 : 3, y: 1.5)
            if tile.isLive {
                Circle().stroke(tile.accent.opacity(0.55), lineWidth: 2).frame(width: size + 6, height: size + 6)
            }
            Glyph(icon: tile.icon, side: size * 0.46)
        }
    }
}

// One stat tile. Whole tile is a single interactive Button (iOS 17+) or Link.
private struct StatTile: View {
    let tile: Tile
    var iconSize: CGFloat = 40

    var body: some View {
        if #available(iOS 17.0, *) {
            Button(intent: makeIntent()) { content }.buttonStyle(.plain)
        } else {
            Link(destination: URL(string: tile.fallbackURL)!) { content }
        }
    }

    @available(iOS 17.0, *)
    private func makeIntent() -> any AppIntent {
        if let ev = tile.logEvent { return LogHomeEventIntent(event: ev) }
        if tile.isLive { return StopHomeTimerIntent() }
        return StartHomeTimerIntent(timerType: tile.timerType ?? "", label: tile.label)
    }

    private var content: some View {
        VStack(spacing: 5) {
            IconBadge(tile: tile, size: iconSize)
            valueText.lineLimit(1).minimumScaleFactor(0.6)
            Text(tile.isLive ? "\(tile.label) ●" : tile.label)
                .font(.system(size: 10.5, weight: .medium, design: .rounded))
                .foregroundStyle(tile.isLive ? tile.accent : inkSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private var valueText: some View {
        if tile.isLive, let start = tile.liveStart {
            if tile.isPaused {
                Text("מושהה").font(.system(size: 12, weight: .bold, design: .rounded)).foregroundStyle(Color.orange)
            } else {
                Text(Date(timeIntervalSince1970: start), style: .timer)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(inkPrimary).monospacedDigit().multilineTextAlignment(.center)
            }
        } else {
            Text(relativeShort(tile.lastAt))
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(tile.lastAt == nil ? inkTertiary : inkPrimary)
        }
    }
}

// A small circular sub-action button on a row's leading edge (L/R, wet/dirty, stop).
private struct QuickActionButton: View {
    let action: QuickAction
    let accent: Color
    var body: some View {
        if #available(iOS 17.0, *) {
            Button(intent: intent) { circle }.buttonStyle(.plain)
        } else {
            circle
        }
    }
    @available(iOS 17.0, *)
    private var intent: any AppIntent {
        if action.isStop { return StopHomeTimerIntent() }
        if let ev = action.logEvent { return LogHomeEventIntent(event: ev) }
        return StartHomeTimerIntent(timerType: action.timerStart ?? "", label: "")
    }
    private var strokeColor: Color {
        if case let .sfColor(_, c) = action.kind { return c }
        return accent
    }
    @ViewBuilder private var circle: some View {
        if action.wide {
            // Pill: text (L/R) + a small play triangle → reads as "tap to start".
            HStack(spacing: 4) {
                if case let .text(t) = action.kind {
                    Text(t).font(.system(size: 13, weight: .heavy, design: .rounded)).foregroundStyle(accent)
                }
                if action.showsPlay {
                    Image(systemName: "play.fill").font(.system(size: 8, weight: .black)).foregroundStyle(accent.opacity(0.75))
                }
            }
            .frame(width: 42, height: 30)
            .background(
                Capsule().fill(accent.opacity(0.12))
                    .overlay(Capsule().stroke(accent.opacity(0.45), lineWidth: 1.2))
            )
        } else {
            let solid = action.isStop || action.filled
            ZStack {
                Circle().stroke(strokeColor.opacity(solid ? 0 : 0.5), lineWidth: 1.4)
                Circle().fill(solid ? AnyShapeStyle(accent.gradient) : AnyShapeStyle(strokeColor.opacity(0.10)))
                    .shadow(color: solid ? accent.opacity(0.3) : .clear, radius: 2.5, y: 1)
                glyph(solid: solid)
            }
            .frame(width: 30, height: 30)
        }
    }

    @ViewBuilder private func glyph(solid: Bool) -> some View {
        switch action.kind {
        case .sf(let name):
            Image(systemName: name)
                .font(.system(size: name == "play.fill" ? 11 : 12, weight: .bold))
                .foregroundStyle(solid ? .white : accent)
                .offset(x: name == "play.fill" ? -1 : 0)  // optically center the triangle
        case .sfColor(let name, let c):
            Image(systemName: name)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(c)
        case .text(let t):
            Text(t).font(.system(size: 12, weight: .heavy, design: .rounded)).foregroundStyle(accent)
        }
    }
}

// One rich event row: [quick actions] · [time + label] · [icon badge].
// Tapping the row body starts/logs the primary action; side circles do sub-actions.
private struct EventRow: View {
    let tile: Tile
    var body: some View {
        HStack(spacing: 8) {
            // Leading: sub-action circles (mirrored to the left edge in RTL).
            HStack(spacing: 6) {
                ForEach(Array(tile.quickActions.enumerated()), id: \.offset) { _, qa in
                    QuickActionButton(action: qa, accent: tile.accent)
                }
            }
            Spacer(minLength: 4)
            // Trailing: time + label (text), then the pastel icon badge.
            VStack(alignment: .trailing, spacing: 1) {
                timeText
                Text(tile.isLive ? "\(tile.label) ●" : tile.label)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(tile.isLive ? tile.accent : inkSecondary)
            }
            IconBadge(tile: tile, size: 36)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 2)
    }
    @ViewBuilder private var timeText: some View {
        if tile.isLive, let start = tile.liveStart {
            if tile.isPaused {
                Text("מושהה").font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(Color.orange)
            } else {
                Text(Date(timeIntervalSince1970: start), style: .timer)
                    .font(.system(size: 16, weight: .heavy, design: .rounded))
                    .foregroundStyle(inkPrimary).monospacedDigit()
                    .lineLimit(1).minimumScaleFactor(0.6).multilineTextAlignment(.trailing)
            }
        } else {
            Text(relativeShort(tile.lastAt))
                .font(.system(size: 16, weight: .heavy, design: .rounded))
                .foregroundStyle(tile.lastAt == nil ? inkTertiary : inkPrimary)
                .lineLimit(1).minimumScaleFactor(0.7)
        }
    }
}

// Header: baby name + live-timer capsule / sleep state.
private struct HeaderBar: View {
    let snapshot: LastEventsSnapshot
    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: snapshot.isSleeping ? "moon.zzz.fill" : "sparkles")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(snapshot.isSleeping ? sleepAccent : primaryTint)
            Text(snapshot.babyName)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(inkPrimary).lineLimit(1)
            Spacer(minLength: 4)
            if snapshot.hasActiveTimer, let start = snapshot.activeTimerStartedAt {
                HStack(spacing: 5) {
                    Circle().fill(accentForActive(snapshot.activeTimerType)).frame(width: 6, height: 6)
                    if snapshot.activeTimerIsPaused {
                        Text("מושהה").font(.system(size: 11, weight: .bold, design: .rounded)).foregroundStyle(Color.orange)
                    } else {
                        Text(Date(timeIntervalSince1970: start), style: .timer)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(inkPrimary).monospacedDigit()
                            .lineLimit(1).minimumScaleFactor(0.7)
                            .frame(maxWidth: 62).fixedSize(horizontal: true, vertical: false)
                    }
                }
                .padding(.horizontal, 9).padding(.vertical, 4)
                .background(Capsule().fill(Color.black.opacity(0.05)))
            } else if snapshot.isSleeping {
                Text("ישן/ה 💤").font(.system(size: 11, weight: .semibold, design: .rounded)).foregroundStyle(inkSecondary)
            }
        }
    }
    private func accentForActive(_ type: String?) -> Color {
        switch type {
        case "breastfeeding": return bfAccent
        case "bottle", "feeding", "pumping": return bottleAccent
        default: return sleepAccent
        }
    }
}

// "Today" summary line — large family only.
private struct TodayBar: View {
    let snapshot: LastEventsSnapshot
    var body: some View {
        HStack(spacing: 6) {
            Text("היום").font(.system(size: 11, weight: .bold, design: .rounded)).foregroundStyle(inkTertiary)
            Spacer()
            item("\(snapshot.feedCount)", "האכלות", bfAccent)
            dot
            item("\(snapshot.diaperCount)", "חיתולים", diaperAccent)
            dot
            item(sleepText, "שינה", sleepAccent)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color.black.opacity(0.04)))
    }
    private var sleepText: String {
        let h = snapshot.sleepMinutes / 60, m = snapshot.sleepMinutes % 60
        if h == 0 { return "\(m) דק'" }
        if m == 0 { return "\(h) שע'" }
        return "\(h):" + String(format: "%02d", m)
    }
    private var dot: some View { Circle().fill(Color.black.opacity(0.15)).frame(width: 3, height: 3) }
    private func item(_ v: String, _ l: String, _ tint: Color) -> some View {
        HStack(spacing: 4) {
            Text(v).font(.system(size: 12, weight: .heavy, design: .rounded)).foregroundStyle(tint).monospacedDigit()
            Text(l).font(.system(size: 10.5, weight: .medium, design: .rounded)).foregroundStyle(inkSecondary)
        }
    }
}

// =====================================================================
// MARK: - Family views
// =====================================================================

private struct SmallView: View {
    let snapshot: LastEventsSnapshot
    var rows: [String] = []
    var body: some View {
        let tiles = tilesFor(snapshot, rows: rows)
        let hero = tiles.first(where: { $0.isLive })
            ?? tiles.filter({ $0.lastAt != nil }).max(by: { ($0.lastAt ?? 0) < ($1.lastAt ?? 0) })
            ?? tiles.first
            ?? tileFor("breastfeeding", snapshot)!
        VStack(spacing: 6) {
            HStack {
                Text(snapshot.babyName).font(.system(size: 12, weight: .bold, design: .rounded)).foregroundStyle(inkSecondary).lineLimit(1)
                Spacer()
                if snapshot.isSleeping {
                    Image(systemName: "moon.zzz.fill").font(.system(size: 10, weight: .semibold)).foregroundStyle(sleepAccent)
                }
            }
            Spacer(minLength: 0)
            IconBadge(tile: hero, size: 48)
            Group {
                if hero.isLive, let start = hero.liveStart, !hero.isPaused {
                    Text(Date(timeIntervalSince1970: start), style: .timer)
                        .font(.system(size: 23, weight: .heavy, design: .rounded)).foregroundStyle(inkPrimary).monospacedDigit()
                } else {
                    Text(relativeShort(hero.lastAt))
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundStyle(hero.lastAt == nil ? inkTertiary : inkPrimary)
                }
            }
            .lineLimit(1).minimumScaleFactor(0.5)
            Text(hero.isLive ? "\(hero.label) עכשיו" : hero.label)
                .font(.system(size: 11, weight: .medium, design: .rounded)).foregroundStyle(inkSecondary)
            Spacer(minLength: 0)
        }
        .widgetURL(URL(string: "calmparentapp://home"))
    }
}

private var rowHairline: some View {
    Rectangle().fill(Color.black.opacity(0.06)).frame(height: 1)
}

// Pick the N most relevant tiles for the compact (medium) layout:
// any live timer first, then by most-recent event, preserving the canonical
// row order within each group so the layout doesn't jump around.
private func topTiles(_ tiles: [Tile], limit: Int) -> [Tile] {
    guard tiles.count > limit else { return tiles }
    let indexed = Array(tiles.enumerated())
    let sorted = indexed.sorted { a, b in
        if a.element.isLive != b.element.isLive { return a.element.isLive }
        let ta = a.element.lastAt ?? 0, tb = b.element.lastAt ?? 0
        if ta != tb { return ta > tb }
        return a.offset < b.offset
    }
    let chosen = Set(sorted.prefix(limit).map { $0.offset })
    return indexed.filter { chosen.contains($0.offset) }.map { $0.element }
}

private struct MediumView: View {
    let snapshot: LastEventsSnapshot
    var rows: [String] = []
    var body: some View {
        // Medium is only ~158pt tall — 4 rows + header get crushed & clipped.
        // Show the 3 most relevant rows (a live timer always wins) so each row
        // gets real breathing room. Large shows all four.
        let tiles = topTiles(tilesFor(snapshot, rows: rows), limit: 3)
        VStack(spacing: 3) {
            HeaderBar(snapshot: snapshot)
            ForEach(Array(tiles.enumerated()), id: \.offset) { idx, tile in
                EventRow(tile: tile)
                    .frame(maxHeight: .infinity)
                if idx < tiles.count - 1 { rowHairline.padding(.horizontal, 2) }
            }
        }
    }
}

private struct LargeView: View {
    let snapshot: LastEventsSnapshot
    var rows: [String] = []
    var body: some View {
        let tiles = tilesFor(snapshot, rows: rows)
        VStack(spacing: 0) {
            HeaderBar(snapshot: snapshot).padding(.bottom, 8)
            ForEach(Array(tiles.enumerated()), id: \.offset) { idx, tile in
                EventRow(tile: tile)
                    .frame(maxHeight: .infinity)
                if idx < tiles.count - 1 { rowHairline }
            }
            rowHairline.padding(.vertical, 4)
            TodayBar(snapshot: snapshot)
        }
    }
}

// =====================================================================
// MARK: - Widget definition
// =====================================================================

struct LastEventWidget: Widget {
    let kind: String = "LastEventWidget"
    var body: some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            // Configurable: long-press → "Edit Widget" to choose which rows show.
            return AppIntentConfiguration(kind: kind, intent: SelectRowsIntent.self, provider: LastEventConfigurableProvider()) { entry in
                BackgroundWrap {
                    LastEventWidgetView(entry: entry)
                        .environment(\.layoutDirection, .rightToLeft)
                }
            }
            .configurationDisplayName("המעקב של התינוק")
            .description("בחר אילו פעולות יופיעו — תיעוד מהיר במבט אחד.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        } else {
            return StaticConfiguration(kind: kind, provider: LastEventProvider()) { entry in
                BackgroundWrap {
                    LastEventWidgetView(entry: entry)
                        .environment(\.layoutDirection, .rightToLeft)
                }
            }
            .configurationDisplayName("המעקב של התינוק")
            .description("הנקה, בקבוק, חיתול, שינה — תיעוד מהיר במבט אחד.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        }
    }
}

struct LastEventWidgetView: View {
    let entry: LastEventEntry
    @Environment(\.widgetFamily) var family
    var body: some View {
        switch family {
        case .systemSmall:  SmallView(snapshot: entry.snapshot, rows: entry.rows)
        case .systemMedium: MediumView(snapshot: entry.snapshot, rows: entry.rows)
        default:            LargeView(snapshot: entry.snapshot, rows: entry.rows)
        }
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
        LinearGradient(colors: [surfaceTop, surfaceBot], startPoint: .top, endPoint: .bottom)
    }
}

// =====================================================================
// MARK: - Formatters
// =====================================================================

private func relativeShort(_ epoch: Double?) -> String {
    guard let epoch, epoch > 0 else { return "טרם תועד" }
    let diff = max(0, Date().timeIntervalSince1970 - epoch)
    if diff < 60 { return "עכשיו" }
    let m = Int(diff / 60)
    if m < 60 { return "\(m) דק'" }
    let h = Int(diff / 3600)
    if h < 24 {
        let remMin = (Int(diff) % 3600) / 60
        return remMin == 0 ? "\(h) שע'" : "\(h):\(String(format: "%02d", remMin))"
    }
    return "\(Int(diff / 86400)) ימים"
}
