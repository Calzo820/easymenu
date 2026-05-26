export default function ServiceStatusBar({ online = true, pendingOrders = 0 }) {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 999,
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 16px',
      borderRadius: 14,
      background: online ? '#14532d' : '#991b1b',
      color: '#fff',
      fontWeight: 700,
      marginBottom: 12,
    }}>
      <span>{online ? 'Sistema online' : 'Offline mode attiva'}</span>
      <span>Ordini in coda: {pendingOrders}</span>
    </div>
  );
}
