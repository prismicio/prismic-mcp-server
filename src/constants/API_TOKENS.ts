import { APPLICATION_MODE } from "./APPLICATION_MODE"

type APITokens = {
	SegmentKey: string
}

export const API_TOKENS: APITokens = (() => {
	switch (process.env.PRISMIC_ENV) {
		case APPLICATION_MODE.Staging:
		case APPLICATION_MODE.DevTools:
		case APPLICATION_MODE.MarketingTools:
		case APPLICATION_MODE.Platform:
			return {
				SegmentKey: "Ng5oKJHCGpSWplZ9ymB7Pu7rm0sTDeiG",
			}
		case undefined:
		case "":
		case APPLICATION_MODE.Production:
		default:
			return {
				SegmentKey: "cGjidifKefYb6EPaGaqpt8rQXkv5TD6P",
			}
	}
})()
