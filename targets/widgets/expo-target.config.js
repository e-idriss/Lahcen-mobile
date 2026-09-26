/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'QuranWidgets',
  icon: '../../assets/logo.png',
  colors: {
    $accent: '#B08D57',
    $widgetBackground: '#14110E',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.idriss.quran.widgets'],
  },
};
