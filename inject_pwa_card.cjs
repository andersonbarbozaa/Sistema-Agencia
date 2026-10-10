const fs = require('fs');

const p = 'app/(app)/settings/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const target = `              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Personalizar IA &rarr;</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                  Gemini API
                </span>
              </div>
            </div>`;

const pwaCard = `              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                <span>Personalizar IA &rarr;</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                  Gemini API
                </span>
              </div>
            </div>

            {/* Card 6: Instalar Aplicativo */}
            <div
              onClick={handleInstallClick}
              className="bg-blue-600 border border-blue-500 rounded-2xl p-6 shadow-md hover:bg-blue-700 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-50 transition-colors">
                  Instalar App no Celular
                </h3>
                <p className="text-xs text-blue-100 mt-1.5 leading-relaxed">
                  Adicione o sistema à tela inicial do seu dispositivo para usá-lo em tela cheia como um aplicativo nativo.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-blue-500/50 flex items-center justify-between text-xs font-semibold text-white">
                <span>Instalar Agora &rarr;</span>
                <Download size={16} />
              </div>
            </div>`;

c = c.replace(target, pwaCard);

fs.writeFileSync(p, c);
console.log('Injected PWA card');
