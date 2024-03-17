import { AtpAgent, BlobRef } from '@atproto/api'
import fs from 'fs/promises'
import { ids } from '../src/lexicon/lexicons'
import { EnvValue } from '../src/envvalue'

const run = async () => {
	// A short name for the record that will show in urls
	// Lowercase with no spaces.
	// Ex: whats-hot
	const recordName: string = ''

	// A display name for your feed
	// Ex: What's Hot
	const displayName: string = ''

	// (Optional) A description of your feed
	// Ex: Top trending content from the whole network
	const description: string = ''
	
	// (Optional) The path to an image to be used as your feed's avatar
	// Ex: ~/path/to/avatar.jpeg
	const avatar: string = ''

	// -------------------------------------
	// NO NEED TO TOUCH ANYTHING BELOW HERE
	// -------------------------------------
	const env: EnvValue = EnvValue.getInstance()
	if (!env.publisherAppPassword) {
		throw new Error('Please provide an app password in the .env file')
	}

	if (!env.serviceDid && !env.hostname) {
		throw new Error('Please provide a hostname in the .env file')
	}
	const feedGenDid = env.serviceDid ?? `did:web:${env.hostname}`

	// only update this if in a test environment
	const agent = new AtpAgent({ service: env.bskyServiceUrl })
	await agent.login({ identifier: env.publisherHandle, password: env.publisherAppPassword })

	let avatarRef: BlobRef | undefined
	if (avatar) {
		let encoding: string
		if (avatar.endsWith('png')) {
			encoding = 'image/png'
		} else if (avatar.endsWith('jpg') || avatar.endsWith('jpeg')) {
			encoding = 'image/jpeg'
		} else {
			throw new Error('expected png or jpeg')
		}
		const img = await fs.readFile(avatar)
		const blobRes = await agent.api.com.atproto.repo.uploadBlob(img, {
			encoding,
		})
		avatarRef = blobRes.data.blob
	}

	await agent.api.com.atproto.repo.putRecord({
		repo: agent.session?.did ?? '',
		collection: ids.AppBskyFeedGenerator,
		rkey: recordName,
		record: {
			did: feedGenDid,
			displayName: displayName,
			description: description,
			avatar: avatarRef,
			createdAt: new Date().toISOString(),
		},
	})

	console.log('All done 🎉')
}

run()
