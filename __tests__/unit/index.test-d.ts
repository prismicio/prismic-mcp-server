import { expectTypeOf, it } from "vitest"

import * as lib from "../../src"

it("returns void", () => {
	expectTypeOf(lib.server).toBeObject()
})
