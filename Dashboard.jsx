import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { Chart, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale } from 'chart.js'
Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale)

export default function Dashboard({ token, user, onLogout }) {
  const [overview, setOverview] = useState({ salesByDay: [], lowStock: 0 })
  const [items, setItems] = useState([])
  useEffect(()=>{ api('/analytics/overview',{token}).then(setOverview).catch(()=>{}); api('/items',{token}).then(setItems).catch(()=>{}) },[token])
  useEffect(()=>{
    if (!overview.salesByDay.length) return
    const ctx = document.getElementById('salesChart')
    const chart = new Chart(ctx, { type:'line', data:{ labels: overview.salesByDay.map(d=>d.date.slice(5)), datasets:[{ label:'Sales (last 30 days)', data: overview.salesByDay.map(d=>d.amount) }] } })
    return ()=> chart.destroy()
  },[overview])
  const lowStockItems = items.filter(i=> i.quantity <= i.reorderLevel).slice(0,5)
  return (
    <div style={{minHeight:'100vh', background:'#0b1220', color:'#e5e7eb'}}>
      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.1)'}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <img src="/logo.png" width={28} height={28} style={{borderRadius:6}}/>
          <b>DH Store — Dashboard</b>
        </div>
        <div>
          <span style={{marginRight:12, opacity:.8}}>Hi, {user?.username} ({user?.role})</span>
          <button onClick={onLogout} style={{padding:'8px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.2)'}}>Logout</button>
        </div>
      </header>
      <main style={{padding:16, display:'grid', gap:16}}>
        <section style={card}><canvas id="salesChart" height="90"></canvas></section>
        <section style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16}}>
          <div style={card}><h3 style={h3}>Low stock items</h3>
            <ul style={{margin:0, paddingLeft:18}}>{lowStockItems.map(i=> <li key={i.id}>{i.name} — Qty {i.quantity} (≤ {i.reorderLevel})</li>)}
              {!lowStockItems.length && <li>All good! ✅</li>}</ul>
          </div>
          <div style={card}><h3 style={h3}>Totals</h3>
            <p>Products: {items.length}</p>
            <p>Low stock count: {overview.lowStock}</p>
          </div>
        </section>
      </main>
    </div>
  )
}
const card = { background:'rgba(17,24,39,0.6)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:16 }
const h3 = { marginTop:0 }
