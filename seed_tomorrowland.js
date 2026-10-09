require('dotenv').config();
const { basePrisma } = require('./src/config/prisma');

async function seedTomorrowlandTrip() {
  console.log('🚀 Iniciando inyección de viaje pasado: Tomorrowland Bélgica 2024 (2 Semanas)...');

  // 1. Obtener usuarios destino
  const usuarios = await basePrisma.usuario.findMany();
  if (usuarios.length === 0) {
    throw new Error('No hay usuarios en la base de datos');
  }

  const targetUserIds = usuarios.map(u => u.id);
  console.log(`👤 Inyectando para ${targetUserIds.length} usuario(s):`, usuarios.map(u => `${u.nombre} (${u.email})`));

  // Eliminar viajes previos de Tomorrowland si quedaron a medias
  await basePrisma.viaje.deleteMany({
    where: {
      titulo: 'Tomorrowland 2024 & Bélgica Épica (2 Semanas)'
    }
  });

  // Tasas de cambio históricas reales de Julio 2024:
  // 1 EUR = ~4,380 COP
  // 1 USD = ~4,020 COP
  // 1 EUR = 1.0895 USD
  const TASA_EUR_COP = 4380;
  const TASA_USD_COP = 4020;

  // Fechas: 2 semanas exactas (16 de julio al 30 de julio de 2024)
  // Tomorrowland 2024: 19 - 21 de Julio de 2024 (Weekend 1)
  const fechaInicio = new Date('2024-07-16T07:00:00.000Z');
  const fechaFin = new Date('2024-07-30T22:00:00.000Z');

  for (const usuarioId of targetUserIds) {
    console.log(`\n📦 Creando viaje Tomorrowland para usuario ${usuarioId}...`);

    // Crear el viaje principal
    const viaje = await basePrisma.viaje.create({
      data: {
        usuarioId,
        titulo: 'Tomorrowland 2024 & Bélgica Épica (2 Semanas)',
        descripcion: 'Viaje pasado de 14 días. Vuelo directo Medellín ➔ Europa (Madrid) ➔ Bélgica (Bruselas, Boom / De Schorre Festival, Gante, Brujas, Amberes) y regreso directo Europa ➔ Medellín.',
        destino: '🇧🇪 Bélgica',
        fechaInicio,
        fechaFin,
        presupuestoTotal: 29500000, // 29.5M COP (~6,735 EUR)
        monedaBase: 'COP',
        monedaReferencia: 'USD',
        monedaLocal: 'EUR'
      }
    });

    console.log(`✅ Viaje creado ID: ${viaje.id}`);

    // Presupuestos por Categoría
    const presupuestos = [
      { categoria: 'vuelos', limite: 11000000 },
      { categoria: 'alojamiento', limite: 6500000 },
      { categoria: 'actividades', limite: 5500000 }, // Tickets Tomorrowland, DreamVille
      { categoria: 'comida', limite: 3500000 },      // Pearls del festival, chocolates, cenas
      { categoria: 'transporte', limite: 1800000 },  // Trenes SNCB Bélgica
      { categoria: 'compras', limite: 1200000 }      // Merch Tomorrowland, souvenirs
    ];

    for (const p of presupuestos) {
      await basePrisma.presupuestoCategoria.create({
        data: {
          viajeId: viaje.id,
          categoria: p.categoria,
          limite: p.limite
        }
      });
    }

    // 2. Eventos del Itinerario (14 días detallados)
    // Coordenadas verificadas:
    // MDE (Medellín): lat 6.1645, lng -75.4231
    // MAD (Madrid Barajas): lat 40.4839, lng -3.5679
    // BRU (Bruselas Zaventem): lat 50.9010, lng 4.4855
    // Boom / De Schorre: lat 51.0911, lng 4.3688
    // Amberes: lat 51.2194, lng 4.4025
    // Gante: lat 51.0543, lng 3.7174
    // Brujas: lat 51.2093, lng 3.2247

    const eventosData = [
      // DÍA 1: Salida de Colombia (Medellín directo a Madrid, Europa)
      {
        titulo: 'Vuelo Directo Medellín ➔ Europa (MDE ➔ MAD)',
        tipo: 'vuelo',
        fechaInicio: new Date('2024-07-16T17:30:00.000Z'),
        fechaFin: new Date('2024-07-17T09:45:00.000Z'),
        ubicacion: 'Aeropuerto Internacional José María Córdova (MDE)',
        latitud: 6.1645,
        longitud: -75.4231,
        costo: 4125000,
        moneda: 'COP',
        ciudadOrigen: 'Medellín',
        paisOrigen: 'Colombia',
        aeropuertoOrigen: 'MDE',
        ciudadDestino: 'Madrid',
        paisDestino: 'España',
        aeropuertoDestino: 'MAD',
        notas: 'Vuelo transatlántico directo de Medellín a Europa (Air Europa UX094).'
      },

      // DÍA 2: Conexión Madrid ➔ Bruselas
      {
        titulo: 'Vuelo Conexión Madrid ➔ Bruselas (MAD ➔ BRU)',
        tipo: 'vuelo',
        fechaInicio: new Date('2024-07-17T12:30:00.000Z'),
        fechaFin: new Date('2024-07-17T15:00:00.000Z'),
        ubicacion: 'Aeropuerto de Bruselas-Zaventem (BRU)',
        latitud: 50.9010,
        longitud: 4.4855,
        costo: 613200,
        moneda: 'COP',
        ciudadOrigen: 'Madrid',
        paisOrigen: 'España',
        aeropuertoOrigen: 'MAD',
        ciudadDestino: 'Bruselas',
        paisDestino: 'Bélgica',
        aeropuertoDestino: 'BRU',
        notas: 'Llegada a Bélgica. Retiro de equipaje y traslado en tren a la ciudad.'
      },
      {
        titulo: 'Check-in Hotel The Augustin Bruselas',
        tipo: 'hotel',
        fechaInicio: new Date('2024-07-17T16:30:00.000Z'),
        fechaFin: new Date('2024-07-18T10:00:00.000Z'),
        ubicacion: 'The Augustin Hotel, Bruselas',
        latitud: 50.8436,
        longitud: 4.3438,
        costo: 854100,
        moneda: 'COP',
        notas: 'Noche de descanso y aclimatación previa al festival.'
      },

      // DÍA 3: Bruselas Colonial & Grand Place
      {
        titulo: 'Recorrido Grand Place, Manneken Pis & Cervecería Delirium',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-18T10:30:00.000Z'),
        fechaFin: new Date('2024-07-18T16:00:00.000Z'),
        ubicacion: 'Grand Place de Bruselas',
        latitud: 50.8467,
        longitud: 4.3524,
        costo: 120000,
        moneda: 'COP',
        notas: 'Degustación de chocolates belgas en Maison Dandoy y cata de cervezas artesanales.'
      },
      {
        titulo: 'Tren SNCB Bruselas Central ➔ Boom (Tomorrowland)',
        tipo: 'transporte',
        fechaInicio: new Date('2024-07-18T17:00:00.000Z'),
        fechaFin: new Date('2024-07-18T18:30:00.000Z'),
        ubicacion: 'Estación de Tren de Boom',
        latitud: 51.0867,
        longitud: 4.3644,
        costo: 45000,
        moneda: 'COP',
        notas: 'Tren especial del festival con fans de más de 80 países.'
      },

      // DÍA 3-7: TOMORROWLAND & DREAMVILLE CAMPING (Boom, De Schorre)
      {
        titulo: 'Ingreso a DreamVille & The Gathering (Opening Party)',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-18T19:00:00.000Z'),
        fechaFin: new Date('2024-07-19T01:00:00.000Z'),
        ubicacion: 'DreamVille Festival Camping, Boom',
        latitud: 51.0911,
        longitud: 4.3688,
        costo: 0,
        moneda: 'COP',
        notas: 'Activación de la pulsera Tomorrowland Bracelet con Pearls precargados.'
      },
      {
        titulo: 'Tomorrowland Día 1: Mainstage "Life" & Freedom Stage',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-19T12:00:00.000Z'),
        fechaFin: new Date('2024-07-20T01:00:00.000Z'),
        ubicacion: 'Parque De Schorre, Boom',
        latitud: 51.0911,
        longitud: 4.3688,
        costo: 5037000,
        moneda: 'COP',
        notas: 'Sets legendarios de Swedish House Mafia, Armin van Buuren y Hardwell.'
      },
      {
        titulo: 'Tomorrowland Día 2: Atmosphere & Core Stage en el bosque',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-20T12:00:00.000Z'),
        fechaFin: new Date('2024-07-21T01:00:00.000Z'),
        ubicacion: 'Parque De Schorre, Boom',
        latitud: 51.0911,
        longitud: 4.3688,
        costo: 0,
        moneda: 'COP',
        notas: 'Stage Core dentro de los bosques de De Schorre con sonido inmersivo.'
      },
      {
        titulo: 'Tomorrowland Día 3: Cierre Mágico & Fuegos Artificiales 20 Años',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-21T12:00:00.000Z'),
        fechaFin: new Date('2024-07-22T01:30:00.000Z'),
        ubicacion: 'Mainstage De Schorre, Boom',
        latitud: 51.0911,
        longitud: 4.3688,
        costo: 0,
        moneda: 'COP',
        notas: 'Gran ceremonia de clausura del vigésimo aniversario de Tomorrowland.'
      },

      // DÍA 8: Despedida de DreamVille y llegada a Amberes
      {
        titulo: 'Check-out DreamVille y Tren Boom ➔ Amberes Central',
        tipo: 'transporte',
        fechaInicio: new Date('2024-07-22T11:00:00.000Z'),
        fechaFin: new Date('2024-07-22T12:30:00.000Z'),
        ubicacion: 'Antwerpen-Centraal Station',
        latitud: 51.2172,
        longitud: 4.4214,
        costo: 35000,
        moneda: 'COP',
        notas: 'Llegada a una de las catedrales ferroviarias más bellas del mundo.'
      },
      {
        titulo: 'Check-in Hotel FRANQ Amberes & Centro Histórico',
        tipo: 'hotel',
        fechaInicio: new Date('2024-07-22T14:00:00.000Z'),
        fechaFin: new Date('2024-07-24T10:00:00.000Z'),
        ubicacion: 'Hotel FRANQ, Amberes',
        latitud: 51.2201,
        longitud: 4.4055,
        costo: 1664400,
        moneda: 'COP',
        notas: 'Recuperación post-festival en hotel boutique.'
      },

      // DÍA 9: Diamantes, Grote Markt & Castillo Het Steen en Amberes
      {
        titulo: 'Recorrido Casco Antiguo Amberes & Catedral de Nuestra Señora',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-23T10:00:00.000Z'),
        fechaFin: new Date('2024-07-23T17:00:00.000Z'),
        ubicacion: 'Grote Markt de Amberes',
        latitud: 51.2213,
        longitud: 4.3997,
        costo: 65000,
        moneda: 'COP',
        notas: 'Visita al distrito de los diamantes, estatua de Brabo y ribera del río Escalda.'
      },

      // DÍA 10: Tren hacia Gante (Gent)
      {
        titulo: 'Tren SNCB Amberes ➔ Gante Sint-Pieters',
        tipo: 'transporte',
        fechaInicio: new Date('2024-07-24T10:30:00.000Z'),
        fechaFin: new Date('2024-07-24T11:45:00.000Z'),
        ubicacion: 'Gent-Sint-Pieters',
        latitud: 51.0359,
        longitud: 3.7107,
        costo: 52000,
        moneda: 'COP',
        notas: 'Viaje en tren interurbano por la región de Flandes.'
      },
      {
        titulo: 'Castillo de los Condes de Flandes (Gravensteen) & Graslei',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-24T14:00:00.000Z'),
        fechaFin: new Date('2024-07-24T19:30:00.000Z'),
        ubicacion: 'Gravensteen, Gante',
        latitud: 51.0575,
        longitud: 3.7214,
        costo: 56940,
        moneda: 'COP',
        notas: 'Fortaleza medieval intacta y atardecer en los muelles de Graslei.'
      },

      // DÍA 11: Tren hacia Brujas (Brugge) - La Venecia del Norte
      {
        titulo: 'Tren SNCB Gante ➔ Brujas',
        tipo: 'transporte',
        fechaInicio: new Date('2024-07-25T09:30:00.000Z'),
        fechaFin: new Date('2024-07-25T10:15:00.000Z'),
        ubicacion: 'Estación de Brujas',
        latitud: 51.1972,
        longitud: 3.2167,
        costo: 38000,
        moneda: 'COP',
        notas: 'Llegada a la joya medieval Patrimonio UNESCO.'
      },
      {
        titulo: 'Paseo en Barco por los Canales de Brujas & Plaza Burg',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-25T11:30:00.000Z'),
        fechaFin: new Date('2024-07-25T17:00:00.000Z'),
        ubicacion: 'Rozenhoedkaai y Canales de Brujas',
        latitud: 51.2078,
        longitud: 3.2272,
        costo: 122640,
        moneda: 'COP',
        notas: 'El punto fotográfico más famoso de Bélgica y visita a la Basílica de la Santa Sangre.'
      },
      {
        titulo: 'Alojamiento Hotel Dukes’ Palace Brujas (Palacio del Siglo XV)',
        tipo: 'hotel',
        fechaInicio: new Date('2024-07-25T18:00:00.000Z'),
        fechaFin: new Date('2024-07-27T10:00:00.000Z'),
        ubicacion: 'Hotel Dukes’ Palace Brugge',
        latitud: 51.2084,
        longitud: 3.2201,
        costo: 2277600,
        moneda: 'COP',
        notas: 'Antigua residencia ducal flamenca en el corazón de Brujas.'
      },

      // DÍA 12: Molinos de Brujas, Lago del Amor & Cervecería De Halve Maan
      {
        titulo: 'Tour Cervecero De Halve Maan & Minnewaterpark (Lago del Amor)',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-26T11:00:00.000Z'),
        fechaFin: new Date('2024-07-26T16:30:00.000Z'),
        ubicacion: 'De Halve Maan Brewery, Brujas',
        latitud: 51.2006,
        longitud: 3.2241,
        costo: 148920,
        moneda: 'COP',
        notas: 'Cervecería histórica con oleoducto subterráneo exclusivo de cerveza.'
      },

      // DÍA 13: Regreso a Bruselas, compras finales y Atomium
      {
        titulo: 'Tren SNCB Brujas ➔ Bruselas Central',
        tipo: 'transporte',
        fechaInicio: new Date('2024-07-27T11:00:00.000Z'),
        fechaFin: new Date('2024-07-27T12:15:00.000Z'),
        ubicacion: 'Estación Central de Bruselas',
        latitud: 50.8456,
        longitud: 4.3572,
        costo: 68000,
        moneda: 'COP',
        notas: 'Última noche en la capital europea.'
      },
      {
        titulo: 'Visita al Atomium & Parque Mini-Europe',
        tipo: 'atraccion',
        fechaInicio: new Date('2024-07-27T14:00:00.000Z'),
        fechaFin: new Date('2024-07-27T18:00:00.000Z'),
        ubicacion: 'Atomium de Bruselas',
        latitud: 50.8949,
        longitud: 4.3415,
        costo: 70080,
        moneda: 'COP',
        notas: 'Monumento icono de la Expo 58 con vistas panorámicas.'
      },
      {
        titulo: 'Hotel Steigenberger Wiltcher’s Bruselas (Avenue Louise)',
        tipo: 'hotel',
        fechaInicio: new Date('2024-07-27T19:00:00.000Z'),
        fechaFin: new Date('2024-07-29T08:00:00.000Z'),
        ubicacion: 'Steigenberger Wiltcher’s, Bruselas',
        latitud: 50.8315,
        longitud: 4.3592,
        costo: 1927200,
        moneda: 'COP',
        notas: 'Hotel de lujo para empacar y preparar el retorno a Colombia.'
      },

      // DÍA 14: Regreso Europa ➔ Medellín directo (Vuelo Bruselas - Madrid y Madrid - Medellín directo)
      {
        titulo: 'Vuelo Bruselas ➔ Madrid (BRU ➔ MAD)',
        tipo: 'vuelo',
        fechaInicio: new Date('2024-07-29T10:15:00.000Z'),
        fechaFin: new Date('2024-07-29T12:45:00.000Z'),
        ubicacion: 'Aeropuerto de Bruselas-Zaventem (BRU)',
        latitud: 50.9010,
        longitud: 4.4855,
        costo: 613200,
        moneda: 'COP',
        ciudadOrigen: 'Bruselas',
        paisOrigen: 'Bélgica',
        aeropuertoOrigen: 'BRU',
        ciudadDestino: 'Madrid',
        paisDestino: 'España',
        aeropuertoDestino: 'MAD',
        notas: 'Conexión hacia la terminal transatlántica de Madrid-Barajas.'
      },
      {
        titulo: 'Vuelo Directo Europa ➔ Medellín (MAD ➔ MDE)',
        tipo: 'vuelo',
        fechaInicio: new Date('2024-07-29T15:30:00.000Z'),
        fechaFin: new Date('2024-07-29T20:15:00.000Z'),
        ubicacion: 'Aeropuerto Adolfo Suárez Madrid-Barajas (MAD)',
        latitud: 40.4839,
        longitud: -3.5679,
        costo: 3325000,
        moneda: 'COP',
        ciudadOrigen: 'Madrid',
        paisOrigen: 'España',
        aeropuertoOrigen: 'MAD',
        ciudadDestino: 'Medellín',
        paisDestino: 'Colombia',
        aeropuertoDestino: 'MDE',
        notas: 'Vuelo transatlántico directo de retorno a Colombia (Air Europa UX093 directo MAD ➔ MDE).'
      }
    ];

    console.log(`🗺️ Insertando ${eventosData.length} eventos de itinerario para Tomorrowland...`);
    for (const ev of eventosData) {
      await basePrisma.eventoItinerario.create({
        data: {
          viajeId: viaje.id,
          ...ev
        }
      });
    }

    // 3. Gastos Reales con tasas de cambio capturadas al momento de compra
    const gastosData = [
      // Costos Hundidos (Vuelos y Boletos comprados con anticipación)
      {
        concepto: 'Vuelo Internacional Directo Medellín ➔ Madrid ➔ Medellín (Air Europa Ida y Vuelta)',
        categoria: 'vuelos',
        montoOriginal: 7450000,
        monedaOriginal: 'COP',
        montoCOP: 7450000,
        montoUSD: 1853.23,
        tasaCambioFecha: 1.0,
        pagadoAdelantado: true,
        fechaGasto: new Date('2024-02-15T14:00:00.000Z')
      },
      {
        concepto: 'Vuelo Conexión Madrid ➔ Bruselas ➔ Madrid (Iberia Express)',
        categoria: 'vuelos',
        montoOriginal: 280,
        monedaOriginal: 'EUR',
        montoCOP: 1226400,
        montoUSD: 305.07,
        tasaCambioFecha: 4380,
        pagadoAdelantado: true,
        fechaGasto: new Date('2024-03-10T16:20:00.000Z')
      },
      {
        concepto: 'Paquete Tomorrowland: Full Madness Pass + DreamVille Spectacular Easy Tent 2P',
        categoria: 'actividades',
        montoOriginal: 1150,
        monedaOriginal: 'EUR',
        montoCOP: 5037000,
        montoUSD: 1252.98,
        tasaCambioFecha: 4380,
        pagadoAdelantado: true,
        fechaGasto: new Date('2024-02-03T18:00:00.000Z')
      },
      {
        concepto: 'Reserva Hotel The Augustin Bruselas (Noche previa festival)',
        categoria: 'alojamiento',
        montoOriginal: 195,
        monedaOriginal: 'EUR',
        montoCOP: 854100,
        montoUSD: 212.46,
        tasaCambioFecha: 4380,
        pagadoAdelantado: true,
        fechaGasto: new Date('2024-04-12T11:00:00.000Z')
      },
      {
        concepto: 'Reserva Hotel FRANQ Amberes (2 Noches boutique)',
        categoria: 'alojamiento',
        montoOriginal: 380,
        monedaOriginal: 'EUR',
        montoCOP: 1664400,
        montoUSD: 414.03,
        tasaCambioFecha: 4380,
        pagadoAdelantado: true,
        fechaGasto: new Date('2024-05-02T15:30:00.000Z')
      },
      {
        concepto: 'Reserva Hotel Dukes’ Palace Brujas (2 Noches 5 estrellas palacio)',
        categoria: 'alojamiento',
        montoOriginal: 520,
        monedaOriginal: 'EUR',
        montoCOP: 2277600,
        montoUSD: 566.57,
        tasaCambioFecha: 4380,
        pagadoAdelantado: true,
        fechaGasto: new Date('2024-05-18T10:00:00.000Z')
      },
      {
        concepto: 'Reserva Steigenberger Wiltcher’s Bruselas (2 Noches finales)',
        categoria: 'alojamiento',
        montoOriginal: 440,
        monedaOriginal: 'EUR',
        montoCOP: 1927200,
        montoUSD: 479.40,
        tasaCambioFecha: 4380,
        pagadoAdelantado: true,
        fechaGasto: new Date('2024-06-05T09:45:00.000Z')
      },

      // Gastos en Ruta / Durante el Viaje
      {
        concepto: 'Carga de Pearls Pulsera Tomorrowland (Alimentación & Bebidas De Schorre)',
        categoria: 'comida',
        montoOriginal: 350,
        monedaOriginal: 'EUR',
        montoCOP: 1533000,
        montoUSD: 381.34,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-18T20:00:00.000Z')
      },
      {
        concepto: 'Recarga adicional de Pearls en DreamVille para comidas y cócteles',
        categoria: 'comida',
        montoOriginal: 180,
        monedaOriginal: 'EUR',
        montoCOP: 788400,
        montoUSD: 196.12,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-20T17:30:00.000Z')
      },
      {
        concepto: 'Hoodie Oficial 20 Años Tomorrowland & Gorra Edición Especial',
        categoria: 'compras',
        montoOriginal: 165,
        monedaOriginal: 'EUR',
        montoCOP: 722700,
        montoUSD: 179.78,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-21T16:00:00.000Z')
      },
      {
        concepto: 'Pase de Tren SNCB Flandes Unlimited (Bruselas - Boom - Amberes - Gante - Brujas)',
        categoria: 'transporte',
        montoOriginal: 96,
        monedaOriginal: 'EUR',
        montoCOP: 420480,
        montoUSD: 104.60,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-18T16:30:00.000Z')
      },
      {
        concepto: 'Cena Flandes Típica: Mejillones con patatas fritas & Cerveza en Bruselas',
        categoria: 'comida',
        montoOriginal: 62,
        monedaOriginal: 'EUR',
        montoCOP: 271560,
        montoUSD: 67.55,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-18T21:30:00.000Z')
      },
      {
        concepto: 'Entrada y Tour Castillo de los Condes de Flandes Gravensteen Gante',
        categoria: 'actividades',
        montoOriginal: 13,
        monedaOriginal: 'EUR',
        montoCOP: 56940,
        montoUSD: 14.16,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-24T14:30:00.000Z')
      },
      {
        concepto: 'Paseo en bote canales de Brujas & Degustación Gofres de Lieja',
        categoria: 'actividades',
        montoOriginal: 28,
        monedaOriginal: 'EUR',
        montoCOP: 122640,
        montoUSD: 30.51,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-25T15:00:00.000Z')
      },
      {
        concepto: 'Cata de Cervezas De Halve Maan (Brugse Zot y Straffe Hendrik) en Brujas',
        categoria: 'comida',
        montoOriginal: 34,
        monedaOriginal: 'EUR',
        montoCOP: 148920,
        montoUSD: 37.04,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-26T16:00:00.000Z')
      },
      {
        concepto: 'Cajas de Chocolate Belga Artesanal Neuhaus & Pierre Marcolini',
        categoria: 'compras',
        montoOriginal: 85,
        monedaOriginal: 'EUR',
        montoCOP: 372300,
        montoUSD: 92.61,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-27T16:00:00.000Z')
      },
      {
        concepto: 'Entrada Atomium y Mirador Panorámico Bruselas',
        categoria: 'actividades',
        montoOriginal: 16,
        monedaOriginal: 'EUR',
        montoCOP: 70080,
        montoUSD: 17.43,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-27T14:30:00.000Z')
      },
      {
        concepto: 'Cena de Despedida Restaurante La Roue d’Or Bruselas',
        categoria: 'comida',
        montoOriginal: 78,
        monedaOriginal: 'EUR',
        montoCOP: 341640,
        montoUSD: 84.99,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        fechaGasto: new Date('2024-07-28T21:00:00.000Z')
      },

      // Reembolso Pearls sobrantes post-festival (esIngreso = true)
      {
        concepto: 'Reembolso Automático Pearls no gastados en Tomorrowland',
        categoria: 'actividades',
        montoOriginal: 42,
        monedaOriginal: 'EUR',
        montoCOP: 183960,
        montoUSD: 45.76,
        tasaCambioFecha: 4380,
        pagadoAdelantado: false,
        esIngreso: true, // Ingreso / Reembolso a favor
        fechaGasto: new Date('2024-07-29T12:00:00.000Z')
      }
    ];

    console.log(`💳 Insertando ${gastosData.length} gastos con lógica multidivisa y tasas capturadas...`);
    for (const g of gastosData) {
      await basePrisma.gasto.create({
        data: {
          viajeId: viaje.id,
          sincronizado: true,
          ...g
        }
      });
    }

    // 4. Documentos en la Bóveda
    const docsData = [
      {
        titulo: 'Pulsera Tomorrowland Bracelet & Treasure Case 2024',
        tipo: 'qr',
        notas: 'Código de activación de la pulsera RFID para acceso a DreamVille y De Schorre.'
      },
      {
        titulo: 'Boleto Electrónico Vuelo Directo Air Europa (MDE - MAD - MDE)',
        tipo: 'reserva',
        notas: 'Vuelo directo de Medellín a Europa sin escalas en Bogotá.'
      },
      {
        titulo: 'Pase de Tren SNCB Bélgica E-Ticket',
        tipo: 'reserva',
        notas: 'Código QR para viajes ilimitados entre Bruselas, Boom, Amberes y Brujas.'
      },
      {
        titulo: 'Póliza Asistencia en Viaje Schengen (Assist Card)',
        tipo: 'seguro',
        notas: 'Cobertura médica internacional requerida para ingreso al espacio Schengen.'
      },
      {
        titulo: 'Pasaporte Colombiano Biométrico',
        tipo: 'pasaporte',
        notas: 'Documento de identidad internacional del titular.'
      }
    ];

    console.log(`🗄️ Insertando ${docsData.length} documentos oficiales en la Bóveda...`);
    for (const doc of docsData) {
      await basePrisma.documentoBoveda.create({
        data: {
          viajeId: viaje.id,
          ...doc
        }
      });
    }

    console.log(`🎉 ¡Viaje Tomorrowland 2024 para usuario ${usuarioId} inyectado con éxito!`);
  }

  console.log('\n✨ ¡Semilla de Tomorrowland completada al 100%!');
}

seedTomorrowlandTrip()
  .catch(e => {
    console.error('❌ Error inyectando semilla de Tomorrowland:', e);
    process.exit(1);
  })
  .finally(async () => {
    await basePrisma.$disconnect();
  });
