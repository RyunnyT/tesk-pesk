@echo off
chcp 65001 > nul
echo Tesk 배포 시작...
echo.

:: HTML 파일만 임시 폴더에 복사해서 배포 (dist/build 제외)
set DEPLOY_DIR=%TEMP%\tesk-deploy-%RANDOM%
mkdir "%DEPLOY_DIR%"

echo HTML 파일 복사 중...
copy "*.html" "%DEPLOY_DIR%\" > nul
copy "vercel.json" "%DEPLOY_DIR%\" > nul

echo 배포 폴더: %DEPLOY_DIR%
echo.

where npx >nul 2>nul
if errorlevel 1 (
    echo Node.js/npx 가 없습니다. https://nodejs.org 에서 설치해주세요.
    rmdir /s /q "%DEPLOY_DIR%"
    pause
    exit /b 1
)

REM [보안] 기존에 하드코딩돼 있던 Vercel 토큰은 제거했습니다.
REM 그 토큰은 이미 노출됐으므로 Vercel 대시보드 → Settings → Tokens 에서 반드시 폐기(revoke)하세요.
REM 이 프로젝트는 Cloudflare Pages 로 일원화되었습니다. 이 파일은 더 이상 사용하지 않는 참고용 아카이브입니다.
echo Vercel 배포 중...
npx vercel "%DEPLOY_DIR%" --token "%VERCEL_TOKEN%" --yes --prod

echo.
echo 임시 폴더 정리 중...
rmdir /s /q "%DEPLOY_DIR%"

echo.
echo 완료! 위의 URL로 접속해보세요.
pause
