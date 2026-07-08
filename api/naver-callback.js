// 네이버 콜백: 코드 → 토큰 → 사용자 정보 → Supabase 유저 생성 → 세션 발급
export default async function handler(req, res) {
  try {
    const { code, state, error } = req.query;

    // 사용자가 네이버에서 취소했거나 에러
    if (error) {
      return res.redirect(302, `/?error=naver_${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return res.redirect(302, "/?error=naver_missing_code");
    }

    // CSRF 검증: 쿠키의 state와 일치해야 함
    const cookies = Object.fromEntries(
      (req.headers.cookie || "")
        .split(";")
        .map((c) => c.trim().split("=").map(decodeURIComponent))
        .filter((p) => p.length === 2)
    );
    if (cookies.naver_state !== state) {
      return res.redirect(302, "/?error=naver_invalid_state");
    }

    // 1) 인가 코드 → 액세스 토큰
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.NAVER_CLIENT_ID,
      client_secret: process.env.NAVER_CLIENT_SECRET,
      code,
      state,
    });
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?${tokenParams}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(302, "/?error=naver_token_failed");
    }

    // 2) 액세스 토큰 → 네이버 사용자 정보 (이름)
    const meRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const meData = await meRes.json();
    if (meData.resultcode !== "00" || !meData.response?.id) {
      return res.redirect(302, "/?error=naver_userinfo_failed");
    }
    const naverId = meData.response.id;
    const name = meData.response.name || "네이버 회원";

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminHeaders = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    // 네이버는 이메일을 안 주므로 내부용 가짜 이메일로 회원 식별
    const email = `nv_${naverId}@naver-users.liel.app`;

    // 3) Supabase에 사용자 생성 (이미 있으면 에러 나지만 무시하고 진행)
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        email_confirm: true,
        user_metadata: {
          name,
          full_name: name,
          provider_name: "naver",
          naver_id: naverId,
        },
      }),
    });

    // 4) 매직링크 생성 → 그 링크로 보내면 Supabase가 세션 만들어서 liel로 복귀시킴
    const linkRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/generate_link`,
      {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          type: "magiclink",
          email,
          options: { redirect_to: `https://${req.headers.host}/` },
        }),
      }
    );
    const linkData = await linkRes.json();
    const actionLink =
      linkData.action_link || linkData?.properties?.action_link;
    if (!actionLink) {
      return res.redirect(302, "/?error=naver_session_failed");
    }

    // state 쿠키 제거
    res.setHeader(
      "Set-Cookie",
      "naver_state=; Path=/; HttpOnly; Secure; Max-Age=0; SameSite=Lax"
    );

    // 5) 매직링크로 리다이렉트 → Supabase 세션 발급 → liel.app 복귀
    return res.redirect(302, actionLink);
  } catch (e) {
    return res.redirect(302, "/?error=naver_login_failed");
  }
}
