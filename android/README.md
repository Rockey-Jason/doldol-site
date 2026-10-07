# 돌이사이트 Android 앱

이 프로젝트는 GitHub Pages의 돌이사이트 PWA를 Trusted Web Activity(TWA)로 실행하는 Android 앱입니다.

- Package: com.rockey.doldolsite
- Start URL: https://rockey-jason.github.io/doldol-site/
- targetSdk: 36
- minSdk: 23

## 1. 출시용 서명키 만들기

서명키는 GitHub 저장소에 절대 커밋하지 않습니다.

Windows PowerShell에서 keytool을 사용할 수 있다면:

    keytool -genkeypair -v -keystore doldol-upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias doldol-upload

생성된 doldol-upload-keystore.jks는 안전한 곳에 백업합니다.

SHA-256 확인:

    keytool -list -v -keystore doldol-upload-keystore.jks -alias doldol-upload

출력의 SHA256 값을 확인합니다.

## 2. GitHub Secrets 등록

GitHub 저장소의 Settings → Secrets and variables → Actions → New repository secret에서 다음 4개를 등록합니다.

- DOLDOL_KEYSTORE_BASE64
- DOLDOL_KEYSTORE_PASSWORD
- DOLDOL_KEY_ALIAS
- DOLDOL_KEY_PASSWORD

JKS를 Base64로 변환하는 PowerShell:

    [Convert]::ToBase64String([IO.File]::ReadAllBytes(".\doldol-upload-keystore.jks")) | Set-Clipboard

클립보드 내용을 DOLDOL_KEYSTORE_BASE64에 넣습니다.

## 3. 자동 빌드

Build Doldol Android App workflow를 실행하면:

1. GitHub Secret에서 JKS를 임시 복원
2. release APK/AAB 서명
3. JKS의 실제 SHA-256 인증서 지문 계산
4. .well-known/assetlinks.json 자동 생성
5. 변경된 assetlinks.json을 GitHub에 자동 커밋
6. release APK/AAB를 Actions Artifact로 업로드
7. 작업 종료 후 임시 JKS 삭제

즉, SHA-256을 직접 복사해서 코드에 하드코딩하지 않아도 됩니다.

## 4. 중요한 Google Play 주의사항

Google Play App Signing을 사용하면 Play가 사용하는 앱 서명 인증서와 업로드에 사용하는 upload key 인증서가 서로 다를 수 있습니다.

Play Console에서 앱 서명 인증서의 SHA-256을 확인한 뒤, 실제 Play 설치 앱까지 TWA 검증을 확실하게 하려면 해당 지문도 assetlinks.json에 추가해야 합니다.

현재 자동화는 저장소의 release/upload keystore 지문을 자동 반영합니다. Play Console에서 App Signing certificate SHA-256을 확인한 후에는 그 지문을 두 번째 값으로 추가하는 단계를 진행해야 합니다.

## 5. 최종 출시 흐름

    upload keystore 생성
            ↓
    GitHub Secrets 등록
            ↓
    Actions release AAB 빌드
            ↓
    SHA-256 자동 계산
            ↓
    .well-known/assetlinks.json 자동 반영
            ↓
    Play Console AAB 업로드
            ↓
    Play App Signing 인증서 SHA-256 확인
            ↓
    assetlinks.json에 Play 서명 지문 추가
            ↓
    TWA 전체화면 검증

현재 workflow는 debug APK/AAB와 release APK/AAB를 모두 생성합니다.
android/doldol-upload-keystore.jks는 보안을 위해 workflow 실행 중에만 임시 생성되며 artifact로 업로드되지 않습니다.
