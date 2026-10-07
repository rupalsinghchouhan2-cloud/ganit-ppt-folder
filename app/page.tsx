'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Kind = 'pdf' | 'ppt' | 'pptx';
type LibraryDocument = {
  id: string;
  title: string;
  fileName: string;
  kind: Kind;
  extension: string;
  pathname: string;
  url: string;
  downloadUrl: string;
  size: number;
  uploadedAt: string;
};
type Filter = 'all' | 'pdf' | 'slides';

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span /><span /><span /><span />
    </span>
  );
}

function FileGlyph({ kind }: { kind: Kind }) {
  const label = kind === 'pdf' ? 'PDF' : kind.toUpperCase();
  return (
    <div className={`file-glyph glyph-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 52 58" fill="none">
        <path d="M8 3.5h23l13 13V51a3.5 3.5 0 0 1-3.5 3.5h-29A3.5 3.5 0 0 1 8 51v-44a3.5 3.5 0 0 1 3.5-3.5Z" fill="currentColor" opacity=".13" />
        <path d="M31 4v11a2 2 0 0 0 2 2h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 31h22M15 37h15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently added';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function HomePage() {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The shelf is taking a little break.');
      setDocuments(Array.isArray(payload) ? payload : []);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The shelf could not load right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const visibleDocuments = useMemo(() => documents.filter((document) => {
    if (filter === 'pdf') return document.kind === 'pdf';
    if (filter === 'slides') return document.kind === 'ppt' || document.kind === 'pptx';
    return true;
  }), [documents, filter]);

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="गणित PPT Folder by Sunita Gulati H.S Bhatkhedi home">
          <BrandMark />
          <span className="brand-label"><span className="brand-name-main">गणित PPT Folder</span><span className="brand-byline">by Sunita Gulati H.S Bhatkhedi</span></span>
        </Link>
        <div className="topbar-right">
          <span className="tiny-top-note"><span className="tiny-spark">✳</span> made for curious minds</span>
          <Link className="admin-link" href="/admin">Admin <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> H.S. BHATKHEDI · MATHS RESOURCES</div>
          <h1 id="hero-title">Big ideas,<br /><span className="hero-italic">neatly gathered.</span></h1>
          <p className="hero-description">Class notes and slide decks, all on one happy little shelf. Pick a topic, download a file, and get back to the good stuff.</p>
          <a href="#library" className="primary-button">Explore the shelf <span aria-hidden="true">↓</span></a>
          <div className="hero-footnote"><span className="scribble-star" aria-hidden="true">✳</span> Less searching. More figuring it out.</div>
        </div>

        <div className="hero-art" aria-label="A playful illustration of study notes and mathematical symbols">
          <div className="art-sun" />
          <div className="math-bubble bubble-sigma">∑</div>
          <div className="math-bubble bubble-pi">π</div>
          <div className="math-bubble bubble-plus">＋</div>
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="note-card note-back"><span>√</span><i /><i /><i /></div>
          <div className="note-card note-front">
            <div className="note-card-head"><span className="mini-sun">✳</span><span>FIELD NOTES · 01</span></div>
            <div className="note-equation">y = mx + b</div>
            <div className="note-lines"><i /><i /><i /></div>
            <div className="note-stamp">keep<br />going!</div>
          </div>
          <svg className="art-curve" viewBox="0 0 110 70" fill="none" aria-hidden="true">
            <path d="M5 62C26 62 22 14 48 14c26 0 21 44 57 44" stroke="#7668dc" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
            <circle cx="48" cy="14" r="4" fill="#ed9978" />
            <circle cx="105" cy="58" r="4" fill="#a6cfb5" />
          </svg>
          <div className="art-caption">a + a little curiosity</div>
        </div>
        <div className="hero-equation" aria-hidden="true">∴</div>
      </section>

      <section className="library-section" id="library" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow section-eyebrow"><span className="eyebrow-dot" /> THE GOOD STUFF</div>
            <h2 id="library-title">Your shelf<span className="heading-period">.</span></h2>
            <p className="section-subtitle">A few useful things to help the ideas stick.</p>
          </div>
          <div className="library-side-note"><span className="mini-doodle">⌁</span><span>Take what you need.<br />Leave room for questions.</span></div>
        </div>

        <div className="shelf-toolbar">
          <div className="filter-list" role="group" aria-label="Filter resources">
            <button className={`filter-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Everything <span>{documents.length}</span></button>
            <button className={`filter-pill ${filter === 'pdf' ? 'active' : ''}`} onClick={() => setFilter('pdf')}>PDF notes</button>
            <button className={`filter-pill ${filter === 'slides' ? 'active' : ''}`} onClick={() => setFilter('slides')}>Slide decks</button>
          </div>
          <span className="shelf-count">{documents.length === 1 ? '1 resource' : `${documents.length} resources`}</span>
        </div>

        {loading ? (
          <div className="state-card"><span className="loader-dot" /> Gathering the good stuff…</div>
        ) : error ? (
          <div className="state-card state-error">
            <span className="state-icon">○</span>
            <div><strong>The shelf is almost ready.</strong><p>{error}</p><button className="text-button" onClick={() => void loadDocuments()}>Try again ↻</button></div>
          </div>
        ) : visibleDocuments.length ? (
          <div className="resource-grid">
            {visibleDocuments.map((document, index) => (
              <article className={`resource-card card-tone-${index % 4}`} key={document.id}>
                <div className="resource-card-top">
                  <FileGlyph kind={document.kind} />
                  <span className={`type-chip chip-${document.kind}`}>{document.kind === 'pdf' ? 'PDF NOTES' : 'SLIDE DECK'}</span>
                  <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3>{document.title}</h3>
                <p className="file-meta">{document.extension.replace('.', '').toUpperCase()} <span>·</span> {formatSize(document.size)} <span>·</span> {formatDate(document.uploadedAt)}</p>
                <a className="download-button" href={document.downloadUrl}>
                  <span>Download {document.kind === 'pdf' ? 'PDF' : 'slides'}</span>
                  <span className="download-arrow" aria-hidden="true">↓</span>
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-doodle" aria-hidden="true"><span>∅</span><i>✳</i></div>
            <h3>{documents.length ? 'Nothing in this pile just yet.' : 'A fresh page.'}</h3>
            <p>{documents.length ? 'Try another shelf filter.' : 'New notes and slides will show up here when they’re added.'}</p>
            {documents.length > 0 && <button className="text-button" onClick={() => setFilter('all')}>Show everything ↗</button>}
          </div>
        )}
      </section>

      <footer className="footer">
        <Link className="footer-brand" href="/"><BrandMark /><span className="brand-label"><span className="brand-name-main">गणित PPT Folder</span><span className="brand-byline">by Sunita Gulati H.S Bhatkhedi</span></span></Link>
        <span>Small steps count, too <span className="footer-heart">♥</span></span>
        <Link href="/admin" className="footer-admin">Library admin ↗</Link>
      </footer>
    </main>
  );
}
