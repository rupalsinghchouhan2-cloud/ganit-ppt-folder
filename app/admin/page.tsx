'use client';

import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useState } from 'react';

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

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></span>;
}

function encodeTitle(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fileDetails(file: File): { extension: string; kind: Kind; contentType: string; safeName: string } | null {
  const match = /\.(pdf|pptx?)$/i.exec(file.name);
  if (!match) return null;
  const extension = `.${match[1].toLowerCase()}`;
  const kind = extension.slice(1) as Kind;
  const base = file.name.slice(0, -match[0].length)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'resource';
  const contentType = kind === 'pdf'
    ? 'application/pdf'
    : kind === 'ppt'
      ? 'application/vnd.ms-powerpoint'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  return { extension, kind, contentType, safeName: `${base}${extension}` };
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently added' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function FileGlyph({ kind }: { kind: Kind }) {
  return (
    <div className={`file-glyph glyph-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 52 58" fill="none"><path d="M8 3.5h23l13 13V51a3.5 3.5 0 0 1-3.5 3.5h-29A3.5 3.5 0 0 1 8 51v-44a3.5 3.5 0 0 1 3.5-3.5Z" fill="currentColor" opacity=".13" /><path d="M31 4v11a2 2 0 0 0 2 2h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 31h22M15 37h15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
      <span>{kind.toUpperCase()}</span>
    </div>
  );
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [storageError, setStorageError] = useState('');
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [deletingPath, setDeletingPath] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not load the shelf.');
      setDocuments(Array.isArray(payload) ? payload : []);
      setStorageError('');
    } catch (caught) {
      setStorageError(caught instanceof Error ? caught.message : 'Could not load the shelf.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean; configured?: boolean }) => {
        if (!active) return;
        setAuthenticated(Boolean(data.authenticated));
        setConfigured(Boolean(data.configured));
      })
      .catch(() => { if (active) setConfigured(false); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (authenticated) void loadDocuments();
  }, [authenticated, loadDocuments]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not sign in.');
      setAuthenticated(true);
      setPassword('');
      setMessage('Welcome in. Your shelf is ready.');
      setMessageIsError(false);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not sign in.');
      setMessageIsError(true);
    } finally {
      setLoginBusy(false);
    }
  }

  function acceptFile(file: File | undefined) {
    if (!file) return;
    if (!fileDetails(file)) {
      setMessage('Please choose a PDF, PPT, or PPTX file.');
      setMessageIsError(true);
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setMessage('That file is a little too large. The limit is 100 MB.');
      setMessageIsError(true);
      return;
    }
    setSelectedFile(file);
    setMessage('');
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setMessage('Give this resource a short, useful name first.');
      setMessageIsError(true);
      return;
    }
    if (cleanTitle.length > 120) {
      setMessage('Keep the name under 120 characters.');
      setMessageIsError(true);
      return;
    }
    if (!selectedFile) {
      setMessage('Choose a file to add to the shelf.');
      setMessageIsError(true);
      return;
    }

    const details = fileDetails(selectedFile);
    if (!details) {
      setMessage('Please choose a PDF, PPT, or PPTX file.');
      setMessageIsError(true);
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage('');
    try {
      const path = `library/${crypto.randomUUID()}/${encodeTitle(cleanTitle)}/${details.safeName}`;
      await upload(path, selectedFile, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        contentType: details.contentType,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      setTitle('');
      setSelectedFile(null);
      await loadDocuments();
      setMessage('Added to the shelf. Nice work!');
      setMessageIsError(false);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'The upload did not finish. Please try again.');
      setMessageIsError(true);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function removeDocument(document: LibraryDocument) {
    if (!window.confirm(`Remove “${document.title}” from the shelf?`)) return;
    setDeletingPath(document.pathname);
    setMessage('');
    try {
      const response = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname: document.pathname }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not remove this file.');
      setDocuments((current) => current.filter((item) => item.pathname !== document.pathname));
      setMessage('Removed from the shelf.');
      setMessageIsError(false);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not remove this file.');
      setMessageIsError(true);
    } finally {
      setDeletingPath('');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAuthenticated(false);
    setDocuments([]);
    setMessage('');
  }

  return (
    <main className="admin-shell">
      <header className="topbar admin-topbar">
        <Link className="brand" href="/" aria-label="गणित PPT Folder by Sunita Gulati H.S Bhatkhedi home"><BrandMark /><span className="brand-label"><span className="brand-name-main">गणित PPT Folder</span><span className="brand-byline">by Sunita Gulati H.S Bhatkhedi</span></span></Link>
        <div className="topbar-right">
          <Link className="back-link" href="/"><span aria-hidden="true">←</span> Back to shelf</Link>
          {authenticated && <button className="admin-link logout-link" onClick={() => void handleLogout()}>Sign out</button>}
        </div>
      </header>

      {checking ? (
        <div className="admin-loading"><span className="loader-dot" /> Opening the little control room…</div>
      ) : !authenticated ? (
        <section className="login-wrap">
          <div className="login-decoration login-decoration-one">π</div>
          <div className="login-decoration login-decoration-two">∑</div>
          <div className="login-card">
            <div className="login-icon"><span>∴</span></div>
            <div className="eyebrow login-eyebrow"><span className="eyebrow-dot" /> JUST FOR THE ADMIN</div>
            <h1>Backstage<br /><em>pass, please.</em></h1>
            <p className="login-intro">Sign in to add new notes and keep the shelf tidy.</p>
            <form className="login-form" onSubmit={handleLogin}>
              <label className="field-label" htmlFor="username">Username</label>
              <input id="username" className="text-input" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
              <label className="field-label" htmlFor="password">Password</label>
              <input id="password" className="text-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              {message && <p className={`form-message ${messageIsError ? 'is-error' : ''}`} role="status">{message}</p>}
              {!configured && <p className="setup-hint">Admin sign-in needs environment variables set up before the first login.</p>}
              <button className="primary-button login-submit" type="submit" disabled={loginBusy}>{loginBusy ? 'Checking…' : 'Open the control room'} <span aria-hidden="true">↗</span></button>
            </form>
            <div className="login-footnote"><span>⌁</span> Your files stay on your Vercel Blob shelf.</div>
          </div>
          <p className="login-lower-note">Small admin corner <span>·</span> big helpful energy</p>
        </section>
      ) : (
        <section className="dashboard-wrap">
          <div className="dashboard-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> THE CONTROL ROOM</div>
              <h1>Keep the ideas <em>coming.</em></h1>
              <p>Add a PDF or presentation; it’ll appear on the public shelf right away.</p>
            </div>
            <div className="admin-count-card"><span className="count-spark">✳</span><strong>{documents.length}</strong><span>on the shelf</span></div>
          </div>

          <div className="admin-columns">
            <section className="admin-panel upload-panel" aria-labelledby="upload-title">
              <div className="panel-heading">
                <span className="panel-step">01</span>
                <div><h2 id="upload-title">Add a resource</h2><p>PDF, PPT, or PPTX · up to 100 MB</p></div>
              </div>
              <form onSubmit={handleUpload}>
                <label className="field-label" htmlFor="resource-title">What should we call it?</label>
                <input id="resource-title" className="text-input" maxLength={120} placeholder="e.g. Quadratic equations, made easy" value={title} onChange={(event) => setTitle(event.target.value)} required />
                <label className={`drop-zone ${dragging ? 'is-dragging' : ''} ${selectedFile ? 'has-file' : ''}`} htmlFor="resource-file" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
                  <input id="resource-file" className="visually-hidden" type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={handleFileChange} />
                  <span className="upload-cloud" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M24 32V10m0 0-8 8m8-8 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 28v9a3 3 0 0 0 3 3h18a3 3 0 0 0 3-3v-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></span>
                  {selectedFile ? <><strong>{selectedFile.name}</strong><span>{formatSize(selectedFile.size)} · click to choose another</span></> : <><strong>Drop a file here, or <u>browse</u></strong><span>PDF, PPT and PPTX only</span></>}
                </label>
                {uploading && <div className="progress-wrap" aria-live="polite"><div className="progress-label"><span>Sending it to the shelf…</span><span>{progress}%</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>}
                {message && <p className={`form-message ${messageIsError ? 'is-error' : ''}`} role="status">{message}</p>}
                <button className="primary-button upload-submit" type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Add to the shelf'} <span aria-hidden="true">↗</span></button>
              </form>
              <div className="upload-note"><span>✳</span> A custom name makes the right file easy to find.</div>
            </section>

            <section className="admin-panel manage-panel" aria-labelledby="manage-title">
              <div className="panel-heading">
                <span className="panel-step panel-step-green">02</span>
                <div><h2 id="manage-title">On the shelf</h2><p>These are visible to everyone.</p></div>
                <button className="refresh-button" onClick={() => void loadDocuments()} aria-label="Refresh the shelf">↻</button>
              </div>
              {storageError ? <div className="manage-empty manage-error"><span>⌁</span><p>{storageError}</p></div> : documents.length === 0 ? <div className="manage-empty"><span>∅</span><p>Nothing here yet.<br />Your first upload will land here.</p></div> : (
                <ul className="manage-list">
                  {documents.map((document) => (
                    <li className="manage-item" key={document.id}>
                      <FileGlyph kind={document.kind} />
                      <div className="manage-item-copy"><strong>{document.title}</strong><span>{document.extension.replace('.', '').toUpperCase()} · {formatSize(document.size)} · {formatDate(document.uploadedAt)}</span></div>
                      <button className="delete-button" onClick={() => void removeDocument(document)} disabled={Boolean(deletingPath)} aria-label={`Remove ${document.title}`}>{deletingPath === document.pathname ? '…' : '×'}</button>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/" className="public-view-link">See the public shelf <span aria-hidden="true">↗</span></Link>
            </section>
          </div>
          <p className="dashboard-footnote"><span>∴</span> Keep it clear, keep it kind, keep asking why.</p>
        </section>
      )}
    </main>
  );
}
