// ─────────────────────────────────────────────────────────────
// Tesk & Pesk 공통 설정 (단일 소스)
//
// 이전에는 firebaseConfig 와 마스터 이메일이 landing/master/pesk/
// tesk_teacher_v2 등 여러 HTML 파일에 복붙돼 있었습니다.
// 이제 이 파일 하나만 고치면 모든 웹 페이지에 반영됩니다.
//
// 사용:  import { firebaseConfig, MASTER_EMAILS } from './shared/firebase-config.js';
//
// 주의: index.html(데스크톱 위젯, file:// 로컬 로드)은 모듈 import 가
//       제약돼 자체 설정을 유지합니다. 위젯 설정을 바꿀 땐 index.html 도 함께 수정하세요.
// ─────────────────────────────────────────────────────────────

// Firebase 웹 설정. apiKey 는 비밀이 아니지만(Firebase 특성), 노출 최소화를 위해
// Firebase 콘솔에서 App Check + API 키 도메인 제한을 거는 것을 권장합니다.
export const firebaseConfig = {
  apiKey: "AIzaSyA41ZYobXjCtGcSN8N7UJ2XkzrH9ef39EY",
  authDomain: "tesk-pesk.firebaseapp.com",
  projectId: "tesk-pesk",
  storageBucket: "tesk-pesk.firebasestorage.app",
  messagingSenderId: "619304025482",
  appId: "1:619304025482:web:27d72258009ec6b9d49c73"
};

// 마스터(전체 관리자) 허용 이메일. 변경 시 firestore.rules, firestore.secure.rules,
// functions/teacher-access.js도 함께 갱신해야 합니다. 서버는 인증된 이메일만 신뢰합니다.
export const MASTER_EMAILS = ['asx0203@gmail.com'];

// 주식 시세 Worker 주소. 배포(worker/) 후 나오는 https://....workers.dev 를 넣으면
// 교사 대시보드가 공용 프록시 대신 이 Worker 로 시세를 빠르게 가져옵니다.
// 비워두면 기존 프록시 방식으로 자동 폴백합니다(동작 변화 없음).
export const STOCK_PRICE_WORKER_URL = 'https://stock-price-worker.asx0203.workers.dev';

// 경제 로직을 서버(Cloud Functions)로 처리할지 여부.
//  false → 기존 클라이언트 트랜잭션 방식(함수 배포 전 기본값, 동작 변화 없음)
//  true  → 경제 서버 호출 (전체 경제 경로 이전 전에는 켜지 않는다)
// 학생 인증은 아래 별도 플래그로 전환한다. STUDENT-AUTH.md 참조.
export const USE_SERVER_ECONOMY = false;

// 서버 인증은 경제 로직 이전과 독립적이다. 서버 배포·검증 및 학생 인증 규칙 전환과
// 함께 켠다. 서버가 없는 상태에서 켜거나 오류 시 공개 계정 조회로 폴백하지 않는다.
export const USE_SERVER_STUDENT_AUTH = false;

// ─────────────────────────────────────────────────────────────
// Pesk 체험(데모) 계정
//
// 랜딩 페이지의 "체험해보기" 버튼이 쓰는 학급/계정 정보입니다.
// 처음 켜는 순서:
//   1) 교사 대시보드에서 체험용 학급을 하나 만든다 (예: "Pesk 체험반")
//   2) 학생을 몇 명 추가하고 [계정] 탭에서 아이디/비밀번호를 만든 뒤,
//      반드시 [저장] 버튼으로 비밀번호를 한 번 더 저장한다.
//      → 이래야 mustChangePassword 가 꺼져서, 체험자가 비밀번호를
//        바꿔버리는 바람에 다음 사람이 못 들어오는 일이 없습니다.
//   3) 그 학급의 6자리 코드와 계정들을 아래에 적고 enabled: true 로 바꾼다.
//
// accounts 를 여러 개 넣으면 접속자마다 무작위로 하나가 배정돼서,
// 동시에 여러 명이 체험해도 서로 덜 부딪힙니다.
// enabled: false 이면 버튼 자체가 숨겨집니다(설정 전 기본값).
// ─────────────────────────────────────────────────────────────
export const PESK_DEMO = {
  enabled: false,
  classCode: '',            // 예: '123456'
  accounts: []              // 예: [{id:'demo1', pw:'123456'}, {id:'demo2', pw:'123456'}]
};

// 전역에서도 접근할 수 있게 노출 (모듈 import 가 어려운 일부 스크립트 호환용)
if (typeof window !== 'undefined') {
  window.TESK_FIREBASE_CONFIG = firebaseConfig;
  window.TESK_MASTER_EMAILS = MASTER_EMAILS;
  window.TESK_USE_SERVER_ECONOMY = USE_SERVER_ECONOMY;
  window.TESK_USE_SERVER_STUDENT_AUTH = USE_SERVER_STUDENT_AUTH;
  window.TESK_STOCK_WORKER_URL = STOCK_PRICE_WORKER_URL;
  window.TESK_PESK_DEMO = PESK_DEMO;
}
