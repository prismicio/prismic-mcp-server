import * as fs from "node:fs"
import * as os from "node:os"

import cookie from "cookie"
import { z } from "zod"

import { API_ENDPOINTS } from "../constants/API_ENDPOINTS"
import { USER_AGENT } from "../constants/USER_AGENT"

const PrismicAuthState = z.object({
	base: z.string(),
	cookies: z
		.object({
			["prismic-auth"]: z.string().optional(),
			SESSION: z.string().optional(),
		})
		.catchall(z.string()),
})
export type PrismicAuthState = z.infer<typeof PrismicAuthState>

export async function getUserShortId(): Promise<string | undefined> {
	let authStateFileContents: string = JSON.stringify({})
	let rawAuthState: Record<string, unknown> = {}

	const authStateFilePath = `${os.homedir()}/.prismic`
	authStateFileContents = fs.readFileSync(authStateFilePath, "utf8")
	rawAuthState = JSON.parse(authStateFileContents)

	if (typeof rawAuthState.cookies === "string") {
		rawAuthState.cookies = parseCookies(rawAuthState.cookies)
	}

	const authState = PrismicAuthState.parse(rawAuthState)

	if (!authState.cookies["prismic-auth"]) {
		return undefined
	}

	const { shortId } = await getProfileForAuthenticationToken({
		authenticationToken: authState.cookies["prismic-auth"],
	})

	return shortId
}

const parseCookies = (cookies: string): Record<string, string | undefined> => {
	return cookie.parse(cookies, {
		// Don't escape any values.
		decode: (value) => value,
	})
}

const PrismicUserProfile = z.object({
	shortId: z.string(),
})
export type PrismicUserProfile = z.infer<typeof PrismicUserProfile>

type GetProfileForAuthenticationTokenArgs = {
	authenticationToken: string
}

async function getProfileForAuthenticationToken(
	args: GetProfileForAuthenticationTokenArgs,
): Promise<PrismicUserProfile> {
	const url = new URL("./profile", API_ENDPOINTS.UserService)
	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${args.authenticationToken}`,
			"User-Agent": USER_AGENT,
		},
	})

	if (res.ok) {
		const json = await res.json()

		return PrismicUserProfile.parse(json)
	} else {
		const text = await res.text()
		throw new Error(
			"Failed to retrieve profile from the Prismic user service.",
			{
				cause: text,
			},
		)
	}
}
