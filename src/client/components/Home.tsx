import React, { useState } from 'react'
import BrandMark from './BrandMark'
import RoomCodeInput from './RoomCodeInput'

function dispatch(name: string, detail?: any) {
  document.dispatchEvent(new CustomEvent(name, { detail }))
}

export default function Home(): JSX.Element {
  const [code, setCode] = useState('')

  function onCreate() {
    dispatch('app:create-room')
  }

  function onJoin(e?: React.FormEvent) {
    e?.preventDefault()
    dispatch('app:join-room', { code: code.trim().toUpperCase() })
  }

  function onScan() {
    dispatch('app:scan-qr')
  }

  return (
    <section className="screen active" aria-labelledby="home-title">
      <div className="brand-lockup">
        <BrandMark onClick={onCreate} />
        <p className="eyebrow">Toca para crear sala</p>
        <p className="brand-sub">red local</p>
        <h1 id="home-title">fAir Drop</h1>
        <p className="tagline">Pasa archivos directo entre tus dispositivos.</p>
      </div>

      <form className="home-actions" onSubmit={onJoin} autoComplete="off">
        <div className="divider" role="separator">
          <span>o</span>
        </div>
        <RoomCodeInput
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        />
        <button id="btn-scan-qr-react" className="btn btn-ghost" type="button" onClick={onScan}>
          Escanear QR
        </button>
        <p id="home-error-react" className="error-msg hidden" role="status" aria-live="polite"></p>
      </form>
    </section>
  )
}
