import { useEffect, useState, useCallback } from 'react';
import { useSignalR } from './hooks/useSignalR';

const API_BASE = 'http://localhost:5000';

export default function App() {
  const [habitos, setHabitos] = useState([]);
  const [alias, setAlias] = useState('Navegador A');
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Salud');
  const [puntos, setPuntos] = useState(15);
  const [mensajeAlerta, setMensajeAlerta] = useState('¡Nuevo registro sincronizado en tiempo real!');
  const [getInicialCount, setGetInicialCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Carga inicial única mediante HTTP GET
  useEffect(() => {
    const cargarHabitos = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/habitos`);
        if (!res.ok) throw new Error('Error al cargar hábitos iniciales');
        const data = await res.json();
        setHabitos(data);
        setGetInicialCount((c) => c + 1);
      } catch (err) {
        setErrorMsg('No se pudo conectar con el backend en http://localhost:5000');
      }
    };
    cargarHabitos();
  }, []);

  const handleHabitoCreado = useCallback((nuevo) => {
    setHabitos((prev) => {
      if (prev.some((h) => h.id === nuevo.id)) return prev;
      return [nuevo, ...prev];
    });
  }, []);

  const handleHabitoActualizado = useCallback((actualizado) => {
    setHabitos((prev) =>
      prev.map((h) => (h.id === actualizado.id ? actualizado : h))
    );
  }, []);

  const {
    estado,
    connectionId,
    toasts,
    eventLog,
    enviarAlerta,
    descartarToast
  } = useSignalR({
    onHabitoCreado: handleHabitoCreado,
    onHabitoActualizado: handleHabitoActualizado
  });

  const handleCrearHabito = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!titulo.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/habitos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          categoria,
          puntos: Number(puntos),
          creadoPor: alias || 'Cliente React'
        })
      });
      if (!res.ok) throw new Error('Error al crear hábito');
      setTitulo('');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCompletar = async (id) => {
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/habitos/${id}/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completadoPor: alias || 'Cliente React' })
      });
      if (!res.ok) throw new Error('Error al completar hábito');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDispararAlerta = async () => {
    setErrorMsg('');
    try {
      await enviarAlerta(alias || 'Cliente React', mensajeAlerta);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="app-shell">
      {/* Toasts en tiempo real */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tipo}`}>
            <div className="toast-header">
              <strong>{toast.titulo}</strong>
              <button onClick={() => descartarToast(toast.id)} title="Cerrar">
                ×
              </button>
            </div>
            <p>{toast.mensaje}</p>
            <span className="toast-meta">
              Push vía SignalR • {new Date(toast.timestampUtc).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      <header className="topbar">
        <div>
          <span className="badge-curso">IS-912 Sistemas Expertos • Grupo #3</span>
          <h1>Habit Tracker en Tiempo Real</h1>
          <p className="subtitle">
            Demostración SignalR (ASP.NET Core) + React sin Polling ni recarga de página
          </p>
        </div>

        <div className="status-card">
          <div className="status-row">
            <span className={`dot dot-${estado.toLowerCase()}`} />
            <strong>{estado}</strong>
            <span className="transport-pill">WebSockets</span>
          </div>
          <div className="conn-id">
            <span>ConnectionId:</span>{' '}
            <code>{connectionId ?? 'Negociando...'}</code>
          </div>
          <div className="get-counter">
            Peticiones GET ejecutadas: <strong>{getInicialCount}</strong> (solo al abrir)
          </div>
        </div>
      </header>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <main className="grid-layout">
        {/* Columna izquierda: controles de mutación */}
        <section className="panel">
          <h2>1. Identidad de esta Ventana</h2>
          <label className="field">
            <span>Nombre del cliente (ej. Navegador A / Navegador B)</span>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Navegador A"
            />
          </label>

          <hr className="divider" />

          <h2>2. Crear Hábito (POST + IHubContext)</h2>
          <form onSubmit={handleCrearHabito} className="form-stack">
            <label className="field">
              <span>Título del hábito</span>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Leer documentación de SignalR"
                required
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Categoría</span>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="Salud">Salud</option>
                  <option value="Estudio">Estudio</option>
                  <option value="Trabajo">Trabajo</option>
                  <option value="General">General</option>
                </select>
              </label>

              <label className="field">
                <span>Puntos</span>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={puntos}
                  onChange={(e) => setPuntos(e.target.value)}
                />
              </label>
            </div>

            <button type="submit" className="btn-primary">
              + Registrar Hábito en Vivo
            </button>
          </form>

          <hr className="divider" />

          <h2>3. RPC Directo al Hub (hub.invoke)</h2>
          <div className="form-stack">
            <label className="field">
              <span>Mensaje de alerta instantánea</span>
              <input
                type="text"
                value={mensajeAlerta}
                onChange={(e) => setMensajeAlerta(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={handleDispararAlerta}
              className="btn-secondary"
              disabled={estado !== 'Conectado'}
            >
              ⚡ Disparar Alerta a Todos los Clientes
            </button>
          </div>
        </section>

        {/* Columna derecha: tabla sincronizada + log de eventos WebSocket */}
        <section className="right-col">
          <div className="panel">
            <div className="panel-header">
              <h2>Hábitos Sincronizados ({habitos.length})</h2>
              <span className="live-tag">● LIVE PUSH</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hábito</th>
                    <th>Categoría</th>
                    <th>Creado por</th>
                    <th>Racha</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {habitos.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <strong>{h.titulo}</strong>
                        <div className="pts">+{h.puntos} pts</div>
                      </td>
                      <td>
                        <span className="cat-pill">{h.categoria}</span>
                      </td>
                      <td>{h.creadoPor}</td>
                      <td>
                        <span className="streak">🔥 {h.racha}</span>
                      </td>
                      <td>
                        <button
                          className="btn-mini"
                          onClick={() => handleCompletar(h.id)}
                        >
                          +1 Completar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {habitos.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty">
                        No hay hábitos registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>Monitor de Eventos SignalR (Sin Polling)</h2>
            <ul className="log-list">
              {eventLog.map((item) => (
                <li key={item.id}>
                  <span className="log-time">{item.hora}</span>
                  <span className="log-event">{item.evento}</span>
                  <span className="log-detail">{item.detalle}</span>
                </li>
              ))}
              {eventLog.length === 0 && (
                <li className="empty">Esperando eventos del servidor...</li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
