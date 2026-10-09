require('dotenv').config();
const { basePrisma } = require('./src/config/prisma');

async function seedRealJapanTrip() {
  console.log('🚀 Iniciando inyección de viaje real a Japón (23 Días)...');

  // 1. Obtener usuarios destino
  const usuarios = await basePrisma.usuario.findMany();
  if (usuarios.length === 0) {
    throw new Error('No hay usuarios en la base de datos');
  }

  // Obtenemos los usuarios para asociarles el viaje
  const targetUserIds = usuarios.map(u => u.id);
  console.log(`👤 Inyectando para ${targetUserIds.length} usuario(s):`, usuarios.map(u => `${u.nombre} (${u.email})`));

  // Tasas de cambio estimadas para consistencia contable:
  // 1 USD = 4,000 COP
  // 1 EUR = 4,350 COP = 1.0875 USD
  // 1 PLN = 1,020 COP = 0.255 USD
  // 1 JPY = 26.5 COP  = 0.006625 USD

  const fechaInicio = new Date('2026-11-01T06:00:00.000Z');
  const fechaFin = new Date('2026-11-23T23:00:00.000Z');

  for (const usuarioId of targetUserIds) {
    console.log(`\n📦 Creando viaje para usuario ${usuarioId}...`);

    // Crear el viaje principal
    const viaje = await basePrisma.viaje.create({
      data: {
        usuarioId,
        titulo: 'Gran Expedición Japón & Escalas Europa (23 Días)',
        descripcion: 'Ruta completa: Medellín ➔ Bogotá ➔ Madrid ➔ Polonia (Varsovia) ➔ Japón (Tokio, Nagoya, Osaka, Kioto, Hiroshima, Tokio) ➔ Polonia ➔ Francia (París) ➔ Madrid ➔ Bogotá ➔ Medellín.',
        destino: '🇯🇵 Japón',
        fechaInicio,
        fechaFin,
        presupuestoTotal: 34000000, // 34M COP (~8,500 USD)
        monedaBase: 'COP',
        monedaReferencia: 'USD',
        monedaLocal: 'JPY'
      }
    });

    console.log(`✅ Viaje creado ID: ${viaje.id}`);

    // Presupuestos por Categoría
    const presupuestos = [
      { categoria: 'vuelos', limite: 14000000 },
      { categoria: 'alojamiento', limite: 7500000 },
      { categoria: 'transporte', limite: 4500000 },
      { categoria: 'comida', limite: 4000000 },
      { categoria: 'actividades', limite: 2500000 },
      { categoria: 'compras', limite: 1500000 }
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

    // 2. Eventos del Itinerario con coordenadas reales y aeropuertos
    const eventosData = [
      // DÍA 1: Medellín ➔ Bogotá ➔ Madrid
      {
        titulo: 'Vuelo MDE ➔ BOG ➔ MAD (Salida de Colombia)',
        tipo: 'vuelo',
        fechaInicio: new Date('2026-11-01T08:00:00.000Z'),
        fechaFin: new Date('2026-11-01T23:30:00.000Z'),
        ubicacion: 'Aeropuerto Internacional José María Córdova (MDE)',
        latitud: 6.1645,
        longitud: -75.4231,
        costo: 3850000,
        moneda: 'COP',
        ciudadOrigen: 'Medellín',
        paisOrigen: 'Colombia',
        aeropuertoOrigen: 'MDE',
        ciudadDestino: 'Madrid',
        paisDestino: 'España',
        aeropuertoDestino: 'MAD',
        tieneConexion: true,
        aeropuertoConexion: 'BOG',
        ciudadConexion: 'Bogotá',
        paisConexion: 'Colombia',
        notas: 'Vuelo intercontinental nocturno hacia Europa cruzando el Atlántico.'
      },
      // DÍA 2: Madrid ➔ Varsovia (Polonia)
      {
        titulo: 'Vuelo MAD ➔ WAW y Noche en Varsovia',
        tipo: 'vuelo',
        fechaInicio: new Date('2026-11-02T06:00:00.000Z'),
        fechaFin: new Date('2026-11-02T10:15:00.000Z'),
        ubicacion: 'Aeropuerto Chopin de Varsovia (WAW)',
        latitud: 52.1672,
        longitud: 20.9679,
        costo: 680000,
        moneda: 'COP',
        ciudadOrigen: 'Madrid',
        paisOrigen: 'España',
        aeropuertoOrigen: 'MAD',
        ciudadDestino: 'Varsovia',
        paisDestino: 'Polonia',
        aeropuertoDestino: 'WAW',
        notas: 'Conexión europea hacia Polonia antes del vuelo transiberiano a Tokio.'
      },
      {
        titulo: 'Hotel Bristol Varsovia (Centro Histórico)',
        tipo: 'hotel',
        fechaInicio: new Date('2026-11-02T14:00:00.000Z'),
        fechaFin: new Date('2026-11-03T11:00:00.000Z'),
        ubicacion: 'Krakowskie Przedmieście 42/44, Varsovia',
        latitud: 52.2431,
        longitud: 21.0163,
        costo: 520,
        moneda: 'PLN',
        notas: 'Hospedaje junto al casco antiguo (Rynek Starego Miasta).'
      },
      // DÍA 3: Varsovia ➔ Tokio
      {
        titulo: 'Vuelo Intercontinental WAW ➔ NRT (LOT Polish Airlines)',
        tipo: 'vuelo',
        fechaInicio: new Date('2026-11-03T15:00:00.000Z'),
        fechaFin: new Date('2026-11-04T09:30:00.000Z'),
        ubicacion: 'Aeropuerto Chopin de Varsovia (WAW)',
        latitud: 52.1672,
        longitud: 20.9679,
        costo: 3900000,
        moneda: 'COP',
        ciudadOrigen: 'Varsovia',
        paisOrigen: 'Polonia',
        aeropuertoOrigen: 'WAW',
        ciudadDestino: 'Tokio',
        paisDestino: 'Japón',
        aeropuertoDestino: 'NRT',
        notas: 'Vuelo directo de 13 horas cruzando hacia Asia.'
      },
      // DÍA 4: Llegada a Tokio & Shinjuku
      {
        titulo: 'Llegada a Tokio & Hotel Gracery Shinjuku (Godzilla)',
        tipo: 'hotel',
        fechaInicio: new Date('2026-11-04T12:00:00.000Z'),
        fechaFin: new Date('2026-11-07T10:00:00.000Z'),
        ubicacion: 'Kabukicho, Shinjuku, Tokio',
        latitud: 35.6953,
        longitud: 139.7020,
        costo: 78000,
        moneda: 'JPY',
        notas: 'Hotel icónico en Kabukicho con la cabeza gigante de Godzilla en la terraza.'
      },
      // DÍA 5: Shibuya & Harajuku
      {
        titulo: 'Cruce de Shibuya, Estatua Hachiko & Shibuya Sky',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-05T10:00:00.000Z'),
        fechaFin: new Date('2026-11-05T14:00:00.000Z'),
        ubicacion: 'Shibuya Scramble Crossing, Tokio',
        latitud: 35.6595,
        longitud: 139.7005,
        costo: 2500,
        moneda: 'JPY',
        notas: 'Mirador a 229 metros en Shibuya Sky con vista al Monte Fuji y la metrópolis.'
      },
      // DÍA 6: Asakusa & Akihabara
      {
        titulo: 'Templo Senso-ji en Asakusa & Cultura Otaku en Akihabara',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-06T09:00:00.000Z'),
        fechaFin: new Date('2026-11-06T18:00:00.000Z'),
        ubicacion: 'Asakusa Sensoji & Akihabara Electric Town',
        latitud: 35.7148,
        longitud: 139.7967,
        costo: 0,
        moneda: 'JPY',
        notas: 'Templo budista más antiguo de Tokio fundado en el año 645, seguido de compras en Radio Kaikan.'
      },
      // DÍA 7: Shinkansen Tokio ➔ Nagoya
      {
        titulo: 'Tren Bala Shinkansen Nozomi (Tokio ➔ Nagoya)',
        tipo: 'transporte',
        fechaInicio: new Date('2026-11-07T08:30:00.000Z'),
        fechaFin: new Date('2026-11-07T10:10:00.000Z'),
        ubicacion: 'Estación de Tokio ➔ Estación de Nagoya',
        latitud: 35.1709,
        longitud: 136.8815,
        costo: 11300,
        moneda: 'JPY',
        notas: 'Trayecto en tren bala a 285 km/h viendo el Monte Fuji por la ventanilla derecha.'
      },
      {
        titulo: 'Castillo de Nagoya y Museo Toyota',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-07T11:30:00.000Z'),
        fechaFin: new Date('2026-11-07T16:30:00.000Z'),
        ubicacion: '1-1 Honmaru, Naka Ward, Nagoya',
        latitud: 35.1848,
        longitud: 136.8997,
        costo: 1000,
        moneda: 'JPY',
        notas: 'Castillo con los delfines dorados (Kinshachi) y museo de origen industrial de Toyota.'
      },
      // DÍA 8: Nagoya ➔ Osaka
      {
        titulo: 'Tren Bala Shinkansen (Nagoya ➔ Shin-Osaka)',
        tipo: 'transporte',
        fechaInicio: new Date('2026-11-08T09:00:00.000Z'),
        fechaFin: new Date('2026-11-08T09:50:00.000Z'),
        ubicacion: 'Shin-Osaka Station',
        latitud: 34.7335,
        longitud: 135.5003,
        costo: 6680,
        moneda: 'JPY',
        notas: 'Llegada a la capital gastronómica y nocturna de Kansai.'
      },
      {
        titulo: 'Dotonbori Street Food & Castillo de Osaka',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-08T15:00:00.000Z'),
        fechaFin: new Date('2026-11-08T22:00:00.000Z'),
        ubicacion: 'Dotonbori Glico Sign & Osaka Castle',
        latitud: 34.6687,
        longitud: 135.5013,
        costo: 3500,
        moneda: 'JPY',
        notas: 'Cena de Takoyaki gigante, Okonomiyaki y foto en el cartel icónico de Glico Man.'
      },
      // DÍA 9: Osaka Universal Studios
      {
        titulo: 'Universal Studios Japan (Super Nintendo World)',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-09T08:00:00.000Z'),
        fechaFin: new Date('2026-11-09T19:00:00.000Z'),
        ubicacion: 'Konohana Ward, Osaka',
        latitud: 34.6654,
        longitud: 135.4323,
        costo: 12500,
        moneda: 'JPY',
        notas: 'Pase con pulsera Power-Up Band para Mario Kart Koopa\'s Challenge y Harry Potter.'
      },
      // DÍA 10: Osaka ➔ Kioto
      {
        titulo: 'Tren JR Special Rapid (Osaka ➔ Kioto) & Ryokan Gion',
        tipo: 'hotel',
        fechaInicio: new Date('2026-11-10T10:00:00.000Z'),
        fechaFin: new Date('2026-11-12T11:00:00.000Z'),
        ubicacion: 'Gion District, Kioto',
        latitud: 35.0037,
        longitud: 135.7772,
        costo: 95000,
        moneda: 'JPY',
        notas: 'Ryokan tradicional japonés con tatami, cena Kaiseki y baños termales Onsen.'
      },
      {
        titulo: 'Santuario Fushimi Inari Taisha (Torii Rojos)',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-10T14:30:00.000Z'),
        fechaFin: new Date('2026-11-10T18:00:00.000Z'),
        ubicacion: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kioto',
        latitud: 34.9671,
        longitud: 135.7727,
        costo: 0,
        moneda: 'JPY',
        notas: 'Caminata por los más de 10,000 pórticos torii bermellón que suben la montaña sagrada.'
      },
      // DÍA 11: Kioto Arashiyama & Pabellón Dorado
      {
        titulo: 'Bosque de Bambú de Arashiyama & Templo Kinkaku-ji',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-11T08:30:00.000Z'),
        fechaFin: new Date('2026-11-11T16:00:00.000Z'),
        ubicacion: 'Sagatenryuji, Ukyo Ward & Kinkakuji, Kioto',
        latitud: 35.0394,
        longitud: 135.7292,
        costo: 900,
        moneda: 'JPY',
        notas: 'Pabellón cubierto de hojas de oro puro reflejado en el estanque Kyoko-chi.'
      },
      // DÍA 12: Kioto ➔ Hiroshima
      {
        titulo: 'Shinkansen Sakura (Kioto ➔ Hiroshima)',
        tipo: 'transporte',
        fechaInicio: new Date('2026-11-12T08:00:00.000Z'),
        fechaFin: new Date('2026-11-12T09:45:00.000Z'),
        ubicacion: 'Hiroshima Station',
        latitud: 34.3976,
        longitud: 132.4753,
        costo: 12100,
        moneda: 'JPY',
        notas: 'Tren bala a través del oeste de Japón hacia la prefectura de Hiroshima.'
      },
      {
        titulo: 'Parque de la Paz y Cúpula de la Bomba Atómica (Genbaku Dome)',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-12T11:00:00.000Z'),
        fechaFin: new Date('2026-11-12T16:00:00.000Z'),
        ubicacion: '1-1 Nakajimacho, Naka Ward, Hiroshima',
        latitud: 34.3955,
        longitud: 132.4536,
        costo: 200,
        moneda: 'JPY',
        notas: 'Monumento Patrimonio de la Humanidad UNESCO en memoria de la paz mundial.'
      },
      // DÍA 13: Isla de Miyajima
      {
        titulo: 'Isla Sagrada de Miyajima & Torii Flotante Itsukushima',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-13T09:00:00.000Z'),
        fechaFin: new Date('2026-11-13T17:00:00.000Z'),
        ubicacion: 'Itsukushima, Hatsukaichi, Hiroshima',
        latitud: 34.2959,
        longitud: 132.3197,
        costo: 2400,
        moneda: 'JPY',
        notas: 'Ferry JR a la isla, contacto con los ciervos sika dóciles y templo sobre el agua.'
      },
      // DÍA 14: Hiroshima ➔ Tokio
      {
        titulo: 'Shinkansen Nozomi (Hiroshima ➔ Tokio)',
        tipo: 'transporte',
        fechaInicio: new Date('2026-11-14T08:30:00.000Z'),
        fechaFin: new Date('2026-11-14T12:30:00.000Z'),
        ubicacion: 'Tokyo Station & Hotel en Ginza',
        latitud: 35.6812,
        longitud: 139.7671,
        costo: 19500,
        moneda: 'JPY',
        notas: 'Retorno a Tokio a toda velocidad para la última etapa nipona.'
      },
      {
        titulo: 'TeamLab Planets Tokio (Arte Digital Inmersivo)',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-14T15:30:00.000Z'),
        fechaFin: new Date('2026-11-14T18:30:00.000Z'),
        ubicacion: 'Toyosu, Koto City, Tokio',
        latitud: 35.6517,
        longitud: 139.7915,
        costo: 3800,
        moneda: 'JPY',
        notas: 'Experiencia interactiva caminando descalzo por el agua con luces y jardines flotantes.'
      },
      // DÍA 15: Tokio Souvenirs & Odaiba
      {
        titulo: 'Odaiba Gundam Gigante & Vistas a la Torre de Tokio',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-15T10:00:00.000Z'),
        fechaFin: new Date('2026-11-15T19:00:00.000Z'),
        ubicacion: 'DiverCity Tokyo Plaza, Odaiba',
        latitud: 35.6251,
        longitud: 139.7753,
        costo: 0,
        moneda: 'JPY',
        notas: 'Estatua Unicorn Gundam a escala 1:1 (19.7 metros) que se transforma con luces.'
      },
      // DÍA 16: Tokio ➔ Polonia (Retorno a Europa)
      {
        titulo: 'Vuelo NRT ➔ WAW (Tokio a Varsovia, Polonia)',
        tipo: 'vuelo',
        fechaInicio: new Date('2026-11-16T11:00:00.000Z'),
        fechaFin: new Date('2026-11-16T17:45:00.000Z'),
        ubicacion: 'Aeropuerto Internacional de Narita (NRT)',
        latitud: 35.7720,
        longitud: 140.3929,
        costo: 3400000,
        moneda: 'COP',
        ciudadOrigen: 'Tokio',
        paisOrigen: 'Japón',
        aeropuertoOrigen: 'NRT',
        ciudadDestino: 'Varsovia',
        paisDestino: 'Polonia',
        aeropuertoDestino: 'WAW',
        notas: 'Vuelo de regreso cruzando continentes hacia Europa Central.'
      },
      // DÍA 17: Polonia (Varsovia gastronómica)
      {
        titulo: 'Cultura y Gastronomía Polaca en Varsovia',
        tipo: 'comida',
        fechaInicio: new Date('2026-11-17T12:00:00.000Z'),
        fechaFin: new Date('2026-11-17T16:00:00.000Z'),
        ubicacion: 'Rynek Starego Miasta, Varsovia',
        latitud: 52.2497,
        longitud: 21.0122,
        costo: 180,
        moneda: 'PLN',
        notas: 'Almuerzo tradicional de Pierogi ruski, sopa Zurek y caminata por el río Vístula.'
      },
      // DÍA 18: Polonia ➔ Francia (París)
      {
        titulo: 'Vuelo WAW ➔ CDG (Varsovia ➔ París Charles de Gaulle)',
        tipo: 'vuelo',
        fechaInicio: new Date('2026-11-18T09:15:00.000Z'),
        fechaFin: new Date('2026-11-18T11:45:00.000Z'),
        ubicacion: 'Aeropuerto Charles de Gaulle de París (CDG)',
        latitud: 49.0097,
        longitud: 2.5479,
        costo: 510000,
        moneda: 'COP',
        ciudadOrigen: 'Varsovia',
        paisOrigen: 'Polonia',
        aeropuertoOrigen: 'WAW',
        ciudadDestino: 'París',
        paisDestino: 'Francia',
        aeropuertoDestino: 'CDG',
        notas: 'Llegada a Francia para los dos días mágicos en París.'
      },
      {
        titulo: 'Hotel Mercure París Montmartre Sacré-Cœur',
        tipo: 'hotel',
        fechaInicio: new Date('2026-11-18T14:00:00.000Z'),
        fechaFin: new Date('2026-11-20T10:00:00.000Z'),
        ubicacion: '3 Rue Caulaincourt, 75018 París',
        latitud: 48.8856,
        longitud: 2.3308,
        costo: 420,
        moneda: 'EUR',
        notas: 'Hospedaje en el barrio de los pintores, a pasos del Moulin Rouge y Basílica Sacré-Cœur.'
      },
      // DÍA 19: París (Torre Eiffel & Louvre)
      {
        titulo: 'Torre Eiffel, Museo del Louvre y Crucero por el Sena',
        tipo: 'atraccion',
        fechaInicio: new Date('2026-11-19T09:30:00.000Z'),
        fechaFin: new Date('2026-11-19T18:00:00.000Z'),
        ubicacion: 'Champ de Mars & Musée du Louvre, París',
        latitud: 48.8584,
        longitud: 2.2945,
        costo: 75,
        moneda: 'EUR',
        notas: 'Subida al 2do piso de la Torre Eiffel y visita a la Gioconda en el Louvre.'
      },
      // DÍA 20: Francia ➔ España (Madrid)
      {
        titulo: 'Vuelo CDG ➔ MAD (París ➔ Madrid Barajas)',
        tipo: 'vuelo',
        fechaInicio: new Date('2026-11-20T11:30:00.000Z'),
        fechaFin: new Date('2026-11-20T13:40:00.000Z'),
        ubicacion: 'Aeropuerto Adolfo Suárez Madrid-Barajas (MAD)',
        latitud: 40.4839,
        longitud: -3.5680,
        costo: 430000,
        moneda: 'COP',
        ciudadOrigen: 'París',
        paisOrigen: 'Francia',
        aeropuertoOrigen: 'CDG',
        ciudadDestino: 'Madrid',
        paisDestino: 'España',
        aeropuertoDestino: 'MAD',
        notas: 'Arribo a Madrid para la última escala europea.'
      },
      {
        titulo: 'Hotel Riu Plaza España (Gran Vía, Madrid)',
        tipo: 'hotel',
        fechaInicio: new Date('2026-11-20T15:00:00.000Z'),
        fechaFin: new Date('2026-11-22T10:00:00.000Z'),
        ubicacion: 'Gran Vía 84, Madrid',
        latitud: 40.4239,
        longitud: -3.7118,
        costo: 380,
        moneda: 'EUR',
        notas: 'Famoso mirador de 360 grados y pasarela de cristal sobre Madrid.'
      },
      // DÍA 21: Madrid Clásico
      {
        titulo: 'Tapas en Mercado de San Miguel & Parque del Retiro',
        tipo: 'comida',
        fechaInicio: new Date('2026-11-21T12:00:00.000Z'),
        fechaFin: new Date('2026-11-21T18:00:00.000Z'),
        ubicacion: 'Plaza de San Miguel & Parque de El Retiro, Madrid',
        latitud: 40.4154,
        longitud: -3.7089,
        costo: 90,
        moneda: 'EUR',
        notas: 'Jamón ibérico de bellota, croquetas de boletus, vinos y paseo en barca por el estanque del Retiro.'
      },
      // DÍA 22: Retorno Madrid ➔ Bogotá ➔ Medellín
      {
        titulo: 'Vuelo Transatlántico MAD ➔ BOG ➔ MDE (Retorno a Colombia)',
        tipo: 'vuelo',
        fechaInicio: new Date('2026-11-22T12:15:00.000Z'),
        fechaFin: new Date('2026-11-22T23:45:00.000Z'),
        ubicacion: 'Aeropuerto Adolfo Suárez Madrid-Barajas (MAD)',
        latitud: 40.4839,
        longitud: -3.5680,
        costo: 3950000,
        moneda: 'COP',
        ciudadOrigen: 'Madrid',
        paisOrigen: 'España',
        aeropuertoOrigen: 'MAD',
        ciudadDestino: 'Medellín',
        paisDestino: 'Colombia',
        aeropuertoDestino: 'MDE',
        tieneConexion: true,
        aeropuertoConexion: 'BOG',
        ciudadConexion: 'Bogotá',
        paisConexion: 'Colombia',
        notas: 'Cruce del Atlántico de regreso a casa tras 23 días épicos.'
      },
      // DÍA 23: Llegada a Medellín
      {
        titulo: 'Llegada a Medellín (Hogar dulce hogar)',
        tipo: 'otro',
        fechaInicio: new Date('2026-11-23T01:00:00.000Z'),
        fechaFin: new Date('2026-11-23T03:00:00.000Z'),
        ubicacion: 'Medellín, Antioquia, Colombia',
        latitud: 6.2442,
        longitud: -75.5812,
        costo: 90000,
        moneda: 'COP',
        notas: 'Taxi aeropuerto MDE por el túnel de Oriente a Medellín. Fin del viaje.'
      }
    ];

    console.log(`📍 Insertando ${eventosData.length} eventos del itinerario...`);
    const createdEventos = [];
    for (const ev of eventosData) {
      const e = await basePrisma.eventoItinerario.create({
        data: {
          viajeId: viaje.id,
          ...ev
        }
      });
      createdEventos.push(e);
    }

    // 3. Gastos Financieros Reales (Costos Hundidos, En Ruta, Tax-Free y Terceros)
    const gastosData = [
      // Costos Hundidos (Pagados por adelantado)
      {
        concepto: 'Vuelo Intercontinental MDE - BOG - MAD - WAW (Ida)',
        categoria: 'transporte',
        montoOriginal: 4530000,
        monedaOriginal: 'COP',
        montoCOP: 4530000,
        montoUSD: 1132.50,
        pagadoAdelantado: true,
        fechaGasto: new Date('2026-09-15T10:00:00.000Z')
      },
      {
        concepto: 'Vuelo Intercontinental WAW - NRT - WAW (LOT Polish Airlines)',
        categoria: 'transporte',
        montoOriginal: 7300000,
        monedaOriginal: 'COP',
        montoCOP: 7300000,
        montoUSD: 1825.00,
        pagadoAdelantado: true,
        fechaGasto: new Date('2026-09-20T10:00:00.000Z')
      },
      {
        concepto: 'Vuelo Retorno Europa - Colombia (MAD - BOG - MDE)',
        categoria: 'transporte',
        montoOriginal: 3950000,
        monedaOriginal: 'COP',
        montoCOP: 3950000,
        montoUSD: 987.50,
        pagadoAdelantado: true,
        fechaGasto: new Date('2026-09-25T10:00:00.000Z')
      },
      {
        concepto: 'Japan Rail Pass Nacional 7 Días (Shinkansen Ilimitado)',
        categoria: 'transporte',
        montoOriginal: 50000,
        monedaOriginal: 'JPY',
        montoCOP: 1325000,
        montoUSD: 331.25,
        pagadoAdelantado: true,
        fechaGasto: new Date('2026-10-01T15:00:00.000Z')
      },
      {
        concepto: 'Reserva Hotel Gracery Shinjuku Tokio (3 noches)',
        categoria: 'alojamiento',
        montoOriginal: 78000,
        monedaOriginal: 'JPY',
        montoCOP: 2067000,
        montoUSD: 516.75,
        pagadoAdelantado: true,
        fechaGasto: new Date('2026-10-05T12:00:00.000Z')
      },
      {
        concepto: 'Reserva Ryokan Tradicional con Onsen en Gion Kioto (2 noches)',
        categoria: 'alojamiento',
        montoOriginal: 95000,
        monedaOriginal: 'JPY',
        montoCOP: 2517500,
        montoUSD: 629.38,
        pagadoAdelantado: true,
        fechaGasto: new Date('2026-10-10T12:00:00.000Z')
      },
      {
        concepto: 'Entradas Universal Studios Japan + Super Nintendo World Express Pass',
        categoria: 'actividades',
        montoOriginal: 19800,
        monedaOriginal: 'JPY',
        montoCOP: 524700,
        montoUSD: 131.18,
        pagadoAdelantado: true,
        fechaGasto: new Date('2026-10-12T14:00:00.000Z')
      },

      // Gastos en Ruta (Día a día en Japón y Europa)
      {
        concepto: 'Noche y cena Pierogi en Varsovia (Escala Polonia)',
        categoria: 'comida',
        montoOriginal: 180,
        monedaOriginal: 'PLN',
        montoCOP: 183600,
        montoUSD: 45.90,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-02T20:00:00.000Z')
      },
      {
        concepto: 'Recarga Tarjeta Suica Transporte Metro de Tokio',
        categoria: 'transporte',
        montoOriginal: 5000,
        monedaOriginal: 'JPY',
        montoCOP: 132500,
        montoUSD: 33.13,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-04T14:00:00.000Z')
      },
      {
        concepto: 'Cena Ramen Ichiran y Gyozas en Shinjuku',
        categoria: 'comida',
        montoOriginal: 2400,
        monedaOriginal: 'JPY',
        montoCOP: 63600,
        montoUSD: 15.90,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-04T21:00:00.000Z')
      },
      {
        concepto: 'Entrada Mirador Shibuya Sky al atardecer',
        categoria: 'actividades',
        montoOriginal: 2500,
        monedaOriginal: 'JPY',
        montoCOP: 66250,
        montoUSD: 16.56,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-05T17:30:00.000Z')
      },
      {
        concepto: 'Cena Wagyu A5 Yakiniku en Shibuya',
        categoria: 'comida',
        montoOriginal: 9800,
        monedaOriginal: 'JPY',
        montoCOP: 259700,
        montoUSD: 64.93,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-05T21:00:00.000Z')
      },
      {
        concepto: 'Street Food Dotonbori (Takoyaki, Kushikatsu y cerveza Asahi)',
        categoria: 'comida',
        montoOriginal: 3800,
        monedaOriginal: 'JPY',
        montoCOP: 100700,
        montoUSD: 25.18,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-08T20:30:00.000Z')
      },
      {
        concepto: 'Ceremonia de Té tradicional Matcha en Kioto',
        categoria: 'actividades',
        montoOriginal: 3500,
        monedaOriginal: 'JPY',
        montoCOP: 92750,
        montoUSD: 23.19,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-11T11:00:00.000Z')
      },
      {
        concepto: 'Hiroshima Okonomiyaki Especial en Okonomimura',
        categoria: 'comida',
        montoOriginal: 1600,
        monedaOriginal: 'JPY',
        montoCOP: 42400,
        montoUSD: 10.60,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-12T19:30:00.000Z')
      },
      {
        concepto: 'Entrada TeamLab Planets Tokio (Arte Inmersivo)',
        categoria: 'actividades',
        montoOriginal: 3800,
        monedaOriginal: 'JPY',
        montoCOP: 100700,
        montoUSD: 25.18,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-14T15:00:00.000Z')
      },
      {
        concepto: 'Cena Bistró en Montmartre París (Foie gras, Pato confitado, Vino Burdeos)',
        categoria: 'comida',
        montoOriginal: 85,
        monedaOriginal: 'EUR',
        montoCOP: 369750,
        montoUSD: 92.44,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-18T20:30:00.000Z')
      },
      {
        concepto: 'Subida Torre Eiffel y Crucero por el Sena París',
        categoria: 'actividades',
        montoOriginal: 52,
        monedaOriginal: 'EUR',
        montoCOP: 226200,
        montoUSD: 56.55,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-19T11:00:00.000Z')
      },
      {
        concepto: 'Ruta de Tapas y Jamón Ibérico en Mercado de San Miguel Madrid',
        categoria: 'comida',
        montoOriginal: 74,
        monedaOriginal: 'EUR',
        montoCOP: 321900,
        montoUSD: 80.48,
        pagadoAdelantado: false,
        fechaGasto: new Date('2026-11-21T14:00:00.000Z')
      },

      // Caso Especial RF: Encargo para Terceros (noComputar = true)
      {
        concepto: 'Figura de Colección Anime en Akihabara (Encargo para amigo)',
        categoria: 'compras',
        montoOriginal: 14500,
        monedaOriginal: 'JPY',
        montoCOP: 384250,
        montoUSD: 96.06,
        pagadoAdelantado: false,
        noComputar: true, // No descuenta del presupuesto del usuario
        fechaGasto: new Date('2026-11-06T17:00:00.000Z')
      },

      // Caso Especial RF: Reembolso Tax-Free a favor (esIngreso = true)
      {
        concepto: 'Reembolso Tax-Free 10% en Yodobashi Camera Akihabara',
        categoria: 'compras',
        montoOriginal: 4800,
        monedaOriginal: 'JPY',
        montoCOP: 127200,
        montoUSD: 31.80,
        pagadoAdelantado: false,
        esIngreso: true, // Reduce gastos totales del viaje
        fechaGasto: new Date('2026-11-06T18:30:00.000Z')
      }
    ];

    console.log(`💳 Insertando ${gastosData.length} gastos con lógica multidivisa y costos hundidos...`);
    for (const g of gastosData) {
      await basePrisma.gasto.create({
        data: {
          viajeId: viaje.id,
          sincronizado: true,
          ...g
        }
      });
    }

    // 4. Documentos en la Bóveda de Documentos
    const docsData = [
      {
        titulo: 'Pasaporte Colombiano Vigente',
        tipo: 'pasaporte',
        notas: 'Pasaporte biométrico con vigencia superior a 6 meses para ingreso al espacio Schengen y Japón.'
      },
      {
        titulo: 'Póliza Seguro Médico Internacional (Cobertura 100k USD)',
        tipo: 'seguro',
        notas: 'Póliza Assist Card con cobertura médica integral, repatriación y cobertura de equipaje.'
      },
      {
        titulo: 'Japan Rail Pass Voucher de Canje (7 Días Shinkansen)',
        tipo: 'qr',
        notas: 'Código de canje para entregar en la oficina JR del Aeropuerto de Narita o Estación Shinjuku.'
      },
      {
        titulo: 'Boleto Electrónico Avianca & LOT Polish (MDE - BOG - MAD - WAW - NRT)',
        tipo: 'reserva',
        notas: 'Localizador de reserva con confirmación de equipaje de 23kg en bodega.'
      },
      {
        titulo: 'Confirmación Ryokan Gion Kioto con Onsen Privado',
        tipo: 'reserva',
        notas: 'Reserva confirmada con desayuno tradicional japonés y cena Kaiseki incluida.'
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

    console.log(`🎉 Inyección completada exitosamente para usuario ${usuarioId}!`);
  }

  console.log('\n======================================================');
  console.log('✨ Simulación completa de Viaje de 23 Días inyectada con éxito en Supabase!');
  console.log('======================================================');
}

seedRealJapanTrip()
  .catch(err => {
    console.error('❌ Error al inyectar datos:', err);
    process.exit(1);
  })
  .finally(() => basePrisma.$disconnect());
