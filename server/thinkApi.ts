import type { IncomingMessage } from 'node:http'
import { loadEnv, type Plugin } from 'vite'

const MODEL = 'gpt-4.1-mini'

const ROOT_PROMPT = `あなたは相談相手として、ユーザーの相談に対する自分の考えを「思考の分岐」として示す。
ユーザーに質問を返さず、自分の見解を述べる。
出力は JSON Lines のみ。1行に1つの JSON オブジェクトを書き、説明文やコードブロックは書かない。
1行目: 論点と、現時点での暫定的な答え。
  label: ユーザーの相談を30文字以内の問いに言い換えたもの。
  detail: その問いへの現時点での答えを、理由を添えて2文以内で。
2〜4行目: その答えを支える、または揺るがす見解。互いに異なる立場から。
  label: 30文字以内の言い切りの文(問いにしない)。
  detail: その見解の理由を2文以内で。

出力例:
{"label": "今の仕事を続けるべきか？", "detail": "今は続けるほうが無難だ。ただし、疲れが原因なら環境を変えるだけで解決する可能性もある。"}
{"label": "成長が止まっているなら、続ける理由は弱い", "detail": "学びがないまま時間が過ぎるほど、市場価値の差は広がる。"}
{"label": "興味を失ったのは、仕事ではなく環境のせいかもしれない", "detail": "同じ仕事でも、チームや裁量が変わると意欲は戻ることがある。"}
{"label": "まず休んでから判断するほうがいい", "detail": "疲労は判断を悲観的に歪めるので、結論を急がないほうがよい。"}`

const BRANCH_PROMPT = `あなたは相談相手として、これまでの思考の流れを踏まえ、ユーザーが現在地点で追加で考えたいことに対する自分の考えを「思考の分岐」として示す。
ユーザーに質問を返さず、自分の見解を述べる。これまでの流れと重複する内容は避ける。
出力は JSON Lines のみ。1行に1つの JSON オブジェクトを書き、説明文やコードブロックは書かない。
3行出力する。互いに異なる立場からの見解にする。
  label: 30文字以内の言い切りの文(問いにしない)。
  detail: その見解の理由を2文以内で。

出力例:
{"label": "成長実感は、数字より新しい仕事の頻度に出る", "detail": "半年前にできなかった仕事を任されているかが、客観的な目安になる。"}
{"label": "学びが止まった原因は、本人より配置にあるかもしれない", "detail": "同じ業務の繰り返しなら、異動や役割変更だけで状況が変わることがある。"}
{"label": "社外で試せるなら、成長の有無はすぐ確かめられる", "detail": "副業や勉強会で通用するかを見れば、今の環境の限界が分かる。"}`

type Step = { label: string; detail?: string }

const buildMessages = (question: string, path: Step[]) => {
  if (path.length === 0) {
    return [
      { role: 'system', content: ROOT_PROMPT },
      { role: 'user', content: question },
    ]
  }
  const flow = path
    .map((step, i) => `${i + 1}. ${step.label}${step.detail ? ` — ${step.detail}` : ''}`)
    .join('\n')
  return [
    { role: 'system', content: BRANCH_PROMPT },
    {
      role: 'user',
      content: `これまでの思考の流れ(最初の論点から現在地まで):\n${flow}\n\n現在地点は「${path[path.length - 1].label}」。ここで追加で考えたいこと:\n${question}`,
    },
  ]
}

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

        const { question, path = [] } = JSON.parse(await readBody(req)) as { question: string; path?: Step[] }
        const abort = new AbortController()
        res.on('close', () => abort.abort())

        const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            messages: buildMessages(question, path),
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
