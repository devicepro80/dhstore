import React, { useState } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null)

  function onLogin({ token, user }) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)
  }
  function logout() {
    localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(null); setUser(null)
  }
  if (!token) return <Login onLogin={onLogin} />
  return <Dashboard token={token} user={user} onLogout={logout} />
}
