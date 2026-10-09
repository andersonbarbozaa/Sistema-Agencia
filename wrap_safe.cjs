const fs = require('fs');

function wrapWithPortal(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  if (!code.includes("import ModalPortal from")) {
    code = code.replace("import { useState, useEffect }", "import { useState, useEffect }\nimport ModalPortal from '@/components/ModalPortal';");
    if (!code.includes("import ModalPortal from")) {
       code = code.replace("import { CalendarEvent }", "import { CalendarEvent }\nimport ModalPortal from '@/components/ModalPortal';");
    }
  }

  // To safely wrap modals, we'll replace the first <div> of the modal and its matching closing </div>.
  // We can do this by finding all `className="fixed inset-0...` and matching the div.
  // Actually, since all these modals are conditional like `{condition && (<div className="fixed inset-0...">...</div>)}`,
  // we can use regex to find `{condition && (` and if the next non-whitespace is `<div className="fixed inset-0`, wrap it.

  const regex = /(\{\w+ && \(\s*)(<div className="fixed inset-0[^>]+>)/g;
  
  code = code.replace(regex, "$1<ModalPortal>\n$2");
  
  // Now we need to close `</ModalPortal>`.
  // This is tricky. But notice all modals end with:
  //       </div>
  //     )}
  // We can replace `</div>\n      )}` with `</div>\n      </ModalPortal>)}`
  // BUT we only want to do this for the modals we opened!
  // To be perfectly safe, I can just do a very targeted replace for each modal.
}
