"""
Database Connection Pool Manager
Implements asyncpg connection pooling for PostgreSQL/Supabase

Requirements: 12.1, 12.3, 12.4, 12.5
"""

import os
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import asyncpg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class DatabasePoolConfig:
    """Database connection pool configuration"""
    
    def __init__(self):
        # Supabase connection details
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")
        
        # Extract database connection details from Supabase URL
        # Supabase URL format: https://[project-ref].supabase.co
        # Database URL format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
        self.database_url = os.getenv("DATABASE_URL", "")
        
        # Connection pool parameters (Requirements 12.1, 12.3, 12.4)
        self.min_size = int(os.getenv("DB_POOL_MIN_SIZE", "5"))
        self.max_size = int(os.getenv("DB_POOL_MAX_SIZE", "20"))
        self.connection_timeout = float(os.getenv("DB_CONNECTION_TIMEOUT", "30.0"))
        self.idle_timeout = float(os.getenv("DB_IDLE_TIMEOUT", "300.0"))
        self.max_lifetime = float(os.getenv("DB_MAX_LIFETIME", "1800.0"))
        
        # Health check configuration
        self.health_check_interval = float(os.getenv("DB_HEALTH_CHECK_INTERVAL", "60.0"))
        
        self.validate_config()
    
    def validate_config(self) -> None:
        """Validate database pool configuration"""
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        if not self.database_url.startswith("postgresql://"):
            raise ValueError("DATABASE_URL must be a valid PostgreSQL connection string")
        
        if self.min_size < 1 or self.min_size > 50:
            raise ValueError("DB_POOL_MIN_SIZE must be between 1 and 50")
        
        if self.max_size < self.min_size or self.max_size > 100:
            raise ValueError(f"DB_POOL_MAX_SIZE must be between {self.min_size} and 100")
        
        if self.connection_timeout < 1 or self.connection_timeout > 120:
            raise ValueError("DB_CONNECTION_TIMEOUT must be between 1 and 120 seconds")
        
        if self.idle_timeout < 60 or self.idle_timeout > 3600:
            raise ValueError("DB_IDLE_TIMEOUT must be between 60 and 3600 seconds")
        
        if self.max_lifetime < 300 or self.max_lifetime > 7200:
            raise ValueError("DB_MAX_LIFETIME must be between 300 and 7200 seconds")
    
    def get_pool_info(self) -> Dict[str, Any]:
        """Get sanitized pool configuration for logging"""
        return {
            "min_size": self.min_size,
            "max_size": self.max_size,
            "connection_timeout": self.connection_timeout,
            "idle_timeout": self.idle_timeout,
            "max_lifetime": self.max_lifetime,
            "health_check_interval": self.health_check_interval
        }


