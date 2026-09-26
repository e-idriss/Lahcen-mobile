/**
 * Mushaf Illuminated Frame Component.
 *
 * Renders authentic Islamic manuscript decorations:
 * - Pages 1 & 2: Authentic illuminated Persian/Islamic opening carpet border (`opening-frame.jpeg`) for Al-Fatihah & Al-Baqarah
 * - Pages 3 to 604: Outer and inner golden decorative border with 4 corner arabesques and safe breathing margins
 * - Translucent Royal Red Bookmark Silk Ribbon when a page is saved
 */

import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  width: number;
  height: number;
  page?: number;
  isBookmarked?: boolean;
}

export function MushafFrame({ children, width, height, page = 1, isBookmarked = false }: Props) {
  const { colors, isDark } = useTheme();
  const isOpeningPage = page === 1 || page === 2;

  // Corner ornament dimension and compact frame margins
  const cornerSize = 14;
  const framePadding = 4;

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: isOpeningPage ? 0 : 8,
          backgroundColor: colors.bg,
        },
      ]}
    >
      {isOpeningPage ? (
        <>
          {/* Authentic Illuminated Opening Carpet Frame - Full Edge-to-Edge Bleed */}
          <Image
            source={require('../../../assets/images/opening-frame.jpeg')}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
          />

          {/* Center Illuminated Parchment Area for Al-Fatihah & Al-Baqarah Opening */}
          <View
            style={[
              styles.contentBody,
              {
                paddingHorizontal: Math.round(width * 0.17),
                paddingTop: Math.max(70, Math.round(height * 0.16)),
                paddingBottom: Math.max(70, Math.round(height * 0.16)),
                justifyContent: 'center',
              },
            ]}
          >
            {children}
          </View>
        </>
      ) : (
        <>
          {/* Background Frame Layer (SVG) */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={width} height={height}>
              {/* Outer Border */}
              <Rect
                x={framePadding}
                y={framePadding}
                width={width - framePadding * 2}
                height={height - framePadding * 2}
                rx={6}
                ry={6}
                fill="none"
                stroke={colors.gold}
                strokeWidth={1.2}
                strokeOpacity={isDark ? 0.7 : 0.85}
              />

              {/* Inner Hairline Border */}
              <Rect
                x={framePadding + 3}
                y={framePadding + 3}
                width={width - (framePadding + 3) * 2}
                height={height - (framePadding + 3) * 2}
                rx={4}
                ry={4}
                fill="none"
                stroke={colors.goldSoft}
                strokeWidth={0.6}
                strokeOpacity={isDark ? 0.4 : 0.6}
              />

              {/* Top-Right Corner Flourish */}
              <G transform={`translate(${width - framePadding - cornerSize}, ${framePadding})`}>
                <Path
                  d={`M 0,0 L ${cornerSize},0 L ${cornerSize},${cornerSize} C ${cornerSize - 4},${cornerSize - 4} ${cornerSize - 8},4 0,0 Z`}
                  fill={colors.gold}
                  fillOpacity={0.25}
                />
                <Circle cx={cornerSize - 3} cy={3} r={1.2} fill={colors.gold} />
              </G>

              {/* Top-Left Corner Flourish */}
              <G transform={`translate(${framePadding}, ${framePadding})`}>
                <Path
                  d={`M 0,0 L ${cornerSize},0 C 8,4 4,${cornerSize - 4} 0,${cornerSize} Z`}
                  fill={colors.gold}
                  fillOpacity={0.25}
                />
                <Circle cx={3} cy={3} r={1.2} fill={colors.gold} />
              </G>

              {/* Bottom-Right Corner Flourish */}
              <G transform={`translate(${width - framePadding - cornerSize}, ${height - framePadding - cornerSize})`}>
                <Path
                  d={`M ${cornerSize},0 L ${cornerSize},${cornerSize} L 0,${cornerSize} C 8,${cornerSize - 4} ${cornerSize - 4},8 ${cornerSize},0 Z`}
                  fill={colors.gold}
                  fillOpacity={0.25}
                />
                <Circle cx={cornerSize - 3} cy={cornerSize - 3} r={1.2} fill={colors.gold} />
              </G>

              {/* Bottom-Left Corner Flourish */}
              <G transform={`translate(${framePadding}, ${height - framePadding - cornerSize})`}>
                <Path
                  d={`M 0,0 C 4,8 8,${cornerSize - 4} ${cornerSize},${cornerSize} L 0,${cornerSize} Z`}
                  fill={colors.gold}
                  fillOpacity={0.25}
                />
                <Circle cx={3} cy={cornerSize - 3} r={1.2} fill={colors.gold} />
              </G>
            </Svg>
          </View>

          {/* 15-Line Mushaf Body Content with guaranteed border clearance across all 604 pages */}
          <View style={[styles.contentBody, { paddingHorizontal: 16, paddingVertical: 8 }]}>
            {children}
          </View>
        </>
      )}

      {/* Elegant Translucent Bookmark Silk Ribbon (Does not obstruct text) */}
      {isBookmarked && (
        <View
          style={[
            styles.bookmarkRibbon,
            { left: isOpeningPage ? Math.round(width * 0.19) : 22 },
          ]}
          pointerEvents="none"
        >
          <Svg width={16} height={30} viewBox="0 0 16 30">
            {/* Soft Shadow */}
            <Path
              d="M 0,0 L 16,0 L 16,28 L 8,21 L 0,28 Z"
              fill="#000000"
              opacity={0.12}
              transform="translate(1, 1)"
            />
            {/* Translucent Red Ribbon Body */}
            <Path
              d="M 0,0 L 16,0 L 16,28 L 8,21 L 0,28 Z"
              fill="#C92A2A"
              fillOpacity={0.78}
            />
            {/* Top Gold Stitch */}
            <Path
              d="M 0,0 L 16,0 L 16,2.5 L 0,2.5 Z"
              fill={colors.gold}
              fillOpacity={0.9}
            />
            {/* Center Stitch */}
            <Path
              d="M 8,4.5 L 8,18"
              stroke="#FFFFFF"
              strokeOpacity={0.7}
              strokeWidth={1}
              strokeDasharray="2,2"
            />
          </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    borderRadius: 8,
  },
  contentBody: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
  },
  bookmarkRibbon: {
    position: 'absolute',
    top: 0,
    zIndex: 50,
    elevation: 4,
  },
});
