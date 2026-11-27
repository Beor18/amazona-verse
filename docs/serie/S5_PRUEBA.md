# Serie · S5: prueba de costo (piloto B, «La carrera de Chispa»)

**Encargo de Kelvin (27-nov):** «quiero probar cuánto gasta esto, al fin y al cabo, un episodio». Kelvin todavía no escogió piloto. Se usa el **B** porque sale con los personajes que ya están en Higgsfield: Vittata, Chispa y Maestro Moon.

## Guion gráfico
Formato vertical 9:16, unos 64 s en 8 tomas de 8 s. Los fondos se generan nuevos: una selva y un valle inspirados en Puerto Rico, sin ningún paquete comprado.

| # | Tiempo | Toma | Personajes | Sonido |
|---|---|---|---|---|
| 1 | 0–8 s | **Gancho.** Chispa aterriza derrapando delante de Vittata en un claro de la selva. Vuelan hojas y polvo. «¡Hola, plumitas! ¿Una carrerita?» | Chispa y Vittata | Derrape y whoosh |
| 2 | 8–16 s | Vittata sostiene un engranaje de bronce; detrás, un puente roto al otro lado del valle. Lo piensa y entrecierra los ojos: «¡Trato hecho!» | Vittata y Chispa | Golpe de tambor |
| 3 | 16–24 s | La salida: Chispa sale disparado; Vittata enciende un turbo casero en la espalda. | Vittata y Chispa | Motor que tose |
| 4 | 24–32 s | El turbo falla: humo, vueltas y plumas por todos lados. Vittata acaba de cabeza en un arbusto. Es la parte cómica. | Vittata | Boing y plumas |
| 5 | 32–40 s | Maestro Moon, sereno sobre una roca: «La prisa no gana; la calma esquiva.» Hace un gesto de esquiva. | Moon y Vittata | Campanita |
| 6 | 40–48 s | Vittata vuela con calma esquivando ramas y alcanza a Chispa, que se quedó enredado en unas lianas. | Vittata y Chispa | Whooshes |
| 7 | 48–56 s | Vittata lo suelta. Juntos cargan el engranaje y lo encajan en el puente, que se cierra. | Vittata y Chispa | Clac metálico y fanfarria |
| 8 | 56–64 s | **Remate y cebo.** Celebran. Las gafas de Chispa pitan con una luz dorada: «Eh… ¿esto lo hiciste tú?» Corte a negro. | Chispa y Vittata | Bip bip y silencio |

## Cómo se produce
1. **Una imagen clave por toma (gratis).** Se hacen en la web con GPT Image 2.6 Unlimited, usando los elementos de los personajes como referencia. No gastan créditos.
2. **Animar cada imagen** con un modelo de video. Este es el único paso que gasta créditos.
3. **Montaje sin silencios.** Cada corte lleva su sonido y la música de Suno sale del repo (`assets/audio/musica/`).

## Precios cotizados (27-nov, `estimate_video_cost`)

| Modelo | Calidad | Créditos por toma de 8 s | Créditos por segundo |
|---|---|---|---|
| Seedance 2.0 fast | 720p | 20 | 2.5 |
| MAGI-2 | 1080p, más lento | 20 | 2.5 |
| Seedance 2.5 | 480p | 24 | 3 |
| Seedance 2.5 | 720p | 56 | 7 |
| Seedance 2.5 | 1080p | 128 | 16 |

### Lo que cuesta un episodio (estimado)
Se suma un **50 % de repeticiones**: es normal tener que rehacer tomas.

| Duración | Barato (2.5 créditos/s) | Bueno (7 créditos/s) | Alto (16 créditos/s) |
|---|---|---|---|
| Corto de 64 s, sin repeticiones | 160 | 448 | 1,024 |
| Corto de 64 s, con repeticiones | ~240 | ~670 | ~1,540 |
| Episodio de televisión de 11 min, con repeticiones | ~2,500 | ~6,900 | ~15,800 |

**Lo que se mide en la prueba:**
- Créditos gastados de verdad.
- Cuántas tomas hubo que repetir.
- Cuánto tiempo llevó.

Con eso se sustituyen los números estimados de arriba por números reales.
