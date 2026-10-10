const fs = require('fs');

const p = 'components/FloatingAIAssistant.tsx';
let c = fs.readFileSync(p, 'utf8');

const oldTarget = `      const data = await res.json();
      setCurrentInterpretation(data);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: \`Entendi! Detectei a ação "\${data.detected_action}". Revise os dados abaixo para confirmar e gravar no sistema:\`,
          interpretation: data,
        },
      ]);`;

const newTarget = `      const data = await res.json();
      const interpPayload = { id: data.id, ...data.interpretation };
      setCurrentInterpretation(interpPayload);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: \`Entendi! Detectei a ação "\${interpPayload.detected_action}". Revise os dados abaixo para confirmar e gravar no sistema:\`,
          interpretation: interpPayload,
        },
      ]);`;

c = c.replace(oldTarget, newTarget);
fs.writeFileSync(p, c);
console.log('Fixed mapping!');
