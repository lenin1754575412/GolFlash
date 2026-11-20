# GolFlash — actualización completa del diseño negro

Este paquete **actualiza tu proyecto Expo existente**. No es un repositorio nuevo.

## Funcionalidades

- Partidos con fechas reales, hora de Perú, marcador, estado, logos cuando estén disponibles y detalle del encuentro.
- Ayer / Hoy / Directo / Mañana y calendario con fechas cercanas.
- Explorar ligas y buscar equipos/competiciones.
- Favoritos que se conservan localmente, incluso sin Internet.
- Noticias de fútbol y sección de fichajes que **filtra noticias de transferencias**. Las noticias se abren en el medio original.
- Menú lateral y 5 botones inferiores operativos, botón actualizar y recarga de datos.
- Fuente principal: ESPN, endpoints públicos **no oficiales** que pueden cambiar; respaldo para resultados con TheSportsDB (cobertura gratuita limitada). Nunca muestra resultados inventados.

## Instalar sobre el proyecto existente

1. Detén Expo: `Ctrl + C` en su terminal.
2. Asegúrate de tener `C:\Users\Johan\Desktop\GolFlash` (o adapta la carpeta).
3. Haz respaldo de `src\App.tsx` si deseas.
4. Descomprime este ZIP en la **carpeta raíz GolFlash**, no dentro de `src`.
5. Ejecuta `npm install` y luego `npx expo start --clear`.

## Consideraciones

- La app requiere Internet para datos frescos. Los favoritos y los cachés básicos se guardan en el teléfono.
- No todos los encuentros/países están cubiertos. Si ESPN o TheSportsDB no responden se informa claramente.
- Los marcadores en vivo se consultan cada 90 segundos mientras la app esté abierta y activa. Puede haber retrasos del proveedor.
- La pestaña **Fichaje** reúne artículos sobre rumores y fichajes; no supone que toda noticia sea un traspaso confirmado.
- Las noticias provienen del feed inglés de ESPN, por lo que los titulares pueden aparecer en inglés.
- No añadas claves privadas de API directamente en un repositorio público.
- SDK Expo, versiones y dependencias se conservan desde el `package.json` existente. Utiliza el SDK 58 de tu proyecto.

## Publicar en GitHub una vez que lo hayas probado

```
git add src/App.tsx src/types.ts src/services/football.ts src/services/news.ts
git commit -m "GolFlash completo: partidos, noticias, fichajes y favoritos"
git push origin main
```
