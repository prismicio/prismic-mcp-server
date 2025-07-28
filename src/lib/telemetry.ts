import {
	Analytics,
	type IdentifyParams,
	type TrackParams,
} from "@segment/analytics-node"
import { randomUUID } from "crypto"

import { API_TOKENS } from "../constants/API_TOKENS"

import { getRepositoryName } from "./repository"
import { getUserShortId } from "./user"

type TelemetryTrackArgs = {
	event: string
	sliceMachineConfigAbsolutePath: string
	properties: Record<string, unknown>
}

export class Telemetry {
	private _segmentClient: (() => Analytics) | undefined = undefined
	private _userID: string | undefined = undefined
	private _anonymousId: string | undefined = undefined

	async initTelemetry(): Promise<void> {
		this._segmentClient = () => {
			const analytics = new Analytics({
				writeKey: API_TOKENS.SegmentKey,
				// Since it's a local app, we do not benefit from event batching the way a server would normally do, all tracking event will be awaited.
				maxEventsInBatch: 1,
			})

			return analytics
		}

		this._anonymousId = randomUUID()
	}

	async track(args: TelemetryTrackArgs): Promise<void> {
		assertTelemetryInitialized(this._segmentClient)

		try {
			await this.identify()
		} catch {
			// noop, we don't wanna block tracking if the identify fails
		}

		const { event, sliceMachineConfigAbsolutePath, properties } = args

		let repositoryName
		try {
			repositoryName = getRepositoryName(sliceMachineConfigAbsolutePath)
		} catch {
			// noop, happen only when the user is not in a project
		}

		let mcpVersion
		try {
			mcpVersion = __PACKAGE_VERSION__
		} catch {
			mcpVersion = "unknown"
		}

		const payload: TrackParams = {
			event,
			properties: {
				...properties,
				mcpVersion,
				nodeVersion: process.versions.node,
				repository: repositoryName,
			},
			...(this._userID
				? { userId: this._userID }
				: { anonymousId: this._anonymousId! }),
		}

		if (repositoryName) {
			payload.context ||= {}
			payload.context.groupId ||= {}
			payload.context.groupId.Repository = repositoryName
		}

		this._segmentClient().track(payload)
	}

	async identify(): Promise<void> {
		assertTelemetryInitialized(this._segmentClient)

		let userShortId
		try {
			userShortId = await getUserShortId()
		} catch {
			// noop, we will use the anonymous ID instead
		}

		const payload: IdentifyParams = {
			...(userShortId
				? { userId: userShortId }
				: { anonymousId: this._anonymousId! }),
		}

		this._userID = userShortId
		this._segmentClient().identify(payload)
	}
}

function assertTelemetryInitialized(
	segmentClient: (() => Analytics) | undefined,
): asserts segmentClient is NonNullable<typeof segmentClient> {
	if (segmentClient === undefined) {
		throw new Error("Telemetry has not been initialized.")
	}
}
