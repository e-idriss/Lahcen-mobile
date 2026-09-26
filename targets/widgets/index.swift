import WidgetKit
import SwiftUI

// MARK: - Shared data
//
// The React Native app writes this JSON into the shared App Group container
// (see `src/features/widgets/iosWidgetBridge.ts`). The widget only ever reads
// it — no network, no computation of prayer times here.

private let appGroup = "group.com.idriss.quran.widgets"
private let dataFile = "widget-data.json"

struct WidgetPrayer: Codable {
    let nameAr: String
    let timeFormatted: String
    let isNext: Bool
}

struct WidgetPayload: Codable {
    struct NextPrayer: Codable {
        let nameAr: String
        let timeFormatted: String
        let remainingFormatted: String
        let cityName: String
        let all: [WidgetPrayer]
    }
    struct Hijri: Codable {
        let dayArabic: String
        let monthNameAr: String
        let yearWithSuffix: String
        let gregorianFormatted: String
    }
    struct LastRead: Codable {
        let surahNameAr: String
        let ayahArabic: String
        let pageArabic: String
    }
    struct DailyAyah: Codable {
        let text: String
        let surahNameAr: String
        let ayahArabic: String
        let theme: String
    }

    let nextPrayer: NextPrayer
    let hijri: Hijri
    let lastRead: LastRead?
    let dailyAyah: DailyAyah
    let updatedAt: String
}

private func loadPayload() -> WidgetPayload? {
    guard
        let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
            .appendingPathComponent(dataFile),
        let data = try? Data(contentsOf: container)
    else { return nil }
    return try? JSONDecoder().decode(WidgetPayload.self, from: data)
}

// MARK: - Timeline

struct QuranEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
}

struct QuranProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuranEntry {
        QuranEntry(date: Date(), payload: loadPayload())
    }
    func getSnapshot(in context: Context, completion: @escaping (QuranEntry) -> Void) {
        completion(QuranEntry(date: Date(), payload: loadPayload()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<QuranEntry>) -> Void) {
        let entry = QuranEntry(date: Date(), payload: loadPayload())
        // Refresh in ~30 min; the app also nudges WidgetCenter on relevant changes.
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Styling

private let bg = Color(red: 0.078, green: 0.067, blue: 0.055)
private let gold = Color(red: 0.839, green: 0.706, blue: 0.435)
private let goldBright = Color(red: 0.988, green: 0.890, blue: 0.541)
private let textMain = Color(red: 1.0, green: 0.933, blue: 0.839)
private let textSoft = Color(red: 0.816, green: 0.769, blue: 0.675)

private func badge(_ label: String) -> some View {
    Text(label).font(.caption2).bold().foregroundColor(gold)
        .environment(\.layoutDirection, .rightToLeft)
}

// MARK: - Views

struct NextPrayerWidgetView: View {
    let payload: WidgetPayload?
    var body: some View {
        let p = payload?.nextPrayer
        VStack(spacing: 4) {
            badge("الصلاة القادمة")
            Text(p?.nameAr ?? "الصلاة").font(.title2).bold().foregroundColor(textMain)
            Text(p?.timeFormatted ?? "--:--").font(.title3).bold().foregroundColor(goldBright)
            Text("الوقت المتبقي \(p?.remainingFormatted ?? "--:--")")
                .font(.caption2).foregroundColor(textSoft)
        }
        .environment(\.layoutDirection, .rightToLeft)
        .containerBackground(for: .widget) { bg }
    }
}

struct HijriWidgetView: View {
    let payload: WidgetPayload?
    var body: some View {
        let h = payload?.hijri
        VStack(spacing: 2) {
            badge("التاريخ الهجري")
            Text(h?.dayArabic ?? "").font(.largeTitle).bold().foregroundColor(goldBright)
            Text(h?.monthNameAr ?? "").font(.headline).foregroundColor(textMain)
            Text(h?.yearWithSuffix ?? "").font(.caption).foregroundColor(textSoft)
        }
        .environment(\.layoutDirection, .rightToLeft)
        .containerBackground(for: .widget) { bg }
    }
}

struct LastReadWidgetView: View {
    let payload: WidgetPayload?
    var body: some View {
        VStack(spacing: 4) {
            badge("متابعة الورد")
            if let lr = payload?.lastRead {
                Text("سورة \(lr.surahNameAr)").font(.title3).bold().foregroundColor(textMain)
                Text("الآية \(lr.ayahArabic)").font(.headline).foregroundColor(goldBright)
                Text("صفحة \(lr.pageArabic)").font(.caption).foregroundColor(textSoft)
            } else {
                Text("افتح المصحف لتظهر آخر قراءة")
                    .font(.footnote).foregroundColor(textSoft).multilineTextAlignment(.center)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
        .containerBackground(for: .widget) { bg }
    }
}

struct DailyAyahWidgetView: View {
    let payload: WidgetPayload?
    var body: some View {
        let a = payload?.dailyAyah
        VStack(spacing: 6) {
            badge("آية وتدبّر")
            Text(a?.text.isEmpty == false ? "﴿ \(a!.text) ﴾" : "افتح التطبيق لتحميل آية اليوم")
                .font(.body).foregroundColor(textMain).multilineTextAlignment(.center)
            Text("سورة \(a?.surahNameAr ?? "") — الآية \(a?.ayahArabic ?? "")")
                .font(.caption).bold().foregroundColor(goldBright)
        }
        .padding(4)
        .environment(\.layoutDirection, .rightToLeft)
        .containerBackground(for: .widget) { bg }
    }
}

// MARK: - Widgets

struct NextPrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NextPrayerWidget", provider: QuranProvider()) { entry in
            NextPrayerWidgetView(payload: entry.payload)
        }
        .configurationDisplayName("الصلاة القادمة")
        .description("الصلاة القادمة والوقت المتبقي للأذان")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct HijriWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HijriWidget", provider: QuranProvider()) { entry in
            HijriWidgetView(payload: entry.payload)
        }
        .configurationDisplayName("التاريخ الهجري")
        .description("اليوم والشهر في التقويم الهجري")
        .supportedFamilies([.systemSmall])
    }
}

struct LastReadWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "LastReadWidget", provider: QuranProvider()) { entry in
            LastReadWidgetView(payload: entry.payload)
        }
        .configurationDisplayName("متابعة الورد")
        .description("متابعة آخر موضع قراءة في المصحف")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct DailyAyahWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DailyAyahWidget", provider: QuranProvider()) { entry in
            DailyAyahWidgetView(payload: entry.payload)
        }
        .configurationDisplayName("آية وتدبّر")
        .description("آية يومية مع التأمل")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

@main
struct QuranWidgetBundle: WidgetBundle {
    var body: some Widget {
        NextPrayerWidget()
        HijriWidget()
        LastReadWidget()
        DailyAyahWidget()
    }
}
