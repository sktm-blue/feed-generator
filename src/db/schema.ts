export type DatabaseSchema = {
  post: Post
  sub_state: SubState
}

export type Post = {
  uri: string
  cid: string
  text: string    // text
  lang1: string    // lang1
  lang2: string    // lang2
  lang3: string    // lang3
  replyParent: string | null
  replyRoot: string | null
  indexedAt: string
  imageCount: number    // imageCount
}

export type SubState = {
  service: string
  cursor: number
}
