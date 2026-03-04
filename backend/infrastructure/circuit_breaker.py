"""
Circuit Breaker for external service calls.

This module provides circuit breaker functionality with:
- State management (CLOSED, OPEN, HALF_OPEN)
- Automatic state transitions based on failure/success thresholds
- Timeout and half-open timeout configuration
- Fallback function support
- Metrics recording (failures, successes, state changes)
- Circuit breaker registry for managing multiple breakers

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
"""

import time
import logging
import asyncio
from enum import Enum
from typing import Optional, Callable, Any, Dict
from datetime import datetime, timedelta
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker state."""
    CLOSED = "closed"      # Normal operation, requests pass through
    OPEN = "open"          # Circuit is open, requests fail immediately
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerMetrics:
    """
    Circuit breaker metrics.
    
    Attributes:
        failure_count: Total number of failures
        success_count: Total number of successes
        consecutive_failures: Current consecutive failure count
        consecutive_successes: Current consecutive success count
        state_changes: List of state change events
        last_failure_time: Timestamp of last failure
        last_success_time: Timestamp of last success
        total_calls: Total number of calls attempted
    """
    failure_count: int = 0
    success_count: int = 0
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    state_changes: list = field(default_factory=list)
    last_failure_time: Optional[float] = None
    last_success_time: Optional[float] = None
    total_calls: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return {
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "consecutive_failures": self.consecutive_failures,
            "consecutive_successes": self.consecutive_successes,
            "state_changes": self.state_changes[-10:],  # Last 10 changes
            "last_failure_time": self.last_failure_time,
            "last_success_time": self.last_success_time,
            "total_calls": self.total_calls,
            "success_rate": (
                self.success_count / self.total_calls 
                if self.total_calls > 0 else 0.0
            )
        }


class CircuitBreakerOpenError(Exception):
    """Exception raised when circuit breaker is open."""
    pass


class CircuitBreaker:
    """
    Circuit breaker for external service calls.
    
    Implements the circuit breaker pattern to prevent cascading failures:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Circuit is open after threshold failures, requests fail fast
    - HALF_OPEN: Testing recovery, limited requests allowed
    
    State Transitions:
    - CLOSED → OPEN: After failure_threshold consecutive failures
    - OPEN → HALF_OPEN: After timeout duration
    - HALF_OPEN → CLOSED: After success_threshold consecutive successes
    - HALF_OPEN → OPEN: On any failure
    
    Requirements:
    - 5.1: Transition from CLOSED to OPEN after failure threshold
    - 5.2: Reject requests immediately in OPEN state
    - 5.3: Transition to HALF_OPEN after timeout
    - 5.4: Transition to CLOSED after success threshold in HALF_OPEN
    - 5.5: Transition back to OPEN on failure in HALF_OPEN
    - 5.6: Execute fallback function when circuit is OPEN
    - 5.7: Record metrics (failures, successes, state changes)
    """
    
    def __init__(
        self,
        name: str = "default",
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout: timedelta = timedelta(seconds=60),
        half_open_timeout: timedelta = timedelta(seconds=30)
    ):
        """
        Initialize circuit breaker.
        
        Args:
            name: Name of the circuit breaker (for logging/metrics)
            failure_threshold: Number of consecutive failures before opening circuit
            success_threshold: Number of consecutive successes to close circuit from half-open
            timeout: Duration to wait before transitioning from OPEN to HALF_OPEN
            half_open_timeout: Duration to wait in HALF_OPEN before allowing next request
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout = timeout
        self.half_open_timeout = half_open_timeout
        
        # State management
        self.state = CircuitState.CLOSED
        self._state_changed_at = time.time()
        self._last_attempt_time: Optional[float] = None
        
        # Metrics
        self.metrics = CircuitBreakerMetrics()
        
        # Lock for thread-safe state transitions
        self._lock = asyncio.Lock()
        
        logger.info(
            f"Initialized CircuitBreaker '{name}': "
            f"failure_threshold={failure_threshold}, "
            f"success_threshold={success_threshold}, "
            f"timeout={timeout.total_seconds()}s"
        )
    
    async def call(
        self,
        func: Callable,
        *args,
        fallback: Optional[Callable] = None,
        **kwargs
    ) -> Any:
        """
        Execute function with circuit breaker protection.
        
        Flow:
        1. Check circuit state
        2. If OPEN and fallback provided, execute fallback
        3. If OPEN and no fallback, raise CircuitBreakerOpenError
        4. If CLOSED or HALF_OPEN, execute function
        5. Record success/failure and update state
        
        Args:
            func: Function to execute (can be sync or async)
            *args: Positional arguments for func
            fallback: Optional fallback function to execute when circuit is OPEN
            **kwargs: Keyword arguments for func
        
        Returns:
            Result from func or fallback
        
        Raises:
            CircuitBreakerOpenError: If circuit is OPEN and no fallback provided
            Exception: Any exception raised by func
        
        Requirements:
        - 5.2: Reject requests immediately in OPEN state
        - 5.6: Execute fallback function when circuit is OPEN
        """
        async with self._lock:
            # Update state based on timeout
            await self._check_and_update_state()
            
            # Check if circuit is OPEN
            if self.state == CircuitState.OPEN:
                logger.warning(
                    f"CircuitBreaker '{self.name}' is OPEN, "
                    f"request rejected"
                )
                
                # Execute fallback if provided
                if fallback:
                    logger.info(
                        f"CircuitBreaker '{self.name}' executing fallback"
                    )
                    try:
                        if asyncio.iscoroutinefunction(fallback):
                            return await fallback(*args, **kwargs)
                        else:
                            return fallback(*args, **kwargs)
                    except Exception as e:
                        logger.error(
                            f"CircuitBreaker '{self.name}' fallback failed: {e}"
                        )
                        raise
                
                # No fallback, raise error
                raise CircuitBreakerOpenError(
                    f"CircuitBreaker '{self.name}' is OPEN"
                )
            
            # Record attempt
            self._last_attempt_time = time.time()
            self.metrics.total_calls += 1
        
        # Execute function (outside lock to allow concurrent calls in CLOSED state)
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Record success
            await self._record_success()
            
            return result
        
        except Exception as e:
            # Record failure
            await self._record_failure()
            
            # Re-raise exception
            raise
    
    async def _check_and_update_state(self) -> None:
        """
        Check and update circuit state based on timeouts.
        
        State transitions:
        - OPEN → HALF_OPEN: After timeout duration
        
        Requirements:
        - 5.3: Transition to HALF_OPEN after timeout
        """
        current_time = time.time()
        time_in_state = current_time - self._state_changed_at
        
        # Check if we should transition from OPEN to HALF_OPEN
        if self.state == CircuitState.OPEN:
            if time_in_state >= self.timeout.total_seconds():
                await self._transition_to(CircuitState.HALF_OPEN)
                logger.info(
                    f"CircuitBreaker '{self.name}' transitioned to HALF_OPEN "
                    f"after {time_in_state:.2f}s"
                )
    
    async def _record_success(self) -> None:
        """
        Record successful call and update state.
        
        State transitions:
        - HALF_OPEN → CLOSED: After success_threshold consecutive successes
        
        Requirements:
        - 5.4: Transition to CLOSED after success threshold in HALF_OPEN
        - 5.7: Record metrics
        """
        async with self._lock:
            current_time = time.time()
            
            # Update metrics
            self.metrics.success_count += 1
            self.metrics.consecutive_successes += 1
            self.metrics.consecutive_failures = 0  # Reset failure count
            self.metrics.last_success_time = current_time
            
            logger.debug(
                f"CircuitBreaker '{self.name}' recorded success: "
                f"consecutive_successes={self.metrics.consecutive_successes}"
            )
            
            # Check if we should transition from HALF_OPEN to CLOSED
            if self.state == CircuitState.HALF_OPEN:
                if self.metrics.consecutive_successes >= self.success_threshold:
                    await self._transition_to(CircuitState.CLOSED)
                    logger.info(
                        f"CircuitBreaker '{self.name}' transitioned to CLOSED "
                        f"after {self.metrics.consecutive_successes} consecutive successes"
                    )
    
    async def _record_failure(self) -> None:
        """
        Record failed call and update state.
        
        State transitions:
        - CLOSED → OPEN: After failure_threshold consecutive failures
        - HALF_OPEN → OPEN: On any failure
        
        Requirements:
        - 5.1: Transition from CLOSED to OPEN after failure threshold
        - 5.5: Transition back to OPEN on failure in HALF_OPEN
        - 5.7: Record metrics
        """
        async with self._lock:
            current_time = time.time()
            
            # Update metrics
            self.metrics.failure_count += 1
            self.metrics.consecutive_failures += 1
            self.metrics.consecutive_successes = 0  # Reset success count
            self.metrics.last_failure_time = current_time
            
            logger.debug(
                f"CircuitBreaker '{self.name}' recorded failure: "
                f"consecutive_failures={self.metrics.consecutive_failures}"
            )
            
            # Check if we should transition to OPEN
            if self.state == CircuitState.CLOSED:
                if self.metrics.consecutive_failures >= self.failure_threshold:
                    await self._transition_to(CircuitState.OPEN)
                    logger.warning(
                        f"CircuitBreaker '{self.name}' transitioned to OPEN "
                        f"after {self.metrics.consecutive_failures} consecutive failures"
                    )
            
            elif self.state == CircuitState.HALF_OPEN:
                # Any failure in HALF_OPEN immediately opens circuit
                await self._transition_to(CircuitState.OPEN)
                logger.warning(
                    f"CircuitBreaker '{self.name}' transitioned to OPEN "
                    f"from HALF_OPEN due to failure"
                )
    
    async def _transition_to(self, new_state: CircuitState) -> None:
        """
        Transition to new state and record the change.
        
        Args:
            new_state: New circuit state
        
        Requirements:
        - 5.7: Record state changes
        """
        old_state = self.state
        self.state = new_state
        self._state_changed_at = time.time()
        
        # Record state change
        state_change = {
            "from": old_state.value,
            "to": new_state.value,
            "timestamp": self._state_changed_at,
            "datetime": datetime.fromtimestamp(self._state_changed_at).isoformat()
        }
        self.metrics.state_changes.append(state_change)
        
        logger.info(
            f"CircuitBreaker '{self.name}' state transition: "
            f"{old_state.value} → {new_state.value}"
        )
    
    async def get_state(self) -> CircuitState:
        """
        Get current circuit state.
        
        Returns:
            Current CircuitState
        """
        async with self._lock:
            await self._check_and_update_state()
            return self.state
    
    async def reset(self) -> None:
        """
        Manually reset circuit breaker to CLOSED state.
        
        Resets all metrics and state. Useful for testing or admin operations.
        """
        async with self._lock:
            old_state = self.state
            self.state = CircuitState.CLOSED
            self._state_changed_at = time.time()
            self.metrics = CircuitBreakerMetrics()
            
            logger.info(
                f"CircuitBreaker '{self.name}' manually reset "
                f"from {old_state.value} to CLOSED"
            )
    
    async def get_metrics(self) -> Dict[str, Any]:
        """
        Get circuit breaker metrics.
        
        Returns:
            Dict with current metrics and state information
        
        Requirements:
        - 5.7: Record metrics (failures, successes, state changes)
        """
        async with self._lock:
            await self._check_and_update_state()
            
            return {
                "name": self.name,
                "state": self.state.value,
                "state_changed_at": self._state_changed_at,
                "time_in_state": time.time() - self._state_changed_at,
                "failure_threshold": self.failure_threshold,
                "success_threshold": self.success_threshold,
                "timeout_seconds": self.timeout.total_seconds(),
                "metrics": self.metrics.to_dict()
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on circuit breaker.
        
        Returns:
            Dict with health status information
        """
        metrics = await self.get_metrics()
        
        # Circuit is healthy if CLOSED or HALF_OPEN
        healthy = self.state in [CircuitState.CLOSED, CircuitState.HALF_OPEN]
        
        return {
            "healthy": healthy,
            "state": self.state.value,
            "consecutive_failures": self.metrics.consecutive_failures,
            "consecutive_successes": self.metrics.consecutive_successes,
            "warning": (
                f"Circuit is {self.state.value}" 
                if not healthy else None
            )
        }


class CircuitBreakerRegistry:
    """
    Registry for managing multiple circuit breakers.
    
    Provides centralized management of circuit breakers for different services.
    Each service can have its own circuit breaker with custom configuration.
    
    Requirements:
    - 5.7: Manage multiple circuit breakers
    """
    
    def __init__(self):
        """Initialize circuit breaker registry."""
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._lock = asyncio.Lock()
        logger.info("Initialized CircuitBreakerRegistry")
    
    def get_breaker(
        self,
        name: str,
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout: timedelta = timedelta(seconds=60),
        half_open_timeout: timedelta = timedelta(seconds=30)
    ) -> CircuitBreaker:
        """
        Get or create circuit breaker.
        
        If a circuit breaker with the given name exists, return it.
        Otherwise, create a new one with the provided configuration.
        
        Args:
            name: Name of the circuit breaker
            failure_threshold: Number of failures before opening circuit
            success_threshold: Number of successes to close circuit
            timeout: Duration before transitioning to HALF_OPEN
            half_open_timeout: Duration in HALF_OPEN state
        
        Returns:
            CircuitBreaker instance
        """
        if name not in self._breakers:
            self._breakers[name] = CircuitBreaker(
                name=name,
                failure_threshold=failure_threshold,
                success_threshold=success_threshold,
                timeout=timeout,
                half_open_timeout=half_open_timeout
            )
            logger.info(f"Created new CircuitBreaker: {name}")
        
        return self._breakers[name]
    
    async def get_all_states(self) -> Dict[str, CircuitState]:
        """
        Get states of all circuit breakers.
        
        Returns:
            Dict mapping breaker names to their current states
        """
        states = {}
        
        for name, breaker in self._breakers.items():
            states[name] = await breaker.get_state()
        
        return states
    
    async def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """
        Get metrics for all circuit breakers.
        
        Returns:
            Dict mapping breaker names to their metrics
        """
        metrics = {}
        
        for name, breaker in self._breakers.items():
            metrics[name] = await breaker.get_metrics()
        
        return metrics
    
    async def reset_all(self) -> None:
        """Reset all circuit breakers."""
        for breaker in self._breakers.values():
            await breaker.reset()
        
        logger.info("Reset all circuit breakers")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on all circuit breakers.
        
        Returns:
            Dict with health status for all breakers
        """
        health_status = {}
        all_healthy = True
        
        for name, breaker in self._breakers.items():
            breaker_health = await breaker.health_check()
            health_status[name] = breaker_health
            
            if not breaker_health["healthy"]:
                all_healthy = False
        
        return {
            "healthy": all_healthy,
            "breakers": health_status,
            "total_breakers": len(self._breakers)
        }
    
    def list_breakers(self) -> list[str]:
        """
        List all registered circuit breaker names.
        
        Returns:
            List of breaker names
        """
        return list(self._breakers.keys())


# Global circuit breaker registry
_registry: Optional[CircuitBreakerRegistry] = None


def get_circuit_breaker_registry() -> CircuitBreakerRegistry:
    """
    Get global circuit breaker registry.
    
    Returns:
        CircuitBreakerRegistry instance
    """
    global _registry
    
    if _registry is None:
        _registry = CircuitBreakerRegistry()
    
    return _registry


def get_circuit_breaker(
    name: str,
    **config
) -> CircuitBreaker:
    """
    Get circuit breaker from global registry.
    
    Args:
        name: Name of the circuit breaker
        **config: Configuration options for the circuit breaker
    
    Returns:
        CircuitBreaker instance
    """
    registry = get_circuit_breaker_registry()
    return registry.get_breaker(name, **config)
