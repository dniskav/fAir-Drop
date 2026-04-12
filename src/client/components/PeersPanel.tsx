import React, { useEffect, useState } from 'react'
import type { AppState } from '../app/state'
import type { PeerInfo, Role } from '../shared/domain/types'
import { elapsed } from '../shared/application/format'
import { useTranslation } from '../i18n'

type Actions = { kickPeer(): void; banPeer(duration: number | null): void }

function ClientCard({
  info,
  role,
  isSelf,
  canControl,
  actions,
}: {
  info: PeerInfo
  role: Role
  isSelf: boolean
  canControl: boolean
  actions: Actions
}) {
  const { t } = useTranslation()
  const [tick, setTick] = useState(0)
  const [banDur, setBanDur] = useState<number>(60)

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <li className={'client-item' + (isSelf ? ' is-self' : '')}>
      <div className="client-role">
        {role === 'creator' ? t.peers.creator : t.peers.guest}
        {isSelf ? <span className="you-badge">{t.peers.you}</span> : null}
      </div>
      <div className="client-ip">{info.ip}</div>
      <div className="client-browser">
        <span className="client-icon">{info.mobile ? 'mobile' : 'desktop'}</span> {info.browser}
      </div>
      <div className="client-since">
        {t.peers.connectedSince + ' '}
        <span data-since={isSelf ? 'self' : 'peer'}>{elapsed(info.connectedAt)}</span>
      </div>

      {canControl ? (
        <div className="peer-actions">
          <button className="btn-kick" onClick={actions.kickPeer} data-kick-peer>
            {t.peers.kick}
          </button>

          <div className="ban-row">
            <button
              className="btn-ban"
              onClick={() => actions.banPeer(null)}
              data-ban-peer="permanent"
            >
              {t.peers.banPermanent}
            </button>
          </div>

          <div className="ban-row">
            <button
              className="btn-ban"
              onClick={() => actions.banPeer(banDur)}
              data-ban-peer="temporary"
            >
              {t.peers.banTemporary}
            </button>
            <input
              type="number"
              className="expiry-input"
              min={1}
              max={86400}
              value={banDur}
              onChange={(e) => setBanDur(Number(e.target.value) || 60)}
            />
            <span className="ban-unit">{t.peers.sec}</span>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export default function PeersPanel({ state, actions }: { state: AppState; actions: Actions }) {
  const { t } = useTranslation()

  return (
    <ul className="clients-list">
      {!state.selfInfo ? (
        <li className="client-empty">{t.peers.waiting}</li>
      ) : (
        <>
          <ClientCard
            info={state.selfInfo}
            role={state.isCreator ? 'creator' : 'joiner'}
            isSelf
            canControl={false}
            actions={actions}
          />
          {state.peerInfo ? (
            <ClientCard
              info={state.peerInfo}
              role={state.isCreator ? 'joiner' : 'creator'}
              isSelf={false}
              canControl={state.isCreator}
              actions={actions}
            />
          ) : (
            <li className="client-item is-empty">
              <div className="client-role">{state.isCreator ? t.peers.guest : t.peers.creator}</div>
              <div className="client-ip">-</div>
              <div className="client-browser">{t.peers.notConnected}</div>
            </li>
          )}
        </>
      )}
    </ul>
  )
}
