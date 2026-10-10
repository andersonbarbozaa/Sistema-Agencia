const fs = require('fs');

const p = 'components/FloatingAIAssistant.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/detected_action === 'create_task'/g, "detected_action === 'TASK'");
c = c.replace(/detected_action === 'create_transaction'/g, "detected_action === 'TRANSACTION'");
c = c.replace(/detected_action === 'create_lead'/g, "detected_action === 'CRM_LEAD'");
c = c.replace(/detected_action === 'create_event'/g, "detected_action === 'CALENDAR_EVENT'");

// Fix SpeechRecognition:
// 1. We need to store previous text when recording starts, or just append properly.
// The easiest way is to let `onresult` append to a base text.
// We can use a ref to hold the base text.

// Let's find:
// const recognitionRef = useRef<any>(null);
// And add:
// const baseTextRef = useRef('');
c = c.replace(
  'const recognitionRef = useRef<any>(null);',
  'const recognitionRef = useRef<any>(null);\n  const baseTextRef = useRef("");'
);

// Then replace the configuration:
// recognition.continuous = false;
// recognition.interimResults = true;
// recognition.onstart = () => { setIsRecording(true); };
const configTarget = `      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };`;

const configReplacement = `      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        // store the current input text as the base
        baseTextRef.current = inputText ? inputText + ' ' : '';
      };`;
c = c.replace(configTarget, configReplacement);

// And replace onresult:
// const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
// setInputText(transcript);
const resultTarget = `      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };`;

const resultReplacement = `      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(baseTextRef.current + transcript);
      };`;
c = c.replace(resultTarget, resultReplacement);

fs.writeFileSync(p, c);
console.log('Fixed Speech Recognition and Actions');
