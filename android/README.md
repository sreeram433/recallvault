# RecallVault Android companion

Kotlin + Jetpack Compose app that registers **Save to RecallVault** in the Android share sheet.

It receives only `ACTION_SEND` `text/plain` (the URL/text the user chose). It does not log into Instagram, scrape, download media, or auto-open the received URL.

## Open in Android Studio

1. Open the `android/` folder as a project.
2. Let Gradle sync (Android SDK 35, JDK 17).
3. Set `API_BASE_URL` in `app/build.gradle.kts` to your machine’s LAN address running the Next.js app.
4. Run on a device or emulator.

If the wrapper jar is missing:

```bash
cd android
gradle wrapper --gradle-version 8.9
```

## Pairing

1. Run the web app and open Settings → **Create pairing code**.
2. Enter the code in the Android app.
3. Shared items then sync to `POST /api/v1/imports/share-target`.
4. If the phone is offline or unpaired, the item stays in an **encrypted pending queue** (Android Keystore / EncryptedFile) and WorkManager retries later.

## Tests

```bash
cd android
./gradlew :app:testDebugUnitTest
```

Validator tests cover Instagram type detection, tracking-param stripping, private-IP rejection, and share-text extraction.
