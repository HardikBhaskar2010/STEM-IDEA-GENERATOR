# Technology Service
# Requirements: 3.2, 9.5
# Task: 9.3 Enhance TechnologyService with caching and BaseService inheritance

import logging
from datetime import timedelta
from typing import List, Optional, Dict, Any

from backend.infrastructure.base_service import BaseService

logger = logging.getLogger(__name__)


class TechnologyService(BaseService):
    """
    Enhanced technology service with caching and recommendations.
    
    Provides:
    - Technology stack caching (24 hour TTL)
    - Technology recommendation logic
    - Popular technology combinations caching
    - BaseService inheritance for common functionality
    
    Requirements:
    - 3.2: Caching for technology stacks
    - 9.5: Technology stack caching with 24 hour TTL
    """
    
    def __init__(self, cache=None, logger_instance=None, db_client=None):
        """Initialize the technology service with BaseService capabilities"""
        super().__init__(
            cache=cache,
            logger_instance=logger_instance or logger,
            db_client=db_client
        )
        
        # Cache TTL for technology stacks (24 hours)
        self.tech_stack_cache_ttl = timedelta(hours=24)
        
        # Cache TTL for popular combinations (24 hours)
        self.popular_combos_cache_ttl = timedelta(hours=24)
        
        self.logger.info("TechnologyService initialized with caching")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Service-specific health check.
        
        Returns:
            Dict with health status information
        """
        base_health = await self.base_health_check()
        
        base_health["service_specific"] = {
            "tech_stack_cache_ttl_hours": self.tech_stack_cache_ttl.total_seconds() / 3600,
            "service_ready": True
        }
        
        return base_health
    
    async def get_technology_stack(self, stack_id: str) -> Optional[Dict[str, Any]]:
        """
        Get technology stack by ID with caching.
        
        Args:
            stack_id: ID of the technology stack
            
        Returns:
            Technology stack data or None if not found
            
        Requirements: 3.2, 9.5
        """
        cache_key = f"tech_stack:{stack_id}"
        
        async def fetch_stack():
            # Placeholder for actual database/API fetch
            # In real implementation, this would query the database or external API
            return self._get_default_stacks().get(stack_id)
        
        return await self.get_cached_or_fetch(
            cache_key=cache_key,
            fetch_func=fetch_stack,
            ttl=self.tech_stack_cache_ttl
        )
    
    async def get_all_technology_stacks(self) -> List[Dict[str, Any]]:
        """
        Get all technology stacks with caching.
        
        Returns:
            List of technology stacks
            
        Requirements: 3.2, 9.5
        """
        cache_key = "tech_stacks:all"
        
        async def fetch_all_stacks():
            return list(self._get_default_stacks().values())
        
        return await self.get_cached_or_fetch(
            cache_key=cache_key,
            fetch_func=fetch_all_stacks,
            ttl=self.tech_stack_cache_ttl
        )
    
    async def get_popular_combinations(self, category: str = "all") -> List[Dict[str, Any]]:
        """
        Get popular technology combinations with caching.
        
        Args:
            category: Category filter (web, mobile, backend, etc.)
            
        Returns:
            List of popular technology combinations
            
        Requirements: 3.2, 9.5
        """
        cache_key = f"tech_combos:popular:{category}"
        
        async def fetch_popular_combos():
            # Placeholder for actual analytics/database fetch
            return self._get_default_popular_combinations(category)
        
        return await self.get_cached_or_fetch(
            cache_key=cache_key,
            fetch_func=fetch_popular_combos,
            ttl=self.popular_combos_cache_ttl
        )
    
    async def recommend_technologies(
        self,
        project_type: str,
        complexity: str,
        team_size: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Recommend technologies based on project requirements.
        
        Args:
            project_type: Type of project (web, mobile, iot, etc.)
            complexity: Project complexity (simple, moderate, complex)
            team_size: Size of the development team
            
        Returns:
            List of recommended technologies
        """
        cache_key = f"tech_recommendations:{project_type}:{complexity}:{team_size}"
        
        async def fetch_recommendations():
            recommendations = []
            
            # Web projects
            if project_type == "web":
                if complexity == "simple":
                    recommendations.append({
                        "name": "HTML/CSS/JavaScript",
                        "reason": "Simple and straightforward for basic web projects",
                        "learning_curve": "easy"
                    })
                elif complexity == "moderate":
                    recommendations.append({
                        "name": "React + Node.js",
                        "reason": "Popular stack with good community support",
                        "learning_curve": "moderate"
                    })
                else:
                    recommendations.append({
                        "name": "Next.js + PostgreSQL",
                        "reason": "Production-ready with SSR and database support",
                        "learning_curve": "moderate"
                    })
            
            # Mobile projects
            elif project_type == "mobile":
                if team_size == 1:
                    recommendations.append({
                        "name": "Flutter",
                        "reason": "Single codebase for iOS and Android",
                        "learning_curve": "moderate"
                    })
                else:
                    recommendations.append({
                        "name": "React Native",
                        "reason": "Large community and JavaScript familiarity",
                        "learning_curve": "moderate"
                    })
            
            # IoT projects
            elif project_type == "iot":
                recommendations.append({
                    "name": "Arduino + C++",
                    "reason": "Standard for microcontroller projects",
                    "learning_curve": "moderate"
                })
                recommendations.append({
                    "name": "Raspberry Pi + Python",
                    "reason": "More powerful computing with easy programming",
                    "learning_curve": "easy"
                })
            
            return recommendations
        
        return await self.get_cached_or_fetch(
            cache_key=cache_key,
            fetch_func=fetch_recommendations,
            ttl=self.tech_stack_cache_ttl
        )
    
    async def invalidate_technology_cache(self, stack_id: Optional[str] = None) -> int:
        """
        Invalidate technology cache.
        
        Args:
            stack_id: Optional specific stack ID to invalidate, or None for all
            
        Returns:
            Number of cache entries invalidated
        """
        if stack_id:
            return await self.invalidate_cache(f"tech_stack:{stack_id}")
        else:
            return await self.invalidate_cache("tech_*")
    
    def _get_default_stacks(self) -> Dict[str, Dict[str, Any]]:
        """Get default technology stacks (placeholder data)"""
        return {
            "mern": {
                "id": "mern",
                "name": "MERN Stack",
                "description": "MongoDB, Express, React, Node.js",
                "category": "full_stack",
                "technologies": ["MongoDB", "Express.js", "React", "Node.js"],
                "popularity_score": 95,
                "learning_curve": "moderate"
            },
            "django_react": {
                "id": "django_react",
                "name": "Django + React",
                "description": "Django REST Framework with React frontend",
                "category": "full_stack",
                "technologies": ["Django", "React", "PostgreSQL"],
                "popularity_score": 90,
                "learning_curve": "moderate"
            },
            "flutter": {
                "id": "flutter",
                "name": "Flutter",
                "description": "Google's UI toolkit for mobile apps",
                "category": "mobile",
                "technologies": ["Flutter", "Dart", "Firebase"],
                "popularity_score": 88,
                "learning_curve": "moderate"
            },
            "arduino": {
                "id": "arduino",
                "name": "Arduino",
                "description": "Microcontroller platform",
                "category": "iot",
                "technologies": ["Arduino", "C++"],
                "popularity_score": 85,
                "learning_curve": "easy"
            }
        }
    
    def _get_default_popular_combinations(self, category: str) -> List[Dict[str, Any]]:
        """Get default popular combinations (placeholder data)"""
        all_combos = [
            {
                "name": "React + Node.js + MongoDB",
                "category": "web",
                "usage_count": 15000,
                "success_rate": 0.92
            },
            {
                "name": "Flutter + Firebase",
                "category": "mobile",
                "usage_count": 12000,
                "success_rate": 0.89
            },
            {
                "name": "Arduino + C++",
                "category": "iot",
                "usage_count": 8000,
                "success_rate": 0.95
            },
            {
                "name": "Next.js + PostgreSQL",
                "category": "web",
                "usage_count": 10000,
                "success_rate": 0.91
            }
        ]
        
        if category == "all":
            return all_combos
        else:
            return [c for c in all_combos if c["category"] == category]
