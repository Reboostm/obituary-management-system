/**
 * Embeddable Home Page Widget — renders inside an iframe on GHL sites.
 * URL: /embed/home
 */
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function normalizeUrl(url) {
  if (!url || url === '#') return '#';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  // Fix old format: /obituaries/slug or /obituaries-/slug → /obituaries-slug
  url = url.replace(/\/obituaries[-/]+([^/?#]+)/, '/obituaries-$1');
  return url;
}

export async function getServerSideProps() {
  try {
    const q = query(collection(db, 'obituaries'), where('status', '==', 'published'));
    const snapshot = await getDocs(q);
    const obituaries = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((o) => o.createdAt)
      .sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      })
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        fullName: o.fullName || '',
        birthDate: o.birthDate || '',
        deathDate: o.deathDate || '',
        images: o.images || [],
        url: normalizeUrl(o.url),
      }));
    return { props: { obituaries } };
  } catch (error) {
    console.error('Embed home error:', error);
    return { props: { obituaries: [], error: error.message } };
  }
}

export default function EmbedHome({ obituaries, error }) {
  if (error) {
    return (
      <html>
        <body style={{ margin: 0, fontFamily: 'Georgia, serif', background: 'transparent' }}>
          <p style={{ color: '#6b7280', fontSize: '.9rem' }}>Unable to load obituaries.</p>
        </body>
      </html>
    );
  }

  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          html, body { margin: 0; padding: 0; width: 100%; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, serif; background: transparent; width: 100%; }
          .rb-hw { padding: 24px; width: 100%; }
          .rb-hw-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); grid-auto-rows: auto; gap: 24px; width: 100%; }
          .rb-hw-card { background: #0a0a0a; border: 1px solid #d4af7f; border-radius: 12px; overflow: hidden; transition: all .3s ease; text-decoration: none; color: inherit; display: flex; flex-direction: column; cursor: pointer; }
          .rb-hw-card:hover { border-color: #e8c99a; box-shadow: 0 4px 20px rgba(212, 175, 127, 0.35); transform: translateY(-2px); }
          .rb-hw-img { width: 100%; height: 320px; object-fit: contain; object-position: center center; display: block; background: #111; flex-shrink: 0; }
          .rb-hw-placeholder { width: 100%; height: 320px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 4rem; color: #d4af7f; flex-shrink: 0; }
          .rb-hw-content { padding: 16px; display: flex; flex-direction: column; justify-content: flex-start; gap: 8px; }
          .rb-hw-name { color: #d4af7f; font-size: 1.4rem; font-weight: 600; margin-bottom: 8px; line-height: 1.3; word-break: break-word; }
          .rb-hw-dates { color: #d1d5db; font-size: 1rem; margin-bottom: 24px; }
          .rb-hw-btn { background: transparent; color: #d4af7f; border: 1px solid #d4af7f; border-radius: 6px; padding: 12px 16px; font-size: 1.1rem; font-weight: 600; cursor: pointer; margin-top: auto; transition: all .2s; font-family: inherit; width: 100%; letter-spacing: .03em; }
          .rb-hw-btn:hover { background: #d4af7f; color: #000; }
          .rb-hw-empty { color: #6b7280; font-size: .9rem; text-align: center; padding: 32px; }
        `}} />
      </head>
      <body>
        <div className="rb-hw">
          <div className="rb-hw-grid">
            {obituaries.length === 0 ? (
              <div className="rb-hw-empty">No recent obituaries.</div>
            ) : (
              obituaries.map((o) => (
                <div
                  key={o.id}
                  className="rb-hw-card"
                  onClick={() => { window.top.location.href = o.url; }}
                  style={{ cursor: 'pointer' }}
                >
                  {o.images && o.images[0] ? (
                    <img className="rb-hw-img" src={o.images[0]} alt={o.fullName} />
                  ) : (
                    <div className="rb-hw-placeholder">&#10013;</div>
                  )}
                  <div className="rb-hw-content">
                    <div>
                      <div className="rb-hw-name">{o.fullName}</div>
                      <div className="rb-hw-dates">
                        {[o.birthDate, o.deathDate].filter(Boolean).join(' – ')}
                      </div>
                    </div>
                    <button className="rb-hw-btn">Read Obituary</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      <script dangerouslySetInnerHTML={{ __html: `
        function notifyHeight() {
          var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
          try { parent.postMessage({ rbHeight: h }, '*'); } catch(e) {}
        }
        window.addEventListener('load', notifyHeight);
        window.addEventListener('resize', notifyHeight);
        setTimeout(notifyHeight, 500);
      `}} />
      </body>
    </html>
  );
}
