"""
OpenRouter response adapter.

Converts raw OpenRouter API responses to the internal format expected by
orchestrators and services, decoupling the rest of the codebase from changes
in OpenRouter's response schema.

Requirements: 4, 4.7
"""

from typing import Any, Dict, Optional


class ResponseAdapter:
    """
    Converts OpenRouter API responses to internal application format.

    All methods are static so the adapter can be used without instantiation.

    Requirements: 4.7
    """

    @staticmethod
    def adapt_chat_response(openrouter_response: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a raw OpenRouter chat-completion response to internal format.

        Args:
            openrouter_response: Raw JSON dict returned by the OpenRouter API.

        Returns:
            Normalised response dict with ``text``, ``model``, ``finish_reason``,
            and ``usage`` keys.
        """
        text = ResponseAdapter.extract_text_content(openrouter_response)
        metadata = ResponseAdapter.extract_metadata(openrouter_response)

        return {
            "text": text,
            "model": metadata.get("model"),
            "finish_reason": metadata.get("finish_reason"),
            "usage": metadata.get("usage", {}),
            "raw": openrouter_response,
        }

    @staticmethod
    def extract_text_content(response: Dict[str, Any]) -> str:
        """Extract the assistant's text from an OpenRouter response.

        Handles both the standard ``choices[0].message.content`` shape and
        the streaming delta shape gracefully.

        Args:
            response: Raw OpenRouter response dict.

        Returns:
            Extracted text content, or empty string if not found.
        """
        try:
            choices = response.get("choices", [])
            if not choices:
                return ""

            choice = choices[0]

            # Non-streaming response
            message = choice.get("message", {})
            if message:
                return message.get("content", "") or ""

            # Streaming delta
            delta = choice.get("delta", {})
            if delta:
                return delta.get("content", "") or ""

        except (KeyError, IndexError, TypeError):
            pass

        return ""

    @staticmethod
    def extract_metadata(response: Dict[str, Any]) -> Dict[str, Any]:
        """Extract metadata fields from an OpenRouter response.

        Args:
            response: Raw OpenRouter response dict.

        Returns:
            Dict with ``model``, ``finish_reason``, and ``usage`` keys.
        """
        metadata: Dict[str, Any] = {
            "model": response.get("model"),
            "finish_reason": None,
            "usage": response.get("usage", {}),
        }

        try:
            choices = response.get("choices", [])
            if choices:
                metadata["finish_reason"] = choices[0].get("finish_reason")
        except (KeyError, IndexError, TypeError):
            pass

        return metadata
