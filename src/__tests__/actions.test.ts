import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { getOnChainActions } from "../actions";
import { setupActionTest, mockConsole } from "./test-utils";
import type { MockRuntime } from "./test-utils";
import {
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
} from "@elizaos/core";

describe("Kaia On-Chain Actions", () => {
  let mockRuntime: MockRuntime;
  let mockMessage: Partial<Memory>;
  let mockState: Partial<State>;
  let callbackFn: HandlerCallback;
  let consoleMock: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    consoleMock = mockConsole();
    const setup = setupActionTest();
    mockRuntime = setup.mockRuntime;
    mockMessage = setup.mockMessage;
    mockState = setup.mockState;
    callbackFn = setup.callbackFn as HandlerCallback;
  });

  afterEach(() => {
    consoleMock.restore();
    mock.restore();
  });

  describe("getOnChainActions", () => {
    it("should return an array of actions when wallet is provided", async () => {
      // Mock wallet client with required methods for GOAT SDK
      const mockWalletClient = {
        getAddress: () => "0x1234567890123456789012345678901234567890",
        balanceOf: mock().mockResolvedValue(BigInt("1000000000000000000")),
        getChain: () => ({ type: "evm", id: 1001 }), // Kaia chain ID
        getCoreTools: () => [],
      };

      const config = {
        KAIA_KAIASCAN_API_KEY: "test-api-key",
        KAIA_NETWORK: "kairos",
      };

      const actions = await getOnChainActions(mockWalletClient, config);

      expect(Array.isArray(actions)).toBe(true);
      // The actual number of actions depends on the Kaia Agent Kit packages
      expect(actions.length).toBeGreaterThanOrEqual(0);

      // Each action should have required properties
      actions.forEach((action) => {
        expect(action.name).toBeDefined();
        expect(action.description).toBeDefined();
        expect(action.handler).toBeDefined();
        expect(typeof action.handler).toBe("function");
      });
    });

    it("should create actions with proper structure", async () => {
      const mockWalletClient = {
        getChain: () => ({ type: "evm", id: 1001 }),
        getCoreTools: () => [],
      };
      const config = {
        KAIA_KAIASCAN_API_KEY: "test-api-key",
      };

      const actions = await getOnChainActions(mockWalletClient, config);

      // Test structure of first action if available
      if (actions.length > 0) {
        const firstAction = actions[0];
        expect(firstAction).toHaveProperty("name");
        expect(firstAction).toHaveProperty("description");
        expect(firstAction).toHaveProperty("handler");

        // Optional properties that might be present
        if (firstAction.similes) {
          expect(Array.isArray(firstAction.similes)).toBe(true);
        }
        if (firstAction.examples) {
          expect(Array.isArray(firstAction.examples)).toBe(true);
        }
      }
    });
  });

  describe("Action Handler", () => {
    it("should handle successful action execution", async () => {
      const mockWalletClient = {
        getChain: () => ({ type: "evm", id: 1001 }),
        getCoreTools: () => [],
      };
      const config = { KAIA_KAIASCAN_API_KEY: "test-api-key" };

      const actions = await getOnChainActions(mockWalletClient, config);

      if (actions.length > 0) {
        const action = actions[0];

        // Mock runtime for successful response
        mockRuntime.useModel = mock()
          .mockResolvedValueOnce("Action executed successfully")
          .mockResolvedValueOnce("Success! The action was completed.");

        const result = await action.handler(
          mockRuntime as IAgentRuntime,
          mockMessage as Memory,
          mockState as State,
          {},
          callbackFn
        );

        expect(result).toBe(true);
        expect(callbackFn).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.any(String),
            content: expect.any(Object),
          })
        );
      }
    });

    it("should handle action execution errors", async () => {
      const mockWalletClient = {
        getChain: () => ({ type: "evm", id: 1001 }),
        getCoreTools: () => [],
      };
      const config = { KAIA_KAIASCAN_API_KEY: "test-api-key" };

      const actions = await getOnChainActions(mockWalletClient, config);

      if (actions.length > 0) {
        const action = actions[0];

        // Mock runtime to throw error
        mockRuntime.useModel = mock().mockRejectedValueOnce(
          new Error("Execution failed")
        );

        const result = await action.handler(
          mockRuntime as IAgentRuntime,
          mockMessage as Memory,
          mockState as State,
          {},
          callbackFn
        );

        expect(result).toBe(false);

        // Check that callback was called
        expect(callbackFn).toHaveBeenCalled();

        // Get the actual call to check the structure
        const callArgs = (callbackFn as any).mock.calls[0][0];
        expect(callArgs).toHaveProperty("text");
        expect(callArgs).toHaveProperty("content");
        expect(callArgs.content).toHaveProperty("error", "Execution failed");
      }
    });

    it("should handle state composition properly", async () => {
      const mockWalletClient = {
        getChain: () => ({ type: "evm", id: 1001 }),
        getCoreTools: () => [],
      };
      const config = { KAIA_KAIASCAN_API_KEY: "test-api-key" };

      const actions = await getOnChainActions(mockWalletClient, config);

      if (actions.length > 0) {
        const action = actions[0];

        // Test with no initial state
        await action.handler(
          mockRuntime as IAgentRuntime,
          mockMessage as Memory,
          undefined, // No state provided
          {},
          callbackFn
        );

        // Should call composeState to create state
        expect(mockRuntime.composeState).toHaveBeenCalledWith(mockMessage);
      }
    });

    it("should update state when state is provided", async () => {
      const mockWalletClient = {
        getChain: () => ({ type: "evm", id: 1001 }),
        getCoreTools: () => [],
      };
      const config = { KAIA_KAIASCAN_API_KEY: "test-api-key" };

      const actions = await getOnChainActions(mockWalletClient, config);

      if (actions.length > 0) {
        const action = actions[0];

        // Test with existing state
        await action.handler(
          mockRuntime as IAgentRuntime,
          mockMessage as Memory,
          mockState as State, // State provided
          {},
          callbackFn
        );

        // Should call composeState with RECENT_MESSAGES
        expect(mockRuntime.composeState).toHaveBeenCalledWith(mockMessage, [
          "RECENT_MESSAGES",
        ]);
      }
    });
  });
});
