export type ThoughtNode = {
  id: string
  label: string
  detail?: string
  branches?: ThoughtNode[]
}
