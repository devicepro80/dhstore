import React, { useState } from 'react'
import { api } from '../api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Admin@123')
  const [error, setError] = useState('')
  async function submit(e){ e.preventDefault(); setError(''); try{ const data = await api('/auth/login',{method:'POST', body:{username, password}}); onLogin(data) } catch(e){ setError(e.message) } }
  return (
    <div style={{minHeight:'100vh', display:'grid', placeItems:'center', background:'#0f172a', color:'#e5e7eb'}}>
      <div style={{width:360, background:'rgba(17,24,39,0.6)', padding:24, borderRadius:12, border:'1px solid rgba(255,255,255,.1)'}}>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
          <img src="/logo.png" alt="DH Store" width={40} height={40} style={{borderRadius:8}} />
          <h2 style={{margin:0}}>DH Store — Login</h2>
        </div>
        <form onSubmit={submit}>
          <label>Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} style={inputStyle} />
          <label>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} />
          {error && <div style={{color:'#fca5a5', marginTop:8}}>{error}</div>}
          <button style={btn}>Sign in</button>
        </form>
      </div>
    </div>
  )
}
const inputStyle = { width:'100%', margin:'6px 0 12px', padding:'10px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'rgba(255,255,255,.05)', color:'#e5e7eb' }
const btn = { width:'100%', padding:'12px', borderRadius:10, border:'none', background:'#22c55e', color:'#0b121f', fontWeight:700, marginTop:6 }
