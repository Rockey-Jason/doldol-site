# 돌이사이트 Android 앱

현재 GitHub Pages의 돌이사이트 PWA를 Trusted Web Activity(TWA)로 실행하는 Android 앱입니다.

- Package: com.rockey.doldolsite
- Start URL: https://rockey-jason.github.io/doldol-site/
- targetSdk: 36
- minSdk: 23

## Google Play 출시 전 필수 작업

1. Play Console에서 앱을 생성합니다.
2. release/upload 키를 준비합니다.
3. SHA-256 인증서 지문을 확인합니다.
4. 웹사이트의 /.well-known/assetlinks.json에 다음 앱 정보와 지문을 넣습니다.
5. release 서명을 연결한 뒤 AAB를 빌드합니다.
6. Play Console에 AAB를 업로드합니다.

현재 workflow는 테스트용 debug APK/AAB를 자동 생성합니다. Play 출시용 release 서명은 비밀키를 GitHub 저장소에 직접 커밋하지 않도록 별도 Secrets/환경에서 연결해야 합니다.
