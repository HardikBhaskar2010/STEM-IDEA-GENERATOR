# Software Project Planning Service
# Requirements: 1.1 Apps & Websites Domain Implementation
# Provides comprehensive software project planning, requirement analysis, and recommendations

import logging
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class ProjectType(Enum):
    """Software project types"""
    WEB_APP = "web_app"
    MOBILE_APP = "mobile_app"
    DESKTOP_APP = "desktop_app"
    API = "api"
    FULL_STACK = "full_stack"
    MICROSERVICES = "microservices"
    PWA = "progressive_web_app"


class Platform(Enum):
    """Target platforms"""
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"
    DESKTOP = "desktop"
    ALL = "all"


class ComplexityLevel(Enum):
    """Project complexity levels"""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    ENTERPRISE = "enterprise"


class Feature:
    """Represents a software feature"""
    def __init__(
        self,
        name: str,
        description: str,
        priority: str = "medium",  # low, medium, high, critical
        acceptance_criteria: Optional[List[str]] = None,
        estimated_hours: Optional[int] = None,
        dependencies: Optional[List[str]] = None
    ):
        self.name = name
        self.description = description
        self.priority = priority
        self.acceptance_criteria = acceptance_criteria or []
        self.estimated_hours = estimated_hours
        self.dependencies = dependencies or []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "priority": self.priority,
            "acceptance_criteria": self.acceptance_criteria,
            "estimated_hours": self.estimated_hours,
            "dependencies": self.dependencies
        }


class UserStory:
    """Represents a user story"""
    def __init__(
        self,
        as_a: str,
        i_want: str,
        so_that: str,
        acceptance_criteria: Optional[List[str]] = None,
        story_points: Optional[int] = None
    ):
        self.as_a = as_a
        self.i_want = i_want
        self.so_that = so_that
        self.acceptance_criteria = acceptance_criteria or []
        self.story_points = story_points
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "as_a": self.as_a,
            "i_want": self.i_want,
            "so_that": self.so_that,
            "acceptance_criteria": self.acceptance_criteria,
            "story_points": self.story_points
        }
    
    def to_text(self) -> str:
        return f"As a {self.as_a}, I want {self.i_want}, so that {self.so_that}"


class SoftwareProjectPlan:
    """Complete software project plan"""
    def __init__(
        self,
        project_type: ProjectType,
        platforms: List[Platform],
        features: List[Feature],
        user_stories: List[UserStory],
        recommended_tech_stack: Dict[str, Any],
        architecture_type: str,
        database_recommendations: List[Dict[str, Any]],
        estimated_timeline: str,
        estimated_budget: str,
        complexity_level: ComplexityLevel,
        team_recommendations: Dict[str, Any],
        deployment_recommendations: List[Dict[str, Any]],
        non_functional_requirements: Dict[str, Any]
    ):
        self.project_type = project_type
        self.platforms = platforms
        self.features = features
        self.user_stories = user_stories
        self.recommended_tech_stack = recommended_tech_stack
        self.architecture_type = architecture_type
        self.database_recommendations = database_recommendations
        self.estimated_timeline = estimated_timeline
        self.estimated_budget = estimated_budget
        self.complexity_level = complexity_level
        self.team_recommendations = team_recommendations
        self.deployment_recommendations = deployment_recommendations
        self.non_functional_requirements = non_functional_requirements
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "project_type": self.project_type.value,
            "platforms": [p.value for p in self.platforms],
            "features": [f.to_dict() for f in self.features],
            "user_stories": [us.to_dict() for us in self.user_stories],
            "recommended_tech_stack": self.recommended_tech_stack,
            "architecture_type": self.architecture_type,
            "database_recommendations": self.database_recommendations,
            "estimated_timeline": self.estimated_timeline,
            "estimated_budget": self.estimated_budget,
            "complexity_level": self.complexity_level.value,
            "team_recommendations": self.team_recommendations,
            "deployment_recommendations": self.deployment_recommendations,
            "non_functional_requirements": self.non_functional_requirements
        }


