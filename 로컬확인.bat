@echo off
chcp 65001 > nul
cd /d "%~dp0"
title Pesk 로컬 확인 (이 창을 닫으면 꺼집니다)

echo ============================================
echo   Pesk 로컬 확인
echo ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [X] Python 이 설치되어 있지 않습니다.
    echo     https://www.python.org 에서 설치한 뒤 다시 실행해주세요.
    echo.
    pause
    exit /b 1
)

echo  잠시 후 브라우저에 ^"학생 로그인 화면^" 이 열립니다.
echo  학급코드 -^> 아이디/비밀번호로 들어간 뒤
echo  마이룸 -^> 모험 탭을 보시면 됩니다.
echo.
echo   다른 화면도 보시려면 주소창에
echo     http://localhost:8765/_rating_lab.html      문항^·레이팅 확인 (로그인 불필요)
echo     http://localhost:8765/tesk_teacher_v2.html  교사 화면
echo     http://localhost:8765/_local.html           위 세 가지 모아보기
echo.
echo  * 끝낼 때는 이 창을 닫거나 Ctrl+C 를 누르세요.
echo ============================================
echo.

rem 서버가 뜰 시간을 준 뒤 학생 로그인 화면(landing)을 연다.
rem 로컬의 index.html 은 데스크톱 위젯 전용이라 "/" 로 열면 안 된다.
rem (배포할 때만 landing.html 이 index.html 로 복사된다)
start "" /b powershell -NoProfile -Command "Start-Sleep 2; Start-Process 'http://localhost:8765/landing.html'"

rem 서버는 이 창에서 돈다. 창을 닫으면 함께 꺼진다.
python -m http.server 8765

echo.
echo 서버가 꺼졌습니다.
pause