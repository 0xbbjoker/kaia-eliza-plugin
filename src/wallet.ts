import type { WalletClientBase } from "@goat-sdk/core";
import { viem } from "@goat-sdk/wallet-viem";
import {
  createWalletClient,
  http,
} from "@goat-sdk/wallet-viem/node_modules/viem";
import { privateKeyToAccount } from "@goat-sdk/wallet-viem/node_modules/viem/accounts";
import { kaia, kairos } from "@goat-sdk/wallet-viem/node_modules/viem/chains";
import type {
  Provider,
  IAgentRuntime,
  Memory,
  State,
  ProviderResult,
} from "@elizaos/core";

// Add the chain you want to use, remember to update also
// the EVM_PROVIDER_URL to the correct one for the chain

export function getWalletClient(config: any): any {
  const privateKey = config.KAIA_EVM_PRIVATE_KEY;
  if (!privateKey) return null;

  const chain = config.KAIA_NETWORK == "kaia" ? kaia : kairos;

  const provider = chain.rpcUrls.default.http[0];

  const wallet = createWalletClient({
    account: privateKeyToAccount(privateKey as `0x${string}`),
    chain: chain,
    transport: http(provider),
  });

  return viem(wallet);
}

export function getWalletProvider(walletClient: any): Provider {
  return {
    name: "kaiaWallet",
    description: "Provides Kaia wallet address and balance information",
    async get(
      runtime: IAgentRuntime,
      message: Memory,
      state: State
    ): Promise<ProviderResult> {
      if (!walletClient) {
        return {
          text: "Wallet not configured. Please set KAIA_EVM_PRIVATE_KEY in your environment.",
          values: {
            address: null,
            balance: null,
          },
        };
      }

      try {
        const address = walletClient.getAddress();
        const balance = await walletClient.balanceOf(address);
        return {
          text: `EVM Wallet Address: ${address}\nBalance: ${balance} ETH`,
          values: {
            address,
            balance: balance.toString(),
          },
          data: {
            address,
            balance,
            network: runtime.getSetting("KAIA_NETWORK") || "kairos",
          },
        };
      } catch (error) {
        console.error("Error in EVM wallet provider:", error);
        return {
          text: "Error fetching wallet information",
          values: {
            address: null,
            balance: null,
          },
        };
      }
    },
  };
}
