import OpenAI from 'openai';
import { SuggestionCache } from './cache';

export interface SuggestionContext {
  textBefore: string;
  textSelected: string;
  textAfter: string;
  fullText: string;
  pageContentBefore: string;
}

export interface SuggestionResponse {
  suggestion: string;
  error?: boolean;
  errorMessage?: string;
  cancelled?: boolean;
}

// Create cache instance with max 100 entries (no TTL)
const suggestionCache = new SuggestionCache<SuggestionContext, SuggestionResponse>({
  maxSize: 100,
});

// Track the current request to enable cancellation
let currentAbortController: AbortController | null = null;

const getClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set. Please create a .env.local file with your API key.');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
};

const systemPrompt = `You are an intelligent autocomplete assistant. Your job is to suggest the completion or replacement of the selected text to help the user.
If there is no meaningful selection, return empty string as suggestion.

You will be provided with:
- pageContext: Visible text on the page that provides context about what the user is responding to
- textBefore: What the user has typed so far (before cursor or selection)
- textSelected: Any text that is currently selected (empty if no selection)
- textAfter: What comes after the cursor or selection (if any)
- use website specific formatting rules

Rules:
1. Use the pageContext to understand what the user is responding to or filling out
2. Provide SHORT, natural continuations (3-8 words max)
3. Match the tone and style of the existing text and page context
4. Be contextually relevant based on the page content and user's partial input
5. If textAfter exists, suggest something that flows naturally into it
6. If textSelected exists, provide a suggestion that would replace the selected text only
7. Don't repeat what's already written
8. CRITICAL: Check if textBefore already ends with a space - if it does, DON'T add a leading space to your suggestion
9. CRITICAL: Only add a leading space if textBefore doesn't already end with a space or punctuation
10. Your suggestion will be inserted DIRECTLY after textBefore, so be careful with spacing

Your suggesting template: 
...pageContext...
$textBefore<$textSelected>$textAfter

Your suggestion will effectively replace the selected text:
$textBefore<$suggestion>$textAfter


Examples:
- pageContext: "What's your favorite color?", textBefore: "My favorite", textSelected: "", textAfter: "" → suggestion: " color is blue"
- pageContext: "Please enter your email address", textBefore: "john", textSelected: "", textAfter: "" → suggestion: "@example.com"
- pageContext: "Leave a comment", textBefore: "Great article", textSelected: "", textAfter: "" → suggestion: "! Thanks for sharing"
- textBefore: "hey", textSelected: "", textAfter: "" → suggestion: " there! What's up?"
- textBefore: "Thank you for", textSelected: "", textAfter: "" → suggestion: " your time and consideration"
- textBefore: "I think this is", textSelected: "bad", textAfter: " habit" → suggestion: "good" (replaces textSelected)
- textBefore: "this is actually detrimental overall, affecting performance significantly. ", textSelected: "", textAfter: "" → suggestion: "They require immediate attention." (NO leading space because textBefore already ends with space)
- textBefore: "I just read your ", textSelected: "comment", textAfter: " and I completely agree." → suggestion: "comment" (replaces textSelected)
`;

const suggestionTool = {
  type: "function" as const,
  function: {
    name: "provide_suggestion",
    description: "Provide the autocomplete suggestion text that should be inserted at the cursor position",
    parameters: {
      type: "object",
      properties: {
        suggestion: {
          type: "string",
          description: "The exact text to insert at the cursor position, including any necessary leading/trailing spaces",
        },
      },
      required: ["suggestion"],
    },
  },
};

const fetchSuggestion = async (context: SuggestionContext): Promise<SuggestionResponse> => {
  console.log('📝 Fetching AI suggestion with context:', {
    textBefore: context.textBefore,
    textAfter: context.textAfter,
    textSelected: context.textSelected,
    pageContentBefore: context.pageContentBefore.substring(0, 100) + '...',
    fullText: context.fullText,
  });

  // Don't suggest if text is too short
  if (context.textBefore.trim().length < 3) {
    return { suggestion: '' };
  }

  // Cancel any previous request
  if (currentAbortController) {
    currentAbortController.abort();
  }

  // Create new abort controller for this request
  const abortController = new AbortController();
  currentAbortController = abortController;

  try {
    const client = getClient();

    // Remove newlines and other formatting from the page context
    const condensedContext = context.pageContentBefore.replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, 300) + '...';

    //     const userPrompt = `pageContext: "${condensedContext}"

    // textBefore: ${JSON.stringify(context.textBefore)}
    // textSelected: ${JSON.stringify(context.textSelected)}
    // textAfter: ${JSON.stringify(context.textAfter)}

    // Suggest completion
    // `;

    const userPrompt = `
Base on page context (some text extracted from the page), generate suggested text to help user type.
Page context, use it to understand overall page content (loosely related to what user is typing): ${condensedContext}

Currently editing text:

textBefore: ${JSON.stringify(context.textBefore)} <-- this is what user has typed so far
textSelected: ${JSON.stringify(context.textSelected)} <-- provide suggestion to replace or complete this!!!
textAfter: ${JSON.stringify(context.textAfter)} <-- this is the text following your suggestion

Use "provide_suggestion" tool to return the suggested text. Pay attention to spaces etc, follow the style of the text entered so far.
`;

    const response = await client.chat.completions.create({
      // model: "gpt-4o-mini",
      model: "gpt-5-nano",
      messages: [
        // {
        //   role: "system",
        //   content: systemPrompt,
        // },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      tools: [suggestionTool],
      tool_choice: { type: "function", function: { name: "provide_suggestion" } },
      reasoning_effort: "low",
    }, {
      signal: abortController.signal, // Add abort signal in options
    });

    // Parse function call response
    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.type !== 'function') {
      console.warn('⚠️  No valid tool call in response');
      return { suggestion: '' };
    }

    // Type narrowing: toolCall is now ChatCompletionMessageToolCallFunction
    const functionCall = toolCall as Extract<typeof toolCall, { type: 'function' }>;

    if (functionCall.function.name !== "provide_suggestion") {
      console.warn('⚠️  Wrong function called:', functionCall.function.name);
      return { suggestion: '' };
    }

    const args = JSON.parse(functionCall.function.arguments);
    const suggestion = args.suggestion || '';

    console.log('✨ AI suggestion generated:', { suggestion, context, prompt: userPrompt });

    // Clear the abort controller since this request completed successfully
    if (currentAbortController === abortController) {
      currentAbortController = null;
    }

    return {
      suggestion,
    };
  } catch (error) {
    console.error('Error fetching suggestion:', error);

    // Clear the abort controller on error
    if (currentAbortController === abortController) {
      currentAbortController = null;
    }

    // Check if the error is due to request cancellation
    if ((error as Error).message?.includes('aborted')) {
      console.error('🚫 Request cancelled (newer request started)');
      return { suggestion: '', cancelled: true };
    }

    return {
      suggestion: '',
      error: true,
    };
  }
};

