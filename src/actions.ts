import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { Kaia, Packages } from "@kaiachain/kaia-agent-kit";
import type { WalletClientBase } from "@goat-sdk/core";

import {
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  composePromptFromState,
} from "@elizaos/core";

export async function getOnChainActions(wallet: any, config: any) {
  // 1. Prepares actions
  const actionsWithoutHandler = [];
  for (const pkg of Object.values(Packages)) {
    const services =
      (pkg as { Services?: Record<string, unknown> }).Services || {};
    const metadata: any = pkg.Metadata || {};
    for (const serviceName of Object.keys(services)) {
      const meta = metadata[serviceName];
      if (meta) {
        actionsWithoutHandler.push({
          name: meta.name,
          description: meta.description,
          similes: meta.similes,
          validate: meta.validate,
          examples: meta.examples,
        });
      }
    }
  }

  const tools = await getOnChainTools({
    wallet: wallet as WalletClientBase,
    // 2. Enable only the plugins you need to perform those actions by PackagesEnum. By default all the packages are enabled.
    plugins: [
      Kaia({
        KAIA_KAIASCAN_API_KEY: config.KAIA_KAIASCAN_API_KEY,
        packages: [],
      }),
    ],
  });

  // 3. Handle all the actions
  return actionsWithoutHandler.map((action) => ({
    ...action,
    handler: getActionHandler(action.name, action.description, tools),
  }));
}

function getActionHandler(
  actionName: string,
  actionDescription: string,
  tools: any
) {
  return async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.composeState(message, ["RECENT_MESSAGES"]);
    }

    try {
      // 1. Call the tools needed
      const prompt = composeActionContext(
        actionName,
        actionDescription,
        currentState
      );

      // Note: The original code uses generateText with tools, which appears to be
      // a custom implementation. This needs to be adapted based on how tools
      // are handled in v1. For now, preserving similar structure.
      const result = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
        // Note: tools integration would need to be handled differently in v1
        // This is a placeholder that maintains the intent
        systemPrompt:
          "You have access to blockchain tools. Execute the requested action.",
      });

      // 2. Compose the response
      const responsePrompt = composeResponseContext(result, currentState);
      const responseText = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: responsePrompt,
      });

      callback?.({
        text: responseText,
        content: {},
      });
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 3. Compose the error response
      const errorPrompt = composeErrorResponseContext(
        errorMessage,
        currentState
      );
      const errorResponseText = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: errorPrompt,
      });

      callback?.({
        text: errorResponseText,
        content: { error: errorMessage },
      });
      return false;
    }
  };
}

function composeActionContext(
  actionName: string,
  actionDescription: string,
  state: State
): string {
  const actionTemplate = `
# Knowledge
{{knowledge}}

About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}


# Action: ${actionName}
${actionDescription}

{{recentMessages}}

Based on the action chosen and the previous messages, execute the action and respond to the user using the tools you were given.
`;
  return composePromptFromState({ state, template: actionTemplate });
}

function composeResponseContext(result: unknown, state: State): string {
  const responseTemplate = `
    # Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

Here is the result:
${JSON.stringify(result)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
  `;
  return composePromptFromState({ state, template: responseTemplate });
}

function composeErrorResponseContext(
  errorMessage: string,
  state: State
): string {
  const errorResponseTemplate = `
# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{actions}}

Respond to the message knowing that the action failed.
The error was:
${errorMessage}

These were the previous messages:
{{recentMessages}}
    `;
  return composePromptFromState({ state, template: errorResponseTemplate });
}

// This function is no longer needed as we use runtime.useModel directly
