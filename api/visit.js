// 방문 기록 (페이지 로드 시 1회 호출) — 접속 IP·페이지·브라우저 저장
// 어떤 오류가 나도 서비스는 계속되게 (기록 실패 시 그냥 통과)
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    res.status(200).json({ ok: true });
    return;
  }

  try {
    // 실제 접속자 IP: liel.app 은 Cloudflare 프록시를 거치므로
    // cf-connecting-ip(진짜 방문자 IP)를 먼저 읽음. 없으면 기존 방식.
    const ip =
      req.headers["cf-connecting-ip"] ||
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.headers["x-real-ip"] ||
      "unknown";

    let page = "";
    try { page = String((req.body && req.body.page) || "").slice(0, 100); } catch (e) {}
    const ua = String(req.headers["user-agent"] || "").slice(0, 200);

    await fetch(`${SUPABASE_URL}/rest/v1/visit_log`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ip, page, user_agent: ua }),
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: true });
  }
};
