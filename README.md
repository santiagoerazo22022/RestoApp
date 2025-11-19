# 🍽️ RestoApp - Sistema de Gestión de Restaurante

Sistema completo de gestión para restaurantes con roles de Mozo, Cocina y Caja. Diseñado con HTML, CSS (Bootstrap) y JavaScript vanilla.

## 🚀 Dos Versiones Disponibles

### 1. Versión LocalStorage (Actual - `app.js`)
- ✅ Funciona completamente offline
- ✅ Datos guardados en el navegador
- ✅ Ideal para pruebas y uso en un solo dispositivo
- ⚠️ Los datos se pierden al limpiar el navegador

### 2. Versión Supabase (Cloud - Disponible)
- ✅ Base de datos en la nube (PostgreSQL)
- ✅ Sincronización en tiempo real entre dispositivos
- ✅ Backup automático
- ✅ Escalable para múltiples sucursales
- ✅ Analytics histórico completo

---

## 🎨 Características de Diseño

- **Tema rojo y blanco** elegante y profesional
- **Diseño responsive** optimizado para móviles (ideal para mozos)
- **Animaciones suaves** y transiciones fluidas
- **Gradientes modernos** en botones y cards
- **Efectos visuales** para feedback táctil
- **Mesas con efecto pulse** cuando están ocupadas

## 👥 Usuarios del Sistema

### 🧑‍💼 Mozo
- **Usuario:** `mozo`
- **Contraseña:** `1234`

### 👨‍🍳 Cocina
- **Usuario:** `cocina`
- **Contraseña:** `1234`

### 💰 Caja
- **Usuario:** `caja`
- **Contraseña:** `1234`

## 📱 Funcionalidades por Rol

### Mozo
1. **Vista principal:** Grid de 12 mesas
2. **Seleccionar mesa:** Click en una mesa para tomar/modificar pedido
3. **Tomar pedido:** Agregar items del menú con botones +/-
4. **Agregar items:** Si la mesa tiene pedido, puede agregar más items
5. **Enviar a cocina:** El pedido se comunica automáticamente
6. **Navegación móvil:** Vista optimizada con navegación entre mesas y pedidos

### Cocina
1. **Recibir comandas:** Visualización en tiempo real
2. **Cambiar estado:** Pendiente → Preparando → Listo
3. **Actualización automática:** Cada 5 segundos
4. **Vista de items:** Cantidad y detalle de cada pedido

### Caja / Admin
1. **Vista de mesas:** Estado y total de cada mesa
2. **Detalle de cuenta:** Items y total a pagar
3. **Finalizar venta:** Cierra el pedido y libera la mesa
4. **Gestión de productos:** Agregar, editar y eliminar items del menú
5. **Analytics del día:** Visualización de ventas diarias con estadísticas
6. **Cierre de caja:** Archiva ventas del día y resetea contadores
7. **Actualización automática:** Cada 5 segundos

## 📊 Analytics (Caja/Admin)

El usuario de Caja tiene acceso a un dashboard de analytics que muestra:

- **Total de Ventas:** Recaudación total del día
- **Número de Órdenes:** Cantidad de mesas atendidas
- **Ticket Promedio:** Promedio de gasto por mesa
- **Items Vendidos:** Total de productos vendidos
- **Detalle de Ventas:** Tabla con hora, mesa, items y total de cada venta
- **Cierre de Caja:** Permite cerrar el día y archivar las ventas

### Cierre de Caja
- Click en "Cerrar Caja del Día"
- Confirma el total recaudado y número de ventas
- Archiva las ventas del día en el historial
- Resetea los contadores para comenzar un nuevo día
- Las ventas se guardan automáticamente en localStorage

## 🔄 Flujo de Trabajo

```
MOZO → Toma pedido → Envía a cocina
  ↓
COCINA → Recibe comanda → Prepara → Marca como lista
  ↓
CAJA → Ve pedido completo → Cobra → Finaliza venta → Mesa libre
  ↓
ANALYTICS → Registra venta → Actualiza estadísticas del día
```

## 💾 Persistencia de Datos

- Utiliza `localStorage` para mantener datos entre sesiones
- Los pedidos persisten al recargar la página
- Sincronización automática entre roles
- **Ventas del día** se almacenan y persisten
- **Historial de ventas** completo archivado
- **Detección automática de cambio de día** para resetear contadores

## 🚀 Instalación y Uso

1. Abrir `index.html` en cualquier navegador moderno
2. No requiere servidor, funciona completamente offline
3. Iniciar sesión con uno de los usuarios

## 🛠️ Resetear Datos

Si necesita limpiar todas las mesas y pedidos:
- En la pantalla de login, hacer click en "Resetear datos del sistema"
- O ejecutar en consola: `resetearDatos()`

## 📊 Estructura de Archivos

```
RestoApp/
├── index.html      # Estructura HTML principal
├── styles.css      # Estilos completos con tema rojo/blanco
├── app.js          # Lógica de la aplicación
└── README.md       # Este archivo
```

## 🎯 Características Técnicas

- **Sin dependencias externas** (excepto Bootstrap y Font Awesome desde CDN)
- **Vanilla JavaScript** puro
- **LocalStorage** para persistencia
- **Responsive Design** con CSS Grid y Flexbox
- **Event-driven** architecture
- **State management** centralizado

## 📱 Optimización Móvil

- Área táctil ampliada en elementos interactivos
- Prevención de zoom no deseado en inputs
- Navegación fluida entre vistas
- Scroll automático al cambiar de panel
- Font-size de 16px en inputs (evita zoom iOS)

## 🎨 Paleta de Colores

- **Rojo Principal:** #dc3545
- **Rojo Oscuro:** #c82333
- **Rojo Claro:** #f8d7da
- **Blanco:** #ffffff
- **Gris Claro:** #f8f9fa
- **Gris Oscuro:** #343a40

## 📈 Funcionalidades Implementadas

- [x] Gestión de 3 roles (Mozo, Cocina, Caja/Admin)
- [x] Sistema de pedidos en tiempo real
- [x] Estados de comandas (Pendiente → Preparando → Listo)
- [x] Gestión de productos (CRUD completo)
- [x] Analytics con estadísticas del día
- [x] Cierre de caja diario
- [x] Historial de ventas
- [x] Detección automática de cambio de día
- [x] Diseño responsive optimizado para móviles
- [x] Persistencia de datos con localStorage

---

**Desarrollado con ❤️ para la gestión eficiente de restaurantes**
