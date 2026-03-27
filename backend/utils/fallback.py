"""
Local fallback generators.

Used when AI services (OpenRouter) are unavailable.  These functions return
pre-built template responses so the application degrades gracefully rather
than returning errors.

Requirements: 27
"""

from typing import Any, Dict, List

# -----------------------------------------------------------------------
# Template data
# -----------------------------------------------------------------------

_SKILL_LEVELS = {
    "beginner": {
        "estimated_time": "2-4 hours",
        "estimated_cost": "$5 - $20",
        "difficulty": "Beginner",
    },
    "intermediate": {
        "estimated_time": "4-8 hours",
        "estimated_cost": "$15 - $50",
        "difficulty": "Intermediate",
    },
    "advanced": {
        "estimated_time": "8-24 hours",
        "estimated_cost": "$30 - $100",
        "difficulty": "Advanced",
    },
}

_PROJECT_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "robotics": {
        "title": "Line-Following Robot",
        "description": "Build an Arduino-based robot that follows a black line on a white surface using IR sensors.",
        "components": ["Arduino Uno", "IR sensors (x2)", "DC motors (x2)", "Motor driver L298N", "Robot chassis kit", "9V battery"],
        "skills": ["Electronics basics", "Programming in C++", "Circuit assembly", "Debugging"],
        "steps": [
            "Step 1: Assemble the chassis and attach the motors",
            "Step 2: Wire the IR sensors to Arduino digital pins",
            "Step 3: Connect the motors to the L298N motor driver",
            "Step 4: Upload the line-following algorithm",
            "Step 5: Calibrate sensor thresholds on a test track",
            "Step 6: Test and refine the robot's performance",
        ],
    },
    "electronics": {
        "title": "Digital Weather Station",
        "description": "Create a weather monitoring system that measures temperature, humidity, and air pressure.",
        "components": ["Arduino Nano", "DHT22 sensor", "BMP280 sensor", "OLED 128x64 display", "Breadboard", "Jumper wires"],
        "skills": ["Sensor integration", "I2C protocol", "Data display", "Environmental monitoring"],
        "steps": [
            "Step 1: Connect DHT22 sensor to Arduino",
            "Step 2: Connect BMP280 via I2C",
            "Step 3: Wire the OLED display",
            "Step 4: Install required libraries in Arduino IDE",
            "Step 5: Write code to read and display sensor values",
            "Step 6: Calibrate and test readings against a reference",
        ],
    },
    "programming": {
        "title": "STEM Quiz Game",
        "description": "Build an interactive web quiz application covering science, technology, engineering, and math topics.",
        "components": ["Computer with Python", "Flask or FastAPI", "HTML/CSS/JavaScript", "SQLite database"],
        "skills": ["Python programming", "Web development", "Database basics", "UI design"],
        "steps": [
            "Step 1: Set up Python virtual environment and install dependencies",
            "Step 2: Create the question database schema",
            "Step 3: Build the Flask/FastAPI backend with quiz endpoints",
            "Step 4: Design the HTML/CSS frontend",
            "Step 5: Implement JavaScript for dynamic quiz interaction",
            "Step 6: Add scoring, timer, and result display features",
        ],
    },
    "math": {
        "title": "Geometric Fractal Visualiser",
        "description": "Write a Python program to generate and visualise classic fractals like Mandelbrot and Julia sets.",
        "components": ["Computer with Python 3.8+", "NumPy library", "Matplotlib library", "Pillow library"],
        "skills": ["Complex number arithmetic", "Iteration logic", "Data visualisation", "Colour mapping"],
        "steps": [
            "Step 1: Install NumPy and Matplotlib",
            "Step 2: Implement the Mandelbrot iteration algorithm",
            "Step 3: Map iteration counts to colour gradients",
            "Step 4: Render and display the fractal",
            "Step 5: Add zoom and pan interactivity",
            "Step 6: Export high-resolution images",
        ],
    },
    "science": {
        "title": "Hydroponic Plant Growth Study",
        "description": "Design a controlled experiment comparing plant growth in soil vs. a nutrient solution.",
        "components": ["Seeds (lettuce or radish)", "Hydroponic net cups", "Nutrient solution", "Grow lights", "Ruler and notebook", "pH test strips"],
        "skills": ["Experimental design", "Data collection", "Scientific measurement", "Report writing"],
        "steps": [
            "Step 1: Germinate seeds in two separate trays (soil vs. hydroponic)",
            "Step 2: Set up consistent light and temperature conditions",
            "Step 3: Measure and record plant height every 2 days",
            "Step 4: Monitor pH of the nutrient solution weekly",
            "Step 5: Photograph plants at each measurement point",
            "Step 6: Analyse data and graph growth curves",
        ],
    },
}

_DEFAULT_TEMPLATE = {
    "title": "STEM Exploration Project",
    "description": "An exploratory STEM project that combines science, technology, engineering, and mathematics.",
    "components": ["Basic materials for the project", "Measuring tools", "Safety equipment", "Documentation materials"],
    "skills": ["Research and analysis", "Problem solving", "Data collection", "Presentation"],
    "steps": [
        "Step 1: Research the topic and define your problem statement",
        "Step 2: Gather required materials and tools",
        "Step 3: Design your experiment or build plan",
        "Step 4: Execute your project and record observations",
        "Step 5: Analyse results and identify patterns",
        "Step 6: Present your findings through a report or demonstration",
    ],
}


def local_generator(params: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a STEM project from local templates (no AI required).

    Picks the closest template based on ``projectType``, then applies
    skill-level-specific time / cost estimates.

    Args:
        params: Dict with ``projectType``, ``skillLevel``, ``interests``,
            ``budget``, and ``duration``.

    Returns:
        Dict conforming to the ``GeneratedProject`` schema.

    Requirements: 27
    """
    project_type = (params.get("projectType") or "").lower()
    skill_level = (params.get("skillLevel") or "intermediate").lower()

    template = _PROJECT_TEMPLATES.get(project_type, _DEFAULT_TEMPLATE)
    level_info = _SKILL_LEVELS.get(skill_level, _SKILL_LEVELS["intermediate"])

    return {
        "title": template["title"],
        "description": template["description"],
        "difficulty": level_info["difficulty"],
        "estimatedTime": level_info["estimated_time"],
        "estimatedCost": level_info["estimated_cost"],
        "components": template["components"],
        "skills": template["skills"],
        "steps": template["steps"],
        "fallback": True,
    }


def generate_practical_steps(
    topic: str,
    skill_level: str = "intermediate",
    num_steps: int = 6,
) -> List[str]:
    """Generate practical numbered steps for a given topic.

    Args:
        topic: The subject or project title.
        skill_level: One of ``"beginner"``, ``"intermediate"``, ``"advanced"``.
        num_steps: Number of steps to include.

    Returns:
        List of step strings.

    Requirements: 27
    """
    base_steps = [
        f"Step 1: Research {topic} and define your objectives",
        f"Step 2: Gather materials needed for {topic}",
        f"Step 3: Set up your {topic} workspace safely",
        f"Step 4: Follow the {topic} build or experiment plan",
        f"Step 5: Test and record observations for {topic}",
        f"Step 6: Analyse results and document your findings",
        f"Step 7: Present your {topic} project",
        f"Step 8: Reflect and identify improvements for {topic}",
    ]
    return base_steps[:num_steps]
