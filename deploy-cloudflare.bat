@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   TESK ^& PESK  Cloudflare Pages 배포
echo ============================================
echo.

set DEPLOY_DIR=%TEMP%\tesk-cf-%RANDOM%
mkdir "%DEPLOY_DIR%"

echo [1/6] 웹 HTML 복사 (위젯 index.html 과 밑줄로 시작하는 확인용 파일 제외)...
for %%F in ("%~dp0*.html") do (
    set "FN=%%~nxF"
    rem 밑줄로 시작하는 파일(_local.html, _rating_lab.html 등)은 개발 확인용이라 배포하지 않는다
    if /I not "!FN!"=="index.html" if not "!FN:~0,1!"=="_" copy "%%F" "%DEPLOY_DIR%\" >nul
)

echo [2/6] 공통 모듈(shared/) 복사...
if exist "%~dp0shared" (
    mkdir "%DEPLOY_DIR%\shared"
    copy "%~dp0shared\*.js" "%DEPLOY_DIR%\shared\" >nul
    if exist "%~dp0shared\*.css" copy "%~dp0shared\*.css" "%DEPLOY_DIR%\shared\" >nul
)

echo [3/6] PWA 자산(매니페스트/서비스워커/아이콘) + 아바타 스프라이트 복사...
for %%A in (pesk-manifest.json pesk-service-worker.js pesk-icon-192.png pesk-icon-512.png pesk-icon.svg avatar-sprites.js avatar-extras.js avatar-female.js pet-sprites.js boss-sprites.js quiz-bank.js quiz-rating.js rpg-monsters.js) do (
    if exist "%~dp0%%A" copy "%~dp0%%A" "%DEPLOY_DIR%\" >nul
)

echo [4/6] 라우팅 설정(_redirects) 복사 + 루트(/) = landing 설정...
if exist "%~dp0_redirects" copy "%~dp0_redirects" "%DEPLOY_DIR%\" >nul
REM 루트(/)에서 학생/교사 진입점인 landing 이 뜨도록 index.html 로 복사.
REM (위젯 전용 index.html 은 위 [1/6]에서 이미 제외했습니다.)
if exist "%DEPLOY_DIR%\landing.html" copy "%DEPLOY_DIR%\landing.html" "%DEPLOY_DIR%\index.html" >nul

echo [5/6] 배포 대상:
dir /b "%DEPLOY_DIR%"
echo.

where npx >nul 2>nul
if errorlevel 1 (
    echo Node.js/npx 가 없습니다. https://nodejs.org 에서 설치해주세요.
    rmdir /s /q "%DEPLOY_DIR%"
    pause
    exit /b 1
)

echo [6/6] Cloudflare Pages 배포 중...
cd /d "%DEPLOY_DIR%"
call npx wrangler pages deploy . --project-name=tesk-pesk --branch=main --commit-dirty=true

cd /d "%~dp0"
rmdir /s /q "%DEPLOY_DIR%"

echo.
echo ============================================
echo   배포 완료. 위 URL 확인:
echo     /          - 학생/교사 로그인(landing)
echo     /teacher   - 교사 대시보드
echo     /master    - 마스터 관리자
echo ============================================
pause
