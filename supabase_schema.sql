-- STEM Idea Generator - Supabase Database Schema
-- Run these commands in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create components table with detailed specifications
CREATE TABLE IF NOT EXISTS public.components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    in_stock BOOLEAN DEFAULT true,
    stock_count INTEGER DEFAULT 0,
    manufacturer VARCHAR(255),
    model_number VARCHAR(100),
    datasheet_url TEXT,
    image_url TEXT,
    specifications JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    dimensions JSONB DEFAULT '{}', -- {width, height, depth, unit}
    weight DECIMAL(8,3), -- in grams
    operating_voltage_min DECIMAL(5,2),
    operating_voltage_max DECIMAL(5,2),
    operating_current DECIMAL(8,3), -- in mA
    power_consumption DECIMAL(8,3), -- in watts
    interface_type VARCHAR(100), -- I2C, SPI, UART, Digital, Analog, etc.
    pin_count INTEGER,
    package_type VARCHAR(50), -- DIP, SMD, Module, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create component_reviews table for user reviews and ratings
CREATE TABLE IF NOT EXISTS public.component_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
    user_name VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    pros TEXT[],
    cons TEXT[],
    use_case TEXT,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create component_projects table to link components with projects
CREATE TABLE IF NOT EXISTS public.component_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_description TEXT,
    project_url TEXT,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
    estimated_time VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create component_alternatives table for similar/alternative components
