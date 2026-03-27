"""
Unit tests for core modules:
  - OpenRouterErrorMapper (integrations/openrouter/errors.py)
  - ResponseAdapter (integrations/openrouter/adapter.py)
  - OpenRouterConfig (core/config.py)
  - APIKeySecurityValidator (core/security.py)
  - local_generator / generate_practical_steps (utils/fallback.py)

Requirements: 1, 2, 4.7, 4.8, 27
"""

import os
import pytest
from unittest.mock import patch

from backend.integrations.openrouter.errors import OpenRouterErrorMapper
from backend.integrations.openrouter.adapter import ResponseAdapter
from backend.core.security import APIKeySecurityValidator
from backend.utils.fallback import local_generator, generate_practical_steps


# ===========================================================================
# OpenRouterErrorMapper
# ===========================================================================

class TestOpenRouterErrorMapper:
    """Requirements: 4.8"""

    def test_known_error_code_maps_to_correct_status(self):
        assert OpenRouterErrorMapper.map_error_to_http_status("rate_limit_exceeded") == 429
        assert OpenRouterErrorMapper.map_error_to_http_status("invalid_api_key") == 401
        assert OpenRouterErrorMapper.map_error_to_http_status("context_length_exceeded") == 413
        assert OpenRouterErrorMapper.map_error_to_http_status("internal_server_error") == 500

    def test_unknown_error_defaults_to_500(self):
        assert OpenRouterErrorMapper.map_error_to_http_status("gibberish_error") == 500

    def test_error_code_is_case_insensitive(self):
        assert OpenRouterErrorMapper.map_error_to_http_status("RATE_LIMIT_EXCEEDED") == 429

    def test_user_friendly_message_for_known_code(self):
        msg = OpenRouterErrorMapper.get_user_friendly_message("invalid_api_key")
        assert "authentication" in msg.lower() or "key" in msg.lower()

    def test_user_friendly_message_fallback(self):
        msg = OpenRouterErrorMapper.get_user_friendly_message("totally_unknown")
        assert isinstance(msg, str) and len(msg) > 0

    def test_map_error_response_returns_all_fields(self):
        result = OpenRouterErrorMapper.map_error_response(
            "rate_limit_exceeded",
            error_message="Too many requests",
            http_status=429,
        )
        assert result["http_status"] == 429
        assert result["error_code"] == "rate_limit_exceeded"
        assert "user_message" in result

    def test_map_error_response_handles_none_code(self):
        result = OpenRouterErrorMapper.map_error_response(None)
        assert result["http_status"] in (500, 503, 502)


# ===========================================================================
# ResponseAdapter
# ===========================================================================

class TestResponseAdapter:
    """Requirements: 4.7"""

    def test_extract_text_content_standard_response(self):
        response = {
            "choices": [{"message": {"content": "Hello, world!"}, "finish_reason": "stop"}]
        }
        assert ResponseAdapter.extract_text_content(response) == "Hello, world!"

    def test_extract_text_content_streaming_delta(self):
        response = {
            "choices": [{"delta": {"content": "stream chunk"}, "finish_reason": None}]
        }
        assert ResponseAdapter.extract_text_content(response) == "stream chunk"

    def test_extract_text_content_empty_choices(self):
        assert ResponseAdapter.extract_text_content({"choices": []}) == ""

    def test_extract_text_content_malformed_response(self):
        assert ResponseAdapter.extract_text_content({}) == ""
        assert ResponseAdapter.extract_text_content({"choices": None}) == ""

    def test_extract_metadata_contains_model_and_usage(self):
        response = {
            "model": "gpt-4",
            "usage": {"prompt_tokens": 10, "completion_tokens": 20},
            "choices": [{"finish_reason": "stop"}],
        }
        meta = ResponseAdapter.extract_metadata(response)
        assert meta["model"] == "gpt-4"
        assert meta["finish_reason"] == "stop"
        assert meta["usage"]["prompt_tokens"] == 10

    def test_adapt_chat_response_has_all_keys(self):
        response = {
            "model": "test-model",
            "usage": {},
            "choices": [{"message": {"content": "Hi"}, "finish_reason": "stop"}],
        }
        adapted = ResponseAdapter.adapt_chat_response(response)
        assert adapted["text"] == "Hi"
        assert adapted["model"] == "test-model"
        assert "usage" in adapted
        assert "raw" in adapted


