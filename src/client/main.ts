/**
 * Adaptador DOM vanilla para FairDropStore.
 *
 * Este archivo es el ÚNICO que toca el DOM directamente.
 * Suscribe al store, traduce estado → DOM, y delega eventos → store.actions.
 * Para migrar a React/Vue/etc. solo hay que reemplazar este archivo.
 */

import { FairDropStore } from '../core/store.js'
import type { AppState } from '../core/store.js'
import { getDomRefs, type DomRefs } from './shared/adapters/dom.js'
import { elapsed, formatBytes, escapeHtml } from './shared/application/format.js'
import { fileIconType } from './features/transfer/application/transfer.js'
import { startQrScanner, stopQrScanner } from './features/qr/application/qr-scanner.js'

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const store = new FairDropStore()
const dom = getDomRefs()

// Clases de dispositivo para estilos CSS responsivos
const isMobileDevice =
  matchMedia('(pointer: coarse)').matches || /mobile|android|iphone|ipad/i.test(navigator.userAgent)
document.documentElement.classList.toggle('is-mobile', isMobileDevice)
document.documentElement.classList.toggle('is-desktop', !isMobileDevice)

// Adaptador: traduce estado de tienda → DOM
let prevState: Readonly<AppState> | null = null

function render(state: Readonly<AppState>): void {
  const prev = prevState

  // ── Pantalla ───────────────────────────────────────────────
  if (!prev || state.screen !== prev.screen) {
    dom.screenHome.classList.toggle('active', state.screen === 'home')
    dom.screenRoom.classList.toggle('active', state.screen === 'room')
    if (state.screen === 'home') {
      dom.brandMark.classList.remove('creating')
      dom.brandMark.setAttribute('aria-pressed', 'false')
    }
  }

  // ── Código y URL de sala ───────────────────────────────────
  if (!prev || state.roomCode !== prev.roomCode) {
    dom.roomCodeDisplay.textContent = state.roomCode ?? ''
  }
  if (!prev || state.shareUrl !== prev.shareUrl || state.isCreator !== prev?.isCreator) {
    if (state.isCreator && state.shareUrl) {
      dom.shareUrl.textContent = state.shareUrl
      dom.roomQr.src = `/api/qr?text=${encodeURIComponent(state.shareUrl)}`
      dom.shareBanner.classList.remove('hidden')
      dom.roomQrCard.classList.remove('hidden')
    } else {
      dom.shareBanner.classList.add('hidden')
      dom.roomQrCard.classList.add('hidden')
    }
  }

  // ── Estado de conexión ─────────────────────────────────────
  if (!prev || state.connectionStatus !== prev.connectionStatus) {
    dom.connectionStatus.className = `status status-${state.connectionStatus}`
    const labels: Record<string, string> = {
      waiting: 'Esperando...',
      connected: 'Conectado (P2P)',
      relay: 'Conectado (via servidor)',
      disconnected: 'Desconectado',
    }
    dom.statusText.textContent = labels[state.connectionStatus] ?? ''

    const connected =
      state.connectionStatus === 'connected' || state.connectionStatus === 'relay'
    if (connected) {
      dom.dropZone.classList.remove('disabled')
      dom.dropWaiting.style.display = 'none'
      dom.dropReady.style.display = 'grid'
    } else {
      dom.dropZone.classList.add('disabled')
      dom.dropWaiting.style.display = 'grid'
      dom.dropReady.style.display = 'none'
    }
  }

  // ── Errores ────────────────────────────────────────────────
  if (!prev || state.homeError !== prev.homeError) {
    if (state.homeError) {
      dom.homeError.textContent = state.homeError
      dom.homeError.classList.remove('hidden')
    } else {
      dom.homeError.classList.add('hidden')
    }
  }
  if (!prev || state.roomError !== prev.roomError) {
    if (state.roomError) {
      dom.roomError.textContent = state.roomError
      dom.roomError.classList.remove('hidden')
    } else {
      dom.roomError.classList.add('hidden')
    }
  }

  // ── Lista de archivos ──────────────────────────────────────
  renderFileList(state, dom)

  // ── Panel de peers ─────────────────────────────────────────
  if (
    !prev ||
    state.selfInfo !== prev.selfInfo ||
    state.peerInfo !== prev.peerInfo
  ) {
    renderPeers(state, dom)
  }

  prevState = state
}

// ── Renderizado de archivos ───────────────────────────────────────────────────

// El adaptador es dueño de estos elementos de lista; el store no los conoce.
const fileEls = new Map<string, HTMLLIElement>()

