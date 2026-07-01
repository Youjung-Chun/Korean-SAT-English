// 이 파일은 Vercel에서 자동으로 "서버 함수"로 실행됩니다.
// 학생 브라우저는 이 함수를 부르고, 이 함수만 비밀 API 키로 Claude에 요청합니다.
// (키는 코드에 적지 않고 Vercel 환경변수 ANTHROPIC_API_KEY 에 넣습니다.)

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "서버에 API 키가 설정되지 않았어요. Vercel 환경변수 ANTHROPIC_API_KEY를 확인하세요." });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
    const { content, system } = body || {};

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: system,
        messages: [{ role: "user", content: content }]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || "Claude 요청 실패";
      res.status(r.status).json({ error: msg });
      return;
    }

    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message || "알 수 없는 서버 오류" });
  }
};
