import type { ExperimentDef } from '@/store/useCircuitStore';

// ─── 2D Layout Convention ─────────────────────────────────────────────────────
// All positions are {x, y} in pixels, snapped to 40px grid.
// Arduino: x=80, y=80 (left anchor).
// Components fan right: resistors at x=360, passive/output at x=520-600.
// Parallel elements (e.g. 3 LEDs for traffic light) spaced 80px apart vertically.

export const EXPERIMENTS: ExperimentDef[] = [
  // ── 1. Arduino Blink ─────────────────────────────────────────────────────
  {
    id: 'blink',
    title: 'Arduino Blink',
    description: 'The classic "Hello World" of electronics. Blink an LED on and off using pin 13.',
    difficulty: 'Beginner',
    components: [
      { id: 'ard-1', type: 'arduino',  label: 'Arduino Uno',   position: { x: 80,  y: 80 }, rotation: 0 },
      { id: 'res-1', type: 'resistor', label: '220Ω Resistor', position: { x: 360, y: 160 }, rotation: 0 },
      { id: 'led-1', type: 'led',      label: 'Red LED',       position: { x: 520, y: 160 }, rotation: 0, isOn: false, brightness: 0, color: '#ff3333' },
    ],
    connections: [
      { id: 'w1', from: 'ard-1-d13',      to: 'res-1-pin1',     isLive: false },
      { id: 'w2', from: 'res-1-pin2',     to: 'led-1-anode',    isLive: false },
      { id: 'w3', from: 'led-1-cathode',  to: 'ard-1-gnd',      isLive: false },
    ],
    code: `// STEM Workshop - Blink Example
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);  // LED ON
  delay(1000);
  digitalWrite(13, LOW);   // LED OFF
  delay(1000);
}`,
    instructions: [
      'Connect the long leg (anode) of the LED to one end of the 220Ω resistor.',
      'Connect the other end of the resistor to digital pin 13 on the Arduino.',
      'Connect the short leg (cathode) of the LED to the GND pin on the Arduino.',
      'Upload the code and watch the LED blink every second!',
    ],
  },

  // ── 2. LED Toggle with Button ────────────────────────────────────────────
  {
    id: 'button-toggle',
    title: 'LED Toggle with Button',
    description: 'Use a push button to toggle an LED on and off. Introduces digital input reading.',
    difficulty: 'Beginner',
    components: [
      { id: 'ard-1', type: 'arduino',  label: 'Arduino Uno',   position: { x: 80,  y: 80  }, rotation: 0 },
      { id: 'btn-1', type: 'button',   label: 'Push Button',   position: { x: 360, y: 80  }, rotation: 0, buttonState: false },
      { id: 'res-1', type: 'resistor', label: '220Ω Resistor', position: { x: 360, y: 200 }, rotation: 0 },
      { id: 'led-1', type: 'led',      label: 'Green LED',     position: { x: 520, y: 200 }, rotation: 0, isOn: false, brightness: 0, color: '#33ff77' },
    ],
    connections: [
      { id: 'w1', from: 'ard-1-5v',      to: 'btn-1-leg1',     isLive: false },
      { id: 'w2', from: 'btn-1-leg2',    to: 'ard-1-d2',       isLive: false },
      { id: 'w3', from: 'ard-1-d13',     to: 'res-1-pin1',     isLive: false },
      { id: 'w4', from: 'res-1-pin2',    to: 'led-1-anode',    isLive: false },
      { id: 'w5', from: 'led-1-cathode', to: 'ard-1-gnd',      isLive: false },
    ],
    code: `// STEM Workshop - Button Toggle
const int buttonPin = 2;
const int ledPin = 13;
bool ledState = false;
bool lastButton = false;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  bool currentButton = (digitalRead(buttonPin) == LOW);
  if (currentButton && !lastButton) {
    ledState = !ledState;
    digitalWrite(ledPin, ledState ? HIGH : LOW);
  }
  lastButton = currentButton;
  delay(50);
}`,
    instructions: [
      'Connect one side of the button to the 5V pin of the Arduino.',
      'Connect the other side of the button to digital pin 2.',
      'Wire digital pin 13 through a 220Ω resistor to the LED anode (+).',
      'Connect the LED cathode (−) to GND.',
      'Press the button to toggle the LED!',
    ],
  },

  // ── 3. Traffic Light ─────────────────────────────────────────────────────
  {
    id: 'traffic-light',
    title: 'Traffic Light',
    description: 'Simulate a real traffic light with three LEDs cycling through red, yellow, and green.',
    difficulty: 'Beginner',
    components: [
      { id: 'ard-1',    type: 'arduino',  label: 'Arduino Uno',   position: { x: 80,  y: 160 }, rotation: 0 },
      { id: 'res-r',    type: 'resistor', label: '220Ω Resistor', position: { x: 360, y: 80  }, rotation: 0 },
      { id: 'res-y',    type: 'resistor', label: '220Ω Resistor', position: { x: 360, y: 160 }, rotation: 0 },
      { id: 'res-g',    type: 'resistor', label: '220Ω Resistor', position: { x: 360, y: 240 }, rotation: 0 },
      { id: 'led-red',  type: 'led', label: 'Red LED',    position: { x: 520, y: 80  }, rotation: 0, isOn: false, brightness: 0, color: '#ff2222' },
      { id: 'led-yellow', type: 'led', label: 'Yellow LED', position: { x: 520, y: 160 }, rotation: 0, isOn: false, brightness: 0, color: '#ffdd00' },
      { id: 'led-green',  type: 'led', label: 'Green LED',  position: { x: 520, y: 240 }, rotation: 0, isOn: false, brightness: 0, color: '#22ff55' },
    ],
    connections: [
      { id: 'w1', from: 'ard-1-d11',         to: 'res-r-pin1',         isLive: false },
      { id: 'w2', from: 'res-r-pin2',         to: 'led-red-anode',      isLive: false },
      { id: 'w3', from: 'led-red-cathode',    to: 'ard-1-gnd',          isLive: false },
      { id: 'w4', from: 'ard-1-d10',          to: 'res-y-pin1',         isLive: false },
      { id: 'w5', from: 'res-y-pin2',         to: 'led-yellow-anode',   isLive: false },
      { id: 'w6', from: 'led-yellow-cathode', to: 'ard-1-gnd',          isLive: false },
      { id: 'w7', from: 'ard-1-d9',           to: 'res-g-pin1',         isLive: false },
      { id: 'w8', from: 'res-g-pin2',         to: 'led-green-anode',    isLive: false },
      { id: 'w9', from: 'led-green-cathode',  to: 'ard-1-gnd',          isLive: false },
    ],
    code: `// STEM Workshop - Traffic Light
const int redPin    = 11;
const int yellowPin = 10;
const int greenPin  = 9;

void setup() {
  pinMode(redPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
}

void loop() {
  // Red - Stop
  digitalWrite(redPin, HIGH);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, LOW);
  delay(3000);

  // Yellow - Caution
  digitalWrite(redPin, LOW);
  digitalWrite(yellowPin, HIGH);
  delay(1000);

  // Green - Go
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, HIGH);
  delay(3000);

  digitalWrite(greenPin, LOW);
}`,
    instructions: [
      'Connect digital pins 9, 10, 11 each through a 220Ω resistor.',
      'Connect the resistor outputs to LED anodes (green=9, yellow=10, red=11).',
      'Connect all LED cathodes to GND.',
      'Run the code and watch the traffic light cycle!',
    ],
  },

  // ── 4. Fading LED with Potentiometer ─────────────────────────────────────
  {
    id: 'fade-pot',
    title: 'Fading LED with Potentiometer',
    description: 'Control LED brightness with a potentiometer using PWM analog output.',
    difficulty: 'Beginner',
    components: [
      { id: 'ard-1', type: 'arduino',       label: 'Arduino Uno',   position: { x: 80,  y: 80 }, rotation: 0 },
      { id: 'pot-1', type: 'potentiometer', label: 'Potentiometer', position: { x: 80,  y: 280 }, rotation: 0, potValue: 512 },
      { id: 'res-1', type: 'resistor',      label: '220Ω Resistor', position: { x: 360, y: 160 }, rotation: 0 },
      { id: 'led-1', type: 'led',           label: 'Blue LED',      position: { x: 520, y: 160 }, rotation: 0, isOn: false, brightness: 0.5, color: '#3388ff' },
    ],
    connections: [
      { id: 'w1', from: 'ard-1-5v',      to: 'pot-1-vcc',     isLive: false },
      { id: 'w2', from: 'pot-1-gnd',     to: 'ard-1-gnd',     isLive: false },
      { id: 'w3', from: 'pot-1-wiper',   to: 'ard-1-a0',      isLive: false },
      { id: 'w4', from: 'ard-1-d9',      to: 'res-1-pin1',    isLive: false },
      { id: 'w5', from: 'res-1-pin2',    to: 'led-1-anode',   isLive: false },
      { id: 'w6', from: 'led-1-cathode', to: 'ard-1-gnd',     isLive: false },
    ],
    code: `// STEM Workshop - Fade LED with Potentiometer
const int potPin = A0;
const int ledPin = 9;  // Must be PWM pin (~)

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int potValue = analogRead(potPin);      // 0-1023
  int brightness = potValue / 4;          // 0-255 for PWM
  analogWrite(ledPin, brightness);
}`,
    instructions: [
      'Connect potentiometer: left pin → 5V, right pin → GND, middle wiper → A0.',
      'Connect pin 9 (PWM~) through a 220Ω resistor to the LED anode.',
      'Connect LED cathode to GND.',
      'Twist the potentiometer to control LED brightness smoothly!',
    ],
  },

  // ── 5. Light Sensor Night Light ───────────────────────────────────────────
  {
    id: 'ldr-night-light',
    title: 'Light Sensor Night Light',
    description: 'Automatically turn an LED on when it gets dark using an LDR (light-dependent resistor).',
    difficulty: 'Intermediate',
    components: [
      { id: 'ard-1', type: 'arduino',  label: 'Arduino Uno',    position: { x: 80,  y: 80  }, rotation: 0 },
      { id: 'ldr-1', type: 'ldr',      label: 'LDR Sensor',     position: { x: 80,  y: 280 }, rotation: 0, ldrValue: 512 },
      { id: 'res-1', type: 'resistor', label: '10kΩ Resistor',  position: { x: 280, y: 280 }, rotation: 0 },
      { id: 'res-2', type: 'resistor', label: '220Ω Resistor',  position: { x: 360, y: 160 }, rotation: 0 },
      { id: 'led-1', type: 'led',      label: 'White LED',      position: { x: 520, y: 160 }, rotation: 0, isOn: false, brightness: 0, color: '#ffffff' },
    ],
    connections: [
      { id: 'w1', from: 'ard-1-5v',      to: 'ldr-1-pin1',    isLive: false },
      { id: 'w2', from: 'ldr-1-pin2',    to: 'res-1-pin1',    isLive: false },
      { id: 'w3', from: 'res-1-pin2',    to: 'ard-1-gnd',     isLive: false },
      { id: 'w4', from: 'ldr-1-pin2',    to: 'ard-1-a0',      isLive: false },
      { id: 'w5', from: 'ard-1-d13',     to: 'res-2-pin1',    isLive: false },
      { id: 'w6', from: 'res-2-pin2',    to: 'led-1-anode',   isLive: false },
      { id: 'w7', from: 'led-1-cathode', to: 'ard-1-gnd',     isLive: false },
    ],
    code: `// STEM Workshop - Night Light with LDR
const int ldrPin = A0;
const int ledPin = 13;
const int threshold = 400;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(ldrPin);
  Serial.println(light);

  if (light < threshold) {
    digitalWrite(ledPin, HIGH);  // Dark → LED ON
  } else {
    digitalWrite(ledPin, LOW);   // Bright → LED OFF
  }
  delay(100);
}`,
    instructions: [
      'Build the voltage divider: 5V → LDR → junction → 10kΩ → GND.',
      'Connect the junction between LDR and resistor to analog pin A0.',
      'Wire pin 13 through a 220Ω resistor to the LED anode.',
      'Connect LED cathode to GND.',
      'Cover the LDR with your hand to simulate darkness — the LED turns on!',
    ],
  },

  // ── 6. Buzzer Alarm ───────────────────────────────────────────────────────
  {
    id: 'buzzer-alarm',
    title: 'Buzzer Alarm',
    description: 'Generate tones and alarms with a passive buzzer using the tone() function.',
    difficulty: 'Beginner',
    components: [
      { id: 'ard-1', type: 'arduino', label: 'Arduino Uno',    position: { x: 80,  y: 80 }, rotation: 0 },
      { id: 'buz-1', type: 'buzzer',  label: 'Passive Buzzer', position: { x: 400, y: 160 }, rotation: 0, isOn: false, buzzFreq: 440 },
    ],
    connections: [
      { id: 'w1', from: 'ard-1-d8',  to: 'buz-1-pos', isLive: false },
      { id: 'w2', from: 'buz-1-neg', to: 'ard-1-gnd', isLive: false },
    ],
    code: `// STEM Workshop - Buzzer Alarm
const int buzzerPin = 8;

void setup() {
  pinMode(buzzerPin, OUTPUT);
}

void loop() {
  // Ascending alarm
  for (int freq = 200; freq <= 2000; freq += 50) {
    tone(buzzerPin, freq, 20);
    delay(20);
  }

  // Siren pattern
  tone(buzzerPin, 1000, 500);
  delay(600);
  tone(buzzerPin, 1500, 500);
  delay(600);

  noTone(buzzerPin);
  delay(2000);
}`,
    instructions: [
      'Connect the positive pin (+) of the buzzer to digital pin 8.',
      'Connect the negative pin (−) of the buzzer to GND.',
      'Run the code — the buzzer plays an ascending alarm!',
      'Modify the frequency values to create your own melody.',
    ],
  },

  // ── 7. Servo Sweep ───────────────────────────────────────────────────────
  {
    id: 'servo-sweep',
    title: 'Servo Sweep',
    description: 'Control a servo motor to sweep back and forth 180°. Introduction to PWM motor control.',
    difficulty: 'Intermediate',
    components: [
      { id: 'ard-1', type: 'arduino', label: 'Arduino Uno', position: { x: 80,  y: 80 }, rotation: 0 },
      { id: 'srv-1', type: 'servo',   label: 'Servo Motor', position: { x: 400, y: 120 }, rotation: 0, servoAngle: 90 },
    ],
    connections: [
      { id: 'w1', from: 'ard-1-5v',  to: 'srv-1-vcc',    isLive: false },
      { id: 'w2', from: 'ard-1-gnd', to: 'srv-1-gnd',    isLive: false },
      { id: 'w3', from: 'ard-1-d9',  to: 'srv-1-signal', isLive: false },
    ],
    code: `// STEM Workshop - Servo Sweep
#include <Servo.h>

Servo myServo;
const int servoPin = 9;

void setup() {
  myServo.attach(servoPin);
}

void loop() {
  // Sweep from 0° to 180°
  for (int angle = 0; angle <= 180; angle++) {
    myServo.write(angle);
    delay(15);
  }

  // Sweep back from 180° to 0°
  for (int angle = 180; angle >= 0; angle--) {
    myServo.write(angle);
    delay(15);
  }
}`,
    instructions: [
      'Connect the red wire (VCC) of the servo to the 5V pin.',
      'Connect the brown wire (GND) to GND.',
      'Connect the orange/yellow wire (Signal) to digital pin 9 (PWM).',
      'Watch the servo arm sweep smoothly back and forth!',
    ],
  },
];

export const getExperimentById = (id: string) =>
  EXPERIMENTS.find((e) => e.id === id) ?? null;
