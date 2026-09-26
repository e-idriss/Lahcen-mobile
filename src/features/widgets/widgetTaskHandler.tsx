/**
 * Headless task handler for `react-native-android-widget`.
 *
 * Android invokes this in a short-lived JS context on widget add, on the
 * `updatePeriodMillis` schedule from app.json, and when we call
 * `requestWidgetUpdate`. It has no app state — it reads the mirrored blob
 * written by `refreshWidgetData` and renders from that.
 */

import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { placeholderWidgetData, readWidgetData } from './widgetData';
import { renderWidget, type WidgetName } from './WidgetViews';

const KNOWN_WIDGETS: WidgetName[] = ['NextPrayer', 'HijriDate', 'LastRead', 'DailyAyah'];

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const widgetName = props.widgetInfo.widgetName as WidgetName;
  if (!KNOWN_WIDGETS.includes(widgetName)) return;

  const data = (await readWidgetData()) ?? placeholderWidgetData();

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(renderWidget(widgetName, data));
      break;
    case 'WIDGET_CLICK':
      // clickAction OPEN_APP is handled natively; nothing to do here.
      break;
    case 'WIDGET_DELETED':
      break;
  }
}
