import { ArduinoNode }     from './nodes/ArduinoNode';
import { LEDNode }         from './nodes/LEDNode';
import { ResistorNode }    from './nodes/ResistorNode';
import { ButtonNode }      from './nodes/ButtonNode';
import { PotentiometerNode } from './nodes/PotentiometerNode';
import { BuzzerNode }      from './nodes/BuzzerNode';
import { ServoNode }       from './nodes/ServoNode';
import { LDRNode }         from './nodes/LDRNode';
import { BreadboardNode }  from './nodes/BreadboardNode';

export const nodeTypes = {
  arduino:       ArduinoNode,
  led:           LEDNode,
  resistor:      ResistorNode,
  button:        ButtonNode,
  potentiometer: PotentiometerNode,
  buzzer:        BuzzerNode,
  servo:         ServoNode,
  ldr:           LDRNode,
  breadboard:    BreadboardNode,
} as const;
