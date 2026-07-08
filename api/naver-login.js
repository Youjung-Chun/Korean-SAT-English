// 네이버 로그인 시작: 네이버 인증 페이지로 보냄
export default function handler(req, res) {
  // CSRF 방지용 무작위 state 생성
  const state =
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NAVER_CLIENT_ID,
    redirect_uri: `https://${req.headers.host}/api/naver-callback`,
    state,
  });

  // state를 쿠키에 저장 (10분 유효) — 콜백에서 검증
  res.setHeader(
    "Set-Cookie",
    `naver_state=${state}; Path=/; HttpOnly; Secure; Max-Age=600; SameSite=Lax`
  );

  res.redirect(302, `https://nid.naver.com/oauth2.0/authorize?${params}`);
}
