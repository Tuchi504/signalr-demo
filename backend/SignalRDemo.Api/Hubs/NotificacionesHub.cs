using Microsoft.AspNetCore.SignalR;
using SignalRDemo.Api.Models;

namespace SignalRDemo.Api.Hubs;

/// <summary>
/// Hub central de SignalR encargado de gestionar conexiones persistentes
/// y transmitir notificaciones en tiempo real hacia los clientes React.
/// </summary>
public class NotificacionesHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        // Notifica únicamente al cliente recién conectado su ConnectionId asignado
        await Clients.Caller.SendAsync("ConexionConfirmada", new
        {
            ConnectionId = Context.ConnectionId,
            ConectadoEnUtc = DateTime.UtcNow
        });

        // Avisa al resto de clientes que un nuevo navegador se unió
        await Clients.Others.SendAsync("RecibirNotificacion", new NotificacionEvento(
            Tipo: "info",
            Titulo: "Nuevo cliente conectado",
            Mensaje: $"Se conectó la sesión {Context.ConnectionId[..8]}...",
            Origen: "Servidor Hub",
            TimestampUtc: DateTime.UtcNow
        ));

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Clients.Others.SendAsync("RecibirNotificacion", new NotificacionEvento(
            Tipo: "warning",
            Titulo: "Cliente desconectado",
            Mensaje: $"La sesión {Context.ConnectionId[..8]}... cerró conexión.",
            Origen: "Servidor Hub",
            TimestampUtc: DateTime.UtcNow
        ));

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Método invocado directamente desde React mediante connection.invoke("EnviarAlerta", ...)
    /// Demuestra comunicación bidireccional directa Cliente -> Hub -> Otros Clientes.
    /// </summary>
    public async Task EnviarAlerta(string usuario, string mensaje)
    {
        var evento = new NotificacionEvento(
            Tipo: "alerta",
            Titulo: $"Alerta en vivo de {usuario}",
            Mensaje: mensaje,
            Origen: usuario,
            TimestampUtc: DateTime.UtcNow,
            Datos: new { ConnectionId = Context.ConnectionId }
        );

        await Clients.All.SendAsync("RecibirNotificacion", evento);
    }
}
