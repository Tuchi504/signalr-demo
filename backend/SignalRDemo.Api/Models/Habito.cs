namespace SignalRDemo.Api.Models;

public record Habito(
    Guid Id,
    string Titulo,
    string Categoria,
    int Puntos,
    int Racha,
    string CreadoPor,
    DateTime FechaCreacionUtc
);

public record CrearHabitoRequest(
    string Titulo,
    string Categoria,
    int Puntos,
    string CreadoPor
);

public record CompletarHabitoRequest(
    string CompletadoPor
);

public record NotificacionEvento(
    string Tipo,
    string Titulo,
    string Mensaje,
    string Origen,
    DateTime TimestampUtc,
    object? Datos = null
);
