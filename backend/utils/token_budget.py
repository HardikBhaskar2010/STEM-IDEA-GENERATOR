"""
Token budget utility for LLM call size management.

This module provides token estimation, budget enforcement, and usage logging
for incremental LLM calls in the agentic builder workflow.

Requirements: 13.1, 13.2, 13.5
"""

import logging

logger = logging.getLogger(__name__)

# Maximum tokens allowed in a prompt for incremental calls
MAX_PROMPT_TOKENS = 4000

# Maximum tokens allowed in a response for incremental calls
MAX_RESPONSE_TOKENS = 2000


class TokenBudget:
    """Utility class for managing token budgets in LLM calls.

    Provides token estimation, context truncation, and usage logging to keep
    each incremental LLM call small enough to avoid rate limits.

    Requirements: 13.1, 13.2, 13.5
    """

    MAX_PROMPT_TOKENS: int = MAX_PROMPT_TOKENS
    MAX_RESPONSE_TOKENS: int = MAX_RESPONSE_TOKENS

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for given text.

        Uses a rough approximation of 1 token ≈ 4 characters. This is a
        conservative estimate that works reasonably well for English text
        and code.

        Args:
            text: The text to estimate tokens for

        Returns:
            Estimated number of tokens

        Requirements: 13.1, 13.5
        """
        return len(text) // 4

    def truncate_context(self, context: str, max_tokens: int) -> str:
        """Truncate context string to fit within a token budget.

        If the context exceeds max_tokens, it is truncated at the character
        limit with a trailing marker so the LLM knows the content was cut.

        Args:
            context: The context string to potentially truncate
            max_tokens: Maximum number of tokens allowed

        Returns:
            Original context if within budget, otherwise truncated version

        Requirements: 13.1, 13.2
        """
        max_chars = max_tokens * 4
        if len(context) <= max_chars:
            return context
        return context[:max_chars] + "\n... (truncated)"

    def log_token_usage(
        self, operation: str, prompt_tokens: int, response_tokens: int
    ) -> None:
        """Log token usage for monitoring and observability.

        Records token usage for a specific operation to help track
        LLM API usage patterns and costs.

        Args:
            operation: Description of the operation (e.g., "file_creation", "planning")
            prompt_tokens: Number of tokens in the prompt
            response_tokens: Number of tokens in the response

        Requirements: 13.5
        """
        total_tokens = prompt_tokens + response_tokens
        logger.info(
            "Token usage for %s: prompt=%d, response=%d, total=%d",
            operation,
            prompt_tokens,
            response_tokens,
            total_tokens,
        )
