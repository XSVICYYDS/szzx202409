// 全局中间件：CORS 处理
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  const res = await context.next();
  const newRes = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) newRes.headers.set(k, v);
  return newRes;
}
