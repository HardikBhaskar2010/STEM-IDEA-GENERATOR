# Technology Stack Service
# Requirements: 1.3 Technology Stack Recommendation Engine
# Provides technology stack recommendations, comparisons, and analysis

import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TechnologyStack:
    """Represents a technology stack configuration"""
    id: str
    name: str
    description: str
    category: str  # web, mobile, desktop, full_stack, backend, frontend
    frontend_framework: Optional[str]
    backend_framework: Optional[str]
    database: str
    additional_technologies: List[Dict[str, str]]
    popularity_score: int  # 0-100
    learning_curve: str  # easy, moderate, steep
    community_size: str  # small, medium, large, very_large
    maturity: str  # experimental, stable, mature, legacy
    pros: List[str]
    cons: List[str]
    best_for: List[str]
    documentation_url: str
    tutorial_links: List[str]
    estimated_hosting_cost: str
    requires_paid_services: bool


class TechnologyStackService:
    """Service for technology stack recommendations and comparisons"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self._initialize_stacks()
    
    def _initialize_stacks(self):
        """Initialize technology stack database"""
        self.stacks = {
            # MERN Stack
            "mern": TechnologyStack(
                id="mern",
                name="MERN Stack",
                description="MongoDB, Express, React, Node.js - Popular JavaScript full-stack",
                category="full_stack",
                frontend_framework="React",
                backend_framework="Express.js",
                database="MongoDB",
                additional_technologies=[
                    {"name": "Redux", "purpose": "State Management"},
                    {"name": "JWT", "purpose": "Authentication"},
                    {"name": "Socket.io", "purpose": "Real-time Communication"}
                ],
                popularity_score=95,
                learning_curve="moderate",
                community_size="very_large",
                maturity="mature",
                pros=[
                    "Single language (JavaScript) across stack",
                    "Large community and ecosystem",
                    "Fast development speed",
                    "Great for real-time applications",
                    "Excellent documentation"
                ],
                cons=[
                    "NoSQL limitations for complex relationships",
                    "Callback hell without proper async handling",
                    "Performance concerns at large scale"
                ],
                best_for=[
                    "Real-time applications",
                    "MVPs and startups",
                    "Content management systems",
                    "Social media platforms"
                ],
                documentation_url="https://www.mongodb.com/mern-stack",
                tutorial_links=[
                    "https://www.freecodecamp.org/news/learn-the-mern-stack-tutorial/",
                    "https://www.youtube.com/watch?v=fnpmR6Q5lEc"
                ],
                estimated_hosting_cost="$5-50/month",
                requires_paid_services=False
            ),
            
            # Django + React
            "django_react": TechnologyStack(
                id="django_react",
                name="Django + React",
                description="Django REST Framework backend with React frontend",
                category="full_stack",
                frontend_framework="React",
                backend_framework="Django",
                database="PostgreSQL",
                additional_technologies=[
                    {"name": "Django REST Framework", "purpose": "API Development"},
                    {"name": "Redux", "purpose": "State Management"},
                    {"name": "Celery", "purpose": "Background Tasks"}
                ],
                popularity_score=90,
                learning_curve="moderate",
                community_size="very_large",
                maturity="mature",
                pros=[
                    "Python backend with excellent libraries",
                    "Built-in admin panel",
                    "Excellent ORM",
                    "Strong security features",
                    "Highly scalable"
                ],
                cons=[
                    "Monolithic by default",
                    "Can be overkill for small projects",
                    "Steeper learning curve than Node.js"
                ],
                best_for=[
                    "Data-driven applications",
                    "Content management systems",
                    "Admin dashboards",
                    "Enterprise applications"
                ],
                documentation_url="https://www.djangoproject.com/",
                tutorial_links=[
                    "https://docs.djangoproject.com/en/stable/intro/tutorial01/",
                    "https://www.youtube.com/watch?v=F5mRW0jo-U4"
                ],
                estimated_hosting_cost="$10-100/month",
                requires_paid_services=False
            ),
            
            # FastAPI + React
            "fastapi_react": TechnologyStack(
                id="fastapi_react",
                name="FastAPI + React",
                description="Modern Python backend with React frontend",
                category="full_stack",
                frontend_framework="React",
                backend_framework="FastAPI",
                database="PostgreSQL",
                additional_technologies=[
                    {"name": "SQLAlchemy", "purpose": "ORM"},
                    {"name": "Pydantic", "purpose": "Data Validation"},
                    {"name": "Redis", "purpose": "Caching"}
                ],
                popularity_score=88,
                learning_curve="easy",
                community_size="large",
                maturity="stable",
                pros=[
                    "Very fast (async Python)",
                    "Automatic API documentation",
                    "Type hints and validation",
                    "Easy to learn",
                    "Modern Python features"
                ],
                cons=[
                    "Newer ecosystem",
                    "Fewer plugins than Django",
                    "Less built-in features"
                ],
                best_for=[
                    "APIs and microservices",
                    "ML/AI integration",
                    "Modern web applications",
                    "Real-time data applications"
                ],
                documentation_url="https://fastapi.tiangolo.com/",
                tutorial_links=[
                    "https://fastapi.tiangolo.com/tutorial/",
                    "https://www.youtube.com/watch?v=7t2alSnE2-I"
                ],
                estimated_hosting_cost="$10-100/month",
                requires_paid_services=False
            ),
            
            # Next.js Full-Stack
            "nextjs": TechnologyStack(
                id="nextjs",
                name="Next.js Full-Stack",
                description="React framework with built-in backend capabilities",
                category="full_stack",
                frontend_framework="Next.js",
                backend_framework="Next.js API Routes",
                database="PostgreSQL",
                additional_technologies=[
                    {"name": "Prisma", "purpose": "ORM"},
                    {"name": "NextAuth.js", "purpose": "Authentication"},
                    {"name": "SWR", "purpose": "Data Fetching"}
                ],
                popularity_score=92,
                learning_curve="moderate",
                community_size="very_large",
                maturity="mature",
                pros=[
                    "Server-side rendering",
                    "API routes built-in",
                    "Great performance",
                    "SEO-friendly",
                    "Easy Vercel deployment"
                ],
                cons=[
                    "Vendor lock-in risk",
                    "More complex than plain React",
                    "Can be overkill for simple apps"
                ],
                best_for=[
                    "SEO-critical sites",
                    "E-commerce platforms",
                    "Marketing websites",
                    "SaaS products"
                ],
                documentation_url="https://nextjs.org/",
                tutorial_links=[
                    "https://nextjs.org/learn",
                    "https://www.youtube.com/watch?v=Sklc_fQBmcs"
                ],
                estimated_hosting_cost="$0-50/month (Vercel free tier)",
                requires_paid_services=False
            ),
            
            # React Native
            "react_native": TechnologyStack(
                id="react_native",
                name="React Native",
                description="Build native mobile apps with React",
                category="mobile",
                frontend_framework="React Native",
                backend_framework=None,
                database="Firebase",
                additional_technologies=[
                    {"name": "Expo", "purpose": "Development Platform"},
                    {"name": "Redux", "purpose": "State Management"},
                    {"name": "React Navigation", "purpose": "Navigation"}
                ],
                popularity_score=90,
                learning_curve="moderate",
                community_size="very_large",
                maturity="mature",
                pros=[
                    "Cross-platform (iOS + Android)",
                    "Large community",
                    "Hot reload for fast development",
                    "Native performance",
                    "Share code with React web apps"
                ],
                cons=[
                    "Bridge overhead",
                    "Native debugging challenges",
                    "Large app size",
                    "Some platform-specific code needed"
                ],
                best_for=[
                    "Cross-platform mobile apps",
                    "MVPs",
                    "Apps with web counterpart",
                    "Social media apps"
                ],
                documentation_url="https://reactnative.dev/",
                tutorial_links=[
                    "https://reactnative.dev/docs/getting-started",
                    "https://www.youtube.com/watch?v=0-S5a0eXPoc"
                ],
                estimated_hosting_cost="$0-50/month (backend services)",
                requires_paid_services=False
            ),
            
            # Flutter
            "flutter": TechnologyStack(
                id="flutter",
                name="Flutter",
                description="Google's UI toolkit for beautiful native apps",
                category="mobile",
                frontend_framework="Flutter",
                backend_framework=None,
                database="Firebase",
                additional_technologies=[
                    {"name": "Provider", "purpose": "State Management"},
                    {"name": "GetX", "purpose": "Navigation & State"},
                    {"name": "Dio", "purpose": "HTTP Client"}
                ],
                popularity_score=88,
                learning_curve="moderate",
                community_size="large",
                maturity="stable",
                pros=[
                    "Beautiful, customizable UI",
                    "Fast performance",
                    "Single codebase for all platforms",
                    "Hot reload",
                    "Growing ecosystem"
                ],
                cons=[
                    "Dart language (less popular than JavaScript)",
                    "Larger app size",
                    "Fewer third-party packages than React Native"
                ],
                best_for=[
                    "Beautiful user interfaces",
                    "Cross-platform apps",
                    "High-performance apps",
                    "Design-focused applications"
                ],
                documentation_url="https://flutter.dev/",
                tutorial_links=[
                    "https://flutter.dev/docs/get-started/codelab",
                    "https://www.youtube.com/watch?v=1ukSR1GRtMU"
                ],
                estimated_hosting_cost="$0-50/month (backend services)",
                requires_paid_services=False
            ),
            
            # Electron
            "electron": TechnologyStack(
                id="electron",
                name="Electron",
                description="Build cross-platform desktop apps with web technologies",
                category="desktop",
                frontend_framework="React",
                backend_framework="Node.js",
                database="SQLite",
                additional_technologies=[
                    {"name": "Electron Builder", "purpose": "Packaging"},
                    {"name": "IPC", "purpose": "Process Communication"},
                    {"name": "Auto Updater", "purpose": "Updates"}
                ],
                popularity_score=85,
                learning_curve="easy",
                community_size="large",
                maturity="mature",
                pros=[
                    "Cross-platform desktop apps",
                    "Use familiar web technologies",
                    "Easy for web developers",
                    "Large ecosystem",
                    "Active development"
                ],
                cons=[
                    "Large app size (100MB+)",
                    "High memory usage",
                    "Not truly native performance",
                    "Security concerns if not careful"
                ],
                best_for=[
                    "Cross-platform desktop applications",
                    "Developer tools",
                    "Productivity applications",
                    "Offline-first applications"
                ],
                documentation_url="https://www.electronjs.org/",
                tutorial_links=[
                    "https://www.electronjs.org/docs/latest/tutorial/quick-start",
                    "https://www.youtube.com/watch?v=ML743nrkMHw"
                ],
                estimated_hosting_cost="N/A (desktop app)",
                requires_paid_services=False
            )
        }
    
    def get_stack_by_id(self, stack_id: str) -> Optional[TechnologyStack]:
        """Get technology stack by ID"""
        return self.stacks.get(stack_id)
    
    def get_all_stacks(self, category: Optional[str] = None) -> List[TechnologyStack]:
        """Get all technology stacks, optionally filtered by category"""
        stacks = list(self.stacks.values())
        
        if category:
            stacks = [s for s in stacks if s.category == category]
        
        # Sort by popularity
        stacks.sort(key=lambda x: x.popularity_score, reverse=True)
        
        return stacks
    
    def recommend_stacks(
        self,
        project_type: str,
        platforms: List[str],
        complexity: str,
        team_expertise: Optional[str] = None,
        budget_conscious: bool = False
    ) -> List[TechnologyStack]:
        """
        Recommend technology stacks based on project requirements.
        
        Args:
            project_type: Type of project (web_app, mobile_app, etc.)
            platforms: Target platforms
            complexity: Project complexity
            team_expertise: Team expertise level
            budget_conscious: Whether to prioritize low-cost options
            
        Returns:
            List of recommended technology stacks
        """
        self.logger.info(f"Recommending stacks for {project_type}, platforms: {platforms}")
        
        recommendations = []
        
        # Filter by platform
        if "mobile" in platforms or "ios" in platforms or "android" in platforms:
            recommendations.extend([self.stacks["react_native"], self.stacks["flutter"]])
        elif "desktop" in platforms:
            recommendations.append(self.stacks["electron"])
        elif "web" in platforms:
            # Recommend based on complexity and expertise
            if complexity in ["simple", "moderate"] and team_expertise in ["beginner", "intermediate"]:
                recommendations.extend([self.stacks["mern"], self.stacks["nextjs"]])
            else:
                recommendations.extend([self.stacks["fastapi_react"], self.stacks["django_react"], self.stacks["nextjs"]])
        else:
            # Default web recommendations
            recommendations.extend([self.stacks["mern"], self.stacks["fastapi_react"], self.stacks["nextjs"]])
        
        # Filter by budget if needed
        if budget_conscious:
            recommendations = [s for s in recommendations if not s.requires_paid_services]
        
        # Sort by popularity
        recommendations.sort(key=lambda x: x.popularity_score, reverse=True)
        
        return recommendations[:5]  # Return top 5
    
    def compare_stacks(self, stack_ids: List[str]) -> Dict[str, Any]:
        """
        Compare multiple technology stacks side by side.
        
        Args:
            stack_ids: List of stack IDs to compare
            
        Returns:
            Comparison data structure
        """
        stacks = [self.stacks[sid] for sid in stack_ids if sid in self.stacks]
        
        if not stacks:
            return {"error": "No valid stacks found"}
        
        comparison = {
            "stacks": [s.name for s in stacks],
            "comparison_table": {
                "frontend": [s.frontend_framework or "N/A" for s in stacks],
                "backend": [s.backend_framework or "N/A" for s in stacks],
                "database": [s.database for s in stacks],
                "popularity": [s.popularity_score for s in stacks],
                "learning_curve": [s.learning_curve for s in stacks],
                "community_size": [s.community_size for s in stacks],
                "maturity": [s.maturity for s in stacks],
                "hosting_cost": [s.estimated_hosting_cost for s in stacks]
            },
            "pros_cons": [
                {
                    "name": s.name,
                    "pros": s.pros,
                    "cons": s.cons,
                    "best_for": s.best_for
                }
                for s in stacks
            ],
            "recommendations": self._generate_comparison_recommendations(stacks)
        }
        
        return comparison
    
    def _generate_comparison_recommendations(self, stacks: List[TechnologyStack]) -> Dict[str, str]:
        """Generate recommendations based on stack comparison"""
        
        # Find stack with highest popularity
        most_popular = max(stacks, key=lambda x: x.popularity_score)
        
        # Find easiest to learn
        learning_order = {"easy": 1, "moderate": 2, "steep": 3}
        easiest = min(stacks, key=lambda x: learning_order.get(x.learning_curve, 2))
        
        # Find most cost-effective
        cost_effective = [s for s in stacks if not s.requires_paid_services]
        
        recommendations = {
            "most_popular": f"{most_popular.name} is the most popular choice with a score of {most_popular.popularity_score}/100",
            "easiest_to_learn": f"{easiest.name} has the easiest learning curve ({easiest.learning_curve})",
        }
        
        if cost_effective:
            cheapest = min(cost_effective, key=lambda x: int(x.estimated_hosting_cost.split("-")[0].replace("$", "").replace("/month", "")))
            recommendations["most_cost_effective"] = f"{cheapest.name} is the most cost-effective at {cheapest.estimated_hosting_cost}"
        
        return recommendations
    
    def get_learning_resources(self, stack_id: str) -> Dict[str, Any]:
        """Get learning resources for a specific stack"""
        stack = self.get_stack_by_id(stack_id)
        
        if not stack:
            return {"error": "Stack not found"}
        
        return {
            "name": stack.name,
            "documentation": stack.documentation_url,
            "tutorials": stack.tutorial_links,
            "learning_curve": stack.learning_curve,
            "recommended_prerequisites": self._get_prerequisites(stack)
        }
    
    def _get_prerequisites(self, stack: TechnologyStack) -> List[str]:
        """Get prerequisite knowledge for a stack"""
        prerequisites = []
        
        if stack.frontend_framework:
            if "react" in stack.frontend_framework.lower():
                prerequisites.extend(["JavaScript", "HTML", "CSS", "React Basics"])
            elif "vue" in stack.frontend_framework.lower():
                prerequisites.extend(["JavaScript", "HTML", "CSS", "Vue Basics"])
            elif "angular" in stack.frontend_framework.lower():
                prerequisites.extend(["TypeScript", "HTML", "CSS", "Angular Basics"])
            elif "flutter" in stack.frontend_framework.lower():
                prerequisites.extend(["Dart", "Mobile Development Concepts"])
        
        if stack.backend_framework:
            if "express" in stack.backend_framework.lower() or "node" in stack.backend_framework.lower():
                prerequisites.extend(["JavaScript", "Node.js", "npm/yarn"])
            elif "django" in stack.backend_framework.lower():
                prerequisites.extend(["Python", "OOP Concepts", "MVC Pattern"])
            elif "fastapi" in stack.backend_framework.lower():
                prerequisites.extend(["Python", "Async/Await", "Type Hints"])
        
        if stack.database:
            if "mongo" in stack.database.lower():
                prerequisites.append("NoSQL Concepts")
            elif "postgres" in stack.database.lower() or "mysql" in stack.database.lower():
                prerequisites.extend(["SQL", "Relational Databases"])
            elif "firebase" in stack.database.lower():
                prerequisites.append("NoSQL Concepts")
        
        return list(set(prerequisites))  # Remove duplicates\n\n\n# Export singleton instance\ntechnology_stack_service = TechnologyStackService()
