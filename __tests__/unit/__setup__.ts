// Add global test set up here.
import { vi } from "vitest"

// Mock the problematic @slicemachine/manager module to avoid ES module import issues
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
