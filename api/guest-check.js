// 비회원 IP 사용량 체크 (지문 분석 "시작" 시 1회 호출)
// - 같은 IP가 하루 5회를 넘으면 차단
// - 비회원의 우회(시크릿 모드 등)를 서버에서 2차 방어
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const IP_DAILY_LIMIT = 5; // IP당 하루 상한

  if (!SUPABASE_URL || !SERVICE_KEY) {
    // 환경변수 없으면 차단하지 않고 통과 (서비스 중단 방지)
    res.status(200).json({ ok: true });
    return;
  }

  try {
    // Vercel에서 실제 접속자 IP 얻기
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.headers["x-real-ip"] ||
      "unknown";

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    // 1) 오늘 이 IP의 기록 조회
    const q = await fetch(
      `${SUPABASE_URL}/rest/v1/guest_usage?ip=eq.${encodeURIComponent(
        ip
      )}&used_date=eq.${today}&select=id,count`,
      { headers }
    );
    const rows = await q.json();
    const row = Array.isArray(rows) && rows[0];

    // 2) 상한 확인
    if (row && row.count >= IP_DAILY_LIMIT) {
      res.status(429).json({
        error:
          "이 네트워크에서 오늘 이용 가능한 체험 횟수를 모두 사용했어요. 로그인하면 계속 이용할 수 있어요!",
        blocked: true,
      });
      return;
    }

    // 3) 카운트 +1 (있으면 update, 없으면 insert)
    if (row) {
      await fetch(`${SUPABASE_URL}/rest/v1/guest_usage?id=eq.${row.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ count: row.count + 1 }),
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/guest_usage`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ip, used_date: today, count: 1 }),
      });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    // 어떤 오류든 서비스는 계속되게 (제한 실패 시 통과)
    res.status(200).json({ ok: true });
  }
};
