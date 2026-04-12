/**
 * Embeddable Home Page Widget — renders inside an iframe on GHL sites.
 * URL: /embed/home
 */
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, serif; background: transparent; }
          .rb-hw { padding: 24px 0; }
          .rb-hw-title { display: none; }
          .rb-hw-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; }
          .rb-hw-card { background: #0a0a0a; border: 1px solid #d97706; border-radius: 12px; overflow: hidden; transition: all .3s ease; text-decoration: none; color: inherit; display: flex; flex-direction: column; cursor: pointer; }
          .rb-hw-card:hover { border-color: #f59e0b; box-shadow: 0 4px 20px rgba(217, 119, 6, 0.3); transform: translateY(-2px); }
          .rb-hw-img { width: 100%; height: 240px; object-fit: cover; display: block; background: #111; }
          .rb-hw-placeholder { width: 100%; height: 240px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: 4rem; color: #d97706; }
          .rb-hw-content { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
          .rb-hw-name { color: #f59e0b; font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; line-height: 1.3; }
          .rb-hw-dates { color: #d1d5db; font-size: .85rem; margin-bottom: 12px; }
          .rb-hw-btn { background: #d97706; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: .85rem; font-weight: 600; cursor: pointer; margin-top: auto; transition: background .2s; font-family: inherit; }
          .rb-hw-btn:hover { background: #b45309; }
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
                <a key={o.id} href={o.url || '#'} className="rb-hw-card" style={{ textDecoration: 'none' }}>
                  {o.images && o.images[0] ? (
                    <img className="rb-hw-img" src={o.images[0]} alt={o.fullName} />
                  ) : (
                    <div className="rb-hw-placeholder">✝</div>
                  )}
                  <div className="rb-hw-content">
                    <div>
                      <div className="rb-hw-name">{o.fullName}</div>
                      <div className="rb-hw-dates">
                        {[o.birthDate, o.deathDate].filter(Boolean).join(' – ')}
                      </div>
                    </div>
                    <button className="rb-hw-btn" onClick={(e) => { e.preventDefault(); window.location.href = o.url || '#'; }}>Read Obituary</button>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
