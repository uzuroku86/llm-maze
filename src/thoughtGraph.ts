export type ThoughtNode = {
  id: string
  label: string
  detail?: string
  question?: string
  branches?: ThoughtNode[]
}
