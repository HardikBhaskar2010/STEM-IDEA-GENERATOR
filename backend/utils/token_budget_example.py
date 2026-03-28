"""
Example usage of TokenBudget utility for monitoring token usage.

This example demonstrates how to use TokenBudget for observability
when making LLM calls with free models that don't have token limits.
"""

from backend.utils.token_budget import TokenBudget


def example_llm_call_with_monitoring():
    """Example of monitoring token usage during an LLM call."""
    budget = TokenBudget()
    
    # Prepare prompt
    prompt = """You are an expert software architect. Create a detailed implementation plan for:

Build a Pomodoro Timer web application

Requirements:
- MINIMUM 15-20 files (not 4-file skeletons)
- Complete project structure with proper organization
- All configuration files (package.json, tsconfig, vite.config, etc.)
"""
    
    # Estimate tokens before making the call
    prompt_tokens = budget.estimate_tokens(prompt)
    print(f"Estimated prompt tokens: {prompt_tokens}")
    
    # Simulate LLM response
    response = """Here is the implementation plan:
    
1. package.json - Project dependencies and scripts
2. tsconfig.json - TypeScript configuration
3. vite.config.ts - Vite build configuration
4. src/App.tsx - Main application component
5. src/components/Timer.tsx - Timer display component
6. src/components/Controls.tsx - Timer control buttons
7. src/components/Settings.tsx - Settings panel
8. src/hooks/useTimer.ts - Custom timer hook
9. src/utils/notifications.ts - Browser notification utilities
10. src/styles/global.css - Global styles
"""
    
    # Estimate response tokens
    response_tokens = budget.estimate_tokens(response)
    print(f"Estimated response tokens: {response_tokens}")
    
    # Log the usage for monitoring
    budget.log_token_usage("planning_phase", prompt_tokens, response_tokens)
    
    return response


def example_file_creation_monitoring():
    """Example of monitoring token usage during file creation."""
    budget = TokenBudget()
    
    # Context for file creation
    context = """Project: Pomodoro Timer
Description: A web-based Pomodoro timer with settings and notifications
Tech Stack: React, TypeScript, Vite

File to create: src/components/Timer.tsx
Purpose: Display the countdown timer with minutes and seconds
"""
    
    # Simulated file content response
    file_content = """import React from 'react';
import { useTimer } from '../hooks/useTimer';

interface TimerProps {
  duration: number;
  onComplete: () => void;
}

export const Timer: React.FC<TimerProps> = ({ duration, onComplete }) => {
  const { minutes, seconds, isRunning } = useTimer(duration, onComplete);
  
  return (
    <div className="timer">
      <div className="timer-display">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
    </div>
  );
};
"""
    
    # Estimate and log
    prompt_tokens = budget.estimate_tokens(context)
    response_tokens = budget.estimate_tokens(file_content)
    
    budget.log_token_usage("file_creation_Timer.tsx", prompt_tokens, response_tokens)
    
    print(f"Created Timer.tsx - Prompt: {prompt_tokens} tokens, Response: {response_tokens} tokens")


def example_debugging_monitoring():
    """Example of monitoring token usage during debugging."""
    budget = TokenBudget()
    
    error_log = """Error: Cannot find module 'react'
  at Module._resolveFilename (internal/modules/cjs/loader.js:636:15)
  at Function.Module._load (internal/modules/cjs/loader.js:562:25)
  at Module.require (internal/modules/cjs/loader.js:692:17)
"""
    
    fix_strategy = """Install React dependency:
npm install react react-dom

Update package.json to include:
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
"""
    
    prompt_tokens = budget.estimate_tokens(error_log)
    response_tokens = budget.estimate_tokens(fix_strategy)
    
    budget.log_token_usage("debugging_iteration_1", prompt_tokens, response_tokens)
    
    print(f"Debugging iteration - Prompt: {prompt_tokens} tokens, Response: {response_tokens} tokens")


if __name__ == "__main__":
    print("=== Example 1: Planning Phase ===")
    example_llm_call_with_monitoring()
    
    print("\n=== Example 2: File Creation ===")
    example_file_creation_monitoring()
    
    print("\n=== Example 3: Debugging ===")
    example_debugging_monitoring()
    
    print("\n=== Summary ===")
    print("TokenBudget provides observability without enforcing limits.")
    print("This allows use with free models while tracking usage patterns.")
