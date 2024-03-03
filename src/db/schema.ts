import { Generated } from 'kysely';

export type DatabaseSchema = {
  post: Post
  sub_state: SubState
  tag: Tag
}

export type Post = {
  id: Generated<number>
  uri: string
  cid: string
  text: string    // text
  lang1: number    // lang1
  lang2: number    // lang2
  lang3: number    // lang3
  postType: number
  indexedAt: string
  imageCount: number    // imageCount
}

export type Tag = {
  id: number
  tagStr: string
}

export type SubState = {
  service: string
  cursor: number
}
