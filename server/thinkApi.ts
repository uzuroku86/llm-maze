import type { IncomingMessage } from 'node:http'
import { loadEnv, type Plugin } from 'vite'

const MODEL = 'gpt-4.1-mini'

const SYSTEM_PROMPT = `あなたは、ユーザーの相談を「思考の分岐」に分解する。
出力は JSON Lines のみ。1行に1つの JSON オブジェクトを書き、説明文やコードブロックは書かない。
1行目: ユーザーの相談を、30文字以内の問いに言い換えた論点。 {"label": "..."}
2〜4行目: その論点を考えるための、互いに異なる切り口。それぞれ30文字以内の問いか短い文。 {"label": "..."}

出力例:
{"label": "今の仕事を続けるべきか？"}
{"label": "今の仕事で成長できているか？"}
{"label": "仕事そのものに興味を持てているか？"}
{"label": "単純に疲れているだけではないか？"}`

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString()
}

export function thinkApi(): Plugin {
  return {
    name: 'think-api',
    configureServer(server) {
      const apiKey = loadEnv(server.config.mode, process.cwd(), '').OPENAI_API_KEY

      server.middlewares.use('/api/think', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        if (!apiKey) {
          res.statusCode = 500
          res.end('OPENAI_API_KEY が .env に設定されていません')
          return
        }

        const { question } = JSON.parse(await readBody(req)) as { question: string }
        const abort = new AbortController()
        res.on('close', () => abort.abort())

        const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: question },
            ],
          }),
          signal: abort.signal,
        }).catch(() => null)

        if (!upstream?.ok || !upstream.body) {
          res.statusCode = 502
          res.end(upstream ? await upstream.text() : 'OpenAI API に接続できません')
          return
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        const decoder = new TextDecoder()
        let buffer = ''
        for await (const chunk of upstream.body) {
          buffer += decoder.decode(chunk, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
            const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content
            if (delta) res.write(delta)
          }
        }
        res.end()
      })
    },
  }
}
