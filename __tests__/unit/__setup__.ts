// Add global test set up here.
import { vi } from "vitest"

vi.mock("@slicemachine/manager", () => ({
	createSliceMachineManager: vi.fn(() => ({
		plugins: {
			initPlugins: vi.fn(),
		},
		slices: {
			createSlice: vi.fn(),
			updateSlice: vi.fn(),
		},
	})),
}))
