"""
Performance tests for AI Code Generation system with large datasets
Tests database performance, query optimization, and scalability
"""

import pytest
import asyncio
import asyncpg
import time
from datetime import datetime, timezone
from uuid import uuid4
import os
import statistics
from typing import List, Dict

TEST_DATABASE_URL = os.getenv('TEST_DATABASE_URL', 'postgresql://postgres:password@localhost:5432/stem_test')

class TestPerformanceLargeDatasets:
    """Performance test suite for large dataset operations"""
    
    @pytest.fixture(scope="class")
    async def db_connection(self):
        """Create test database connection with performance settings"""
        conn = await asyncpg.connect(
            TEST_DATABASE_URL,
            command_timeout=60,  # Longer timeout for performance tests
            server_settings={
                'jit': 'off',  # Disable JIT for consistent timing
                'shared_preload_libraries': 'pg_stat_statements'
            }
        )
        yield conn
        await conn.close()
    
    @pytest.fixture
    async def large_dataset(self, db_connection):
        """Create a large dataset for performance testing"""
        print("Creating large dataset for performance testing...")
        
        # Create test users
        user_ids = [str(uuid4()) for _ in range(100)]
        user_data = [(uid, f"user_{uid}@example.com", datetime.now(timezone.utc)) for uid in user_ids]
        
        await db_connection.executemany("""
            INSERT INTO users (id, email, created_at) VALUES ($1, $2, $3)
        """, user_data)
        
        # Create test projects (10 per user = 1000 projects)
        project_data = []
        for user_id in user_ids:
            for i in range(10):
                project_data.append((
                    str(uuid4()), user_id, f"Project {i} for {user_id[:8]}", 
                    f"Description for project {i}", datetime.now(timezone.utc)
                ))
        
        await db_connection.executemany("""
            INSERT INTO projects (id, user_id, title, description, created_at) 
            VALUES ($1, $2, $3, $4, $5)
        """, project_data)
        
        # Create test generations (5 per project = 5000 generations)
        generation_data = []
        platforms = ['web', 'arduino', 'raspberry_pi', 'mobile']
        statuses = ['generating', 'completed', 'failed']
        
        for project_id, user_id, _, _, _ in project_data:
            for i in range(5):
                generation_data.append((
                    str(uuid4()), project_id, user_id, 
                    platforms[i % len(platforms)], 
                    statuses[i % len(statuses)],
                    '{"complexity": "intermediate"}',
                    datetime.now(timezone.utc)
                ))
        
        await db_connection.executemany("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, 
                generation_params, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, generation_data)
        
        # Create test files (3 per generation = 15000 files)
        file_data = []
        file_types = ['html', 'css', 'js', 'py', 'cpp']
        
        for gen_id, _, _, _, _, _, _ in generation_data:
            for i in range(3):
                content = f"// Generated file {i} for {gen_id}\n" + "x" * (100 + i * 50)
                file_data.append((
                    str(uuid4()), gen_id, f"file_{i}.{file_types[i % len(file_types)]}", 
                    f"src/file_{i}.{file_types[i % len(file_types)]}", 
                    file_types[i % len(file_types)], content, len(content), 
                    i == 0, datetime.now(timezone.utc)
                ))
        
        await db_connection.executemany("""
            INSERT INTO code_files (
                id, generation_id, file_name, file_path, file_type, 
                content, size_bytes, is_main_file, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, file_data)
        
        print(f"Created large dataset: {len(user_ids)} users, {len(project_data)} projects, "
              f"{len(generation_data)} generations, {len(file_data)} files")
        
        yield {
            'users': user_ids,
            'projects': [p[0] for p in project_data],
            'generations': [g[0] for g in generation_data],
            'files': [f[0] for f in file_data]
        }
        
        # Cleanup
        print("Cleaning up large dataset...")
        await db_connection.execute("DELETE FROM users WHERE email LIKE 'user_%@example.com'")

    async def measure_query_performance(self, db_connection, query: str, params: tuple = None, iterations: int = 10) -> Dict:
        """Measure query performance over multiple iterations"""
        times = []
        
        for _ in range(iterations):
            start_time = time.perf_counter()
            if params:
                await db_connection.fetch(query, *params)
            else:
                await db_connection.fetch(query)
            end_time = time.perf_counter()
            times.append(end_time - start_time)
        
        return {
            'avg_time': statistics.mean(times),
            'min_time': min(times),
            'max_time': max(times),
            'median_time': statistics.median(times),
            'std_dev': statistics.stdev(times) if len(times) > 1 else 0
        }

    async def test_user_projects_query_performance(self, db_connection, large_dataset):
        """Test performance of fetching user projects"""
        user_id = large_dataset['users'][0]
        
        # Test query performance
        perf = await self.measure_query_performance(
            db_connection,
            "SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC",
            (user_id,)
        )
        
        print(f"User projects query - Avg: {perf['avg_time']:.4f}s, "
              f"Min: {perf['min_time']:.4f}s, Max: {perf['max_time']:.4f}s")
        
        # Performance should be under 100ms for 10 projects
        assert perf['avg_time'] < 0.1, f"Query too slow: {perf['avg_time']:.4f}s"

    async def test_project_generations_query_performance(self, db_connection, large_dataset):
        """Test performance of fetching project generations"""
        project_id = large_dataset['projects'][0]
        
        perf = await self.measure_query_performance(
            db_connection,
            """SELECT gc.*, COUNT(cf.id) as file_count 
               FROM generated_code gc 
               LEFT JOIN code_files cf ON gc.id = cf.generation_id 
               WHERE gc.project_id = $1 
               GROUP BY gc.id 
               ORDER BY gc.created_at DESC""",
            (project_id,)
        )
        
        print(f"Project generations query - Avg: {perf['avg_time']:.4f}s, "
              f"Min: {perf['min_time']:.4f}s, Max: {perf['max_time']:.4f}s")
        
        # Performance should be under 50ms for 5 generations
        assert perf['avg_time'] < 0.05, f"Query too slow: {perf['avg_time']:.4f}s"

    async def test_generation_files_query_performance(self, db_connection, large_dataset):
        """Test performance of fetching generation files"""
        generation_id = large_dataset['generations'][0]
        
        perf = await self.measure_query_performance(
            db_connection,
            "SELECT * FROM code_files WHERE generation_id = $1 ORDER BY is_main_file DESC, file_name",
            (generation_id,)
        )
        
        print(f"Generation files query - Avg: {perf['avg_time']:.4f}s, "
              f"Min: {perf['min_time']:.4f}s, Max: {perf['max_time']:.4f}s")
        
        # Performance should be under 10ms for 3 files
        assert perf['avg_time'] < 0.01, f"Query too slow: {perf['avg_time']:.4f}s"

    async def test_search_generations_performance(self, db_connection, large_dataset):
        """Test performance of searching generations across all users"""
        perf = await self.measure_query_performance(
            db_connection,
            """SELECT gc.*, p.title as project_title 
               FROM generated_code gc 
               JOIN projects p ON gc.project_id = p.id 
               WHERE gc.platform = $1 AND gc.status = $2 
               ORDER BY gc.created_at DESC 
               LIMIT 50""",
            ('web', 'completed')
        )
        
        print(f"Search generations query - Avg: {perf['avg_time']:.4f}s, "
              f"Min: {perf['min_time']:.4f}s, Max: {perf['max_time']:.4f}s")
        
        # Performance should be under 200ms for searching across 5000 generations
        assert perf['avg_time'] < 0.2, f"Query too slow: {perf['avg_time']:.4f}s"

    async def test_file_content_search_performance(self, db_connection, large_dataset):
        """Test performance of searching file content"""
        perf = await self.measure_query_performance(
            db_connection,
            """SELECT cf.*, gc.platform 
               FROM code_files cf 
               JOIN generated_code gc ON cf.generation_id = gc.id 
               WHERE cf.content ILIKE $1 
               LIMIT 20""",
            ('%Generated%',),
            iterations=5  # Fewer iterations for expensive query
        )
        
        print(f"File content search query - Avg: {perf['avg_time']:.4f}s, "
              f"Min: {perf['min_time']:.4f}s, Max: {perf['max_time']:.4f}s")
        
        # Performance should be under 1s for content search across 15000 files
        assert perf['avg_time'] < 1.0, f"Query too slow: {perf['avg_time']:.4f}s"

    async def test_aggregation_query_performance(self, db_connection, large_dataset):
        """Test performance of aggregation queries"""
        perf = await self.measure_query_performance(
            db_connection,
            """SELECT 
                   platform,
                   status,
                   COUNT(*) as count,
                   AVG(files_count) as avg_files,
                   SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed_count
               FROM generated_code 
               GROUP BY platform, status 
               ORDER BY platform, status"""
        )
        
        print(f"Aggregation query - Avg: {perf['avg_time']:.4f}s, "
              f"Min: {perf['min_time']:.4f}s, Max: {perf['max_time']:.4f}s")
        
        # Performance should be under 100ms for aggregation across 5000 records
        assert perf['avg_time'] < 0.1, f"Query too slow: {perf['avg_time']:.4f}s"

    async def test_complex_join_performance(self, db_connection, large_dataset):
        """Test performance of complex multi-table joins"""
        perf = await self.measure_query_performance(
            db_connection,
            """SELECT 
                   u.email,
                   p.title,
                   gc.platform,
                   gc.status,
                   COUNT(cf.id) as file_count,
                   SUM(cf.size_bytes) as total_size
               FROM users u
               JOIN projects p ON u.id = p.user_id
               JOIN generated_code gc ON p.id = gc.project_id
               LEFT JOIN code_files cf ON gc.id = cf.generation_id
               WHERE gc.created_at >= $1
               GROUP BY u.id, u.email, p.id, p.title, gc.id, gc.platform, gc.status
               HAVING COUNT(cf.id) > 0
               ORDER BY total_size DESC
               LIMIT 100""",
            (datetime.now(timezone.utc).replace(hour=0, minute=0, second=0),),
            iterations=5
        )
        
        print(f"Complex join query - Avg: {perf['avg_time']:.4f}s, "
              f"Min: {perf['min_time']:.4f}s, Max: {perf['max_time']:.4f}s")
        
        # Performance should be under 500ms for complex joins
        assert perf['avg_time'] < 0.5, f"Query too slow: {perf['avg_time']:.4f}s"

    async def test_bulk_insert_performance(self, db_connection):
        """Test performance of bulk insert operations"""
        # Test bulk file creation
        generation_id = str(uuid4())
        user_id = str(uuid4())
        project_id = str(uuid4())
        
        # Create prerequisites
        await db_connection.execute("""
            INSERT INTO users (id, email, created_at) VALUES ($1, $2, $3)
        """, user_id, f"bulk_test_{user_id}@example.com", datetime.now(timezone.utc))
        
        await db_connection.execute("""
            INSERT INTO projects (id, user_id, title, description, created_at) 
            VALUES ($1, $2, $3, $4, $5)
        """, project_id, user_id, "Bulk Test Project", "Test", datetime.now(timezone.utc))
        
        await db_connection.execute("""
            INSERT INTO generated_code (
                id, project_id, user_id, platform, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
        """, generation_id, project_id, user_id, 'web', 'generating', datetime.now(timezone.utc))
        
        # Prepare bulk file data (1000 files)
        file_data = []
        for i in range(1000):
            content = f"// Bulk test file {i}\n" + "x" * 100
            file_data.append((
                str(uuid4()), generation_id, f"bulk_file_{i}.js", 
                f"src/bulk_file_{i}.js", 'js', content, len(content), 
                False, datetime.now(timezone.utc)
            ))
        
        # Measure bulk insert performance
        start_time = time.perf_counter()
        await db_connection.executemany("""
            INSERT INTO code_files (
                id, generation_id, file_name, file_path, file_type, 
                content, size_bytes, is_main_file, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, file_data)
        end_time = time.perf_counter()
        
        bulk_insert_time = end_time - start_time
        files_per_second = len(file_data) / bulk_insert_time
        
        print(f"Bulk insert performance: {bulk_insert_time:.4f}s for {len(file_data)} files "
              f"({files_per_second:.1f} files/sec)")
        
        # Should be able to insert at least 100 files per second
        assert files_per_second > 100, f"Bulk insert too slow: {files_per_second:.1f} files/sec"
        
        # Cleanup
        await db_connection.execute("DELETE FROM users WHERE id = $1", user_id)

    async def test_concurrent_access_performance(self, db_connection, large_dataset):
        """Test performance under concurrent access"""
        user_id = large_dataset['users'][0]
        
        async def concurrent_query():
            """Simulate concurrent user query"""
            return await db_connection.fetch("""
                SELECT gc.*, COUNT(cf.id) as file_count
                FROM generated_code gc
                LEFT JOIN code_files cf ON gc.id = cf.generation_id
                WHERE gc.user_id = $1
                GROUP BY gc.id
                ORDER BY gc.created_at DESC
                LIMIT 10
            """, user_id)
        
        # Run 10 concurrent queries
        start_time = time.perf_counter()
        tasks = [concurrent_query() for _ in range(10)]
        results = await asyncio.gather(*tasks)
        end_time = time.perf_counter()
        
        concurrent_time = end_time - start_time
        queries_per_second = len(tasks) / concurrent_time
        
        print(f"Concurrent access performance: {concurrent_time:.4f}s for {len(tasks)} queries "
              f"({queries_per_second:.1f} queries/sec)")
        
        # All queries should return results
        assert all(len(result) > 0 for result in results)
        
        # Should handle at least 5 queries per second
        assert queries_per_second > 5, f"Concurrent access too slow: {queries_per_second:.1f} queries/sec"

    async def test_index_effectiveness(self, db_connection, large_dataset):
        """Test that database indexes are being used effectively"""
        # Enable query plan analysis
        await db_connection.execute("SET enable_seqscan = off")
        
        try:
            # Test index on user_id
            plan = await db_connection.fetchval("""
                EXPLAIN (FORMAT JSON) 
                SELECT * FROM generated_code WHERE user_id = $1
            """, large_dataset['users'][0])
            
            # Should use index scan, not sequential scan
            assert 'Index Scan' in str(plan) or 'Bitmap' in str(plan), "Query not using index on user_id"
            
            # Test index on project_id
            plan = await db_connection.fetchval("""
                EXPLAIN (FORMAT JSON) 
                SELECT * FROM generated_code WHERE project_id = $1
            """, large_dataset['projects'][0])
            
            assert 'Index Scan' in str(plan) or 'Bitmap' in str(plan), "Query not using index on project_id"
            
            # Test index on generation_id for files
            plan = await db_connection.fetchval("""
                EXPLAIN (FORMAT JSON) 
                SELECT * FROM code_files WHERE generation_id = $1
            """, large_dataset['generations'][0])
            
            assert 'Index Scan' in str(plan) or 'Bitmap' in str(plan), "Query not using index on generation_id"
            
        finally:
            # Reset setting
            await db_connection.execute("SET enable_seqscan = on")

    async def test_memory_usage_large_results(self, db_connection, large_dataset):
        """Test memory usage with large result sets"""
        # Test fetching large amounts of data
        start_time = time.perf_counter()
        
        # Fetch all files for first 10 generations
        generation_ids = large_dataset['generations'][:10]
        
        all_files = []
        for gen_id in generation_ids:
            files = await db_connection.fetch("""
                SELECT * FROM code_files WHERE generation_id = $1
            """, gen_id)
            all_files.extend(files)
        
        end_time = time.perf_counter()
        
        fetch_time = end_time - start_time
        print(f"Large result set fetch: {fetch_time:.4f}s for {len(all_files)} files")
        
        # Should complete within reasonable time
        assert fetch_time < 1.0, f"Large result fetch too slow: {fetch_time:.4f}s"
        assert len(all_files) > 0, "No files fetched"

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])  # -s to see print output