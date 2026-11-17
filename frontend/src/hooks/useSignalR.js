import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = 'http://localhost:5000/hubs/notificaciones';

function formatearHoraMs(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function useSignalR({ onHabitoCreado, onHabitoActualizado }) {
  const [estado, setEstado] = useState('Conectando');
  const [connectionId, setConnectionId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [eventLog, setEventLog] = useState([]);

  const connectionRef = useRef(null);
  const onCreadoRef = useRef(onHabitoCreado);
  const onActualizadoRef = useRef(onHabitoActualizado);

  onCreadoRef.current = onHabitoCreado;
  onActualizadoRef.current = onHabitoActualizado;

  const agregarLog = useCallback((evento, detalle) => {
    setEventLog((prev) => [
      {
        id: crypto.randomUUID(),
        hora: formatearHoraMs(),
        evento,
        detalle
      },
      ...prev.slice(0, 14)
    ]);
  }, []);

  const mostrarToast = useCallback((notificacion) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [{ ...notificacion, id }, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    let cancelado = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        withCredentials: true
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on('ConexionConfirmada', (info) => {
      if (cancelado) return;
      setConnectionId(info.connectionId);
      agregarLog('ConexionConfirmada', `ID asignado: ${info.connectionId}`);
    });

    connection.on('HabitoCreado', (habito) => {
      if (cancelado) return;
      onCreadoRef.current?.(habito);
      agregarLog('HabitoCreado', `"${habito.titulo}" por ${habito.creadoPor}`);
    });

    connection.on('HabitoActualizado', (habito) => {
      if (cancelado) return;
      onActualizadoRef.current?.(habito);
      agregarLog('HabitoActualizado', `"${habito.titulo}" -> Racha: ${habito.racha}`);
    });

    connection.on('RecibirNotificacion', (notificacion) => {
      if (cancelado) return;
      mostrarToast(notificacion);
      agregarLog(`RecibirNotificacion (${notificacion.tipo})`, notificacion.mensaje);
    });

    connection.onreconnecting(() => {
      if (!cancelado) setEstado('Reconectando');
    });

    connection.onreconnected((newId) => {
      if (cancelado) return;
      setEstado('Conectado');
      setConnectionId(newId ?? null);
      agregarLog('Reconnected', `Nueva sesión: ${newId}`);
    });

    connection.onclose(() => {
      if (!cancelado) setEstado('Desconectado');
    });

    const iniciar = async () => {
      try {
        await connection.start();
        if (cancelado) {
          await connection.stop();
          return;
        }
        setEstado('Conectado');
        setConnectionId(connection.connectionId);
      } catch (err) {
        if (!cancelado) {
          setEstado('Desconectado');
          agregarLog('Error', err.message || 'No se pudo conectar al Hub');
        }
      }
    };

    iniciar();

    return () => {
      cancelado = true;
      connection.off('ConexionConfirmada');
      connection.off('HabitoCreado');
      connection.off('HabitoActualizado');
      connection.off('RecibirNotificacion');
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.stop();
      }
    };
  }, [agregarLog, mostrarToast]);

  const enviarAlerta = useCallback(async (usuario, mensaje) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      throw new Error('La conexión SignalR no está activa.');
    }
    await conn.invoke('EnviarAlerta', usuario, mensaje);
  }, []);

  const descartarToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    estado,
    connectionId,
    toasts,
    eventLog,
    enviarAlerta,
    descartarToast
  };
}
