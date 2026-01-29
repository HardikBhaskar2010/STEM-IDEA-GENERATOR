/**
 * API Service - Handles all backend API calls
 */

// Get the API base URL from environment variables
const getApiBaseUrl = () => {
  let baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://perfection-v2.onrender.com/api';
  
  // Ensure baseUrl ends with /api for production
  if (baseUrl && !baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/$/, '') + '/api';
  }
  
  return baseUrl;
};

const FINAL_API_BASE_URL = getApiBaseUrl();

/**
 * Generic API fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Use absolute URL if provided, otherwise relative to current origin (handled by Vite proxy in dev)
  const url = endpoint.startsWith('http') ? endpoint : `${FINAL_API_BASE_URL}${endpoint}`;
  
  // Debug log for troubleshooting
  if (!endpoint.startsWith('http')) {
    console.log(`🔍 API Call: ${endpoint} → ${url}`);
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Health check - Test if backend is reachable
 */
export async function healthCheck(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/health');
}

/**
 * Generate STEM Project based on user parameters
 * 
 * @param params Project generation parameters
 * @returns Generated project details
 */
export interface ProjectParams {
  projectType: string;
  skillLevel: string;
  interests: string;
  budget: string;
  duration: string;
}

export interface GeneratedProject {
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  estimatedCost: string;
  components: string[];
  skills: string[];
  steps: string[];
}

/**
 * Main project generation entry point.
 * Now strictly calls the backend API which handles the AI logic securely.
 */
