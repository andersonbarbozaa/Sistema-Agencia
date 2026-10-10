const fs = require('fs');

const p = 'app/(app)/settings/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const anchor = "const [loading, setLoading] = useState(true);";
const pwaState = `  const [loading, setLoading] = useState(true);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else if (isIOS) {
      alert('Para instalar no iPhone, toque no ícone de Compartilhar do Safari e escolha "Adicionar à Tela Inicial".');
    } else {
      alert('Seu navegador não suporta a instalação via botão ou o aplicativo já está instalado.');
    }
  };`;

c = c.replace(anchor, pwaState);

// Replace "Import Smartphone" if needed, but we already import `import { ... Download } from 'lucide-react'`?
// Let's just use `import { Smartphone } from 'lucide-react'` if it exists, or just use what's available like `Sparkles`. 
// The user asked for "download ou smartphone".
// Let's add Smartphone and Download to imports.
c = c.replace('import {\n  Settings,', 'import {\n  Settings,\n  Smartphone,\n  Download,');

fs.writeFileSync(p, c);
console.log('Injected PWA logic');