export const getSuggestion = async (context: SuggestionContext): Promise<SuggestionResponse> => {
  // Check cache first
  const cached = suggestionCache.get(context);

  if (cached) {
    return cached;
  }

  // No cache hit, create new promise and cache it
  const result = await fetchSuggestion(context);
  if (!result.cancelled && !result.error) {
    suggestionCache.set(context, result);
  }

  return result;
};

export const cancelCurrentSuggestionRequest = () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
};


export const getGuidedSuggestion = async (
  context: SuggestionContext,
  currentSuggestion: string,
  guidedPrompt: string
): Promise<SuggestionResponse> => {
  console.log('🎯 Fetching guided AI suggestion with context:', {
    textBefore: context.textBefore,
    textAfter: context.textAfter,
    textSelected: context.textSelected,
    pageContentBefore: context.pageContentBefore.substring(0, 100) + '...',
    fullText: context.fullText,
    currentSuggestion,
    guidedPrompt,
  });

  try {
    const client = getClient();

    //     const userPrompt = `You are in * guided rephrase * mode.

    //       pageContext: "${context.pageContentBefore}"

    //     textBefore: ${JSON.stringify(context.textBefore)}
    //     textSelected: ${JSON.stringify(context.textSelected)}
    //     textAfter: ${JSON.stringify(context.textAfter)}

    //     currentSuggestion: "${currentSuggestion}"
    //     guidedPrompt: "${guidedPrompt}"

    //     Task:
    // - Rephrase ** currentSuggestion ** to follow ** guidedPrompt **.Follow what user has asked for - either rewrite, add, remove, or change the text.
    // - Multiple lines are allowed - encode new lines as \\n without escaping.
    // - Match tone / style and flow with textBefore / textAfter.
    // - Apply spacing rules: if textBefore ends with space / punctuation, don't add a leading space; otherwise add exactly one leading space.
    //       - If textSelected is non - empty, produce text that replaces only the selected span.
    // Return ONLY the final text to insert.`;
    const condensedContext = context.pageContentBefore.replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, 300) + '...';

    const userPrompt = `
Base on page context (some text extracted from the page), typed text, and user's request, generate suggested text to help user type.
Page context, use it to understand overall page content and expected format (loosely related to what user is typing): ${condensedContext}

Currently editing text:

textBefore: ${JSON.stringify(context.textBefore)}
textSelected: ${JSON.stringify(context.textSelected)}
textAfter: ${JSON.stringify(context.textAfter)}

User has asked for: ${guidedPrompt}

Use "provide_suggestion" tool to return the suggested rewrite.
Return ONLY the final text to insert.
`;

    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        // { role: "system", content: systemPrompt + "\nWhen guidedPrompt is provided, prioritize rephrasing currentSuggestion per the guidance." },
        { role: "user", content: userPrompt },
      ],
      tools: [suggestionTool],
      tool_choice: { type: "function", function: { name: "provide_suggestion" } },
      reasoning_effort: "low",
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    console.log('🎯 AI guided suggestion response:', toolCall);
    if (!toolCall || toolCall.type !== 'function') {
      console.warn('⚠️  No valid tool call in response');
      return { suggestion: '' };
    }

    const functionCall = toolCall as Extract<typeof toolCall, { type: 'function' }>;
    if (functionCall.function.name !== "provide_suggestion") {
      console.warn('⚠️  Wrong function called:', functionCall.function.name);
      return { suggestion: '' };
    }

    const args = JSON.parse(functionCall.function.arguments);
    const suggestion = args.suggestion || '';

    console.log('✨ AI guided suggestion generated:', { suggestion });

    return { suggestion };
  } catch (error) {
    console.error('Error fetching guided suggestion:', error);
    return { suggestion: '', error: true };
  }
};
