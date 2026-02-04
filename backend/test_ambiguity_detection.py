#!/usr/bin/env python3
"""
Test script for ambiguity detection and follow-up question logic
Tests the new functionality added to AIGuidanceService
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.ai_guidance_service import AIGuidanceService
from models.ai_guidance import GuidanceRequest, ProjectContext, Task, Milestone, TaskStatus, TaskPriority


async def test_ambiguity_detection():
    """Test the ambiguity detection functionality"""
    print("🧪 Testing Ambiguity Detection and Follow-up Question Logic")
    print("=" * 60)
    
    # Initialize the service
    service = AIGuidanceService()
    
    # Create a sample project context
    project_context = ProjectContext(
        project_id="550e8400-e29b-41d4-a716-446655440000",  # Valid UUID format
        title="Smart Home IoT System",
        description="Building an IoT system for home automation",
        goals=["Implement sensor network", "Create mobile app", "Set up cloud backend"],
        current_phase="Development",
        tasks=[
            Task(
                title="Install temperature sensors",
                description="Set up temperature monitoring in all rooms",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.HIGH
            ),
            Task(
                title="Develop mobile interface",
                description="Create user-friendly mobile app",
                status=TaskStatus.PENDING,
                priority=TaskPriority.MEDIUM
            )
        ],
        milestones=[
            Milestone(
                title="Sensor Network Complete",
                description="All sensors installed and connected",
                target_date=datetime.now(timezone.utc),
                completed=False
            )
        ],
        progress=35.0
    )
    
    # Test cases with different levels of ambiguity
    test_cases = [
        {
            "name": "Clear, specific question",
            "message": "How do I configure the temperature sensor calibration settings for the DHT22 sensors in my smart home system?",
            "expected_ambiguous": False
        },
        {
            "name": "Vague question with pronouns",
            "message": "Help me with this",
            "expected_ambiguous": True
        },
        {
            "name": "Short unclear question",
            "message": "What next?",
            "expected_ambiguous": True
        },
        {
            "name": "Multiple topics mentioned",
            "message": "I need help with sensors and also the mobile app and maybe the backend too",
            "expected_ambiguous": True
        },
        {
            "name": "Project-related but lacks specifics",
            "message": "I'm having issues with my project tasks",
            "expected_ambiguous": True
        },
        {
            "name": "Moderately specific question",
            "message": "What sensors should I use for temperature monitoring in my IoT project?",
            "expected_ambiguous": False
        }
    ]
    
    print(f"Testing {len(test_cases)} different query types...\n")
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['name']}")
        print(f"Query: \"{test_case['message']}\"")
        
        try:
            # Analyze query ambiguity
            analysis = await service.analyzeQueryAmbiguity(
                test_case['message'],
                project_context,
                []  # Empty conversation history
            )
            
            print(f"Ambiguous: {analysis.is_ambiguous} (score: {analysis.ambiguity_score:.2f})")
            print(f"Expected: {test_case['expected_ambiguous']}")
            
            if analysis.ambiguous_aspects:
                print(f"Ambiguous aspects: {', '.join(analysis.ambiguous_aspects)}")
            
            if analysis.follow_up_questions:
                print("Follow-up questions:")
                for j, question in enumerate(analysis.follow_up_questions, 1):
                    print(f"  {j}. {question}")
            
            # Test full guidance response
            request = GuidanceRequest(
                project_id=project_context.project_id,
                user_message=test_case['message'],
                conversation_history=[]
            )
            
            response = await service.generateResponse(request)
            
            print(f"Requires clarification: {response.requires_clarification}")
            print(f"Response preview: {response.response[:100]}...")
            
            # Verify expectations
            if analysis.is_ambiguous == test_case['expected_ambiguous']:
                print("✅ Ambiguity detection correct")
            else:
                print("❌ Ambiguity detection incorrect")
            
        except Exception as e:
            print(f"❌ Error testing case: {e}")
        
        print("-" * 40)
    
    print("\n🎯 Testing clarification request generation...")
    
    # Test clarification request generation
    try:
        vague_message = "I need help"
        analysis = await service.analyzeQueryAmbiguity(vague_message, project_context, [])
        
        if analysis.is_ambiguous:
            clarification = await service.generateClarificationRequest(
                vague_message, analysis, project_context
            )
            
            print(f"Original query: \"{clarification.original_query}\"")
            print(f"Clarification prompt: {clarification.clarification_prompt}")
            print(f"Suggested questions: {len(clarification.suggested_questions)}")
            
            for question in clarification.suggested_questions:
                print(f"  - {question.question} (category: {question.category}, priority: {question.priority})")
            
            print("✅ Clarification request generation working")
        else:
            print("❌ Expected ambiguous query but got clear result")
            
    except Exception as e:
        print(f"❌ Error testing clarification generation: {e}")
    
    print("\n🏁 Ambiguity detection testing complete!")


if __name__ == "__main__":
    asyncio.run(test_ambiguity_detection())