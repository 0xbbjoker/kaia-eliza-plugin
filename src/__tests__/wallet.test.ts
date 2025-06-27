import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { getWalletClient, getWalletProvider } from "../wallet";
import {
  createMockRuntime,
  createMockMemory,
  createMockState,
} from "./test-utils";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";

describe("Wallet Client", () => {
  afterEach(() => {
    mock.restore();
  });

  describe("getWalletClient", () => {
    it("should return null when private key is not provided", () => {
      const config = {
        KAIA_NETWORK: "kairos",
      };
      const client = getWalletClient(config);
      expect(client).toBeNull();
    });

    it("should create wallet client for kairos network", () => {
      const config = {
        KAIA_EVM_PRIVATE_KEY:
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        KAIA_NETWORK: "kairos",
      };
      const client = getWalletClient(config);
      expect(client).toBeDefined();
      expect(client).not.toBeNull();
    });

    it("should create wallet client for kaia mainnet", () => {
      const config = {
        KAIA_EVM_PRIVATE_KEY:
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        KAIA_NETWORK: "kaia",
      };
      const client = getWalletClient(config);
      expect(client).toBeDefined();
      expect(client).not.toBeNull();
    });

    it("should default to kairos when network is not specified", () => {
      const config = {
        KAIA_EVM_PRIVATE_KEY:
          "0x1234567890123456789012345678901234567890123456789012345678901234",
      };
      const client = getWalletClient(config);
      expect(client).toBeDefined();
      expect(client).not.toBeNull();
    });

    it("should handle invalid private key format gracefully", () => {
      const config = {
        KAIA_EVM_PRIVATE_KEY: "invalid-key",
        KAIA_NETWORK: "kairos",
      };

      // This should throw when trying to create account from invalid key
      expect(() => getWalletClient(config)).toThrow();
    });
  });

  describe("getWalletProvider integration", () => {
    let mockRuntime: any;
    let mockMessage: Partial<Memory>;
    let mockState: Partial<State>;

    beforeEach(() => {
      mockRuntime = createMockRuntime();
      mockMessage = createMockMemory();
      mockState = createMockState();
    });

    it("should integrate with real wallet client", async () => {
      const config = {
        KAIA_EVM_PRIVATE_KEY:
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        KAIA_NETWORK: "kairos",
      };

      const walletClient = getWalletClient(config);
      const provider = getWalletProvider(walletClient);

      // Mock the balanceOf method since we can't make real network calls
      if (walletClient) {
        walletClient.balanceOf = mock().mockResolvedValue(
          BigInt("1000000000000000000")
        );
      }

      const result = await provider.get(
        mockRuntime as IAgentRuntime,
        mockMessage as Memory,
        mockState as State
      );

      expect(result.values?.address).toBeDefined();
      expect(result.values?.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(result.values?.balance).toBe("1000000000000000000");
      expect(result.data?.network).toBe("kairos");
    });

    it("should handle wallet client with viem wrapper correctly", async () => {
      const config = {
        KAIA_EVM_PRIVATE_KEY:
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat test key
        KAIA_NETWORK: "kaia",
      };

      const walletClient = getWalletClient(config);
      expect(walletClient).toBeDefined();

      // Test that wallet client has expected methods from viem wrapper
      expect(typeof walletClient.getAddress).toBe("function");
      expect(typeof walletClient.balanceOf).toBe("function");

      // Test address derivation
      const address = walletClient.getAddress();
      expect(address).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // Known address for this test key
    });
  });

  describe("Type compatibility", () => {
    it("should create wallet client compatible with goat-sdk types", () => {
      const config = {
        KAIA_EVM_PRIVATE_KEY:
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        KAIA_NETWORK: "kairos",
      };

      const walletClient = getWalletClient(config);
      if (walletClient) {
        // Test that the client has the expected shape for goat-sdk
        expect(walletClient).toHaveProperty("getAddress");
        expect(walletClient).toHaveProperty("balanceOf");

        // The viem wrapper should return a WalletClientBase compatible object
        expect(typeof walletClient.getAddress).toBe("function");
        expect(typeof walletClient.balanceOf).toBe("function");
      }
    });
  });
});
