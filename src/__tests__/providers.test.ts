import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { getWalletProvider } from "../wallet";
import {
  createMockRuntime,
  createMockMemory,
  createMockState,
} from "./test-utils";
import { type IAgentRuntime, type Memory, type State } from "@elizaos/core";

describe("Kaia Wallet Provider", () => {
  let mockRuntime: any;
  let mockMessage: Partial<Memory>;
  let mockState: Partial<State>;

  beforeEach(() => {
    mockRuntime = createMockRuntime();
    mockMessage = createMockMemory();
    mockState = createMockState();
  });

  afterEach(() => {
    mock.restore();
  });

  it("should have required properties", () => {
    const provider = getWalletProvider(null);
    expect(provider.name).toBe("kaiaWallet");
    expect(provider.description).toBe(
      "Provides Kaia wallet address and balance information"
    );
    expect(provider.get).toBeDefined();
    expect(typeof provider.get).toBe("function");
  });

  it("should handle null wallet client gracefully", async () => {
    const provider = getWalletProvider(null);
    const result = await provider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    expect(result).toMatchObject({
      text: "Wallet not configured. Please set KAIA_EVM_PRIVATE_KEY in your environment.",
      values: {
        address: null,
        balance: null,
      },
    });
  });

  it("should return wallet data when client is available", async () => {
    // Mock wallet client
    const mockWalletClient = {
      getAddress: () => "0x1234567890123456789012345678901234567890",
      balanceOf: mock().mockResolvedValue(BigInt("1000000000000000000")), // 1 ETH
    };

    const provider = getWalletProvider(mockWalletClient);
    const result = await provider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    expect(result).toMatchObject({
      text: expect.stringContaining(
        "EVM Wallet Address: 0x1234567890123456789012345678901234567890"
      ),
      values: {
        address: "0x1234567890123456789012345678901234567890",
        balance: "1000000000000000000",
      },
      data: {
        address: "0x1234567890123456789012345678901234567890",
        balance: BigInt("1000000000000000000"),
        network: "kairos",
      },
    });
  });

  it("should handle errors from wallet client", async () => {
    // Mock wallet client that throws error
    const mockWalletClient = {
      getAddress: () => {
        throw new Error("Wallet error");
      },
      balanceOf: mock(),
    };

    const provider = getWalletProvider(mockWalletClient);
    const result = await provider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    expect(result).toMatchObject({
      text: "Error fetching wallet information",
      values: {
        address: null,
        balance: null,
      },
    });
  });

  it("should use network from runtime settings", async () => {
    mockRuntime.getSetting = mock().mockImplementation((key: string) => {
      if (key === "KAIA_NETWORK") return "kaia";
      return null;
    });

    const mockWalletClient = {
      getAddress: () => "0x1234567890123456789012345678901234567890",
      balanceOf: mock().mockResolvedValue(BigInt("0")),
    };

    const provider = getWalletProvider(mockWalletClient);
    const result = await provider.get(
      mockRuntime as IAgentRuntime,
      mockMessage as Memory,
      mockState as State
    );

    expect(result.data?.network).toBe("kaia");
  });
});
