import React from 'react';
import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface RoleSelectorProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  name: string;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ label, options, value, onChange, name }) => {
  return (
    <div className="space-y-3">
      <Label className="text-gray-300 text-sm font-medium">{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="flex gap-3">
        {options.map((option) => (
          <motion.div
            key={option.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1"
          >
            <div className="relative">
              <RadioGroupItem
                value={option.value}
                id={`${name}-${option.value}`}
                className="peer sr-only"
                data-testid={`${name}-${option.value}-radio`}
              />
              <Label
                htmlFor={`${name}-${option.value}`}
                className={
                  `flex items-center justify-center px-4 py-3 rounded-xl cursor-pointer transition-all duration-300
                  ${value === option.value
                    ? 'bg-purple-500/20 border-2 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                  }`
                }
              >
                <div className="flex items-center space-x-2">
                  <div className={
                    `w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                    ${value === option.value ? 'border-purple-400' : 'border-gray-500'}`
                  }>
                    {value === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-purple-400"
                      />
                    )}
                  </div>
                  <span className="font-medium">{option.label}</span>
                </div>
              </Label>
            </div>
          </motion.div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default RoleSelector;