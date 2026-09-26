# Finaliser : Widgets + Notifications adhan + corrections prod

Tout le **code** est écrit. Il reste à installer 3 paquets natifs, vérifier, et
builder. À faire quand le réseau npm est stable (l'environnement de dev ici
timeoutait sur `registry.npmjs.org`).

## 1. Installer les paquets natifs

```bash
cd mobile
npx expo install expo-notifications react-native-android-widget @bacons/apple-targets
```

Ces trois-là sont référencés par le code déjà en place :
- `expo-notifications` → `src/features/prayer/prayerNotifications.ts`
- `react-native-android-widget` → `src/features/widgets/*` (widgets Android)
- `@bacons/apple-targets` → `targets/widgets/*` (widgets iOS WidgetKit) + `src/features/widgets/iosWidgetBridge.ts`

## 2. Vérifier

```bash
npx tsc --noEmit
npm test
npx expo-doctor
```

Corriger ce qui casse. Points d'attention connus :
- `prayerNotifications.ts` utilise `Notifications.SchedulableTriggerInputTypes.DATE`
  et `scheduleNotificationAsync` — API expo-notifications SDK 53+. Si la version
  installée diffère, ajuster la forme du `trigger`.
- `react-native-android-widget` : vérifier la signature de `WidgetTaskHandlerProps`
  et `requestWidgetUpdate` contre la version installée (`widgetTaskHandler.tsx`,
  `src/features/widgets/index.ts`).
- `@bacons/apple-targets` : l'API `ExtensionStorage` dans `iosWidgetBridge.ts` —
  confirmer le nom de la classe et `reloadWidget()` dans la doc de la version.

## 3. Config à compléter dans `app.json`

- `owner` est `"idriss5"` : vérifier que le projet EAS `eb1ca329-…` appartient
  bien à ce compte (`eas whoami`, `eas project:info`).
- L'App Group iOS `group.com.idriss.quran.widgets` doit être créé dans le
  portail Apple Developer et coché sur l'app ID + le widget target.
- `@bacons/apple-targets` peut demander `ios.appleTeamId` — l'ajouter.

## 4. Builder un dev client pour tester sur ton téléphone

Les widgets et notifications ne marchent **pas dans Expo Go** — il faut un
*development build*.

```bash
# Android (le plus simple, câble USB ou QR)
eas build --profile development --platform android

# iOS (nécessite un compte Apple Developer payant)
eas build --profile development --platform ios
```

Installe l'APK/IPA, lance `npx expo start --dev-client`, ouvre l'app.

### Tester les widgets Android
1. Appui long sur l'écran d'accueil → Widgets
2. Cherche « Quran » → 4 widgets : الصلاة القادمة, التاريخ الهجري, متابعة الورد, آية وتدبر
3. Ajoute-en un. Il se remplit au prochain lancement de l'app (ou via le
   bouton « تحديث الودجات » dans l'écran Widgets de l'app).

### Tester les notifications
1. Réglages → active « تنبيه الأذان » (demande la permission notifications)
2. Vérifie les notifications programmées : elles couvrent 7 jours, 5 prières/jour
3. Sur Android 13+, accepte aussi la permission « alarmes exactes » si demandée

## 5. Ce qui a été corrigé (P0/P1/P2)

| Correction | Fichier |
|---|---|
| Versions Expo alignées (17 paquets) | `package.json` |
| `runtimeVersion: appVersion` (OTA cohérent) | `app.json` |
| `UIBackgroundModes: [audio]` (audio background iOS) | `app.json` |
| Permissions Android élaguées (retiré RECORD_AUDIO, READ/WRITE_EXTERNAL_STORAGE, READ_MEDIA_VIDEO/AUDIO) | `app.json` |
| Notifications adhan programmées | `src/features/prayer/prayerNotifications.ts` + `prayerStore.ts` + `_layout.tsx` |
| Vrais widgets Android (4) | `src/features/widgets/` |
| Vrais widgets iOS (4, WidgetKit) | `targets/widgets/` + `iosWidgetBridge.ts` |
| Qibla : heading vrai corrigé de la déclinaison magnétique (via `Location.watchHeadingAsync`, fallback magnétomètre) | `app/qibla.tsx` + `qiblaService.ts` |
| Images de fond recompressées (−4 Mo bundle) | `assets/images/prayer.jpg`, `quran.jpg` (backups: `/tmp/*.bak.jpg`) |
| Libellé toggle adhan clarifié | `app/(tabs)/settings.tsx` |

## 6. Reste en dette (non bloquant prod, à faire plus tard)

- Fonts inutilisées : `assets/fonts/Aalmaghribi-pg74r.ttf`,
  `Almaghribi Warsh-Quran.ttf`, `assets/images/lahcen.svg` — peuvent être
  supprimées.
- `expo-file-system/legacy` utilisé dans plusieurs services — migrer vers la
  nouvelle API avant qu'elle soit retirée.
- Guard test alef wasla (`U+0671`) existe pour la table `ayahs` (Hafs) mais pas
  `ayahs_warsh` — ajouter le même test.
- Vérif device obligatoire avant prod : Android réel (rendu arabe, clipping
  diacritiques, direction pager RTL, cold start < 2s), iPhone SE + grand,
  thèmes clair/sombre.
