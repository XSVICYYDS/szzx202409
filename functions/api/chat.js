// POST /api/chat - AI 对话（公开访问，前端做次数限制）
import { json, err, parseBody, getSecret } from '../_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  const body = await parseBody(request);
  if (!body.messages || !Array.isArray(body.messages)) return err('请提供 messages 数组', 400);

  const apiKey = await getSecret(db, 'openrouter_key');
  if (!apiKey) return err('未配置 OpenRouter API Key', 500);

  const systemPrompt = '你是尚志中学2024届09班的AI学习助手。你可以帮助学生解答学习问题、辅助诗歌创作、提供写作建议。请用中文回答，保持友好和鼓励的语气。';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...body.messages,
  ];

  const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://szzx202409.pages.dev',
      'X-Title': '尚志中学09班官网',
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || 'openrouter/free',
      messages,
    }),
  });

  if (!aiRes.ok) {
    const aiErr = await aiRes.text();
    return err('AI 请求失败: ' + aiErr, 502);
  }

  const aiData = await aiRes.json();
  const reply = aiData.choices && aiData.choices[0] && aiData.choices[0].message
    ? aiData.choices[0].message.content
    : '';

  return json({ reply });
}
