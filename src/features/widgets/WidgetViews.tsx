/**
 * Render trees for the native Android home-screen widgets.
 *
 * These use `react-native-android-widget`'s primitives (`FlexWidget`,
 * `TextWidget`) — NOT React Native views. They are serialised to Android
 * RemoteViews, so only the documented props work and there is no state,
 * effects, or custom fonts here.
 */

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetData } from './widgetData';

// Cast to the `#${string}` template literal type that react-native-android-widget
// requires for ColorProp. Plain string literals fail the strict check.
const COLORS = {
  bg: '#14110E' as `#${string}`,
  surface: '#1C1712' as `#${string}`,
  text: '#FFEED6' as `#${string}`,
  textSoft: '#D0C4AC' as `#${string}`,
  textMuted: '#9B907B' as `#${string}`,
  gold: '#D6B46F' as `#${string}`,
  goldBright: '#FCE38A' as `#${string}`,
};

const OPEN_APP = { open: 'quran://' } as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      clickActionData={OPEN_APP}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: COLORS.bg,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {children}
    </FlexWidget>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <TextWidget
      text={label}
      style={{ fontSize: 11, color: COLORS.gold, fontWeight: 'bold' }}
    />
  );
}

export function NextPrayerWidgetView({ data }: { data: WidgetData }) {
  const p = data.nextPrayer;
  return (
    <Shell>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <Badge label="الصلاة القادمة" />
        <TextWidget text={p.cityName} style={{ fontSize: 10, color: COLORS.textMuted }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'column', alignItems: 'center', width: 'match_parent' }}>
        <TextWidget text={p.nameAr} style={{ fontSize: 24, color: COLORS.text, fontWeight: 'bold' }} />
        <TextWidget text={p.timeFormatted} style={{ fontSize: 20, color: COLORS.goldBright, fontWeight: 'bold' }} />
        <TextWidget
          text={`الوقت المتبقي ${p.remainingFormatted}`}
          style={{ fontSize: 11, color: COLORS.textSoft }}
        />
      </FlexWidget>
    </Shell>
  );
}

export function HijriDateWidgetView({ data }: { data: WidgetData }) {
  const h = data.hijri;
  return (
    <Shell>
      <Badge label="التاريخ الهجري" />
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'center', width: 'match_parent' }}>
        <TextWidget text={h.dayArabic} style={{ fontSize: 34, color: COLORS.goldBright, fontWeight: 'bold' }} />
        <TextWidget text={h.monthNameAr} style={{ fontSize: 16, color: COLORS.text, fontWeight: 'bold' }} />
        <TextWidget text={h.yearWithSuffix} style={{ fontSize: 12, color: COLORS.textSoft }} />
      </FlexWidget>
      <TextWidget text={h.gregorianFormatted} style={{ fontSize: 10, color: COLORS.textMuted }} />
    </Shell>
  );
}

export function LastReadWidgetView({ data }: { data: WidgetData }) {
  const lr = data.lastRead;
  return (
    <Shell>
      <Badge label="متابعة الورد" />
      {lr ? (
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'center', width: 'match_parent' }}>
          <TextWidget text={`سورة ${lr.surahNameAr}`} style={{ fontSize: 20, color: COLORS.text, fontWeight: 'bold' }} />
          <TextWidget text={`الآية ${lr.ayahArabic}`} style={{ fontSize: 15, color: COLORS.goldBright, fontWeight: 'bold' }} />
          <TextWidget text={`صفحة ${lr.pageArabic}`} style={{ fontSize: 12, color: COLORS.textSoft }} />
        </FlexWidget>
      ) : (
        <TextWidget
          text="افتح المصحف وابدأ القراءة ليظهر آخر موضع هنا"
          style={{ fontSize: 13, color: COLORS.textSoft }}
        />
      )}
    </Shell>
  );
}

export function DailyAyahWidgetView({ data }: { data: WidgetData }) {
  const a = data.dailyAyah;
  return (
    <Shell>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <Badge label="آية وتدبّر" />
        <TextWidget text={a.theme} style={{ fontSize: 10, color: COLORS.textMuted }} />
      </FlexWidget>
      <TextWidget
        text={a.text ? `﴿ ${a.text} ﴾` : 'افتح التطبيق لتحميل آية اليوم'}
        style={{ fontSize: 16, color: COLORS.text, textAlign: 'center' }}
      />
      <TextWidget
        text={`سورة ${a.surahNameAr} — الآية ${a.ayahArabic}`}
        style={{ fontSize: 12, color: COLORS.goldBright, fontWeight: 'bold' }}
      />
    </Shell>
  );
}

export type WidgetName = 'NextPrayer' | 'HijriDate' | 'LastRead' | 'DailyAyah';

export function renderWidget(name: WidgetName, data: WidgetData) {
  switch (name) {
    case 'NextPrayer':
      return <NextPrayerWidgetView data={data} />;
    case 'HijriDate':
      return <HijriDateWidgetView data={data} />;
    case 'LastRead':
      return <LastReadWidgetView data={data} />;
    case 'DailyAyah':
      return <DailyAyahWidgetView data={data} />;
  }
}
