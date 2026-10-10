const fs = require('fs');

const p = 'components/FloatingAIAssistant.tsx';
let c = fs.readFileSync(p, 'utf8');

const oldResult = `      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(baseTextRef.current + transcript);
      };`;

const newResult = `      recognition.onresult = (event: any) => {
        const transcripts = Array.from(event.results).map((result: any) => result[0].transcript);
        let combined = '';
        
        for (const t of transcripts) {
          const tStr = String(t);
          if (tStr.startsWith(' ') && combined !== '') {
            // Desktop continuation
            combined += tStr;
          } else {
            const tTrim = tStr.trim().toLowerCase();
            const cTrim = combined.trim().toLowerCase();
            if (cTrim && tTrim.startsWith(cTrim)) {
              // Android full-string replacement bug
              combined = tStr;
            } else {
              combined += (combined && !tStr.startsWith(' ') ? ' ' : '') + tStr;
            }
          }
        }
        
        setInputText(baseTextRef.current + combined);
      };`;

c = c.replace(oldResult, newResult);
fs.writeFileSync(p, c);
console.log('Fixed transcription duplication bug');