function renderFileList(state: Readonly<AppState>, dom: DomRefs): void {
  // IDs activos en el estado
  const activeIds = new Set<string>([
    ...state.incoming.keys(),
    ...state.fileUrls.keys(),
    ...state.fileMeta.keys(),
  ])

  // Eliminar ítems borrados
  for (const [id, el] of fileEls) {
    if (!activeIds.has(id)) {
      el.remove()
      fileEls.delete(id)
    }
  }

  // Crear o actualizar ítems
  for (const id of activeIds) {
    const existing = fileEls.get(id)
    if (!existing) {
      const li = buildFileEl(id, state)
      dom.fileList.prepend(li)
      fileEls.set(id, li)
    } else {
      patchFileEl(id, existing, state)
    }
  }

  dom.fileListSection.classList.toggle('hidden', fileEls.size === 0)
}

function buildFileEl(id: string, state: Readonly<AppState>): HTMLLIElement {
  const li = document.createElement('li')
  li.className = 'file-item'
  li.dataset.fileId = id
  patchFileEl(id, li, state)
  return li
}

function fileIconSvg(name: string): string {
  const svgs: Record<string, string> = {
    file: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 2h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" fill="none"><path d="M14 2v6a2 2 0 0 0 2 2h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="8" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.4"/></svg>`,
    img: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M8 14l2.5-3 3.5 4.5 2.5-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    zip: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M8 7h8M10 11h4M10 15h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    mov: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M20 8v8l4-4-4-4z" fill="currentColor"/></svg>`,
    aud: `<svg viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.4"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.4"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none"><path d="M16 18l6-6-6-6M8 6L2 12l6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    txt: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h10M4 11h12M4 15h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    md: `<svg viewBox="0 0 24 24" fill="none"><path d="M6 3v18M18 6v12M12 6v12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    app: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.4"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  }
  const kind = fileIconType(name)
  return `<span class="icon-svg">${svgs[kind] ?? svgs['file']}</span>`
}

function patchFileEl(id: string, li: HTMLLIElement, state: Readonly<AppState>): void {
  const incoming = state.incoming.get(id)
  const url = state.fileUrls.get(id)
  const meta = state.fileMeta.get(id)
  const expiry = state.fileExpiry.get(id)

  if (incoming) {
    // En vuelo: mostrar progreso
    const pct =
      incoming.meta.totalChunks > 0
        ? Math.round((incoming.received / incoming.meta.totalChunks) * 100)
        : 0
    const direction = incoming.direction ?? 'receiving'
    li.innerHTML = `
      <span class="file-icon">${fileIconSvg(incoming.meta.name)}</span>
      <div class="file-meta">
        <div class="file-name">${escapeHtml(incoming.meta.name)}</div>
        <div class="file-size">${formatBytes(incoming.meta.size)}</div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>
      <div class="file-actions">
        <span class="badge ${direction === 'sending' ? 'badge-sending' : 'badge-receiving'}">
          ${direction === 'sending' ? 'enviando' : 'recibiendo'}
        </span>
      </div>`
    return
  }

  if (!meta) return

  const expiryTime =
    typeof expiry?.remaining === 'number'
      ? `<span class="expiry-tag time">${expiry.remaining}s</span>`
      : ''
  const expiryDl =
    typeof expiry?.downloadsLeft === 'number'
      ? `<span class="expiry-tag dl">${expiry.downloadsLeft}</span>`
      : ''

  if (url) {
    // Completado como receptor: botón de descarga
    li.innerHTML = `
      <span class="file-icon">${fileIconSvg(meta.name)}</span>
      <div class="file-meta">
        <div class="file-name">${escapeHtml(meta.name)}</div>
        ${meta.size ? `<div class="file-size">${formatBytes(meta.size)}</div>` : ''}
      </div>
      <div class="file-actions">
        ${expiryTime}${expiryDl}
        <a class="btn-download" href="${url}" download="${escapeHtml(meta.name)}">Descargar</a>
        <button class="btn-delete" data-delete-file="${id}">Eliminar</button>
      </div>`
    li.querySelector('a.btn-download')?.addEventListener('click', () => {
      store.recordDownload(id)
    })
  } else {
    // Completado como emisor
    li.innerHTML = `
      <span class="file-icon">${fileIconSvg(meta.name)}</span>
      <div class="file-meta">
        <div class="file-name">${escapeHtml(meta.name)}</div>
        ${meta.size ? `<div class="file-size">${formatBytes(meta.size)}</div>` : ''}
      </div>
      <div class="file-actions">
        ${expiryTime}${expiryDl}
        <span class="badge badge-done">enviado</span>
        <button class="btn-delete" data-delete-file="${id}">Eliminar</button>
      </div>`
  }
}

// ── Renderizado de peers ──────────────────────────────────────────────────────

