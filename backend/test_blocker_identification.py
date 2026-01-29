#!/usr/bin/env python3
"""
Test script for blocker identification and recommendation logic
Tests the new functionality added to AIGuidanceService for Requirements 6.1 and 6.4
Task: 7.3 Add blocker identification and recommendation logic
"""

import asyncio
import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.ai_guidance_service import AIGuidanceService
from models.ai_guidance import GuidanceRequest, ProjectContext, Task, Milestone, TaskStatus, TaskPriority


async def test_blocker_identification():
    """Test the identifyProjectBlockers method"""
    print("=== Testing Blocker Identification ===")
    
    # Initialize the service
    service = AIGuidanceService()
    
    # Create a sample project context with various blocker scenarios
    overdue_date = datetime.now(timezone.utc) - timedelta(days=3)
    future_date = datetime.now(timezone.utc) + timedelta(days=7)
    
    project_context = ProjectContext(
        project_id=str(uuid.uuid4()),
        title="IoT Temperature Monitoring System",
        description="A comprehensive IoT system for monitoring temperature in multiple locations",
        goals=["Learn IoT development", "Implement sensor integration", "Create monitoring dashboard"],
        current_phase="Development",
        progress=35.0,
        tasks=[
            # Overdue high priority task
            Task(
                title="Set up sensor hardware",
                description="Connect and configure temperature sensors",
                status=TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                due_date=overdue_date
            ),
            # Another overdue task
            Task(
                title="Implement data logging",
                description="Create system to log sensor data",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.MEDIUM,
                due_date=overdue_date
            ),
            # Too many in-progress tasks
            Task(
                title="Design user interface",
                description="Create web interface for monitoring",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.MEDIUM,
                due_date=future_date
            ),
            Task(
                title="Set up database",
                description="Configure database for sensor data",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.HIGH,
                due_date=future_date
            ),
            Task(
                title="Implement alerts",
                description="Create alert system for temperature thresholds",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.LOW,
                due_date=future_date
            ),
            Task(
                title="Write documentation",
                description="Document the system architecture",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.LOW,
                due_date=future_date
            ),
            Task(
                title="Performance testing",
                description="Test system performance under load",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.MEDIUM,
                due_date=future_date
            ),
            Task(
                title="Security review",
                description="Review system security measures",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.HIGH,
                due_date=future_date
            ),
            # Multiple high priority pending tasks
            Task(
                title="Calibrate sensors",
                description="Ensure sensor accuracy",
                status=TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                due_date=future_date
            ),
            Task(
                title="Network configuration",
                description="Set up network connectivity",
                status=TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                due_date=future_date
            ),
            Task(
                title="Error handling",
                description="Implement comprehensive error handling",
                status=TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                due_date=future_date
            ),
            Task(
                title="Data validation",
                description="Validate incoming sensor data",
                status=TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                due_date=future_date
            )
        ],
        milestones=[
            # Overdue milestone
            Milestone(
                title="Hardware Setup Complete",
                description="All sensors connected and tested",
                target_date=overdue_date,
                completed=False
            ),
            # Future milestone
            Milestone(
                title="Software Development Complete",
                description="Core software functionality implemented",
                target_date=future_date,
                completed=False
            )
        ],
        deadlines=[future_date]
    )
    
    # Test blocker identification
    blockers = await service.identifyProjectBlockers(project_context)
    
    print(f"Identified {len(blockers)} potential blockers:")
    for i, blocker in enumerate(blockers, 1):
        print(f"  {i}. {blocker}")
    
    # Verify expected blockers are identified
    expected_blocker_types = [
        "overdue task",
        "overdue milestone", 
        "too many tasks in progress",
        "high-priority tasks are pending"
    ]
    
    blocker_text = " ".join(blockers).lower()
    found_types = []
    
    for blocker_type in expected_blocker_types:
        if any(keyword in blocker_text for keyword in blocker_type.split()):
            found_types.append(blocker_type)
    
    print(f"\nExpected blocker types found: {len(found_types)}/{len(expected_blocker_types)}")
    for found_type in found_types:
        print(f"  ✓ {found_type}")
    
    return len(blockers) > 0 and len(found_types) >= 3


