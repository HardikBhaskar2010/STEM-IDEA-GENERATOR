import emailjs from '@emailjs/browser';

// These should be set in environment variables in a real production app
// For now, we'll provide the structure and instructions for the user
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export interface FeedbackData {
  name: string;
  email: string;
  protocol: string;
  message: string;
}

export const sendFeedback = async (data: FeedbackData) => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS credentials missing. Feedback will only be logged to console.');
    console.log('Feedback Data:', data);
    
    // Simulate API delay for better UX even without keys
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, mock: true };
  }

  try {
    const templateParams = {
      from_name: data.name,
      from_email: data.email,
      protocol: data.protocol,
      message: data.message,
    };

    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
    return { success: true, response };
  } catch (error) {
    console.error('EmailJS Error:', error);
    throw error;
  }
};