CREATE TABLE IF NOT EXISTS public.component_alternatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
    alternative_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
    reason TEXT, -- Why this is an alternative
    compatibility_score INTEGER CHECK (compatibility_score >= 1 AND compatibility_score <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_components_category ON public.components(category);
CREATE INDEX IF NOT EXISTS idx_components_name ON public.components(name);
CREATE INDEX IF NOT EXISTS idx_components_in_stock ON public.components(in_stock);
CREATE INDEX IF NOT EXISTS idx_components_price ON public.components(price);
CREATE INDEX IF NOT EXISTS idx_component_reviews_component_id ON public.component_reviews(component_id);
CREATE INDEX IF NOT EXISTS idx_component_reviews_rating ON public.component_reviews(rating);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_components_updated_at 
    BEFORE UPDATE ON public.components 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_alternatives ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (no authentication required)
CREATE POLICY "Allow public read access on components" ON public.components
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on component_reviews" ON public.component_reviews
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on component_projects" ON public.component_projects
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on component_alternatives" ON public.component_alternatives
    FOR SELECT USING (true);

-- Create policies for public write access (for demo purposes - adjust as needed)
CREATE POLICY "Allow public insert on components" ON public.components
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on components" ON public.components
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on components" ON public.components
    FOR DELETE USING (true);

CREATE POLICY "Allow public insert on component_reviews" ON public.component_reviews
    FOR INSERT WITH CHECK (true);

-- Insert sample data
INSERT INTO public.components (
    name, category, description, price, currency, in_stock, stock_count,
    manufacturer, model_number, specifications, tags, dimensions,
    operating_voltage_min, operating_voltage_max, operating_current,
    interface_type, pin_count, package_type
) VALUES 
(
    'Arduino Uno R3',
    'Microcontrollers',
    'Popular microcontroller board based on ATmega328P, perfect for beginners and prototyping projects',
    25.00, 'USD', true, 150,
    'Arduino', 'A000066',
    '{"clock_speed": "16 MHz", "flash_memory": "32 KB", "sram": "2 KB", "eeprom": "1 KB", "digital_io_pins": "14", "analog_input_pins": "6", "pwm_pins": "6"}',
    ARRAY['arduino', 'microcontroller', 'beginner', 'popular', 'atmega328p'],
    '{"width": 68.6, "height": 53.4, "depth": 15, "unit": "mm"}',
    7.0, 12.0, 50.0,
    'USB/Serial', 30, 'DIP'
),
(
    'Arduino Mega 2560',
    'Microcontrollers',
    'High-capacity Arduino board with more I/O pins and memory for complex projects',
    45.00, 'USD', true, 75,
    'Arduino', 'A000067',
    '{"clock_speed": "16 MHz", "flash_memory": "256 KB", "sram": "8 KB", "eeprom": "4 KB", "digital_io_pins": "54", "analog_input_pins": "16", "pwm_pins": "15"}',
    ARRAY['arduino', 'microcontroller', 'advanced', 'atmega2560', 'high-capacity'],
    '{"width": 101.52, "height": 53.3, "depth": 15, "unit": "mm"}',
    7.0, 12.0, 80.0,
    'USB/Serial', 86, 'DIP'
),
(
    'Arduino Nano',
    'Microcontrollers',
    'Compact Arduino board ideal for breadboard projects and space-constrained applications',
    15.00, 'USD', true, 200,
    'Arduino', 'A000005',
    '{"clock_speed": "16 MHz", "flash_memory": "32 KB", "sram": "2 KB", "eeprom": "1 KB", "digital_io_pins": "14", "analog_input_pins": "8", "pwm_pins": "6"}',
    ARRAY['arduino', 'microcontroller', 'compact', 'breadboard', 'atmega328p'],
    '{"width": 18, "height": 45, "depth": 15, "unit": "mm"}',
    7.0, 12.0, 40.0,
    'USB/Serial', 30, 'DIP'
),
(
    'ESP32 DevKit V1',
    'Microcontrollers',
    'Powerful WiFi and Bluetooth enabled microcontroller for IoT projects',
    12.00, 'USD', true, 120,
    'Espressif', 'ESP32-WROOM-32',
    '{"clock_speed": "240 MHz", "flash_memory": "4 MB", "sram": "520 KB", "wifi": "802.11 b/g/n", "bluetooth": "4.2", "digital_io_pins": "34", "analog_input_pins": "18", "pwm_pins": "16"}',
    ARRAY['esp32', 'wifi', 'bluetooth', 'iot', 'wireless', 'dual-core'],
    '{"width": 25.4, "height": 55, "depth": 15, "unit": "mm"}',
    3.0, 3.6, 160.0,
    'WiFi/Bluetooth/SPI/I2C', 38, 'Module'
),
(
    'Raspberry Pi 4 Model B',
    'Single Board Computers',
    'Powerful single-board computer with quad-core ARM processor, perfect for advanced projects',
    75.00, 'USD', true, 50,
    'Raspberry Pi Foundation', 'RPI4-MODBP-4GB',
    '{"processor": "Quad-core ARM Cortex-A72", "clock_speed": "1.5 GHz", "ram": "4 GB", "storage": "microSD", "usb_ports": "4x USB 3.0", "ethernet": "Gigabit", "wifi": "802.11ac", "bluetooth": "5.0"}',
    ARRAY['raspberry-pi', 'linux', 'sbc', 'advanced', 'quad-core', 'wifi'],
    '{"width": 85, "height": 56, "depth": 17, "unit": "mm"}',
    5.0, 5.0, 1200.0,
    'GPIO/USB/Ethernet/WiFi', 40, 'SBC'
),
(
    'DHT22 Temperature Humidity Sensor',
    'Sensors',
    'Digital temperature and humidity sensor with high accuracy and reliability',
    8.50, 'USD', true, 300,
    'Aosong', 'AM2302',
    '{"temperature_range": "-40 to 80°C", "humidity_range": "0 to 100% RH", "temperature_accuracy": "±0.5°C", "humidity_accuracy": "±2% RH", "resolution": "0.1°C, 0.1% RH", "response_time": "2s"}',
    ARRAY['dht22', 'temperature', 'humidity', 'digital', 'environmental'],
    '{"width": 14, "height": 18, "depth": 5.5, "unit": "mm"}',
    3.3, 6.0, 2.5,
    'Digital (One-Wire)', 4, 'Module'
),
(
    'HC-SR04 Ultrasonic Sensor',
    'Sensors',
    'Ultrasonic distance sensor for measuring distances from 2cm to 400cm',
    3.50, 'USD', true, 250,
    'Generic', 'HC-SR04',
    '{"range": "2cm to 400cm", "accuracy": "3mm", "measuring_angle": "15°", "frequency": "40 kHz", "trigger_pulse": "10µs TTL", "echo_pulse": "150µs to 25ms TTL"}',
    ARRAY['ultrasonic', 'distance', 'sensor', 'hc-sr04', 'ranging'],
    '{"width": 45, "height": 20, "depth": 15, "unit": "mm"}',
    5.0, 5.0, 15.0,
    'Digital', 4, 'Module'
),
(
    'L298N Motor Driver',
    'Motor Controllers',
    'Dual H-bridge motor driver for controlling DC motors and stepper motors',
    6.00, 'USD', true, 180,
    'STMicroelectronics', 'L298N',
    '{"channels": "2", "max_voltage": "46V", "max_current": "2A per channel", "logic_voltage": "5V", "pwm_frequency": "up to 40kHz", "protection": "Over-temperature, Over-current"}',
    ARRAY['motor-driver', 'h-bridge', 'l298n', 'robotics', 'dc-motor'],
    '{"width": 43, "height": 43, "depth": 27, "unit": "mm"}',
    5.0, 35.0, 36.0,
    'Digital/PWM', 15, 'Module'
),
(
    'SG90 Micro Servo Motor',
    'Actuators',
    'Small and lightweight servo motor perfect for robotics and automation projects',
    4.50, 'USD', true, 400,
    'TowerPro', 'SG90',
    '{"torque": "1.8 kg⋅cm", "speed": "0.1s/60°", "rotation": "180°", "control_signal": "PWM", "pulse_width": "1ms to 2ms", "frequency": "50Hz"}',
    ARRAY['servo', 'motor', 'sg90', 'robotics', 'micro', 'pwm'],
    '{"width": 22.2, "height": 11.5, "depth": 31, "unit": "mm"}',
    4.8, 6.0, 100.0,
    'PWM', 3, 'Motor'
),
(
    'ESP8266 NodeMCU',
    'Development Boards',
    'WiFi development board based on ESP8266 with built-in USB and breadboard-friendly design',
    8.00, 'USD', true, 150,
    'Espressif', 'ESP8266-12E',
    '{"clock_speed": "80 MHz", "flash_memory": "4 MB", "sram": "128 KB", "wifi": "802.11 b/g/n", "digital_io_pins": "17", "analog_input_pins": "1", "pwm_pins": "17"}',
    ARRAY['esp8266', 'nodemcu', 'wifi', 'iot', 'development-board'],
    '{"width": 25.4, "height": 48.26, "depth": 12, "unit": "mm"}',
    3.3, 3.3, 80.0,
    'WiFi/SPI/I2C/UART', 30, 'Development Board'
);

-- Insert sample reviews
INSERT INTO public.component_reviews (
    component_id, user_name, rating, review_text, pros, cons, use_case, difficulty_level
) VALUES 
(
    (SELECT id FROM public.components WHERE name = 'Arduino Uno R3' LIMIT 1),
    'MakerMike',
    5,
    'Perfect board for beginners! Great documentation and community support.',
    ARRAY['Beginner-friendly', 'Excellent documentation', 'Large community', 'Stable and reliable'],
    ARRAY['Limited memory for complex projects', 'No built-in WiFi'],
    'Learning electronics and programming basics',
    'Beginner'
),
(
    (SELECT id FROM public.components WHERE name = 'ESP32 DevKit V1' LIMIT 1),
    'IoTEnthusiast',
    5,
    'Amazing value for money! WiFi and Bluetooth built-in make it perfect for IoT projects.',
    ARRAY['Built-in WiFi and Bluetooth', 'Powerful dual-core processor', 'Great for IoT', 'Good price'],
    ARRAY['More complex than Arduino for beginners', 'Higher power consumption'],
    'Smart home automation and IoT sensors',
    'Intermediate'
),
(
    (SELECT id FROM public.components WHERE name = 'DHT22 Temperature Humidity Sensor' LIMIT 1),
    'WeatherStation',
    4,
    'Reliable sensor with good accuracy. Easy to use with Arduino libraries.',
    ARRAY['High accuracy', 'Digital output', 'Good libraries available', 'Reliable'],
    ARRAY['Slower response time', 'Only one sensor per pin without multiplexing'],
    'Environmental monitoring and weather stations',
    'Beginner'
);

-- Insert sample projects
INSERT INTO public.component_projects (
    component_id, project_name, project_description, difficulty_level, estimated_time
) VALUES 
(
    (SELECT id FROM public.components WHERE name = 'Arduino Uno R3' LIMIT 1),
    'LED Blink Tutorial',
    'Learn the basics of Arduino programming by making an LED blink',
    'Beginner',
    '30 minutes'
),
(
    (SELECT id FROM public.components WHERE name = 'Arduino Uno R3' LIMIT 1),
    'Temperature Monitor',
    'Build a temperature monitoring system with LCD display',
    'Intermediate',
    '2 hours'
),
(
    (SELECT id FROM public.components WHERE name = 'ESP32 DevKit V1' LIMIT 1),
    'WiFi Weather Station',
    'Create a WiFi-enabled weather station that sends data to the cloud',
    'Advanced',
    '1 week'
),
(
    (SELECT id FROM public.components WHERE name = 'HC-SR04 Ultrasonic Sensor' LIMIT 1),
    'Parking Sensor',
    'Build an ultrasonic parking distance sensor with buzzer alerts',
    'Intermediate',
    '3 hours'
),
(
    (SELECT id FROM public.components WHERE name = 'SG90 Micro Servo Motor' LIMIT 1),
    'Robotic Arm',
    'Create a simple 2-DOF robotic arm controlled by potentiometers',
    'Advanced',
    '1 week'
);

-- Insert component alternatives
INSERT INTO public.component_alternatives (
    component_id, alternative_id, reason, compatibility_score
) VALUES 
(
    (SELECT id FROM public.components WHERE name = 'Arduino Uno R3' LIMIT 1),
    (SELECT id FROM public.components WHERE name = 'Arduino Nano' LIMIT 1),
    'Smaller form factor, same functionality',
    9
),
(
    (SELECT id FROM public.components WHERE name = 'Arduino Mega 2560' LIMIT 1),
    (SELECT id FROM public.components WHERE name = 'Arduino Uno R3' LIMIT 1),
    'Simpler option with fewer I/O pins',
    7
),
(
    (SELECT id FROM public.components WHERE name = 'ESP8266 NodeMCU' LIMIT 1),
    (SELECT id FROM public.components WHERE name = 'ESP32 DevKit V1' LIMIT 1),
    'More powerful with Bluetooth support',
    8
);

-- Create a view for component details with aggregated data
CREATE OR REPLACE VIEW component_details_view AS
SELECT 
    c.*,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as review_count,
    COUNT(p.id) as project_count,
    COUNT(a.alternative_id) as alternative_count
FROM public.components c
LEFT JOIN public.component_reviews r ON c.id = r.component_id
LEFT JOIN public.component_projects p ON c.id = p.component_id
LEFT JOIN public.component_alternatives a ON c.id = a.component_id
GROUP BY c.id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create function to get component details with related data
CREATE OR REPLACE FUNCTION get_component_details(component_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'component', row_to_json(c),
        'reviews', COALESCE(reviews.reviews, '[]'::json),
        'projects', COALESCE(projects.projects, '[]'::json),
        'alternatives', COALESCE(alternatives.alternatives, '[]'::json),
        'stats', json_build_object(
            'average_rating', COALESCE(AVG(r.rating), 0),
            'review_count', COUNT(DISTINCT r.id),
            'project_count', COUNT(DISTINCT p.id),
            'alternative_count', COUNT(DISTINCT a.id)
        )
    ) INTO result
    FROM public.components c
    LEFT JOIN public.component_reviews r ON c.id = r.component_id
    LEFT JOIN public.component_projects p ON c.id = p.component_id
    LEFT JOIN public.component_alternatives a ON c.id = a.component_id
    LEFT JOIN LATERAL (
        SELECT json_agg(row_to_json(rev)) as reviews
        FROM public.component_reviews rev
        WHERE rev.component_id = c.id
    ) reviews ON true
    LEFT JOIN LATERAL (
        SELECT json_agg(row_to_json(proj)) as projects
        FROM public.component_projects proj
        WHERE proj.component_id = c.id
    ) projects ON true
    LEFT JOIN LATERAL (
        SELECT json_agg(
            json_build_object(
                'id', alt_comp.id,
                'name', alt_comp.name,
                'reason', alt.reason,
                'compatibility_score', alt.compatibility_score
            )
        ) as alternatives
        FROM public.component_alternatives alt
        JOIN public.components alt_comp ON alt.alternative_id = alt_comp.id
        WHERE alt.component_id = c.id
    ) alternatives ON true
    WHERE c.id = component_uuid
    GROUP BY c.id, reviews.reviews, projects.projects, alternatives.alternatives;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT get_component_details('your-component-uuid-here');

COMMIT;