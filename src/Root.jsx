import { useEffect, useState } from 'react'
import App from './App.jsx'
import Dashboard from './Dashboard.jsx'

export default function Root() {
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const onChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route === '#/dashboard' ? <Dashboard /> : <App />
}