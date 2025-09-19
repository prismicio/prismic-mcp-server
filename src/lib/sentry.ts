import * as Sentry from "@sentry/node"

export function initSentry(): void {
	Sentry.init({
		dsn: "https://decd691efe8dbf600548de58a9003829@o146123.ingest.us.sentry.io/4510035021725696",
		environment: process.env.PRISMIC_ENV || "production",
		tracesSampleRate: 0,
		beforeSend(event) {
			// scrub potentially sensitive information
			if (event.request) {
				delete event.request
			}
			if (event.breadcrumbs) {
				event.breadcrumbs = []
			}
			if (event.extra) {
				delete event.extra.stdin
				delete event.extra.stdout
				delete event.extra.stderr
			}

			return event
		},
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

	Sentry.withScope((scope) => {
		scope.setTag("tool_name", toolName)
		Sentry.captureException(error)
	})
}

// export function testSentry(): void {
// 	setTimeout(() => {
// 		try {
// 			foo()
// 		} catch (e) {
// 			Sentry.captureException(e)
// 		}
// 	}, 99)
// }