function renderPeers(state: Readonly<AppState>, dom: DomRefs): void {
  if (!state.selfInfo) {
    dom.clientsList.innerHTML = '<li class="client-empty">Esperando...</li>'
    return
  }

  const items: string[] = []
  items.push(buildPeerCard(state.selfInfo, state.isCreator ? 'creator' : 'joiner', true, false))

  if (state.peerInfo) {
    items.push(
      buildPeerCard(
        state.peerInfo,
        state.isCreator ? 'joiner' : 'creator',
        false,
        state.isCreator
      )
    )
  } else {
    items.push(`
      <li class="client-item is-empty">
        <div class="client-role">${state.isCreator ? 'Invitado' : 'Creador'}</div>
        <div class="client-ip">-</div>
        <div class="client-browser">Sin conectar</div>
      </li>`)
  }

  dom.clientsList.innerHTML = items.join('')

  // Botones de control (solo para el creador)
  if (state.isCreator) {
    dom.clientsList.querySelector<HTMLButtonElement>('[data-kick-peer]')?.addEventListener(
      'click',
      () => {
        if (confirm('¿Expulsar al invitado?')) store.kickPeer()
      }
    )
    dom.clientsList.querySelector<HTMLButtonElement>('[data-ban-peer="permanent"]')?.addEventListener(
      'click',
      () => {
        if (confirm('¿Banear permanentemente al invitado?')) store.banPeer(null)
      }
    )
    dom.clientsList.querySelector<HTMLButtonElement>('[data-ban-peer="temporary"]')?.addEventListener(
      'click',
      () => {
        const input = dom.clientsList.querySelector<HTMLInputElement>('[data-ban-duration]')
        const duration = Number(input?.value) || 60
        if (confirm(`¿Banear al invitado por ${duration}s?`)) store.banPeer(duration)
      }
    )
  }
}

function buildPeerCard(
  info: NonNullable<AppState['selfInfo']>,
  role: 'creator' | 'joiner',
  isSelf: boolean,
  canControl: boolean
): string {
  const roleLabel = role === 'creator' ? 'Creador' : 'Invitado'
  const selfBadge = isSelf ? '<span class="you-badge">tú</span>' : ''
  const deviceIcon = info.mobile ? 'mobile' : 'desktop'
  const since = elapsed(info.connectedAt)

  const controls = canControl
    ? `<div class="peer-actions">
        <button class="btn-kick" data-kick-peer>Expulsar</button>
        <div class="ban-row">
          <button class="btn-ban" data-ban-peer="permanent">Ban permanente</button>
        </div>
        <div class="ban-row">
          <button class="btn-ban" data-ban-peer="temporary">Ban temporal</button>
          <input type="number" class="expiry-input" data-ban-duration min="1" max="86400" value="60" />
          <span class="ban-unit">seg</span>
        </div>
      </div>`
    : ''

  return `
    <li class="client-item${isSelf ? ' is-self' : ''}">
      <div class="client-role">${roleLabel} ${selfBadge}</div>
      <div class="client-ip">${info.ip}</div>
      <div class="client-browser">
        <span class="client-icon">${deviceIcon}</span> ${info.browser}
      </div>
      <div class="client-since">conectado hace ${since}</div>
      ${controls}
    </li>`
}

// ── Eventos DOM ───────────────────────────────────────────────────────────────

function touchAction(fn: () => void) {
  return (e: TouchEvent) => {
    e.preventDefault()
    fn()
  }
}

function getExpiryFromDom(): import('./shared/domain/types.js').ExpiryConfig | null {
  const cfg: import('./shared/domain/types.js').ExpiryConfig = {}
  if (dom.expTimeOn.checked)
    cfg.time = Math.max(1, parseInt(dom.expTimeVal.value, 10) || 30)
  if (dom.expDlOn.checked)
    cfg.downloads = Math.max(1, parseInt(dom.expDlVal.value, 10) || 1)
  return cfg.time || cfg.downloads ? cfg : null
}

function isConnected(): boolean {
  const s = store.getState()
  return s.dc?.readyState === 'open' || s.useRelay
}

