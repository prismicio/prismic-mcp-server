import { APPLICATION_MODE } from "./APPLICATION_MODE"

export type APIEndpoints = {
	UserService: string
}

export const API_ENDPOINTS: APIEndpoints = (() => {
	switch (process.env.PRISMIC_ENV) {
		case APPLICATION_MODE.Staging: {
			return {
				UserService: "https://user-service.wroom.io/",
			}
		}
		case APPLICATION_MODE.DevTools:
		case APPLICATION_MODE.MarketingTools:
		case APPLICATION_MODE.Platform: {
			return {
				UserService: `https://user-service.${process.env.SM_ENV}-wroom.com/`,
			}
		}
		case APPLICATION_MODE.Production:
		default: {
			return {
				UserService: "https://user-service.prismic.io/",
			}
		}
	}
})()
