import * as Sentry from "@sentry/node"

export function initSentry(): void {
	Sentry.init({
		dsn: "https://decd691efe8dbf600548de58a9003829@o146123.ingest.us.sentry.io/4510035021725696",
		environment: process.env.PRISMIC_ENV || "production",
		tracesSampleRate: 0,
	})
}

type trackSentryErrorArgs = {
	error: unknown
	toolName:
		| "add_slice_to_custom_type"
		| "how_to_code_slice"
		| "how_to_model_slice"
		| "verify_slice_model"
		| "how_to_mock_slice"
		| "verify_slice_mock"
		| "generate_types"
}

export function trackSentryError(args: trackSentryErrorArgs): void {
	const { error, toolName } = args

	try {
		Sentry.withScope((scope) => {
			scope.setTag("tool_name", toolName)
			Sentry.captureException(error)
		})
	} catch (error) {
		// noop, we don't wanna block the tool call if this fails
		if (process.env.PRISMIC_DEBUG) {
			console.error("Error while tracking sentry error:", error)
		}
	}
}
