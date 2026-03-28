"""
Token usage monitoring utility for LLM calls.

This module provides token estimation and usage logging for observability
when using free models without token limits.

Requirements: 13.5
"""

import logging

logger = logging.getLogger(__name__)


class TokenBudget:
    """Utility class for monitoring token usage in LLM calls.
    
    Provides token estimation and usage logging for observability purposes.
    No token limits are enforced, allowing use with free models.
    
    Requirements: 13.5
    """
    
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for given text.
        
        Uses a rough approximation of 1 token ≈ 4 characters. This is a
        conservative estimate that works reasonably well for English text
        and code.
        
        Args:
            text: The text to estimate tokens for
            
        Returns:
            Estimated number of tokens
            
        Requirements: 13.5
        """
        return len(text) // 4
    
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
            f"Token usage for {operation}: "
            f"prompt={prompt_tokens}, response={response_tokens}, "
            f"total={total_tokens}"
        )
