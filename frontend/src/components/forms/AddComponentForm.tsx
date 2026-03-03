import React from 'react';

interface AddComponentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddComponentForm: React.FC<AddComponentFormProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg">
        <h2>Add Component Form</h2>
        <p>Coming soon...</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default AddComponentForm;