export async function generateProject(params: ProjectParams): Promise<GeneratedProject> {
  console.log('🚀 Project Generation Request to Backend:', { 
    type: params.projectType, 
    level: params.skillLevel
  });

  try {
    // Call the real backend API which now handles Gemini AI
    const project = await apiFetch<GeneratedProject>('/generate-project', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    
    console.log('✅ Project generated from backend:', project.title);
    return project;
    
  } catch (error) {
    console.error('❌ Backend API call failed, using local mock fallback:', error);
    
    // Fallback to client-side generation if backend fails completely
    return generateMockProject(params);
  }
}

/**
 * Fallback mock generation if backend API fails
 * This ensures the app still works even if backend is down
 */
function generateMockProject(params: ProjectParams): Promise<GeneratedProject> {
  console.log('⚠️ Using fallback mock generation');
  
  // Project-specific component mappings (matching backend logic)
  const componentMappings: Record<string, Record<string, string[]>> = {
    robotics: {
      'Beginner': ['Arduino Uno', 'DC Motors (2x)', 'Motor Driver L298N', 'Ultrasonic Sensor HC-SR04', 'Chassis Kit', 'Wheels (4x)', 'Battery Pack 9V', 'Jumper Wires'],
      'Intermediate': ['Arduino Mega', 'Servo Motors (2x)', 'Stepper Motors', 'IMU Sensor MPU6050', 'Camera Module', 'Bluetooth Module HC-05', 'Custom Chassis', 'LiPo Battery'],
      'Advanced': ['Raspberry Pi 4', 'LIDAR Sensor', 'Encoders', 'ROS Compatible Hardware', 'AI Processing Unit', 'Advanced Sensors Suite', 'Custom PCB', 'High-Capacity Battery'],
      'Expert': ['NVIDIA Jetson', 'Computer Vision Cameras', 'Advanced SLAM Sensors', 'Custom Actuators', 'Machine Learning Hardware', 'Professional Grade Components', 'Custom Manufacturing']
    },
    iot: {
      'Beginner': ['ESP32 Development Board', 'DHT22 Temperature Sensor', 'LED Indicators', 'Breadboard', 'Resistors Kit', 'WiFi Router', 'Mobile App Platform', 'Cloud Service Account'],
      'Intermediate': ['NodeMCU ESP8266', 'Multiple Sensors Suite', 'OLED Display', 'Relay Modules', 'MQTT Broker', 'Database Service', 'Custom Enclosure', 'Power Management'],
      'Advanced': ['ESP32-CAM', 'LoRaWAN Modules', 'Edge Computing Unit', 'Industrial Sensors', 'Mesh Network Hardware', 'Advanced Analytics Platform', 'Solar Power System'],
      'Expert': ['Custom IoT Gateway', 'AI Edge Processors', 'Industrial IoT Protocols', 'Enterprise Cloud Platform', 'Advanced Security Hardware', 'Scalable Infrastructure']
    },
    electronics: {
      'Beginner': ['Arduino Nano', 'LED Matrix 8x8', 'Resistors (220Ω, 1kΩ)', 'Capacitors (100µF)', 'Breadboard', 'LCD Display 16x2', 'Push Buttons', 'Battery Holder'],
      'Intermediate': ['Microcontroller ATmega328P', 'Op-Amps LM358', 'Transistors (NPN, PNP)', 'Voltage Regulators', 'PCB Board', 'Oscilloscope Probes', 'Function Generator'],
      'Advanced': ['FPGA Development Board', 'High-Speed ADC/DAC', 'RF Modules', 'Custom IC Design Tools', 'Professional PCB Fabrication', 'Signal Analyzers'],
      'Expert': ['Custom ASIC Design', 'High-Frequency Components', 'Professional Test Equipment', 'Advanced Simulation Software', 'Cleanroom Fabrication Access']
    },
    automation: {
      'Beginner': ['Arduino Uno', 'Relay Modules (4-channel)', 'PIR Motion Sensor', 'Light Dependent Resistor', 'Solenoid Valve', 'Timer Modules', 'Power Supply 12V', 'Control Panel'],
      'Intermediate': ['PLC Controller', 'Industrial Relays', 'Proximity Sensors', 'Pneumatic Actuators', 'HMI Touch Screen', 'Variable Frequency Drive', 'Industrial Enclosure'],
      'Advanced': ['SCADA System', 'Industrial IoT Gateway', 'Advanced PLC', 'Servo Control Systems', 'Vision Inspection System', 'Robotic Arms', 'Safety Systems'],
      'Expert': ['Distributed Control System', 'AI-Powered Automation', 'Industrial Robotics', 'Advanced Process Control', 'Enterprise Integration', 'Custom Automation Solutions']
    },
    sensors: {
      'Beginner': ['Arduino Uno', 'Temperature Sensor DS18B20', 'Humidity Sensor DHT11', 'Light Sensor LDR', 'SD Card Module', 'RTC Module', 'LCD Display', 'Data Logger Shield'],
      'Intermediate': ['Data Acquisition System', 'Pressure Sensors', 'Gas Sensors MQ Series', 'Accelerometer ADXL345', 'Wireless Transmission', 'Database Storage', 'Calibration Standards'],
      'Advanced': ['High-Precision Sensors', 'Multi-Channel DAQ', 'Industrial Protocols', 'Edge Computing', 'Machine Learning Processing', 'Professional Calibration Equipment'],
      'Expert': ['Research-Grade Instruments', 'Custom Sensor Development', 'Advanced Signal Processing', 'Metrology Standards', 'Publication-Quality Data Systems']
    }
  };

  // Project-specific skills
  const skillMappings: Record<string, string[]> = {
    robotics: ['Robot mechanics', 'Motor control', 'Sensor integration', 'Path planning', 'Programming in C++/Python'],
    iot: ['IoT protocols (MQTT/HTTP)', 'WiFi connectivity', 'Cloud integration', 'Data visualization', 'Mobile app development'],
    electronics: ['Circuit design', 'Component selection', 'PCB layout', 'Signal analysis', 'Embedded programming'],
    automation: ['Control systems', 'PLC programming', 'Industrial protocols', 'Safety systems', 'Process optimization'],
    sensors: ['Sensor calibration', 'Data acquisition', 'Signal processing', 'Statistical analysis', 'Measurement uncertainty']
  };

  // Project titles by type
  const titleMappings: Record<string, string[]> = {
    robotics: ['Autonomous Line Following Robot', 'Obstacle Avoiding Smart Car', 'Bluetooth Controlled Robot', 'Gesture Controlled Robot Arm'],
    iot: ['Smart Home Weather Station', 'IoT Plant Monitoring System', 'WiFi-Based Home Automation', 'Real-time Air Quality Monitor'],
    electronics: ['LED Music Visualizer', 'Digital Thermometer with Display', 'Battery Capacity Tester', 'Mini Oscilloscope'],
    automation: ['Smart Light Control System', 'Automated Garden Watering', 'Motion-Activated Security', 'Temperature-Based Fan Controller'],
    sensors: ['Environmental Monitoring Station', 'Multi-Sensor Data Logger', 'Smart Air Quality Detector', 'Weather Prediction System']
  };

  // Get project type and skill level
  const projectType = params.projectType.toLowerCase();
  const skillLevel = params.skillLevel || 'Beginner';
  
  // Get project-specific data or fallback to electronics
  const projectComponents = componentMappings[projectType] || componentMappings.electronics;
  const components = projectComponents[skillLevel] || projectComponents.Beginner;
  
  const skills = skillMappings[projectType] || skillMappings.electronics;
  const titles = titleMappings[projectType] || titleMappings.electronics;
  
  // Select title (random or based on interests)
  const titleIndex = Math.floor(Math.random() * titles.length);
  const title = titles[titleIndex];
  
  // Time estimates by skill level
  const timeEstimates: Record<string, string> = {
    Beginner: '1-2 weeks',
    Intermediate: '2-4 weeks',
    Advanced: '4-6 weeks', 
    Expert: '6-10 weeks'
  };
  
  // Cost estimates by skill level and project type
  const costEstimates: Record<string, Record<string, string>> = {
    robotics: { Beginner: '$40-60', Intermediate: '$60-90', Advanced: '$90-150', Expert: '$150-250' },
    iot: { Beginner: '$30-50', Intermediate: '$50-80', Advanced: '$80-130', Expert: '$130-200' },
    electronics: { Beginner: '$25-45', Intermediate: '$45-70', Advanced: '$70-120', Expert: '$120-180' },
    automation: { Beginner: '$35-55', Intermediate: '$55-85', Advanced: '$85-140', Expert: '$140-220' },
    sensors: { Beginner: '$30-50', Intermediate: '$50-75', Advanced: '$75-110', Expert: '$110-170' }
  };
  
  // Build description
  let description = `A ${skillLevel.toLowerCase()}-level ${projectType} project that combines practical electronics with real-world applications. `;
  if (params.interests) {
    description += `Designed around your interest in ${params.interests}. `;
  }
  description += `Perfect for learning ${projectType} fundamentals while building something useful.`;
  
  // Build step-by-step guide
  const steps = [
    `Research ${projectType} project requirements and best practices`,
    'Create detailed project plan and component list',
    'Order required components and materials',
    'Set up development environment and tools',
    'Build and test individual components',
    'Integrate components into complete system',
    'Test functionality and debug issues',
    'Optimize performance and add features',
    'Create comprehensive project documentation',
    'Present and demonstrate final project'
  ];
  
  // Determine cost and time
  const projectCosts = costEstimates[projectType] || costEstimates.electronics;
  const cost = params.budget || projectCosts[skillLevel] || '$50-80';
  const time = params.duration || timeEstimates[skillLevel] || '2-3 weeks';
  
  // Enhanced skills list
  const enhancedSkills = [...skills, 'Problem solving', 'Project documentation'];
  
  // Simulate API delay (realistic)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        title,
        description,
        difficulty: skillLevel,
        estimatedTime: time,
        estimatedCost: cost,
        components,
        skills: enhancedSkills,
        steps
      });
      console.log('✅ Project generated successfully with project-specific components');
    }, 2000); // 2 second delay to simulate API call
  });
}

/**
 * Create status check (existing endpoint on your Render backend)
 */
export interface StatusCheckCreate {
  client_name: string;
}

export interface StatusCheck {
  id: string;
  client_name: string;
  timestamp: string;
}

export async function createStatusCheck(data: StatusCheckCreate): Promise<StatusCheck> {
  return apiFetch<StatusCheck>('/status', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all status checks
 */
export async function getStatusChecks(): Promise<StatusCheck[]> {
  return apiFetch<StatusCheck[]>('/status');
}

export default {
  healthCheck,
  generateProject,
  createStatusCheck,
  getStatusChecks,
};
