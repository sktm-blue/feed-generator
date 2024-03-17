import { AtpAgent, BlobRef } from '@atproto/api'
import { ids } from '../src/lexicon/lexicons'
import { EnvValue } from '../src/envvalue'

const run = async () => {

	// A short name for the record that will show in urls
	// Lowercase with no spaces.
	// Ex: whats-hot
	const recordName: string = ''

	// -------------------------------------
	// NO NEED TO TOUCH ANYTHING BELOW HERE
	// -------------------------------------
	const env: EnvValue = EnvValue.getInstance()
	if (!env.publisherAppPassword) {
		throw new Error('Please provide an app password in the .env file')
	}

	// only update this if in a test environment
	const agent = new AtpAgent({ service: env.bskyServiceUrl })
	await agent.login({ identifier: env.publisherHandle, password: env.publisherAppPassword })

	await agent.api.com.atproto.repo.deleteRecord({
		repo: agent.session?.did ?? '',
		collection: ids.AppBskyFeedGenerator,
		rkey: recordName,
	})

	console.log('All done 🎉')
}

run()