async def test_resource_aware_recommendations():
    """Test the generateResourceAwareRecommendations method"""
    print("\n=== Testing Resource-Aware Recommendations ===")
    
    service = AIGuidanceService()
    
    # Create a project context
    project_context = ProjectContext(
        project_id=str(uuid.uuid4()),
        title="Mobile App Development",
        description="Creating a mobile app for task management",
        goals=["Learn mobile development", "Create user-friendly interface"],
        current_phase="Planning",
        progress=15.0,
        tasks=[
            Task(
                title="Design app wireframes",
                description="Create initial app design",
                status=TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                due_date=datetime.now(timezone.utc) + timedelta(days=5)
            ),
            Task(
                title="Set up development environment",
                description="Install and configure development tools",
                status=TaskStatus.PENDING,
                priority=TaskPriority.LOW,
                due_date=datetime.now(timezone.utc) + timedelta(days=10)
            )
        ],
        milestones=[
            Milestone(
                title="Design Phase Complete",
                description="All designs and wireframes completed",
                target_date=datetime.now(timezone.utc) + timedelta(days=14),
                completed=False
            )
        ],
        deadlines=[datetime.now(timezone.utc) + timedelta(days=30)]
    )
    
    # Test different resource constraint scenarios
    test_scenarios = [
        {
            "message": "I need to finish this quickly, I have limited time",
            "expected_keywords": ["minimum viable", "core features", "prioritize"]
        },
        {
            "message": "I'm on a tight budget and can't afford expensive tools",
            "expected_keywords": ["free", "open-source", "phased implementation"]
        },
        {
            "message": "I'm new to mobile development and don't know where to start",
            "expected_keywords": ["simpler tasks", "learning steps", "beginner"]
        },
        {
            "message": "I don't have access to the latest development tools",
            "expected_keywords": ["available resources", "alternative approaches", "community"]
        },
        {
            "message": "What should I focus on next?",
            "expected_keywords": ["development environment", "task breakdown", "milestone"]
        }
    ]
    
    all_tests_passed = True
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\nScenario {i}: {scenario['message']}")
        
        recommendations = await service.generateResourceAwareRecommendations(
            project_context, 
            scenario['message']
        )
        
        print(f"Generated {len(recommendations)} recommendations:")
        for j, rec in enumerate(recommendations, 1):
            print(f"  {j}. {rec}")
        
        # Check if expected keywords are present
        recommendations_text = " ".join(recommendations).lower()
        found_keywords = []
        
        for keyword in scenario['expected_keywords']:
            if keyword.lower() in recommendations_text:
                found_keywords.append(keyword)
        
        print(f"Expected keywords found: {len(found_keywords)}/{len(scenario['expected_keywords'])}")
        for keyword in found_keywords:
            print(f"  ✓ {keyword}")
        
        if len(found_keywords) < len(scenario['expected_keywords']) // 2:
            all_tests_passed = False
            print(f"  ⚠ Not enough expected keywords found for scenario {i}")
    
    return all_tests_passed


async def test_integrated_guidance_response():
    """Test the integrated blocker identification and recommendations in generateResponse"""
    print("\n=== Testing Integrated Guidance Response ===")
    
    service = AIGuidanceService()
    
    # Create a project context with blockers
    test_project_id = str(uuid.uuid4())
    project_context = ProjectContext(
        project_id=test_project_id,
        title="Robotics Project",
        description="Building an autonomous robot",
        goals=["Learn robotics", "Implement navigation"],
        current_phase="Development",
        progress=45.0,
        tasks=[
            Task(
                title="Overdue sensor integration",
                description="Integrate ultrasonic sensors",
                status=TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                due_date=datetime.now(timezone.utc) - timedelta(days=2)
            )
        ],
        milestones=[
            Milestone(
                title="Hardware Assembly",
                description="Complete robot hardware assembly",
                target_date=datetime.now(timezone.utc) + timedelta(days=7),
                completed=False
            )
        ],
        deadlines=[datetime.now(timezone.utc) + timedelta(days=21)]
    )
    
    # Mock the project context service to return our test context
    original_analyze = service.analyzeProjectContext
    async def mock_analyze(project_id):
        return project_context
    service.analyzeProjectContext = mock_analyze
    
    # Create a guidance request
    request = GuidanceRequest(
        project_id=test_project_id,
        user_message="I'm stuck and need help with my project. I have limited time and budget.",
        conversation_history=[]
    )
    
    # Generate response
    response = await service.generateResponse(request)
    
    print(f"Generated response: {response.response}")
    print(f"\nSuggestions ({len(response.suggestions)}):")
    for i, suggestion in enumerate(response.suggestions, 1):
        print(f"  {i}. {suggestion}")
    
    print(f"\nNext steps ({len(response.next_steps)}):")
    for i, step in enumerate(response.next_steps, 1):
        print(f"  {i}. {step}")
    
    # Verify that blocker-related and resource-aware content is included
    all_content = f"{response.response} {' '.join(response.suggestions)} {' '.join(response.next_steps)}".lower()
    
    blocker_indicators = ["overdue", "blocker", "challenge", "stuck"]
    resource_indicators = ["limited", "budget", "time", "resource", "constraint"]
    
    found_blocker_indicators = [ind for ind in blocker_indicators if ind in all_content]
    found_resource_indicators = [ind for ind in resource_indicators if ind in all_content]
    
    print(f"\nBlocker-related content found: {len(found_blocker_indicators)} indicators")
    print(f"Resource-aware content found: {len(found_resource_indicators)} indicators")
    
    # Restore original method
    service.analyzeProjectContext = original_analyze
    
    return len(found_blocker_indicators) > 0 or len(found_resource_indicators) > 0


async def main():
    """Run all tests"""
    print("Testing Blocker Identification and Recommendation Logic")
    print("=" * 60)
    
    try:
        # Run individual tests
        test1_passed = await test_blocker_identification()
        test2_passed = await test_resource_aware_recommendations()
        test3_passed = await test_integrated_guidance_response()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Blocker Identification Test: {'✓ PASSED' if test1_passed else '✗ FAILED'}")
        print(f"Resource-Aware Recommendations Test: {'✓ PASSED' if test2_passed else '✗ FAILED'}")
        print(f"Integrated Guidance Response Test: {'✓ PASSED' if test3_passed else '✗ FAILED'}")
        
        overall_success = test1_passed and test2_passed and test3_passed
        print(f"\nOverall Result: {'✓ ALL TESTS PASSED' if overall_success else '✗ SOME TESTS FAILED'}")
        
        if overall_success:
            print("\n🎉 Blocker identification and recommendation logic is working correctly!")
            print("Requirements 6.1 and 6.4 have been successfully implemented.")
        else:
            print("\n⚠ Some functionality needs attention. Review the failed tests above.")
        
        return overall_success
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)