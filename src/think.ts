export async function streamThought(
  question: string,
  onLabel: (label: string) => void,
  signal: AbortSignal,
) {
  const res = await fetch('/api/think', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(await res.text())

  const emit = (line: string) => {
    try {
      const { label } = JSON.parse(line)
      if (typeof label === 'string') onLabel(label)
    } catch {
      // JSON以外の行(コードブロックの記号など)は読み飛ばす
    }
  }

  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    lines.forEach(emit)
  }
  emit(buffer)
}
