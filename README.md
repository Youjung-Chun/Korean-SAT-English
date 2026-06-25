[README.txt](https://github.com/user-attachments/files/29343312/README.txt)
수능 영어 분석 사이트 — Vercel 배포용 파일
==========================================

이 폴더 안에는 두 개의 파일이 있습니다:
  - index.html        : 학생이 보는 사이트 화면
  - api/analyze.js    : API 키를 숨겨서 Claude를 부르는 서버 함수

배포 방법은 채팅에 적어 드린 순서를 그대로 따라 하시면 됩니다.
핵심: 키는 코드에 적지 말고, Vercel의 "환경변수(Environment Variables)"에
이름 ANTHROPIC_API_KEY 로 넣으세요.
