const fs = require('fs');
let c = fs.readFileSync('app/(app)/agenda/page.tsx', 'utf8');

c = c.replace(
  `} catch (err) {
      console.error(err);
    } finally {`,
  `} catch (err: any) {
      console.error(err);
      alert('Erro de conexão ao excluir: ' + err.message);
    } finally {`
);

fs.writeFileSync('app/(app)/agenda/page.tsx', c);
