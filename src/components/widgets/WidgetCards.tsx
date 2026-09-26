/**
 * Pixel-perfect renderers for Home Screen Widgets.
 *
 * Supports 4 Widget Categories:
 * 1. Next Prayer & Countdown / Adhan Time (`prayer`)
 * 2. Hijri Date (`hijri`)
 * 3. Continue Reading Quran (`lastRead`)
 * 4. Ayah of the Day (`dailyAyah`)
 *
 * In 3 standard Apple/Android dimensions:
 * - Small (`160 x 160`)
 * - Medium (`340 x 160`)
 * - Large (`340 x 340`)
 */

import { Feather } from '@expo/vector-icons';
import { ImageBackground } from 'expo-image';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { IslamicEmblem } from '../ui/IslamicEmblem';
import { fonts, radius } from '../../theme/tokens';
import { toArabicDigits } from '../../utils/arabicDigits';
import type {
  DailyAyahWidgetPayload,
  HijriWidgetPayload,
  LastReadWidgetPayload,
  NextPrayerWidgetPayload,
} from '../../utils/widgetSync';
import { surahFontName } from '../../utils/surahFontName';

export type WidgetType = 'prayer' | 'hijri' | 'lastRead' | 'dailyAyah';
export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetTheme = 'mosque' | 'gold' | 'emerald' | 'glass';

// Responsive dimensions: calculate from screen width with a max cap
const SCREEN_WIDTH = Dimensions.get('window').width;
const WIDGET_PADDING = 32; // left+right padding in previewStage
const MEDIUM_W = Math.min(340, SCREEN_WIDTH - WIDGET_PADDING);
const SMALL_W = Math.min(160, (SCREEN_WIDTH - WIDGET_PADDING) / 2);
const MEDIUM_H = Math.round(MEDIUM_W * (160 / 340));
const SMALL_H = SMALL_W;
const LARGE_W = MEDIUM_W;
const LARGE_H = LARGE_W;

interface WidgetCardProps {
  type: WidgetType;
  size: WidgetSize;
  theme?: WidgetTheme;
  prayerData?: NextPrayerWidgetPayload;
  hijriData?: HijriWidgetPayload;
  lastReadData?: LastReadWidgetPayload;
  dailyAyahData?: DailyAyahWidgetPayload;
}

export function WidgetCard({
  type,
  size,
  theme = 'mosque',
  prayerData,
  hijriData,
  lastReadData,
  dailyAyahData,
}: WidgetCardProps) {
  // Theme Background & Accent Palette
  const themeStyle = getThemeColors(theme);

  const containerDimensions =
    size === 'small'
      ? styles.containerSmall
      : size === 'medium'
      ? styles.containerMedium
      : styles.containerLarge;

  // All themes use mosque.jpg as the background — scrim color varies per theme.
  const bgSource = require('../../../assets/images/mosque.jpg');

  const content = (
    <View style={[styles.innerContent, size === 'small' && styles.innerSmall]}>
      {type === 'prayer' && (
        <NextPrayerWidgetContent size={size} data={prayerData} theme={themeStyle} />
      )}
      {type === 'hijri' && (
        <HijriDateWidgetContent size={size} data={hijriData} theme={themeStyle} />
      )}
      {type === 'lastRead' && (
        <LastReadWidgetContent size={size} data={lastReadData} theme={themeStyle} />
      )}
      {type === 'dailyAyah' && (
        <DailyAyahWidgetContent size={size} data={dailyAyahData} theme={themeStyle} />
      )}
    </View>
  );

  if (bgSource) {
    return (
      <View
        style={[
          styles.containerBase,
          containerDimensions,
          { borderColor: themeStyle.border },
        ]}
      >
        <ImageBackground
          source={bgSource}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.bgImage}
        >
          <View
            style={[
              styles.scrimOverlay,
              { backgroundColor: themeStyle.scrimColor },
            ]}
          />
          {content}
        </ImageBackground>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.containerBase,
        containerDimensions,
        {
          backgroundColor: themeStyle.bg,
          borderColor: themeStyle.border,
        },
      ]}
    >
      {/* Subtle tint overlay for parchment & glass themes */}
      <View style={[styles.motifBg, { backgroundColor: themeStyle.gold, opacity: 0.04 }]} />
      {content}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Next Prayer Widget Content                                              */
