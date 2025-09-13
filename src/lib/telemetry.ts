import {
	Analytics,
	type IdentifyParams,
	type TrackParams,
} from "@segment/analytics-node"
import { randomUUID } from "crypto"

import { API_TOKENS } from "../constants/API_TOKENS"

import { getRepositoryName } from "./repository"
import { getUserShortId } from "./user"

type TelemetryTrackArgs =
	| {
			event: "MCP Tool - How to code a slice"
			sliceMachineConfigAbsolutePath: string
			properties: {
				framework: string
				fieldsUsed: string[]
			}
	  }
	| {
			event: "MCP Tool - How to model a slice"
			sliceMachineConfigAbsolutePath: string
			properties: {
				sliceName: string
				isNewSlice: boolean
				contentRequirements: string
				requestType: string
			}
	  }
	| {
			event: "MCP Tool - Verify slice model"
			sliceMachineConfigAbsolutePath: string
			properties: {
				sliceName: string
				isNewSlice: boolean
			}
	  }
	| {
			event: "MCP Tool - How to mock a slice"
			sliceMachineConfigAbsolutePath: string
			properties: {
				operation: "create" | "update"
				sliceName: string
				userIntent: string
			}
	  }
	| {
			event: "MCP Tool - Verify slice mock"
			sliceMachineConfigAbsolutePath: string
			properties: {
				sliceName: string
			}
	  }
	| {
			event: "MCP Tool - Generate types"
			sliceMachineConfigAbsolutePath: string
			properties?: never
	  }
	| {
			event: "MCP Tool - Add slice to custom type"
			sliceMachineConfigAbsolutePath: string
			properties: {
				sliceName: string
				customTypeId: string
			}
	  }

export class Telemetry {
	private _segmentClient: Analytics | undefined = undefined
	private _userID: string | undefined = undefined
	private _anonymousId: string | undefined = undefined

	initTelemetry(): void {
		try {
			this._segmentClient = new Analytics({
				writeKey: API_TOKENS.SegmentKey,
				// Since it's a local server, we do not benefit from event batching
				// the way a remote server would normally do, all tracking events will be awaited.
				maxEventsInBatch: 1,
			})

			this._segmentClient.on("error", (error) => {
				// noop, we don't wanna block the mcp server if a tracking event is unsuccessful.
				// Some users or networks intentionally block Segment,
				// so we can't block the mcp server if a tracking event is unsuccessful.
				if (process.env.DEBUG) {
					console.error("Error while tracking event:", error)
				}
			})
		} catch (error) {
			// noop, we don't wanna block the mcp server if the telemetry is not initialized
			if (process.env.DEBUG) {
				console.error("Error while initializing telemetry:", error)
			}
		}

		this._anonymousId = randomUUID()
	}

	async track(args: TelemetryTrackArgs): Promise<void> {
		assertTelemetryInitialized(this._segmentClient)
		const { event, sliceMachineConfigAbsolutePath, properties } = args

		try {
			await this.identify()
		} catch (error) {
			// noop, we don't wanna block tracking if the identify fails
			if (process.env.DEBUG) {
				console.error("Error while identifying user:", error)
			}
		}

		let repository
		try {
			repository = getRepositoryName(sliceMachineConfigAbsolutePath)
		} catch (error) {
			// noop, we don't wanna block tracking if the repository name is not found
			if (process.env.DEBUG) {
				console.error("Error while getting repository name:", error)
			}
		}

		let mcpVersion
		try {
			mcpVersion = __PACKAGE_VERSION__
		} catch (error) {
			// noop, we don't wanna block tracking if the mcp version is not found
			if (process.env.DEBUG) {
				console.error("Error while getting MCP version:", error)
			}
		}

		let nodeVersion
		try {
			nodeVersion = process.versions.node
		} catch (error) {
			// noop, we don't wanna block tracking if the node version is not found
			if (process.env.DEBUG) {
				console.error("Error while getting node version:", error)
			}
		}

		const payload: TrackParams = {
			event,
			properties: {
				...properties,
				mcpVersion,
				nodeVersion,
				repository,
			},
			...(this._userID
				? { userId: this._userID }
				: { anonymousId: this._anonymousId! }),
			...(repository
				? { context: { groupId: { Repository: repository } } }
				: {}),
		}

		this._segmentClient.track(payload)
	}

	async identify(): Promise<void> {
		assertTelemetryInitialized(this._segmentClient)

		let userShortId
		try {
			userShortId = await getUserShortId()
			this._userID = userShortId
		} catch (error) {
			// noop, we will use the anonymous ID instead
			if (process.env.DEBUG) {
				console.error("Error while getting user short ID:", error)
			}
		}

		const payload: IdentifyParams = {
			...(userShortId
				? { userId: userShortId }
				: { anonymousId: this._anonymousId! }),
		}

		this._segmentClient.identify(payload)
	}
}

function assertTelemetryInitialized(
	segmentClient: Analytics | undefined,
): asserts segmentClient is NonNullable<typeof segmentClient> {
	if (segmentClient === undefined) {
		throw new Error("Telemetry has not been initialized.")
	}
}
