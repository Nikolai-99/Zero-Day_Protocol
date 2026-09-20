# Registro de Recursos de Uso Libre (Assets) — Zero-Day Protocol

Todos los recursos multimedia, tipográficos y de estilo utilizados en el juego han sido migrados para operar de manera **100% offline y local** sin requerir conexión a internet.

> [!NOTE]
> Para una guía exhaustiva compatible con Obsidian con diagramas Mermaid, especificaciones técnicas y trazabilidad legal detallada, consulte el documento [`DOCUMENTACION_ASSETS.md`](DOCUMENTACION_ASSETS.md).

---

## 1. Tipografías de Código Abierto (`assets/fonts/`)

| Tipografía | Formato | Diseñador / Origen | Licencia de Uso Libre |
|---|---|---|---|
| **Orbitron** | WOFF2 | Matt McInerney (The League of Moveable Type) | **SIL Open Font License 1.1** (Comercial y Personal) |
| **Pixelify Sans** | WOFF2 | Stefie Justprince | **SIL Open Font License 1.1** (Comercial y Personal) |
| **VT323** | WOFF2 | Peter Hull | **SIL Open Font License 1.1** (Comercial y Personal) |
| **Roboto Mono** | WOFF2 | Christian Robertson (Google Fonts) | **Apache License 2.0** (Comercial y Personal) |

---

## 2. Motor de Estilos Local (`assets/` y `src/index.css`)

| Recurso | Tipo | Origen | Licencia |
|---|---|---|---|
| **Tailwind CSS Engine** | CSS / JS Bundler | Tailwind Labs | **MIT License** |
| `assets/tailwind.min.js` | Standalone bundle de respaldo | Tailwind CDN Offline Copy | **MIT License** |
| `@font-face` Definitions | CSS Embebido en `src/index.css` | Mapeo relativo local a `assets/fonts/` | N/A |

---

## 3. Modelos 3D Procedurales y Audio

| Recurso | Ubicación | Formato | Tipo |
|---|---|---|---|
| **KiT Virus** | `assets/3D Models/KiT_Virus.glb` | GLTF / Binary GLB | Modelo 3D de enemigo procedural |
| **Player Cursor** | `assets/3D Models/Player_Cursor.glb` | GLTF / Binary GLB | Modelo 3D de nave / avatar del operador |
| **Banda Sonora Principal** | `assets/Zero-Day Protocol.mp3` | MPEG Audio Layer 3 | Audio soundtrack cyberpunk |
| **Tema Alternativo Genesis** | `assets/Genesis.mp3` | MPEG Audio Layer 3 | Audio soundtrack |
| **Icono de Aplicación** | `assets/app_icon.png` | PNG | Logotipo e isotipo de Electron |
