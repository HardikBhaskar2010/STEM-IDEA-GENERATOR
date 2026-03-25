/**
 * globePins.ts
 * Rich node data for STEM hubs on the globe.
 */

export interface GlobePin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  region: string;
  category: string;
  description: string;
  highlights: string[];
  accent: string;           // neon accent / border / glow tint
  connectsTo?: string[];
}

export const GLOBE_PINS: GlobePin[] = [
  {
    id: 'delhi',
    lat: 28.6139,
    lng: 77.209,
    name: 'Delhi Node',
    region: 'South Asia',
    category: 'STEM Innovation Hub',
    description: 'A central hub for STEM learning, maker projects, and future-ready experimentation.',
    highlights: ['Arduino', 'AI Labs', 'Smart Systems'],
    accent: '#22d3ee',
    connectsTo: ['san-francisco', 'berlin'],
  },
  {
    id: 'bangalore',
    lat: 12.9716,
    lng: 77.5946,
    name: 'Bangalore Node',
    region: 'India Tech Belt',
    category: 'Robotics & AI',
    description: 'A high-energy zone for robotics, machine learning, and rapid prototyping.',
    highlights: ['Robotics', 'ML', 'Prototyping'],
    accent: '#8b5cf6',
    connectsTo: ['singapore', 'delhi'],
  },
  {
    id: 'singapore',
    lat: 1.3521,
    lng: 103.8198,
    name: 'Singapore Node',
    region: 'Southeast Asia',
    category: 'Applied Science Lab',
    description: 'A precision-focused node exploring clean tech, automation, and smart city systems.',
    highlights: ['Clean Tech', 'Automation', 'Smart Cities'],
    accent: '#34d399',
    connectsTo: ['tokyo', 'bangalore'],
  },
  {
    id: 'tokyo',
    lat: 35.6762,
    lng: 139.6503,
    name: 'Tokyo Node',
    region: 'East Asia',
    category: 'Advanced Tech Cluster',
    description: 'A futuristic node for hardware innovation, sensors, and next-gen product design.',
    highlights: ['Hardware', 'Sensors', 'Design'],
    accent: '#60a5fa',
    connectsTo: ['singapore', 'san-francisco'],
  },
  {
    id: 'berlin',
    lat: 52.52,
    lng: 13.405,
    name: 'Berlin Node',
    region: 'Europe',
    category: 'Green Innovation Lab',
    description: 'A creative hub for sustainable engineering, climate tech, and energy systems.',
    highlights: ['Energy', 'Climate Tech', 'Sustainability'],
    accent: '#f59e0b',
    connectsTo: ['nairobi', 'delhi'],
  },
  {
    id: 'nairobi',
    lat: -1.2921,
    lng: 36.8219,
    name: 'Nairobi Node',
    region: 'Africa',
    category: 'Climate & Impact Hub',
    description: 'A bold node focused on impact-driven science, environment monitoring, and local innovation.',
    highlights: ['Climate', 'Impact', 'Monitoring'],
    accent: '#f472b6',
    connectsTo: ['berlin', 'sao-paulo'],
  },
  {
    id: 'san-francisco',
    lat: 37.7749,
    lng: -122.4194,
    name: 'SF Node',
    region: 'North America',
    category: 'AI Frontier',
    description: 'A frontier node for AI systems, software experimentation, and digital intelligence.',
    highlights: ['AI', 'Software', 'Research'],
    accent: '#a78bfa',
    connectsTo: ['tokyo', 'sao-paulo'],
  },
  {
    id: 'sao-paulo',
    lat: -23.5505,
    lng: -46.6333,
    name: 'São Paulo Node',
    region: 'South America',
    category: 'Maker & BioTech',
    description: 'A vibrant node for maker culture, biotech curiosity, and community-led innovation.',
    highlights: ['Maker', 'Biotech', 'Community'],
    accent: '#fb7185',
    connectsTo: ['nairobi', 'san-francisco'],
  },
];