class ConnectionPoolStats:
    """Track connection pool statistics"""
    
    def __init__(self):
        self.total_connections_created = 0
        self.total_connections_closed = 0
        self.total_queries_executed = 0
        self.total_query_time = 0.0
        self.failed_queries = 0
        self.connection_errors = 0
        self.pool_exhausted_count = 0
        self.last_health_check = None
        self.health_check_failures = 0
    
    def record_connection_created(self):
        """Record a new connection creation"""
        self.total_connections_created += 1
    
    def record_connection_closed(self):
        """Record a connection closure"""
        self.total_connections_closed += 1
    
    def record_query(self, duration: float, success: bool = True):
        """Record query execution"""
        self.total_queries_executed += 1
        self.total_query_time += duration
        if not success:
            self.failed_queries += 1
    
    def record_connection_error(self):
        """Record a connection error"""
        self.connection_errors += 1
    
    def record_pool_exhausted(self):
        """Record pool exhaustion event"""
        self.pool_exhausted_count += 1
    
    def record_health_check(self, success: bool):
        """Record health check result"""
        self.last_health_check = datetime.now(timezone.utc)
        if not success:
            self.health_check_failures += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current statistics"""
        avg_query_time = (
            self.total_query_time / self.total_queries_executed
            if self.total_queries_executed > 0
            else 0.0
        )
        
        return {
            "total_connections_created": self.total_connections_created,
            "total_connections_closed": self.total_connections_closed,
            "active_connections": self.total_connections_created - self.total_connections_closed,
            "total_queries_executed": self.total_queries_executed,
            "average_query_time_ms": round(avg_query_time * 1000, 2),
            "failed_queries": self.failed_queries,
            "connection_errors": self.connection_errors,
            "pool_exhausted_count": self.pool_exhausted_count,
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None,
            "health_check_failures": self.health_check_failures
        }


class DatabaseConnectionPool:
    """
    Asyncpg-based database connection pool manager
    
    Implements connection pooling with:
    - Configurable min/max connections (Requirement 12.1)
    - Connection timeout (Requirement 12.3)
    - Idle timeout (Requirement 12.4)
    - Max connection lifetime (Requirement 12.4)
    - Health checks (Requirement 12.4)
    - Connection pool statistics (Requirement 12.6)
    """
    
    _instance: Optional['DatabaseConnectionPool'] = None
    _pool: Optional[asyncpg.Pool] = None
    _lock = asyncio.Lock()
    
    def __new__(cls) -> 'DatabaseConnectionPool':
        """Singleton pattern to ensure single pool instance"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize database connection pool"""
        if not hasattr(self, '_initialized'):
            self.config = DatabasePoolConfig()
            self.stats = ConnectionPoolStats()
            self._initialized = True
            self._health_check_task = None
            logger.info("Database connection pool manager initialized")
    
    async def initialize(self) -> None:
        """
        Initialize the connection pool
        
        Creates asyncpg connection pool with configured parameters:
        - min_size: Minimum number of connections (Requirement 12.1)
        - max_size: Maximum number of connections (Requirement 12.1)
        - timeout: Connection acquisition timeout (Requirement 12.3)
        - max_inactive_connection_lifetime: Idle timeout (Requirement 12.4)
        - max_lifetime: Maximum connection lifetime (Requirement 12.4)
        """
        async with self._lock:
            if self._pool is not None:
                logger.warning("Connection pool already initialized")
                return
            
            try:
                logger.info(f"Creating connection pool with config: {self.config.get_pool_info()}")
                
                # Create asyncpg connection pool
                self._pool = await asyncpg.create_pool(
                    dsn=self.config.database_url,
                    min_size=self.config.min_size,
                    max_size=self.config.max_size,
                    timeout=self.config.connection_timeout,
                    max_inactive_connection_lifetime=self.config.idle_timeout,
                    max_queries=50000,  # Max queries before connection is recycled
                    command_timeout=60.0,  # Command execution timeout
                    setup=self._setup_connection
                )
                
                # Record initial connections
                for _ in range(self.config.min_size):
                    self.stats.record_connection_created()
                
                logger.info(
                    f"Connection pool created successfully: "
                    f"min={self.config.min_size}, max={self.config.max_size}"
                )
                
                # Start health check task
                self._health_check_task = asyncio.create_task(self._periodic_health_check())
                
            except Exception as e:
                logger.error(f"Failed to create connection pool: {e}")
                self.stats.record_connection_error()
                raise
    
    async def _setup_connection(self, connection: asyncpg.Connection) -> None:
        """
        Setup callback for new connections
        
        Called when a new connection is established to configure it
        """
        # Set statement timeout to prevent long-running queries
        await connection.execute("SET statement_timeout = '60s'")
        
        # Set timezone to UTC
        await connection.execute("SET timezone = 'UTC'")
        
        logger.debug("Connection setup completed")
    
    async def _periodic_health_check(self) -> None:
        """
        Periodic health check task
        
        Runs health checks at configured intervals (Requirement 12.4)
        """
        while True:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                await self.health_check()
            except asyncio.CancelledError:
                logger.info("Health check task cancelled")
                break
            except Exception as e:
                logger.error(f"Health check task error: {e}")
    
    async def get_pool(self) -> asyncpg.Pool:
        """
        Get the connection pool instance
        
        Returns:
            asyncpg.Pool: The connection pool
        
        Raises:
            RuntimeError: If pool is not initialized
        """
        if self._pool is None:
            await self.initialize()
        
        if self._pool is None:
            raise RuntimeError("Connection pool not initialized")
        
        return self._pool
    
    async def acquire(self, timeout: Optional[float] = None) -> asyncpg.Connection:
        """
        Acquire a connection from the pool
        
        Args:
            timeout: Optional timeout for acquiring connection (Requirement 12.3)
        
        Returns:
            asyncpg.Connection: Database connection
        
        Raises:
            asyncpg.PoolConnectionError: If pool is exhausted (Requirement 12.5)
        """
        pool = await self.get_pool()
        
        try:
            connection = await asyncio.wait_for(
                pool.acquire(),
                timeout=timeout or self.config.connection_timeout
            )
            return connection
        except asyncio.TimeoutError:
            self.stats.record_pool_exhausted()
            logger.error("Connection pool exhausted - timeout acquiring connection")
            raise asyncpg.PoolConnectionError("Connection pool exhausted")
        except Exception as e:
            self.stats.record_connection_error()
            logger.error(f"Error acquiring connection: {e}")
            raise
    
    async def release(self, connection: asyncpg.Connection) -> None:
        """
        Release a connection back to the pool
        
        Args:
            connection: Connection to release
        """
        pool = await self.get_pool()
        
        try:
            await pool.release(connection)
        except Exception as e:
            logger.error(f"Error releasing connection: {e}")
            raise
    
    async def execute(self, query: str, *args, timeout: Optional[float] = None) -> str:
        """
        Execute a query using a connection from the pool
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            timeout: Optional query timeout
        
        Returns:
            Query result status
        """
        start_time = datetime.now(timezone.utc)
        success = True
        
        try:
            pool = await self.get_pool()
            result = await pool.execute(query, *args, timeout=timeout)
            return result
        except Exception as e:
            success = False
            logger.error(f"Query execution failed: {e}")
            raise
        finally:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            self.stats.record_query(duration, success)
    
    async def fetch(self, query: str, *args, timeout: Optional[float] = None) -> list:
        """
        Fetch multiple rows using a connection from the pool
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            timeout: Optional query timeout
        
        Returns:
            List of records
        """
        start_time = datetime.now(timezone.utc)
        success = True
        
        try:
            pool = await self.get_pool()
            result = await pool.fetch(query, *args, timeout=timeout)
            return result
        except Exception as e:
            success = False
            logger.error(f"Query fetch failed: {e}")
            raise
        finally:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            self.stats.record_query(duration, success)
    
    async def fetchrow(self, query: str, *args, timeout: Optional[float] = None) -> Optional[asyncpg.Record]:
        """
        Fetch a single row using a connection from the pool
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            timeout: Optional query timeout
        
        Returns:
            Single record or None
        """
        start_time = datetime.now(timezone.utc)
        success = True
        
        try:
            pool = await self.get_pool()
            result = await pool.fetchrow(query, *args, timeout=timeout)
            return result
        except Exception as e:
            success = False
            logger.error(f"Query fetchrow failed: {e}")
            raise
        finally:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            self.stats.record_query(duration, success)
    
    async def fetchval(self, query: str, *args, timeout: Optional[float] = None):
        """
        Fetch a single value using a connection from the pool
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            timeout: Optional query timeout
        
        Returns:
            Single value
        """
        start_time = datetime.now(timezone.utc)
        success = True
        
        try:
            pool = await self.get_pool()
            result = await pool.fetchval(query, *args, timeout=timeout)
            return result
        except Exception as e:
            success = False
            logger.error(f"Query fetchval failed: {e}")
            raise
        finally:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            self.stats.record_query(duration, success)
    
    async def health_check(self) -> bool:
        """
        Perform connection pool health check (Requirement 12.4)
        
        Returns:
            bool: True if healthy, False otherwise
        """
        try:
            # Simple query to test connection
            result = await self.fetchval("SELECT 1")
            
            if result == 1:
                self.stats.record_health_check(True)
                logger.debug("Connection pool health check passed")
                return True
            else:
                self.stats.record_health_check(False)
                logger.warning("Connection pool health check failed: unexpected result")
                return False
                
        except Exception as e:
            self.stats.record_health_check(False)
            logger.error(f"Connection pool health check failed: {e}")
            return False
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """
        Get connection pool statistics (Requirement 12.6)
        
        Returns:
            Dict containing pool statistics
        """
        pool_info = {}
        
        if self._pool:
            pool_info = {
                "size": self._pool.get_size(),
                "free_size": self._pool.get_idle_size(),
                "active_connections": self._pool.get_size() - self._pool.get_idle_size(),
                "min_size": self._pool.get_min_size(),
                "max_size": self._pool.get_max_size()
            }
        
        return {
            **pool_info,
            **self.stats.get_stats(),
            "config": self.config.get_pool_info()
        }
    
    async def close(self) -> None:
        """
        Close the connection pool and cleanup resources
        """
        async with self._lock:
            if self._health_check_task:
                self._health_check_task.cancel()
                try:
                    await self._health_check_task
                except asyncio.CancelledError:
                    pass
                self._health_check_task = None
            
            if self._pool:
                # Record closing connections
                pool_size = self._pool.get_size()
                for _ in range(pool_size):
                    self.stats.record_connection_closed()
                
                await self._pool.close()
                self._pool = None
                logger.info("Connection pool closed")


# Global connection pool instance
_db_pool: Optional[DatabaseConnectionPool] = None


async def get_db_pool() -> DatabaseConnectionPool:
    """
    Get the global database connection pool instance
    
    Returns:
        DatabaseConnectionPool: The connection pool
    """
    global _db_pool
    
    if _db_pool is None:
        _db_pool = DatabaseConnectionPool()
        await _db_pool.initialize()
    
    return _db_pool


async def close_db_pool() -> None:
    """
    Close the global database connection pool
    """
    global _db_pool
    
    if _db_pool is not None:
        await _db_pool.close()
        _db_pool = None
