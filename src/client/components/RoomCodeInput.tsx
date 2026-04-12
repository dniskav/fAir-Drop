import React from 'react'

type Props = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function RoomCodeInput({ value, onChange }: Props): JSX.Element {
  return (
    <div className="join-form">
      <label className="sr-only" htmlFor="input-code-react">
        Codigo de sala
      </label>
      <input
        id="input-code-react"
        type="text"
        placeholder="AB12"
        maxLength={4}
        inputMode="text"
        value={value}
        onChange={onChange}
        aria-describedby="home-error-react"
      />
      <button id="btn-join-react" className="btn btn-secondary" type="submit">
        Unirse
      </button>
    </div>
  )
}
