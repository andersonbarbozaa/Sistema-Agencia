const fs = require('fs');

function wrapWithPortal(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes("import ModalPortal from '@/components/ModalPortal';")) {
    content = content.replace("import { useState, useEffect }", "import { useState, useEffect }\nimport ModalPortal from '@/components/ModalPortal';");
    if (!content.includes("import ModalPortal from")) {
      content = content.replace("import { CalendarEvent }", "import { CalendarEvent }\nimport ModalPortal from '@/components/ModalPortal';");
    }
  }

  // Find all `<div className="fixed inset-0 `
  let searchStr = '<div className="fixed inset-0';
  let index = content.indexOf(searchStr);
  
  while (index !== -1) {
    // Before this <div, there should be `&& (`
    let beforeDiv = content.substring(index - 20, index);
    if (beforeDiv.includes('&& (')) {
      // Find the exact `(` before the div
      let parenIndex = content.lastIndexOf('(', index);
      
      // We found `&& (`. Now we want to insert `<ModalPortal>` right after `(`.
      content = content.substring(0, parenIndex + 1) + '<ModalPortal>' + content.substring(parenIndex + 1);
      
      // Update index because we added 13 chars
      index += 13;
      
      // Now find the matching `)`
      let openDivs = 0;
      let i = index;
      while (i < content.length) {
        if (content.substr(i, 4) === '<div') openDivs++;
        if (content.substr(i, 5) === '</div') openDivs--;
        
        if (openDivs === 0) {
          // We found the closing `</div>` for our modal div.
          // The `)}` should be right after it.
          // Let's find the next `)` after this `</div>`.
          let closeParen = content.indexOf(')', i + 5);
          if (closeParen !== -1) {
            content = content.substring(0, closeParen) + '</ModalPortal>' + content.substring(closeParen);
          }
          break;
        }
        i++;
      }
    }
    index = content.indexOf(searchStr, index + 10);
  }
  
  fs.writeFileSync(filePath, content);
}

wrapWithPortal('app/(app)/tasks/page.tsx');
wrapWithPortal('app/(app)/agenda/page.tsx');
console.log('Done');