function bindEvents(): void {
  // Crear sala
  dom.brandMark.addEventListener('click', () => {
    dom.brandMark.classList.add('creating')
    dom.brandMark.setAttribute('aria-pressed', 'true')
    store.createRoom()
  })
  dom.brandMark.addEventListener('touchend', touchAction(() => {
    dom.brandMark.classList.add('creating')
    dom.brandMark.setAttribute('aria-pressed', 'true')
    store.createRoom()
  }))
  dom.brandMark.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') store.createRoom()
  })

  // Unirse a sala
  dom.btnJoin.addEventListener('click', () => {
    store.joinRoom(dom.inputCode.value.trim().toUpperCase())
  })
  dom.btnJoin.addEventListener('touchend', touchAction(() => {
    store.joinRoom(dom.inputCode.value.trim().toUpperCase())
  }))
  dom.inputCode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') store.joinRoom(dom.inputCode.value.trim().toUpperCase())
  })
  dom.inputCode.addEventListener('focus', () => dom.inputCode.select())
  dom.inputCode.addEventListener('click', () => dom.inputCode.select())
  dom.inputCode.addEventListener('input', () => {
    dom.inputCode.value = dom.inputCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  })

  // Copiar código y link
  dom.btnCopyCode.addEventListener('click', () =>
    copyButtonText(dom.btnCopyCode, dom.roomCodeDisplay.textContent ?? '', 'Copiar')
  )
  dom.btnCopyLink.addEventListener('click', () =>
    copyButtonText(dom.btnCopyLink, dom.shareUrl.textContent ?? '', 'Copiar link')
  )
  dom.btnNativeShare.addEventListener('click', nativeShare)

  // Scanner QR
  dom.btnScanQr.addEventListener('click', () =>
    void startQrScanner(
      { inputCode: dom.inputCode, qrScanner: dom.qrScanner, qrVideo: dom.qrVideo, scannerStatus: dom.scannerStatus },
      (msg) => {
        store['showHomeError']?.(msg) // private — usamos leaveRoom como fallback
      },
      () => store.joinRoom(dom.inputCode.value.trim().toUpperCase())
    )
  )
  dom.btnCloseScanner.addEventListener('click', () =>
    stopQrScanner({ qrScanner: dom.qrScanner, qrVideo: dom.qrVideo })
  )
  dom.qrScanner.addEventListener('close', () =>
    stopQrScanner({ qrScanner: dom.qrScanner, qrVideo: dom.qrVideo })
  )

  // Dropzone
  bindDropzone()

  // Delegación de clicks en lista de archivos (eliminar)
  dom.fileList.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-delete-file]')
    if (btn?.dataset.deleteFile) store.deleteFile(btn.dataset.deleteFile)
  })
}

// ── Dropzone ─────────────────────────────────────────────────────────────────

function bindDropzone(): void {
  dom.dropZone.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (dom.dropZone.classList.contains('disabled')) return
    if (target.closest('.expiry-bar')) return
    if (target === dom.fileInput || target.tagName === 'LABEL') return
    dom.fileInput.click()
  })

  dom.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    if (!dom.dropZone.classList.contains('disabled')) dom.dropZone.classList.add('drag-over')
  })
  dom.dropZone.addEventListener('dragleave', (e) => {
    if (!dom.dropZone.contains(e.relatedTarget as Node | null))
      dom.dropZone.classList.remove('drag-over')
  })
  dom.dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dom.dropZone.classList.remove('drag-over')
    if (dom.dropZone.classList.contains('disabled')) return
    const files = Array.from(e.dataTransfer?.files ?? [])
    if (!files.length) return
    if (!isConnected()) {
      // el store emitirá el error via roomError
      return
    }
    void store.sendFiles(files, getExpiryFromDom())
  })

  let pendingHandled = false
  function handleFileInput() {
    if (pendingHandled) return
    const files = Array.from(dom.fileInput.files ?? [])
    if (!files.length) return
    pendingHandled = true
    dom.fileInput.value = ''
    setTimeout(() => { pendingHandled = false }, 500)
    if (!isConnected()) return
    void store.sendFiles(files, getExpiryFromDom())
  }

  dom.fileInput.addEventListener('change', handleFileInput)
  // Fallback para Android Chrome que no dispara 'change' al volver de la cámara
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(handleFileInput, 400)
  })
}

// ── Utilidades UI ─────────────────────────────────────────────────────────────

async function copyButtonText(
  button: HTMLButtonElement,
  text: string,
  original: string
): Promise<void> {
  if (!text) return
  await navigator.clipboard.writeText(text)
  button.textContent = 'Copiado'
  window.setTimeout(() => { button.textContent = original }, 1600)
}

async function nativeShare(): Promise<void> {
  const url = dom.shareUrl.textContent ?? ''
  if (!url) return
  if (navigator.share) {
    try {
      await navigator.share({ title: 'fAir Drop', text: 'Entra a mi sala de fAir Drop', url })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }
  await copyButtonText(dom.btnNativeShare, url, 'Compartir')
}

function autoJoinFromUrl(): void {
  const room = new URLSearchParams(location.search).get('room')
  if (room && /^[A-Z0-9]{4}$/i.test(room)) {
    dom.inputCode.value = room.toUpperCase()
    store.joinRoom(room.toUpperCase())
  }
}

// ── Arranque ──────────────────────────────────────────────────────────────────

store.subscribe(() => render(store.getState()))
render(store.getState())
bindEvents()
autoJoinFromUrl()
