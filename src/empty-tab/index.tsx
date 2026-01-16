import ReactDOM from 'react-dom/client'
import React from 'react'
import App from '../App/App'

const el = document.getElementById('app')

if (el) {
  const root: ReactDOM.Root = ReactDOM.createRoot(el as HTMLElement)

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
