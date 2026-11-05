# Football Legacy — Android

Нативная часть отделена от сайта. Игровые исходники подключаются из `../website/src/`; изображения — из `../website/public/`. Копировать игровой код между приложениями не требуется.

## Запуск сборки

После `npm ci` в корне:

```sh
# Из этой папки:
npm run sync
npm run apk
npm run open
```

Из корня доступны `npm run android:sync`, `npm run android:apk`, `npm run android:open`.

Требования: Node.js 22+, полный JDK 21, Android SDK API 36 и Build Tools 35/36. Используйте `JAVA_HOME`/`ANDROID_HOME` или локальный `android/local.properties`. В подготовленной облачной среде helper также обнаруживает SDK и JDK под `/workspace`. Наследуемые настройки HTTPS-прокси и CA сохраняются, TLS и проверки Gradle checksum включены.

- Android Studio: проект **`android/`** внутри этой папки.
- Результат: **`android/app/build/outputs/apk/debug/app-debug.apk`**.
- Package ID: `com.footballlegacy.career`.
- Минимальная версия: Android 7.0 / API 24.
- Версия оболочки: 0.2.1 / versionCode 3.

`src/main.ts` сначала подключает `src/native-export.ts`, затем запускает интерфейс из веб-проекта. Нативный экспорт пишет JSON в cache и открывает системное меню «Поделиться». `capacitor.config.ts` упаковывает локальный `dist/`, без сервера разработчика. `npm run sync` обязательно выполнять после изменения web-кода; `npm run apk` делает это автоматически.

Ключи подписи и локальные настройки SDK не включаются в исходники. В существующей облачной среде debug-ключ сохранён для установки поверх старых APK. Для магазина нужен ваш собственный release-ключ; debug APK предназначен для тестирования.

Сохранения браузера и Android раздельные, при переносе используйте JSON. Удаление приложения удаляет его локальные данные. Сборка не означает проверку на физическом устройстве.
