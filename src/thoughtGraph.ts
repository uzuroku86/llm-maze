export type ThoughtNode = {
  id: string
  label: string
  branches?: ThoughtNode[]
}

export const thoughtGraph: ThoughtNode = {
  id: 'root',
  label: '今の仕事を続けるべきか？',
  branches: [
    { id: 'growth', label: '今の仕事で成長できているか？' },
    { id: 'interest', label: '仕事そのものに興味を持てているか？' },
    { id: 'fatigue', label: '単純に疲れているだけではないか？' },
  ],
}
