using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using SignalRDemo.Api.Hubs;
using SignalRDemo.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Registrar el servicio de SignalR en el contenedor de dependencias
builder.Services.AddSignalR();

// 2. Configurar política CORS explícita con soporte de credenciales (requerido por SignalR)
const string CorsPolicy = "ReactClientPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors(CorsPolicy);

// Almacenamiento en memoria para facilitar la demo sin depender de BD externa
var habitos = new ConcurrentDictionary<Guid, Habito>();
var habitoInicial = new Habito(
    Id: Guid.NewGuid(),
    Titulo: "Repasar arquitectura SignalR",
    Categoria: "Estudio",
    Puntos: 20,
    Racha: 1,
    CreadoPor: "Sistema",
    FechaCreacionUtc: DateTime.UtcNow
);
habitos[habitoInicial.Id] = habitoInicial;

// GET inicial: solo se ejecuta una vez al abrir la aplicación
app.MapGet("/api/habitos", () =>
{
    var lista = habitos.Values
        .OrderByDescending(h => h.FechaCreacionUtc)
        .ToList();
    return Results.Ok(lista);
});

// POST: crea un hábito y emite notificación en tiempo real vía IHubContext
app.MapPost("/api/habitos", async (
    CrearHabitoRequest request,
    IHubContext<NotificacionesHub> hubContext) =>
{
    if (string.IsNullOrWhiteSpace(request.Titulo))
    {
        return Results.BadRequest(new { error = "El título del hábito es obligatorio." });
    }

    var autor = string.IsNullOrWhiteSpace(request.CreadoPor) ? "Anónimo" : request.CreadoPor.Trim();
    var nuevoHabito = new Habito(
        Id: Guid.NewGuid(),
        Titulo: request.Titulo.Trim(),
        Categoria: string.IsNullOrWhiteSpace(request.Categoria) ? "General" : request.Categoria.Trim(),
        Puntos: Math.Clamp(request.Puntos, 5, 100),
        Racha: 0,
        CreadoPor: autor,
        FechaCreacionUtc: DateTime.UtcNow
    );

    habitos[nuevoHabito.Id] = nuevoHabito;

    // Empuja el nuevo hábito a TODOS los clientes conectados sin que hagan GET
    await hubContext.Clients.All.SendAsync("HabitoCreado", nuevoHabito);

    // Envía también una notificación visual tipo Toast
    await hubContext.Clients.All.SendAsync("RecibirNotificacion", new NotificacionEvento(
        Tipo: "success",
        Titulo: "Nuevo hábito registrado",
        Mensaje: $"{autor} creó \"{nuevoHabito.Titulo}\" (+{nuevoHabito.Puntos} pts)",
        Origen: autor,
        TimestampUtc: DateTime.UtcNow,
        Datos: nuevoHabito
    ));

    return Results.Created($"/api/habitos/{nuevoHabito.Id}", nuevoHabito);
});

// POST: incrementa la racha de un hábito y sincroniza a todos los clientes en vivo
app.MapPost("/api/habitos/{id:guid}/completar", async (
    Guid id,
    CompletarHabitoRequest request,
    IHubContext<NotificacionesHub> hubContext) =>
{
    if (!habitos.TryGetValue(id, out var actual))
    {
        return Results.NotFound(new { error = "Hábito no encontrado." });
    }

    var actualizado = actual with { Racha = actual.Racha + 1 };
    habitos[id] = actualizado;

    var usuario = string.IsNullOrWhiteSpace(request.CompletadoPor) ? "Un usuario" : request.CompletadoPor.Trim();

    await hubContext.Clients.All.SendAsync("HabitoActualizado", actualizado);
    await hubContext.Clients.All.SendAsync("RecibirNotificacion", new NotificacionEvento(
        Tipo: "streak",
        Titulo: "¡Racha incrementada!",
        Mensaje: $"{usuario} completó \"{actualizado.Titulo}\" (Racha: {actualizado.Racha})",
        Origen: usuario,
        TimestampUtc: DateTime.UtcNow,
        Datos: actualizado
    ));

    return Results.Ok(actualizado);
});

// 3. Mapear el endpoint del Hub de SignalR
app.MapHub<NotificacionesHub>("/hubs/notificaciones");

app.Run();
