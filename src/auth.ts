import express from 'express'
import { verifyJwt, AuthRequiredError } from '@atproto/xrpc-server'
import { DidResolver } from '@atproto/identity'
import { Trace } from './trace'

export const validateAuth = async (
  req: express.Request,
  serviceDid: string,
  didResolver: DidResolver,
): Promise<string> => {
  const { authorization = '' } = req.headers
  Trace.debug('authorization = ' + authorization)
  if (!authorization.startsWith('Bearer ')) {
    throw new AuthRequiredError()
  }
  const jwt = authorization.replace('Bearer ', '').trim()
  return verifyJwt(jwt, serviceDid, async (did: string) => {
    return didResolver.resolveAtprotoKey(did)
  })
  //const payload = await verifyJwt(jwt, serviceDid, async (did: string) => {
  //  return didResolver.resolveAtprotoKey(did)
  //})
  //return payload.iss
}