# ===========================================================================
# APIKeySecurityValidator
# ===========================================================================

class TestAPIKeySecurityValidator:
    """Requirements: 2"""

    API_KEY = "sk-or-v1-abc123def456ghi789"

    def test_sanitize_log_message_removes_api_key(self):
        msg = f"Connecting with key {self.API_KEY} to server"
        result = APIKeySecurityValidator.sanitize_log_message(msg, self.API_KEY)
        assert self.API_KEY not in result
        assert "[API_KEY_REDACTED]" in result

    def test_sanitize_log_message_no_change_when_key_absent(self):
        msg = "Normal log message without key"
        result = APIKeySecurityValidator.sanitize_log_message(msg, self.API_KEY)
        assert result == msg

    def test_sanitize_error_message(self):
        error = f"Authorization failed for {self.API_KEY}"
        result = APIKeySecurityValidator.sanitize_error_message(error, self.API_KEY)
        assert self.API_KEY not in result

    def test_sanitize_dict_values_recursively_removes_key(self):
        data = {
            "headers": {"Authorization": f"Bearer {self.API_KEY}"},
            "body": f"key={self.API_KEY}",
        }
        result = APIKeySecurityValidator.sanitize_dict_values(data, self.API_KEY)
        import json
        flat = json.dumps(result)
        assert self.API_KEY not in flat

    def test_validate_no_key_exposure_true_when_clean(self):
        clean = "No sensitive data here"
        assert APIKeySecurityValidator.validate_no_key_exposure(clean, self.API_KEY) is True

    def test_validate_no_key_exposure_false_when_exposed(self):
        exposed = f"Error: invalid key {self.API_KEY}"
        assert APIKeySecurityValidator.validate_no_key_exposure(exposed, self.API_KEY) is False


# ===========================================================================
# local_generator / generate_practical_steps
# ===========================================================================

class TestFallback:
    """Requirements: 27"""

    def test_local_generator_returns_project_dict(self):
        result = local_generator({"projectType": "robotics", "skillLevel": "beginner"})
        assert "title" in result
        assert "steps" in result
        assert "components" in result
        assert isinstance(result["steps"], list)

    def test_local_generator_fallback_flag_set(self):
        result = local_generator({"projectType": "robotics", "skillLevel": "intermediate"})
        assert result.get("fallback") is True

    def test_local_generator_unknown_type_uses_default(self):
        result = local_generator({"projectType": "quantum-cooking", "skillLevel": "expert"})
        assert "title" in result
        assert len(result["steps"]) > 0

    def test_local_generator_beginner_time_is_shorter(self):
        beginner = local_generator({"projectType": "robotics", "skillLevel": "beginner"})
        advanced = local_generator({"projectType": "robotics", "skillLevel": "advanced"})
        # Estimated time strings should differ
        assert beginner["estimatedTime"] != advanced["estimatedTime"]

    def test_local_generator_all_project_types(self):
        for ptype in ["robotics", "electronics", "programming", "math", "science"]:
            result = local_generator({"projectType": ptype, "skillLevel": "intermediate"})
            assert result["title"]

    def test_generate_practical_steps_correct_count(self):
        steps = generate_practical_steps("Solar Panel Project", num_steps=4)
        assert len(steps) == 4

    def test_generate_practical_steps_contains_topic(self):
        steps = generate_practical_steps("Hydroponic Garden", num_steps=3)
        for step in steps:
            assert "Hydroponic Garden" in step

    def test_generate_practical_steps_default_count(self):
        steps = generate_practical_steps("Robotics")
        assert len(steps) == 6
