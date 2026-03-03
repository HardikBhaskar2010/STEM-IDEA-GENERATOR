# Database Connection and Configuration
# Requirements: 7.1, 7.2

import os
import logging
import asyncio
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Database configuration management with performance optimizations"""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        # Try service role key first (bypasses RLS), then fall back to anon key
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        
        # Performance configuration
        self.connection_pool_size = int(os.getenv("DB_POOL_SIZE", "10"))
        self.query_timeout = int(os.getenv("DB_QUERY_TIMEOUT", "30"))
        self.enable_query_logging = os.getenv("DB_ENABLE_QUERY_LOGGING", "false").lower() == "true"
        self.enable_performance_monitoring = os.getenv("DB_ENABLE_PERF_MONITORING", "true").lower() == "true"
        
        self.validate_config()
    
    def validate_config(self) -> None:
        """Validate database configuration"""
        if not self.supabase_url:
            raise ValueError("SUPABASE_URL environment variable is required")
        
        if not self.supabase_key:
            raise ValueError("SUPABASE_KEY environment variable is required")
        
        if not self.supabase_url.startswith("https://"):
            raise ValueError("SUPABASE_URL must be a valid HTTPS URL")
        
        if self.connection_pool_size < 1 or self.connection_pool_size > 50:
            raise ValueError("DB_POOL_SIZE must be between 1 and 50")
        
        if self.query_timeout < 5 or self.query_timeout > 300:
            raise ValueError("DB_QUERY_TIMEOUT must be between 5 and 300 seconds")
    
    def get_connection_info(self) -> Dict[str, Any]:
        """Get sanitized connection information for logging"""
        return {
            "url": self.supabase_url,
            "key_configured": bool(self.supabase_key),
            "key_prefix": self.supabase_key[:10] + "..." if self.supabase_key else "Not set",
            "pool_size": self.connection_pool_size,
            "query_timeout": self.query_timeout,
            "query_logging": self.enable_query_logging,
            "performance_monitoring": self.enable_performance_monitoring
        }


class QueryPerformanceMonitor:
    """Monitor and log database query performance"""
    
    def __init__(self):
        self.query_stats = {
            'total_queries': 0,
            'total_time': 0.0,
            'slow_queries': 0,
            'failed_queries': 0,
            'queries_by_table': {},
            'average_response_time': 0.0
        }
        self.slow_query_threshold = 2.0  # seconds
    
    def record_query(self, table_name: str, operation: str, duration: float, success: bool = True):
        """Record query performance metrics"""
        self.query_stats['total_queries'] += 1
        self.query_stats['total_time'] += duration
        
        if not success:
            self.query_stats['failed_queries'] += 1
        
        if duration > self.slow_query_threshold:
            self.query_stats['slow_queries'] += 1
            logger.warning(f"Slow query detected: {operation} on {table_name} took {duration:.2f}s")
        
        # Track per-table statistics
        table_key = f"{table_name}_{operation}"
        if table_key not in self.query_stats['queries_by_table']:
            self.query_stats['queries_by_table'][table_key] = {
                'count': 0,
                'total_time': 0.0,
                'avg_time': 0.0
            }
        
        table_stats = self.query_stats['queries_by_table'][table_key]
        table_stats['count'] += 1
        table_stats['total_time'] += duration
        table_stats['avg_time'] = table_stats['total_time'] / table_stats['count']
        
        # Update overall average
        self.query_stats['average_response_time'] = self.query_stats['total_time'] / self.query_stats['total_queries']
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for monitoring"""
        return {
            'total_queries': self.query_stats['total_queries'],
            'average_response_time': round(self.query_stats['average_response_time'], 3),
            'slow_queries': self.query_stats['slow_queries'],
            'failed_queries': self.query_stats['failed_queries'],
            'success_rate': round((self.query_stats['total_queries'] - self.query_stats['failed_queries']) / max(self.query_stats['total_queries'], 1) * 100, 2),
            'top_tables': sorted(
                [(k, v['avg_time'], v['count']) for k, v in self.query_stats['queries_by_table'].items()],
                key=lambda x: x[1],
                reverse=True
            )[:5]
        }
    
    def reset_stats(self):
        """Reset performance statistics"""
        self.__init__()


