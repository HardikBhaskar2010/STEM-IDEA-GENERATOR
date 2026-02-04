/**
 * Test file to verify PerfContext Phase 1 implementation
 * 
 * This file demonstrates:
 * 1. PerfContext creation with auto-detection
 * 2. localStorage persistence
 * 3. data-mode attribute setting
 * 4. usePerf hook usage
 * 5. Suggestion banner display
 * 
 * To test manually:
 * 1. Open browser DevTools Console
 * 2. Check for "[PerfContext]" logs showing device detection
 * 3. Check localStorage for "perf:low" key
 * 4. Check document.documentElement for data-mode attribute
 * 5. Navigate to /profile and check Settings tab for Low Performance Mode toggle
 * 6. On low-end devices, check for suggestion banner
 */

import { usePerf } from '@/contexts/PerfContext';

export const TestPerfContext = () => {
  const { lowPerf, setLowPerf, suggested, shouldPrompt } = usePerf();
  
  return (
    <div style={{ padding: '20px', background: '#111', color: '#fff' }}>
      <h2>Phase 1 Test Results</h2>
      <ul>
        <li>Low Perf Mode: {lowPerf ? '✅ Enabled' : '❌ Disabled'}</li>
        <li>Suggested: {suggested ? '✅ Yes' : '❌ No'}</li>
        <li>Should Prompt: {shouldPrompt ? '✅ Yes' : '❌ No'}</li>
        <li>Data Mode Attribute: {document.documentElement.getAttribute('data-mode')}</li>
        <li>LocalStorage Value: {localStorage.getItem('perf:low')}</li>
      </ul>
      <button 
        onClick={() => setLowPerf(!lowPerf)}
        style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer' }}
      >
        Toggle Low Perf
      </button>
    </div>
  );
};