class SoftwareProjectPlanningService:
    """Service for software project planning and requirement analysis"""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def analyze_requirements(
        self,
        description: str,
        target_platforms: List[str],
        budget: Optional[str] = None,
        timeline: Optional[str] = None,
        team_size: Optional[int] = None,
        team_expertise: Optional[str] = None
    ) -> SoftwareProjectPlan:
        """
        Analyze project requirements and generate comprehensive project plan.
        
        Args:
            description: Project description and goals
            target_platforms: List of target platforms (web, mobile, desktop)
            budget: Budget constraint
            timeline: Timeline constraint
            team_size: Size of development team
            team_expertise: Team expertise level
            
        Returns:
            SoftwareProjectPlan with recommendations
        """
        self.logger.info(f"Analyzing requirements for project: {description[:100]}...")
        
        # Determine project type based on description and platforms
        project_type = self._determine_project_type(description, target_platforms)
        
        # Convert platform strings to enums
        platforms = [Platform(p.lower()) for p in target_platforms if p.lower() in [e.value for e in Platform]]
        
        # Extract features from description
        features = self._extract_features(description, project_type)
        
        # Generate user stories
        user_stories = self._generate_user_stories(features, project_type)
        
        # Determine complexity
        complexity = self._assess_complexity(features, platforms, description)
        
        # Recommend technology stack
        tech_stack = self._recommend_tech_stack(project_type, platforms, complexity, team_expertise)
        
        # Recommend architecture
        architecture = self._recommend_architecture(project_type, complexity, features)
        
        # Recommend database
        db_recommendations = self._recommend_databases(project_type, complexity, features)
        
        # Estimate timeline and budget
        estimated_timeline = self._estimate_timeline(features, complexity, team_size, team_expertise)
        estimated_budget = self._estimate_budget(complexity, timeline, team_size) if not budget else budget
        
        # Team recommendations
        team_recs = self._recommend_team_composition(complexity, platforms, features)
        
        # Deployment recommendations
        deployment_recs = self._recommend_deployment_platforms(tech_stack, budget, complexity)
        
        # Non-functional requirements
        nfr = self._generate_nfr(complexity, project_type)
        
        return SoftwareProjectPlan(
            project_type=project_type,
            platforms=platforms,
            features=features,
            user_stories=user_stories,
            recommended_tech_stack=tech_stack,
            architecture_type=architecture,
            database_recommendations=db_recommendations,
            estimated_timeline=estimated_timeline,
            estimated_budget=estimated_budget,
            complexity_level=complexity,
            team_recommendations=team_recs,
            deployment_recommendations=deployment_recs,
            non_functional_requirements=nfr
        )
    
    def _determine_project_type(self, description: str, platforms: List[str]) -> ProjectType:
        """Determine project type based on description and platforms"""
        desc_lower = description.lower()
        
        # Check for keywords
        if "api" in desc_lower or "backend" in desc_lower or "rest" in desc_lower:
            return ProjectType.API
        elif "microservice" in desc_lower:
            return ProjectType.MICROSERVICES
        elif len(platforms) > 1:
            return ProjectType.FULL_STACK
        elif "mobile" in platforms or "ios" in platforms or "android" in platforms:
            return ProjectType.MOBILE_APP
        elif "desktop" in platforms:
            return ProjectType.DESKTOP_APP
        elif "pwa" in desc_lower or "progressive" in desc_lower:
            return ProjectType.PWA
        else:
            return ProjectType.WEB_APP
    
    def _extract_features(self, description: str, project_type: ProjectType) -> List[Feature]:
        """
        Extract features from project description.
        In a production system, this would use AI/NLP for better extraction.
        """
        features = []
        
        # Common features based on project type
        if project_type in [ProjectType.WEB_APP, ProjectType.FULL_STACK]:
            features.extend([
                Feature("User Authentication", "Secure user registration and login system", "high",
                       ["Users can register", "Users can login", "Password reset functionality"], 16),
                Feature("User Dashboard", "Personalized dashboard for users", "high",
                       ["Display user-specific data", "Customizable widgets", "Real-time updates"], 24),
                Feature("Responsive Design", "Mobile-friendly responsive interface", "high",
                       ["Works on mobile devices", "Adaptive layout", "Touch-friendly controls"], 16)
            ])
        
        # E-commerce specific
        if any(keyword in description.lower() for keyword in ["ecommerce", "shop", "store", "product"]):
            features.extend([
                Feature("Product Catalog", "Browse and search products", "critical",
                       ["Display products", "Search functionality", "Filter options"], 32),
                Feature("Shopping Cart", "Add items to cart and checkout", "critical",
                       ["Add/remove items", "Update quantities", "Calculate totals"], 24),
                Feature("Payment Integration", "Process payments securely", "critical",
                       ["Stripe/PayPal integration", "Secure checkout", "Order confirmation"], 40)
            ])
        
        # Social media specific
        if any(keyword in description.lower() for keyword in ["social", "post", "feed", "message"]):
            features.extend([
                Feature("User Profiles", "User profile pages", "high",
                       ["View profiles", "Edit own profile", "Profile pictures"], 20),
                Feature("News Feed", "Display posts from connections", "critical",
                       ["Chronological feed", "Infinite scroll", "Post interactions"], 32),
                Feature("Real-time Messaging", "Chat between users", "high",
                       ["Send messages", "Real-time delivery", "Message history"], 40)
            ])
        
        # If no specific features detected, add generic ones
        if len(features) < 3:
            features.extend([
                Feature("Core Functionality", "Main application features", "critical",
                       ["Based on project requirements"], 80),
                Feature("Admin Panel", "Administrative interface", "medium",
                       ["Manage users", "View analytics", "System configuration"], 40),
                Feature("Analytics Dashboard", "Track application metrics", "low",
                       ["User analytics", "Performance metrics", "Reports"], 24)
            ])
        
        return features
    
    def _generate_user_stories(self, features: List[Feature], project_type: ProjectType) -> List[UserStory]:
        """Generate user stories from features"""
        user_stories = []
        
        for feature in features:
            if "authentication" in feature.name.lower():
                user_stories.append(
                    UserStory(
                        "new user",
                        "to register an account",
                        "I can access personalized features",
                        ["Registration form is available", "Email verification works", "Password is securely stored"],
                        3
                    )
                )
            elif "dashboard" in feature.name.lower():
                user_stories.append(
                    UserStory(
                        "registered user",
                        "to see a personalized dashboard",
                        "I can quickly access relevant information",
                        ["Dashboard loads within 2 seconds", "Shows personalized data", "Is mobile responsive"],
                        5
                    )
                )
            elif "product" in feature.name.lower() or "catalog" in feature.name.lower():
                user_stories.append(
                    UserStory(
                        "customer",
                        "to browse products",
                        "I can find what I'm looking for",
                        ["Products display with images", "Search works accurately", "Filters are functional"],
                        5
                    )
                )
            elif "cart" in feature.name.lower():
                user_stories.append(
                    UserStory(
                        "customer",
                        "to add items to my cart",
                        "I can purchase multiple items at once",
                        ["Items are added correctly", "Cart persists across sessions", "Quantities can be updated"],
                        3
                    )
                )
            elif "payment" in feature.name.lower():
                user_stories.append(
                    UserStory(
                        "customer",
                        "to checkout securely",
                        "I can complete my purchase confidently",
                        ["Payment form is secure (SSL)", "Multiple payment methods supported", "Order confirmation is sent"],
                        8
                    )
                )
        
        return user_stories
    
    def _assess_complexity(self, features: List[Feature], platforms: List[Platform], description: str) -> ComplexityLevel:
        """Assess project complexity based on features and platforms"""
        total_hours = sum(f.estimated_hours or 0 for f in features)
        feature_count = len(features)
        platform_count = len(platforms)
        
        # Complexity factors
        desc_lower = description.lower()
        has_realtime = "realtime" in desc_lower or "websocket" in desc_lower
        has_payment = "payment" in desc_lower or "stripe" in desc_lower
        has_auth = "auth" in desc_lower or "login" in desc_lower
        has_ml = "machine learning" in desc_lower or "ai" in desc_lower
        
        complexity_score = 0
        complexity_score += feature_count * 2
        complexity_score += platform_count * 5
        complexity_score += 10 if has_realtime else 0
        complexity_score += 10 if has_payment else 0
        complexity_score += 5 if has_auth else 0
        complexity_score += 20 if has_ml else 0
        
        if complexity_score > 50 or total_hours > 300:
            return ComplexityLevel.ENTERPRISE
        elif complexity_score > 30 or total_hours > 150:
            return ComplexityLevel.COMPLEX
        elif complexity_score > 15 or total_hours > 80:
            return ComplexityLevel.MODERATE
        else:
            return ComplexityLevel.SIMPLE
    
    def _recommend_tech_stack(self, project_type: ProjectType, platforms: List[Platform], complexity: ComplexityLevel, team_expertise: Optional[str]) -> Dict[str, Any]:
        """Recommend technology stack based on project characteristics"""
        
        # Default to intermediate if not specified
        expertise = team_expertise or "intermediate"
        
        # For web applications
        if project_type in [ProjectType.WEB_APP, ProjectType.FULL_STACK, ProjectType.PWA]:
            if complexity in [ComplexityLevel.SIMPLE, ComplexityLevel.MODERATE] and expertise in ["beginner", "intermediate"]:
                return {
                    "name": "MERN Stack",
                    "frontend": "React",
                    "backend": "Node.js + Express",
                    "database": "MongoDB",
                    "reasoning": "Popular, JavaScript-based, large community, great for rapid development",
                    "additional_tools": ["Redux", "JWT", "Mongoose", "Socket.io"]
                }
            else:
                return {
                    "name": "React + FastAPI",
                    "frontend": "React + TypeScript",
                    "backend": "Python FastAPI",
                    "database": "PostgreSQL",
                    "reasoning": "Type-safe, high performance, excellent for complex applications, great for ML integration",
                    "additional_tools": ["Redux Toolkit", "JWT", "SQLAlchemy", "Redis"]
                }
        
        # For mobile applications
        elif project_type == ProjectType.MOBILE_APP:
            if Platform.IOS in platforms and Platform.ANDROID in platforms:
                return {
                    "name": "React Native",
                    "frontend": "React Native",
                    "backend": "Node.js + Express",
                    "database": "Firebase / PostgreSQL",
                    "reasoning": "Cross-platform, share code with web, large community",
                    "additional_tools": ["Expo", "Redux", "React Navigation"]
                }
            else:
                return {
                    "name": "Flutter",
                    "frontend": "Flutter",
                    "backend": "Python FastAPI",
                    "database": "Firebase / PostgreSQL",
                    "reasoning": "Beautiful UI, high performance, growing ecosystem",
                    "additional_tools": ["Provider", "GetX", "Firebase"]
                }
        
        # For desktop applications
        elif project_type == ProjectType.DESKTOP_APP:
            return {
                "name": "Electron",
                "frontend": "React + TypeScript",
                "backend": "Node.js (Embedded)",
                "database": "SQLite / PostgreSQL",
                "reasoning": "Cross-platform desktop, use web technologies, easy for web developers",
                "additional_tools": ["Electron Builder", "IPC Communication"]
            }
        
        # For APIs
        elif project_type == ProjectType.API:
            return {
                "name": "FastAPI",
                "backend": "Python FastAPI",
                "database": "PostgreSQL",
                "reasoning": "Fast, automatic documentation, async support, type hints",
                "additional_tools": ["SQLAlchemy", "Pydantic", "JWT", "Redis"]
            }
        
        # Default fallback
        return {
            "name": "React + Node.js",
            "frontend": "React",
            "backend": "Node.js + Express",
            "database": "PostgreSQL",
            "reasoning": "Versatile, popular, good for most use cases",
            "additional_tools": ["Redux", "JWT", "Sequelize"]
        }
    
    def _recommend_architecture(self, project_type: ProjectType, complexity: ComplexityLevel, features: List[Feature]) -> str:
        """Recommend software architecture pattern"""
        
        if project_type == ProjectType.MICROSERVICES:
            return "microservices"
        elif complexity == ComplexityLevel.ENTERPRISE and len(features) > 15:
            return "microservices"
        elif project_type in [ProjectType.WEB_APP, ProjectType.FULL_STACK] and complexity in [ComplexityLevel.SIMPLE, ComplexityLevel.MODERATE]:
            return "spa"  # Single Page Application
        elif complexity in [ComplexityLevel.SIMPLE, ComplexityLevel.MODERATE]:
            return "monolith"
        else:
            return "modular_monolith"
    
    def _recommend_databases(self, project_type: ProjectType, complexity: ComplexityLevel, features: List[Feature]) -> List[Dict[str, Any]]:
        """Recommend suitable databases"""
        recommendations = []
        
        # Check for specific requirements
        has_complex_relations = any("relationship" in f.description.lower() or "relational" in f.description.lower() for f in features)
        has_flexible_schema = any("flexible" in f.description.lower() or "dynamic" in f.description.lower() for f in features)
        has_realtime = any("realtime" in f.description.lower() or "live" in f.description.lower() for f in features)
        
        # PostgreSQL for structured data
        recommendations.append({
            "name": "PostgreSQL",
            "type": "Relational SQL",
            "pros": ["ACID compliance", "Complex queries", "JSON support", "Mature", "Free and open source"],
            "cons": ["Requires schema design", "Vertical scaling limitations"],
            "best_for": ["Structured data", "Complex relationships", "Enterprise applications"],
            "recommended": has_complex_relations or complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE]
        })
        
        # MongoDB for flexible schemas
        recommendations.append({
            "name": "MongoDB",
            "type": "NoSQL Document",
            "pros": ["Flexible schema", "Horizontal scaling", "JSON-like documents", "Fast development"],
            "cons": ["No ACID transactions (in older versions)", "Memory intensive"],
            "best_for": ["Rapid prototyping", "Flexible data models", "Real-time applications"],
            "recommended": has_flexible_schema or project_type == ProjectType.MOBILE_APP
        })
        
        # Firebase for real-time
        if has_realtime or project_type == ProjectType.MOBILE_APP:
            recommendations.append({
                "name": "Firebase",
                "type": "NoSQL Real-time",
                "pros": ["Real-time sync", "Easy setup", "Built-in auth", "Good for mobile"],
                "cons": ["Vendor lock-in", "Can be expensive at scale", "Limited querying"],
                "best_for": ["Real-time applications", "Mobile apps", "Rapid prototyping"],
                "recommended": True
            })
        
        return recommendations
    
    def _estimate_timeline(self, features: List[Feature], complexity: ComplexityLevel, team_size: Optional[int], team_expertise: Optional[str]) -> str:
        """Estimate project timeline"""
        total_hours = sum(f.estimated_hours or 0 for f in features)
        
        # Adjust based on team size
        team_size = team_size or 2
        effective_hours = total_hours / team_size
        
        # Adjust based on expertise
        expertise_multiplier = {
            "beginner": 1.5,
            "intermediate": 1.0,
            "advanced": 0.8,
            "expert": 0.6
        }
        multiplier = expertise_multiplier.get(team_expertise or "intermediate", 1.0)
        effective_hours *= multiplier
        
        # Add buffer for testing, deployment, etc. (30%)
        total_hours_with_buffer = effective_hours * 1.3
        
        # Convert to weeks (assuming 40 hours/week)
        weeks = total_hours_with_buffer / 40
        
        if weeks < 2:
            return "1-2 weeks"
        elif weeks < 4:
            return "2-4 weeks"
        elif weeks < 8:
            return "1-2 months"
        elif weeks < 12:
            return "2-3 months"
        elif weeks < 24:
            return "3-6 months"
        else:
            return "6+ months"
    
    def _estimate_budget(self, complexity: ComplexityLevel, timeline: Optional[str], team_size: Optional[int]) -> str:
        """Estimate project budget"""
        # Rough estimates (very simplified)
        base_costs = {
            ComplexityLevel.SIMPLE: (5000, 15000),
            ComplexityLevel.MODERATE: (15000, 40000),
            ComplexityLevel.COMPLEX: (40000, 100000),
            ComplexityLevel.ENTERPRISE: (100000, 500000)
        }
        
        min_cost, max_cost = base_costs.get(complexity, (10000, 50000))
        
        # Adjust for team size
        if team_size and team_size > 3:
            min_cost *= 1.5
            max_cost *= 1.5
        
        return f"${min_cost:,} - ${max_cost:,}"
    
    def _recommend_team_composition(self, complexity: ComplexityLevel, platforms: List[Platform], features: List[Feature]) -> Dict[str, Any]:
        """Recommend team composition"""
        
        team = {
            "recommended_size": 0,
            "roles": []
        }
        
        if complexity == ComplexityLevel.SIMPLE:
            team["recommended_size"] = 2
            team["roles"] = [
                {"role": "Full-Stack Developer", "count": 2, "skills": ["Frontend", "Backend", "Database"]}
            ]
        elif complexity == ComplexityLevel.MODERATE:
            team["recommended_size"] = 3
            team["roles"] = [
                {"role": "Frontend Developer", "count": 1, "skills": ["React/Vue", "CSS", "JavaScript"]},
                {"role": "Backend Developer", "count": 1, "skills": ["API Development", "Database", "Security"]},
                {"role": "Full-Stack Developer", "count": 1, "skills": ["Frontend", "Backend", "DevOps"]}
            ]
        elif complexity == ComplexityLevel.COMPLEX:
            team["recommended_size"] = 5
            team["roles"] = [
                {"role": "Frontend Developer", "count": 2, "skills": ["React/Vue", "State Management", "Performance"]},
                {"role": "Backend Developer", "count": 2, "skills": ["API Development", "Database", "Microservices"]},
                {"role": "DevOps Engineer", "count": 1, "skills": ["CI/CD", "Docker", "Cloud Platforms"]}
            ]
        else:  # Enterprise
            team["recommended_size"] = 8
            team["roles"] = [
                {"role": "Frontend Developer", "count": 2, "skills": ["React/Vue", "State Management", "Testing"]},
                {"role": "Backend Developer", "count": 2, "skills": ["Microservices", "Database", "Security"]},
                {"role": "DevOps Engineer", "count": 1, "skills": ["Kubernetes", "CI/CD", "Monitoring"]},
                {"role": "QA Engineer", "count": 1, "skills": ["Automation", "Testing", "Quality Assurance"]},
                {"role": "Product Manager", "count": 1, "skills": ["Requirements", "Stakeholder Management"]},
                {"role": "UI/UX Designer", "count": 1, "skills": ["Design", "User Research", "Prototyping"]}
            ]
        
        return team
    
    def _recommend_deployment_platforms(self, tech_stack: Dict[str, Any], budget: Optional[str], complexity: ComplexityLevel) -> List[Dict[str, Any]]:
        """Recommend deployment platforms"""
        recommendations = []
        
        # Vercel (great for Next.js / React)
        if "react" in tech_stack.get("frontend", "").lower() or "next" in tech_stack.get("frontend", "").lower():
            recommendations.append({
                "name": "Vercel",
                "type": "Frontend Hosting",
                "pros": ["Easy deployment", "Free tier", "Auto scaling", "Great DX", "Built-in analytics"],
                "cons": ["Serverless limitations", "Can be expensive at scale"],
                "pricing": "Free tier available, Pro at $20/month",
                "best_for": ["Next.js apps", "React apps", "Static sites"],
                "recommended": complexity in [ComplexityLevel.SIMPLE, ComplexityLevel.MODERATE]
            })
        
        # Heroku (easy for beginners)
        recommendations.append({
            "name": "Heroku",
            "type": "Full-Stack Platform",
            "pros": ["Easy setup", "Add-ons ecosystem", "Good for Node/Python"],
            "cons": ["Can be expensive", "Sleep on free tier", "Less control"],
            "pricing": "$7/month hobby tier, scales up",
            "best_for": ["MVPs", "Rapid prototyping", "Small apps"],
            "recommended": complexity == ComplexityLevel.SIMPLE
        })
        
        # AWS (for enterprise)
        if complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE]:
            recommendations.append({
                "name": "AWS",
                "type": "Cloud Infrastructure",
                "pros": ["Highly scalable", "Full control", "Many services", "Enterprise-ready"],
                "cons": ["Steep learning curve", "Complex pricing", "Requires DevOps expertise"],
                "pricing": "Pay-as-you-go, can be $50-500+/month",
                "best_for": ["Enterprise apps", "High traffic", "Complex architectures"],
                "recommended": True
            })
        
        # Render (great middle ground)
        recommendations.append({
            "name": "Render",
            "type": "Full-Stack Platform",
            "pros": ["Easy deployment", "Free tier", "Docker support", "Auto scaling"],
            "cons": ["Smaller ecosystem than AWS", "Limited regions"],
            "pricing": "Free tier available, paid from $7/month",
            "best_for": ["Full-stack apps", "APIs", "Background workers"],
            "recommended": complexity in [ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]
        })
        
        return recommendations
    
    def _generate_nfr(self, complexity: ComplexityLevel, project_type: ProjectType) -> Dict[str, Any]:
        """Generate non-functional requirements"""
        
        nfr = {
            "performance": {
                "page_load_time": "< 3 seconds" if complexity == ComplexityLevel.SIMPLE else "< 2 seconds",
                "api_response_time": "< 500ms" if complexity in [ComplexityLevel.SIMPLE, ComplexityLevel.MODERATE] else "< 200ms",
                "concurrent_users": "100+" if complexity == ComplexityLevel.SIMPLE else "1000+"
            },
            "security": {
                "authentication": "JWT or OAuth 2.0",
                "encryption": "SSL/TLS for data in transit, encryption for sensitive data at rest",
                "compliance": "GDPR compliant" if complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE] else "Basic privacy policy"
            },
            "scalability": {
                "horizontal_scaling": complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE],
                "load_balancing": complexity == ComplexityLevel.ENTERPRISE,
                "caching_strategy": "Redis" if complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE] else "In-memory"
            },
            "availability": {
                "uptime_target": "99.9%" if complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE] else "99%",
                "backup_strategy": "Daily" if complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE] else "Weekly",
                "disaster_recovery": complexity == ComplexityLevel.ENTERPRISE
            },
            "maintainability": {
                "code_coverage": "80%+" if complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE] else "60%+",
                "documentation": "Required for all APIs and components",
                "code_review": "Required" if complexity in [ComplexityLevel.COMPLEX, ComplexityLevel.ENTERPRISE] else "Recommended"
            }
        }
        
        return nfr


# Export singleton instance
software_planning_service = SoftwareProjectPlanningService()