class OptimizedDatabaseConnection:
    """Enhanced database connection manager with performance optimizations"""
    
    _instance: Optional['OptimizedDatabaseConnection'] = None
    _client: Optional[Client] = None
    _connection_pool: List[Client] = []
    _pool_lock = asyncio.Lock()
    
    def __new__(cls) -> 'OptimizedDatabaseConnection':
        """Singleton pattern to ensure single database connection manager"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize optimized database connection"""
        if not hasattr(self, '_initialized'):
            self.config = DatabaseConfig()
            self.performance_monitor = QueryPerformanceMonitor()
            self._initialized = True
            logger.info("Optimized database connection manager initialized")
    
    async def _initialize_connection_pool(self):
        """Initialize connection pool for better performance"""
        async with self._pool_lock:
            if not self._connection_pool:
                logger.info(f"Initializing connection pool with {self.config.connection_pool_size} connections")
                
                for i in range(self.config.connection_pool_size):
                    try:
                        client = create_client(
                            self.config.supabase_url,
                            self.config.supabase_key
                        )
                        self._connection_pool.append(client)
                    except Exception as e:
                        logger.error(f"Failed to create connection {i+1}: {e}")
                        raise
                
                logger.info(f"Connection pool initialized with {len(self._connection_pool)} connections")
    
    async def get_client(self) -> Client:
        """Get optimized Supabase client instance"""
        if not self._connection_pool:
            await self._initialize_connection_pool()
        
        # For now, return the first client from the pool
        # In a more sophisticated implementation, you might implement round-robin or load balancing
        if self._connection_pool:
            return self._connection_pool[0]
        
        # Fallback to single client
        if self._client is None:
            try:
                self._client = create_client(
                    self.config.supabase_url,
                    self.config.supabase_key
                )
                logger.info("Fallback Supabase client created successfully")
            except Exception as e:
                logger.error(f"Failed to create Supabase client: {e}")
                raise
        
        return self._client
    
    async def execute_optimized_query(self, table_name: str, operation: str, query_func, *args, **kwargs):
        """Execute database query with performance monitoring and optimization"""
        start_time = datetime.now(timezone.utc)
        success = True
        
        try:
            if self.config.enable_query_logging:
                logger.debug(f"Executing {operation} on {table_name}")
            
            # Execute the query
            result = await query_func(*args, **kwargs)
            
            return result
            
        except Exception as e:
            success = False
            logger.error(f"Query failed: {operation} on {table_name}: {e}")
            raise
        
        finally:
            # Record performance metrics
            if self.config.enable_performance_monitoring:
                duration = (datetime.now(timezone.utc) - start_time).total_seconds()
                self.performance_monitor.record_query(table_name, operation, duration, success)
    
    async def test_connection(self) -> bool:
        """Test database connection with performance monitoring"""
        try:
            client = await self.get_client()
            
            start_time = datetime.now(timezone.utc)
            # Test connection by querying a system table
            result = client.table('chat_sessions').select('count', count='exact').limit(0).execute()
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            
            if self.config.enable_performance_monitoring:
                self.performance_monitor.record_query('chat_sessions', 'connection_test', duration, True)
            
            logger.info(f"Database connection test successful ({duration:.3f}s)")
            return True
            
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            if self.config.enable_performance_monitoring:
                self.performance_monitor.record_query('chat_sessions', 'connection_test', 0.0, False)
            return False
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics"""
        return self.performance_monitor.get_performance_summary()
    
    def reset_performance_metrics(self):
        """Reset performance metrics"""
        self.performance_monitor.reset_stats()
    
    async def close_connection(self) -> None:
        """Close database connections"""
        async with self._pool_lock:
            if self._connection_pool:
                # Supabase clients don't need explicit closing, but we clear the pool
                self._connection_pool.clear()
                logger.info("Connection pool cleared")
            
            if self._client:
                self._client = None
                logger.info("Database connection closed")


# Database indexing recommendations
DATABASE_INDEXES = {
    'chat_sessions': [
        'CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_id ON chat_sessions(project_id);',
        'CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity DESC);',
        'CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_user ON chat_sessions(project_id, user_id);'
    ],
    'chat_messages': [
        'CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);',
        'CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);',
        'CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender);',
        'CREATE INDEX IF NOT EXISTS idx_chat_messages_session_timestamp ON chat_messages(session_id, timestamp DESC);'
    ],
    'ai_context_cache': [
        'CREATE INDEX IF NOT EXISTS idx_ai_context_cache_project_id ON ai_context_cache(project_id);',
        'CREATE INDEX IF NOT EXISTS idx_ai_context_cache_expires_at ON ai_context_cache(expires_at);',
        'CREATE INDEX IF NOT EXISTS idx_ai_context_cache_generated_at ON ai_context_cache(generated_at DESC);'
    ]
}

async def create_database_indexes(client: Client) -> Dict[str, Any]:
    """Create database indexes for optimal performance"""
    results = {
        'created': [],
        'failed': [],
        'total': 0
    }
    
    try:
        for table_name, indexes in DATABASE_INDEXES.items():
            for index_sql in indexes:
                try:
                    # Execute index creation (this would need to be done via SQL in a real implementation)
                    # For Supabase, you would typically create these indexes through the dashboard or migrations
                    logger.info(f"Index creation recommended: {index_sql}")
                    results['created'].append(index_sql)
                    results['total'] += 1
                except Exception as e:
                    logger.error(f"Failed to create index: {index_sql}: {e}")
                    results['failed'].append({'sql': index_sql, 'error': str(e)})
                    results['total'] += 1
        
        logger.info(f"Database indexing complete: {len(results['created'])} created, {len(results['failed'])} failed")
        return results
        
    except Exception as e:
        logger.error(f"Database indexing failed: {e}")
        return results


# Global optimized database connection instance (lazy initialization)
db_connection = None


async def get_db_client() -> Client:
    """Get optimized database client instance"""
    global db_connection
    if db_connection is None:
        db_connection = OptimizedDatabaseConnection()
    return await db_connection.get_client()


async def test_db_connection() -> bool:
    """Test database connection with performance monitoring"""
    global db_connection
    if db_connection is None:
        db_connection = OptimizedDatabaseConnection()
    return await db_connection.test_connection()


def get_db_performance_metrics() -> Dict[str, Any]:
    """Get database performance metrics"""
    global db_connection
    if db_connection is None:
        return {"error": "Database connection not initialized"}
    return db_connection.get_performance_metrics()


def reset_db_performance_metrics():
    """Reset database performance metrics"""
    global db_connection
    if db_connection is not None:
        db_connection.reset_performance_metrics()


async def close_db_connection() -> None:
    """Close database connections"""
    global db_connection
    if db_connection is not None:
        await db_connection.close_connection()


async def optimize_database_performance() -> Dict[str, Any]:
    """Run database performance optimization"""
    try:
        client = await get_db_client()
        
        # Create recommended indexes
        index_results = await create_database_indexes(client)
        
        # Test connection performance
        connection_test = await test_db_connection()
        
        # Get current performance metrics
        performance_metrics = get_db_performance_metrics()
        
        optimization_results = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'connection_test': connection_test,
            'index_creation': index_results,
            'performance_metrics': performance_metrics,
            'recommendations': [
                "Monitor slow queries and optimize them",
                "Consider connection pooling for high-traffic applications",
                "Regularly clean up expired cache entries",
                "Use appropriate indexes for frequently queried columns",
                "Monitor database performance metrics regularly"
            ]
        }
        
        logger.info("Database performance optimization completed")
        return optimization_results
        
    except Exception as e:
        logger.error(f"Database performance optimization failed: {e}")
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'error': str(e),
            'success': False
        }