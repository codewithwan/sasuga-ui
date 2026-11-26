import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { initTheme } from './lib/theme'

initTheme()

// The FX canvas draws SFX lettering (Japanese + italic Nunito); load those glyphs early.
Promise.all([
  document.fonts?.load('40px "Dela Gothic One"', 'ドンバシュッゼロ最高カッセーブ送信ズスザポ行くぞピッカチコード注意成功危険読込中!'),
  document.fonts?.load('italic 900 40px "Nunito"'),
]).catch(() => {})

// Warm the other styles' faces while idle, so the first switch to manga/flat doesn't
// stall on a font download + full re-layout mid-transition.
const warm = () =>
  ['40px "Anton"', '800 40px "Plus Jakarta Sans"', '400 40px "Plus Jakarta Sans"', '40px "Mochiy Pop One"'].forEach((f) => document.fonts?.load(f).catch(() => {}))
if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 })
else setTimeout(warm, 1500)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