/* -------------------------------------------------------------------------- */
function NextPrayerWidgetContent({
  size,
  data,
  theme,
}: {
  size: WidgetSize;
  data?: NextPrayerWidgetPayload;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const prayerName = data?.nextPrayerNameAr || 'العصر';
  const adhanTime = data?.adhanTime || '16:15';
  const countdown = data?.timeRemainingFormatted || '02:45';
  const calligraphyKey = data?.nextPrayerCalligraphyKey || '5';

  if (size === 'small') {
    return (
      <View style={styles.contentColCentered}>
        <View style={styles.topBadgeRow}>
          <Text style={[styles.badgeText, { color: theme.gold }]}>الصلاة القادمة</Text>
          <Feather name="clock" size={13} color={theme.gold} />
        </View>

        <Text
          style={[styles.calligraphySmall, { color: theme.textMain }]}
          allowFontScaling={false}
        >
          {calligraphyKey}
        </Text>

        <View style={styles.timePill}>
          <Text style={[styles.adhanTimeText, { color: theme.goldBright }]}>
            {adhanTime}
          </Text>
        </View>

        <Text style={[styles.countdownSub, { color: theme.textMuted }]}>
          متبقي {countdown}
        </Text>
      </View>
    );
  }

  if (size === 'medium') {
    return (
      <View style={styles.contentRowBetween}>
        {/* Left Side: Timetable Mini Cards */}
        <View style={styles.miniTimetable}>
          {data?.prayers && data.prayers.length > 0 ? (
            data.prayers.slice(0, 5).map((p, idx) => (
              <View
                key={idx}
                style={[
                  styles.miniPrayerRow,
                  p.isNext && { backgroundColor: theme.highlightBg, borderRadius: 6 },
                ]}
              >
                <Text
                  style={[
                    styles.miniPrayerTime,
                    { color: p.isNext ? theme.goldBright : theme.textMuted },
                  ]}
                >
                  {p.timeFormatted}
                </Text>
                <Text
                  style={[
                    styles.miniPrayerName,
                    { color: p.isNext ? theme.textMain : theme.textSecondary },
                  ]}
                >
                  {p.nameAr}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.miniPrayerSummary}>
              <Text style={[styles.miniCity, { color: theme.textSecondary }]}>
                {data?.cityName || 'مواقيت الصلاة'}
              </Text>
              <Text style={[styles.miniAdhanNotice, { color: theme.gold }]}>
                الأذان القادم: {adhanTime}
              </Text>
            </View>
          )}
        </View>

        {/* Right Side: Big Calligraphy Hero */}
        <View style={styles.prayerHeroRight}>
          <View style={styles.badgePillSmall}>
            <Text style={[styles.badgeTextSmall, { color: theme.gold }]}>
              الصلاة القادمة
            </Text>
          </View>
          <Text
            style={[styles.calligraphyMedium, { color: theme.textMain }]}
            allowFontScaling={false}
          >
            {calligraphyKey}
          </Text>
          <Text style={[styles.countdownMedium, { color: theme.goldBright }]}>
            {adhanTime}
          </Text>
          <Text style={[styles.countdownSubSmall, { color: theme.textSecondary }]}>
            الوقت المتبقي {countdown}
          </Text>
        </View>
      </View>
    );
  }

  // Large Size: Full Prayer Dashboard
  return (
    <View style={styles.contentColBetween}>
      <View style={styles.largeTopHeader}>
        <Text style={[styles.largeCityLabel, { color: theme.textSecondary }]}>
          {data?.cityName || 'مواقيت الصلاة اليوم'}
        </Text>
        <View style={styles.largeBadge}>
          <Text style={[styles.largeBadgeText, { color: theme.gold }]}>الصلاة القادمة</Text>
          <IslamicEmblem size={16} color={theme.gold} fillColor="transparent" />
        </View>
      </View>

      <View style={styles.largeCenterHero}>
        <Text
          style={[styles.calligraphyLarge, { color: theme.textMain }]}
          allowFontScaling={false}
        >
          {calligraphyKey}
        </Text>
        <Text style={[styles.adhanTimeLarge, { color: theme.goldBright }]}>
          {adhanTime}
        </Text>
        <Text style={[styles.countdownLargeSub, { color: theme.textSecondary }]}>
          الوقت المتبقي للأذان: {countdown}
        </Text>
      </View>

      <View style={[styles.largeTableBox, { borderColor: theme.borderSoft }]}>
        {data?.prayers && data.prayers.length > 0 ? (
          data.prayers.map((p, idx) => (
            <View
              key={idx}
              style={[
                styles.largeTableRow,
                p.isNext && { backgroundColor: theme.highlightBg, borderRadius: 8 },
              ]}
            >
              <Text
                style={[
                  styles.largeTableTime,
                  { color: p.isNext ? theme.goldBright : theme.textMain },
                ]}
              >
                {p.timeFormatted}
              </Text>
              <Text
                style={[
                  styles.largeTableName,
                  { color: p.isNext ? theme.goldBright : theme.textSecondary },
                ]}
              >
                {p.nameAr}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.largeNotice, { color: theme.textSecondary }]}>
            مواقيت الصلاة حسب الموقع الفلكي الدقيق
          </Text>
        )}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Hijri Date Widget Content                                               */
/* -------------------------------------------------------------------------- */
function HijriDateWidgetContent({
  size,
  data,
  theme,
}: {
  size: WidgetSize;
  data?: HijriWidgetPayload;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const weekdayLigature = data?.weekdayLigature ?? 1;
  const day = data?.dayArabic ?? '۲۲';
  const monthLigature = data?.monthLigature ?? 2;
  const monthName = data?.monthNameAr ?? 'صفر';
  const year = data?.yearWithSuffix ?? '١٤٤٨ هـ';

  if (size === 'small') {
    return (
      <View style={styles.contentColCentered}>
        <View style={styles.topBadgeRow}>
          <Text style={[styles.badgeText, { color: theme.gold }]}>التاريخ الهجري</Text>
          <Feather name="moon" size={13} color={theme.gold} />
        </View>

        <Text
          style={[styles.weekdaySmall, { color: theme.textMain }]}
          allowFontScaling={false}
        >
          {String(weekdayLigature)}
        </Text>

        <Text style={[styles.hijriDaySmall, { color: theme.goldBright }]}>
          {day}
        </Text>

        <Text style={[styles.hijriMonthYearSmall, { color: theme.textSecondary }]}>
          {monthName} {year}
        </Text>
      </View>
    );
  }

  if (size === 'medium') {
    return (
      <View style={styles.contentColCentered}>
        <View style={styles.topBadgeRow}>
          <Text style={[styles.badgeText, { color: theme.gold }]}>اليوم في التقويم الهجري</Text>
          <IslamicEmblem size={15} color={theme.gold} fillColor="transparent" />
        </View>

        <Text
          style={[styles.weekdayMedium, { color: theme.textMain }]}
          allowFontScaling={false}
        >
          {String(weekdayLigature)}
        </Text>

        <View style={styles.hijriDateRowMedium}>
          <Text style={[styles.hijriDayNumberMedium, { color: theme.goldBright }]}>
            {day}
          </Text>
          <View style={styles.monthClipBoxMedium}>
            <Text
              style={[styles.hijriMonthCalligraphyMedium, { color: theme.textMain }]}
              allowFontScaling={false}
            >
              {String(monthLigature)}
            </Text>
          </View>
          <Text style={[styles.hijriYearMedium, { color: theme.textSecondary }]}>
            {year}
          </Text>
        </View>
      </View>
    );
  }

  // Large Hijri Calendar Card
  return (
    <View style={styles.contentColBetween}>
      <View style={styles.largeTopHeader}>
        <Text style={[styles.largeCityLabel, { color: theme.textSecondary }]}>
          {data?.gregorianDateFormatted || 'التقويم الإسلامي'}
        </Text>
        <View style={styles.largeBadge}>
          <Text style={[styles.largeBadgeText, { color: theme.gold }]}>التاريخ الهجري</Text>
          <Feather name="moon" size={15} color={theme.gold} />
        </View>
      </View>

      <View style={styles.largeCenterHero}>
        <Text
          style={[styles.weekdayLarge, { color: theme.textMain }]}
          allowFontScaling={false}
        >
          {String(weekdayLigature)}
        </Text>

        <View style={styles.largeDateDisplayRow}>
          <Text style={[styles.largeDayNumber, { color: theme.goldBright }]}>
            {day}
          </Text>
          <View style={styles.largeMonthClipBox}>
            <Text
              style={[styles.largeMonthCalligraphy, { color: theme.textMain }]}
              allowFontScaling={false}
            >
              {String(monthLigature)}
            </Text>
          </View>
        </View>

        <Text style={[styles.largeYearLabel, { color: theme.textSecondary }]}>
          {year}
        </Text>
      </View>

      {/* Not scripture: the previous ornament quoted a TRUNCATED ayah (9:36). */}
      <View style={[styles.largeBottomQuote, { borderColor: theme.borderSoft }]}>
        <Text style={[styles.largeQuoteText, { color: theme.gold }]}>
          {`${monthName} ${year}`}
        </Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Last Read Quran Widget Content                                          */
/* -------------------------------------------------------------------------- */
function LastReadWidgetContent({
  size,
  data,
  theme,
}: {
  size: WidgetSize;
  data?: LastReadWidgetPayload;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const surahName = data?.surahNameAr || 'البقرة';
  const ayah = data?.ayahArabic || '۱۳۷';
  const juz = data?.juzArabic || '١';
  const page = data?.pageArabic || '٢١';

  if (size === 'small') {
    return (
      <View style={styles.contentColCentered}>
        <View style={styles.topBadgeRow}>
          <Text style={[styles.badgeText, { color: theme.gold }]}>متابعة الورد</Text>
          <Feather name="book-open" size={13} color={theme.gold} />
        </View>

        <Text
          style={[styles.surahNameSmall, { color: theme.textMain }]}
          allowFontScaling={false}
          numberOfLines={1}
        >
          سورة {surahFontName(surahName)}
        </Text>

        <Text style={[styles.ayahBadgeSmall, { color: theme.goldBright }]}>
          الآية {ayah}
        </Text>

        <Text style={[styles.pageSubSmall, { color: theme.textSecondary }]}>
          صفحة {page} • جزء {juz}
        </Text>
      </View>
    );
  }

  if (size === 'medium') {
    return (
      <View style={styles.contentColCentered}>
        <View style={styles.topBadgeRow}>
          <Text style={[styles.badgeText, { color: theme.gold }]}>متابعة التلاوة والورد القرآني</Text>
          <IslamicEmblem size={15} color={theme.gold} fillColor="transparent" />
        </View>

        <Text
          style={[styles.surahNameMedium, { color: theme.textMain }]}
          allowFontScaling={false}
        >
          سورة {surahFontName(surahName)}
        </Text>

        <View style={styles.lastReadMetaRow}>
          <View style={[styles.metaPillBox, { backgroundColor: theme.highlightBg }]}>
            <Text style={[styles.metaPillText, { color: theme.goldBright }]}>
              الآية {ayah}
            </Text>
          </View>
          <View style={[styles.metaPillBox, { backgroundColor: theme.highlightBg }]}>
            <Text style={[styles.metaPillText, { color: theme.textSecondary }]}>
              الصفحة {page}
            </Text>
          </View>
          <View style={[styles.metaPillBox, { backgroundColor: theme.highlightBg }]}>
            <Text style={[styles.metaPillText, { color: theme.textSecondary }]}>
              الجزء {juz}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Large Last Read Card
  return (
    <View style={styles.contentColBetween}>
      <View style={styles.largeTopHeader}>
        <Text style={[styles.largeCityLabel, { color: theme.textSecondary }]}>
          آخر موضع توقفت عنده
        </Text>
        <View style={styles.largeBadge}>
          <Text style={[styles.largeBadgeText, { color: theme.gold }]}>الورد القرآني</Text>
          <Feather name="bookmark" size={15} color={theme.gold} />
        </View>
      </View>

      <View style={styles.largeCenterHero}>
        <Text style={[styles.preTitleLarge, { color: theme.gold }]}>
          تابع القراءة من حيث وصلت
        </Text>
        <Text
          style={[styles.surahNameLarge, { color: theme.textMain }]}
          allowFontScaling={false}
        >
          سورة {surahFontName(surahName)}
        </Text>
        <Text style={[styles.ayahLargeNumber, { color: theme.goldBright }]}>
          الآية المباركة {ayah}
        </Text>
      </View>

      <View style={[styles.largeDetailsGrid, { borderColor: theme.borderSoft }]}>
        <View style={styles.detailCol}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>الجزء</Text>
          <Text style={[styles.detailValue, { color: theme.textMain }]}>{juz}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>الصفحة</Text>
          <Text style={[styles.detailValue, { color: theme.textMain }]}>{page}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>السورة رقم</Text>
          <Text style={[styles.detailValue, { color: theme.textMain }]}>
            {toArabicDigits(data?.surahNumber ?? 2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Daily Ayah & Reflection Widget Content                                  */
/* -------------------------------------------------------------------------- */
function DailyAyahWidgetContent({
  size,
  data,
  theme,
}: {
  size: WidgetSize;
  data?: DailyAyahWidgetPayload;
  theme: ReturnType<typeof getThemeColors>;
}) {
  // No literal fallback for the ayah text: it is scripture and comes from the
  // database via `loadTodayAyahText`. Empty until that read resolves.
  const text = data?.text ?? '';
  const surah = data?.surahNameAr || 'الرعد';
  const ayah = data?.ayahArabic || '۲۸';
  const reflectionTheme = data?.theme || 'السكينة والطمأنينة';

  if (size === 'small') {
    return (
      <View style={styles.contentColCentered}>
        <View style={styles.topBadgeRow}>
          <Text style={[styles.badgeText, { color: theme.gold }]}>آية وتأمّل</Text>
          <IslamicEmblem size={13} color={theme.gold} fillColor="transparent" />
        </View>

        <Text
          style={[styles.verseTextSmall, { color: theme.textMain }]}
          numberOfLines={3}
        >
          ﴿ {text} ﴾
        </Text>

        <Text style={[styles.verseRefSmall, { color: theme.goldBright }]}>
          سورة {surah} : {ayah}
        </Text>
      </View>
    );
  }

  if (size === 'medium') {
    return (
      <View style={styles.contentColCentered}>
        <View style={styles.topBadgeRow}>
          <Text style={[styles.badgeText, { color: theme.gold }]}>
            آية وتدبر • {reflectionTheme}
          </Text>
          <IslamicEmblem size={15} color={theme.gold} fillColor="transparent" />
        </View>

        <Text
          style={[styles.verseTextMedium, { color: theme.textMain }]}
          numberOfLines={3}
        >
          ﴿ {text} ﴾
        </Text>

        <Text style={[styles.verseRefMedium, { color: theme.goldBright }]}>
          سورة {surah} • الآية {ayah}
        </Text>
      </View>
    );
  }

  // Large Daily Reflection
  return (
    <View style={styles.contentColBetween}>
      <View style={styles.largeTopHeader}>
        <Text style={[styles.largeCityLabel, { color: theme.textSecondary }]}>
          {reflectionTheme}
        </Text>
        <View style={styles.largeBadge}>
          <Text style={[styles.largeBadgeText, { color: theme.gold }]}>آية وتدبّر اليوم</Text>
          <IslamicEmblem size={15} color={theme.gold} fillColor="transparent" />
        </View>
      </View>

      <View style={styles.largeVerseContainer}>
        <Text style={[styles.verseTextLarge, { color: theme.textMain }]}>
          ﴿ {text} ﴾
        </Text>
        <Text style={[styles.verseRefLarge, { color: theme.goldBright }]}>
          سورة {surah} — الآية {ayah}
        </Text>
      </View>

      <View style={[styles.largeBottomQuote, { borderColor: theme.borderSoft }]}>
        <Text style={[styles.largeQuoteText, { color: theme.gold }]}>
          القرآن الكريم • ربيع القلوب ونور الصدور
        </Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Theme Colors Resolver                                                      */
/* -------------------------------------------------------------------------- */
function getThemeColors(theme: WidgetTheme) {
  switch (theme) {
    case 'mosque':
      return {
        bg: '#14110E',
        textMain: '#FFEED6',
        textSecondary: '#D0C4AC',
        textMuted: '#9B907B',
        gold: '#D6B46F',
        goldBright: '#FCE38A',
        border: 'rgba(214, 180, 111, 0.4)',
        borderSoft: 'rgba(255, 238, 214, 0.12)',
        highlightBg: 'rgba(214, 180, 111, 0.18)',
        scrimColor: 'rgba(12, 8, 5, 0.62)',   // warm dark — lets the carpet show
      };
    case 'emerald':
      return {
        bg: '#0A2018',
        textMain: '#F2FFF6',
        textSecondary: '#B9DFC8',
        textMuted: '#7AA88E',
        gold: '#E3C174',
        goldBright: '#FFEC9E',
        border: 'rgba(100, 200, 140, 0.35)',
        borderSoft: 'rgba(240, 255, 245, 0.12)',
        highlightBg: 'rgba(76, 175, 80, 0.22)',
        scrimColor: 'rgba(4, 28, 16, 0.72)',   // deep emerald tint
      };
    case 'gold':
      return {
        bg: '#FFF8EC',
        textMain: '#1C1407',
        textSecondary: '#5C4A2E',
        textMuted: '#8A7558',
        gold: '#9E7A2E',
        goldBright: '#C49A1E',
        border: '#DFC99F',
        borderSoft: 'rgba(158, 122, 46, 0.15)',
        highlightBg: 'rgba(214, 180, 111, 0.25)',
        scrimColor: 'rgba(255, 240, 200, 0.55)', // parchment tint
      };
    case 'glass':
      return {
        bg: 'rgba(30, 26, 22, 0.94)',
        textMain: '#FFEED6',
        textSecondary: '#C8BEAA',
        textMuted: '#8E8472',
        gold: '#D6B46F',
        goldBright: '#FCE38A',
        border: 'rgba(214, 180, 111, 0.3)',
        borderSoft: 'rgba(255, 238, 214, 0.08)',
        highlightBg: 'rgba(214, 180, 111, 0.15)',
        scrimColor: 'rgba(10, 8, 6, 0.74)',      // frosted glass over carpet
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  containerBase: {
    borderRadius: radius['2xl'],
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  containerSmall: {
    width: SMALL_W,
    height: SMALL_H,
  },
  containerMedium: {
    width: MEDIUM_W,
    height: MEDIUM_H,
  },
  containerLarge: {
    width: LARGE_W,
    height: LARGE_H,
  },
  bgImage: {
    borderRadius: radius['2xl'],
  },
  scrimOverlay: {
    ...StyleSheet.absoluteFill,
  },
  motifBg: {
    ...StyleSheet.absoluteFill,
    opacity: 0.08,
  },
  innerContent: {
    flex: 1,
    padding: 14,
    zIndex: 2,
  },
  innerSmall: {
    padding: 10,
  },

  /* Common Layout Helpers */
  contentColCentered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  contentRowBetween: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  contentColBetween: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 5,
  },
  badgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  /* Prayer Widget Styles */
  calligraphySmall: {
    fontFamily: fonts.prayers,
    fontSize: 34,
    lineHeight: 36,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  timePill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  adhanTimeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: 1,
  },
  countdownSub: {
    fontFamily: fonts.defaultMedium,
    fontSize: 11,
  },

  miniTimetable: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  miniPrayerRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniPrayerName: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
  },
  miniPrayerTime: {
    fontFamily: fonts.defaultMedium,
    fontSize: 11,
  },
  miniPrayerSummary: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  miniCity: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12,
  },
  miniAdhanNotice: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  prayerHeroRight: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  badgePillSmall: {
    marginBottom: 2,
  },
  badgeTextSmall: {
    fontFamily: fonts.defaultBold,
    fontSize: 10,
  },
  calligraphyMedium: {
    fontFamily: fonts.prayers,
    fontSize: 40,
    lineHeight: 44,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  countdownMedium: {
    fontFamily: fonts.defaultBold,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: 1.2,
  },
  countdownSubSmall: {
    fontFamily: fonts.defaultMedium,
    fontSize: 10.5,
  },

  largeTopHeader: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
  },
  largeBadge: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 5,
  },
  largeBadgeText: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  largeCityLabel: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12,
  },
  largeCenterHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    gap: 2,
  },
  calligraphyLarge: {
    fontFamily: fonts.prayers,
    fontSize: 52,
    lineHeight: 56,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  adhanTimeLarge: {
    fontFamily: fonts.defaultBold,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: 1.5,
  },
  countdownLargeSub: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12.5,
  },
  largeTableBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 8,
    gap: 3,
  },
  largeTableRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  largeTableName: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  largeTableTime: {
    fontFamily: fonts.defaultMedium,
    fontSize: 12,
  },
  largeNotice: {
    fontFamily: fonts.defaultMedium,
    fontSize: 11,
    textAlign: 'center',
  },

  /* Hijri Widget Styles */
  weekdaySmall: {
    fontFamily: fonts.hijriWeekday,
    fontSize: 30,
    lineHeight: 34,
    textAlign: 'center',
  },
  hijriDaySmall: {
    fontFamily: fonts.defaultBold,
    fontSize: 26,
    lineHeight: 28,
  },
  hijriMonthYearSmall: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
    textAlign: 'center',
  },
  weekdayMedium: {
    fontFamily: fonts.hijriWeekday,
    fontSize: 38,
    lineHeight: 44,
    textAlign: 'center',
  },
  hijriDateRowMedium: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  hijriDayNumberMedium: {
    fontFamily: fonts.defaultBold,
    fontSize: 30,
    lineHeight: 32,
  },
  monthClipBoxMedium: {
    height: 30,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  hijriMonthCalligraphyMedium: {
    fontFamily: fonts.hijriMonth,
    fontSize: 30,
    lineHeight: 30,
    marginTop: -2,
    textAlign: 'center',
  },
  hijriYearMedium: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
  },
  weekdayLarge: {
    fontFamily: fonts.hijriWeekday,
    fontSize: 48,
    lineHeight: 52,
    textAlign: 'center',
  },
  largeDateDisplayRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 12,
    justifyContent: 'center',
    marginVertical: 4,
  },
  largeDayNumber: {
    fontFamily: fonts.defaultBold,
    fontSize: 42,
    lineHeight: 46,
  },
  largeMonthClipBox: {
    height: 42,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  largeMonthCalligraphy: {
    fontFamily: fonts.hijriMonth,
    fontSize: 40,
    lineHeight: 40,
    textAlign: 'center',
  },
  largeYearLabel: {
    fontFamily: fonts.defaultBold,
    fontSize: 18,
    lineHeight: 22,
  },
  largeBottomQuote: {
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  largeQuoteText: {
    fontFamily: fonts.quran,
    fontSize: 13,
    textAlign: 'center',
  },

  /* Last Read Widget Styles */
  surahNameSmall: {
    fontFamily: fonts.surahName,
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
  },
  ayahBadgeSmall: {
    fontFamily: fonts.defaultBold,
    fontSize: 14,
  },
  pageSubSmall: {
    fontFamily: fonts.defaultMedium,
    fontSize: 10,
    textAlign: 'center',
  },
  surahNameMedium: {
    fontFamily: fonts.surahName,
    fontSize: 38,
    lineHeight: 42,
    textAlign: 'center',
  },
  lastReadMetaRow: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 8,
    justifyContent: 'center',
  },
  metaPillBox: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  metaPillText: {
    fontFamily: fonts.defaultBold,
    fontSize: 11,
  },
  preTitleLarge: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  surahNameLarge: {
    fontFamily: fonts.surahName,
    fontSize: 48,
    lineHeight: 52,
    textAlign: 'center',
  },
  ayahLargeNumber: {
    fontFamily: fonts.defaultBold,
    fontSize: 20,
    lineHeight: 24,
  },
  largeDetailsGrid: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  detailCol: {
    alignItems: 'center',
    gap: 2,
  },
  detailLabel: {
    fontFamily: fonts.defaultMedium,
    fontSize: 11,
  },
  detailValue: {
    fontFamily: fonts.defaultBold,
    fontSize: 15,
  },

  /* Daily Ayah Widget Styles */
  verseTextSmall: {
    fontFamily: fonts.quran,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  verseRefSmall: {
    fontFamily: fonts.defaultBold,
    fontSize: 10.5,
  },
  verseTextMedium: {
    fontFamily: fonts.quran,
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'center',
  },
  verseRefMedium: {
    fontFamily: fonts.defaultBold,
    fontSize: 12,
  },
  largeVerseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  verseTextLarge: {
    fontFamily: fonts.quran,
    fontSize: 21,
    lineHeight: 36,
    textAlign: 'center',
  },
  verseRefLarge: {
    fontFamily: fonts.defaultBold,
    fontSize: 13,
  },
});
