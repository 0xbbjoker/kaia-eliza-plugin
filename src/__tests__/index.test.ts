import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import createKaiaPlugin from "../index";
import { mockConsole } from "./test-utils";

describe("Kaia Plugin", () => {
  let consoleMock: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    consoleMock = mockConsole();
  });

  afterEach(() => {
    consoleMock.restore();
    mock.restore();
  });

  it("should export a function that creates a plugin", () => {
    expect(createKaiaPlugin).toBeDefined();
    expect(typeof createKaiaPlugin).toBe("function");
  });

  it("should create a valid plugin object with required properties", async () => {
    const config = {
      KAIA_EVM_PRIVATE_KEY:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
      KAIA_NETWORK: "kairos",
      KAIA_KAIASCAN_API_KEY: "test-api-key",
    };

    const plugin = await createKaiaPlugin(config);

    expect(plugin).toBeDefined();
    expect(plugin.name).toBe("kaia");
    expect(plugin.description).toBe("Kaia blockchain integration plugin");
  });

  it("should export providers array", async () => {
    const config = {
      KAIA_EVM_PRIVATE_KEY:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
      KAIA_NETWORK: "kairos",
    };

    const plugin = await createKaiaPlugin(config);

    expect(plugin.providers).toBeDefined();
    expect(Array.isArray(plugin.providers)).toBe(true);
    expect(plugin.providers!.length).toBe(1);

    // Check wallet provider
    const walletProvider = plugin.providers![0];
    expect(walletProvider.name).toBe("kaiaWallet");
    expect(walletProvider.get).toBeDefined();
    expect(typeof walletProvider.get).toBe("function");
  });

  it("should export actions array", async () => {
    const config = {
      KAIA_EVM_PRIVATE_KEY:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
      KAIA_NETWORK: "kairos",
      KAIA_KAIASCAN_API_KEY: "test-api-key",
    };

    const plugin = await createKaiaPlugin(config);

    expect(plugin.actions).toBeDefined();
    expect(Array.isArray(plugin.actions)).toBe(true);

    // Each action should have required properties
    plugin.actions!.forEach((action) => {
      expect(action.name).toBeDefined();
      expect(action.handler).toBeDefined();
      expect(typeof action.handler).toBe("function");
    });
  });

  it("should export empty evaluators array", async () => {
    const config = {};
    const plugin = await createKaiaPlugin(config);

    expect(plugin.evaluators).toBeDefined();
    expect(Array.isArray(plugin.evaluators)).toBe(true);
    expect(plugin.evaluators!.length).toBe(0);
  });

  it("should export empty services array", async () => {
    const config = {};
    const plugin = await createKaiaPlugin(config);

    expect(plugin.services).toBeDefined();
    expect(Array.isArray(plugin.services)).toBe(true);
    expect(plugin.services!.length).toBe(0);
  });

  it("should handle missing private key gracefully", async () => {
    const config = {
      KAIA_NETWORK: "kairos",
      KAIA_KAIASCAN_API_KEY: "test-api-key",
    };

    const plugin = await createKaiaPlugin(config);

    expect(plugin).toBeDefined();
    expect(plugin.name).toBe("kaia");

    // Should still have provider but it will handle null wallet
    expect(plugin.providers!.length).toBe(1);

    // Actions should be empty when no wallet
    expect(plugin.actions!.length).toBe(0);
  });

  it("should use default network when not specified", async () => {
    const config = {
      KAIA_EVM_PRIVATE_KEY:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
    };

    const plugin = await createKaiaPlugin(config);

    expect(plugin).toBeDefined();
    // The default network is handled internally by getWalletClient
    expect(plugin.providers!.length).toBe(1);
  });

  it("should handle complete configuration", async () => {
    const config = {
      KAIA_EVM_PRIVATE_KEY:
        "0x1234567890123456789012345678901234567890123456789012345678901234",
      KAIA_NETWORK: "kaia", // mainnet
      KAIA_KAIASCAN_API_KEY: "test-api-key",
      KAIROS_FAUCET_AMOUNT: "5",
    };

    const plugin = await createKaiaPlugin(config);

    expect(plugin).toBeDefined();
    expect(plugin.name).toBe("kaia");
    expect(plugin.description).toBe("Kaia blockchain integration plugin");
    expect(plugin.providers!.length).toBeGreaterThan(0);
    expect(plugin.actions!.length).toBeGreaterThanOrEqual(0);
  });
});
