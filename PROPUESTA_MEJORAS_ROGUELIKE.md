# Propuesta Arquitectónica: Sistema de Mejoras y Ciber-Buffs (Roguelike)

## 1. Resumen Ejecutivo
El presente documento formaliza la propuesta de diseño para integrar una mecánica de progresión tipo *roguelike* (inspirada en *Vampire Survivors*) a **Zero-Day Protocol**. 
---

## 2. Ejemplo conceptual: Los "Protocolos de Kernel"
Al superar una oleada de virus o completar exitosamente un minijuego de inyección de código (*Hacking Quiz*), el operador recibe una interrupción de sistema que le presenta una selección aleatoria de tres mejoras de software (*Ciber-Buffs*). 

### Catálogo Inicial de Protocolos:
1. **Overclock de Hilos (`THREAD_OVERCLOCK`):** Aumenta la cadencia de fuego reduciendo el intervalo entre disparos en un 15% por nivel.
2. **Subnet Firewall (`SUBNET_FIREWALL`):** Incrementa la capacidad y regeneración de escudos de matriz (+1 stack por nivel, máx. 5).
3. **Buffer Penetration (`BUFFER_PENETRATION`):** Incrementa el daño base de los proyectiles contra las barreras de datos y núcleos enemigos.
4. **Algoritmo de Evasión (`EVASION_ROUTINE`):** Incrementa la velocidad de desplazamiento del cursor en un 10% por nivel.

---

## 3. Reglas de Negocio del Sistema de Buffs

### Regla 1: Selección y Disponibilidad de Opciones
* **Nivel Máximo (Cap):** Cada protocolo cuenta con un rango de niveles de `Tier 1` a `Tier 5`.
* **Exclusión de Saturación:** Todo protocolo que alcance el `Tier 5` queda automáticamente excluido del *pool* de selección en futuras oleadas.
* **Mecanismo de Reroll:** El operador dispone de una cantidad finita de reintentos de selección (*rerolls*). Cada uso decrementa el contador en 1. Si `rerolls == 0`, la petición de refresco es rechazada.
* **Pool Agotado:** Si todos los protocolos alcanzan el nivel máximo, el sistema entrega una recompensa alternativa por defecto (*Restauración de Integridad* o *Puntos Planos*) sin generar excepciones.

### Regla 2: Acumulación y Límites Físicos (Hard Caps)
* **Cadencia de Disparo Compuesta:**
  $$T_{\text{nuevo}} = T_{\text{base}} \times (0.85)^{\text{tier}}$$
* **Límite Duro (Hard Cap / BVA):** El intervalo de disparo **nunca puede ser inferior a 30 ms** (`max(30, T_nuevo)`), impidiendo desbordamientos de memoria o caídas drásticas de fotogramas por segundo.
* **Límite de Escudos:** Los stacks de absorción están acotados rígidamente en el intervalo $[0, 5]$.
* **Límite de Velocidad:** La velocidad máxima del cursor tiene un tope superior en $25.0\text{ u/s}$.

### Regla 3: Sinergias y Protocolos Maestros (Tablas de Decisión)
Se define la evolución de protocolos cuando se cumplen condiciones compuestas simultáneas:
* **Protocolo Maestro "Zero-Day Overdrive":**
  1. Condición 1: `THREAD_OVERCLOCK` en `Tier 5`.
  2. Condición 2: `SUBNET_FIREWALL` en `Tier 5`.
  3. Condición 3: Oleada actual $\ge 3$.
* Si las tres condiciones son verdaderas, el sistema desbloquea el protocolo maestro que otorga disparo dual con absorción automática. Si cualquiera es falsa, la evolución permanece bloqueada.

### Regla 4: Ponderación de Rareza por Desempeño
* Si el minijuego de inyección se resuelve en el **primer intento**, el sistema garantiza al menos una carta de rareza **Épica/Legendaria** en la siguiente selección.
* Si el operador comete errores o requiere asistencia de pistas, la selección se limita a rarezas **Común** y **Rara**.

---
