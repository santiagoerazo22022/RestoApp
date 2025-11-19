// ============================================
// SISTEMA DE GESTIÓN DE RESTAURANTE - RestoApp
// ============================================

// Estado Global de la Aplicación
const AppState = {
    currentUser: null,
    currentRole: null,
    selectedMesa: null,
    pedidoActual: [],
    mesas: [],
    comandas: [],
    ventas: [], // Historial de ventas
    ventasHoy: [], // Ventas del día actual
    fechaApertura: null, // Fecha de apertura de caja
    menu: [] // Se cargará desde Supabase
};

// Usuarios del Sistema - Ya no se usa, se cargan desde Supabase
// const users = [
//     { username: 'mozo', password: '1234', role: 'mozo' },
//     { username: 'cocina', password: '1234', role: 'cocina' },
//     { username: 'caja', password: '1234', role: 'caja' }
// ];

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupStorageListener();
});

// Sistema de sincronización en tiempo real
function setupStorageListener() {
    // Escuchar cambios en localStorage de otras pestañas/ventanas
    window.addEventListener('storage', function(e) {
        if (e.key === 'restoapp_mesas' || e.key === 'restoapp_comandas') {
            console.log('📡 Detectado cambio en datos, actualizando vista...');
            loadData();
            
            // Mostrar notificación visual
            showUpdateNotification();
            
            // Actualizar vista según el rol actual
            if (AppState.currentRole === 'cocina') {
                renderComandas();
            } else if (AppState.currentRole === 'caja') {
                renderMesasCaja();
                if (AppState.selectedMesa) {
                    renderDetalleCuenta();
                }
            } else if (AppState.currentRole === 'mozo') {
                renderMesasMozo();
            }
        }
    });
    
    // Para la misma pestaña, usar eventos personalizados
    window.addEventListener('pedido-actualizado', function() {
        console.log('📡 Evento pedido-actualizado recibido');
        if (AppState.currentRole === 'cocina') {
            renderComandas();
        } else if (AppState.currentRole === 'caja') {
            renderMesasCaja();
        }
    });
}

// Mostrar notificación de actualización
function showUpdateNotification() {
    // Crear elemento de notificación si no existe
    let notification = document.getElementById('updateNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'updateNotification';
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #28a745 0%, #218838 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
            z-index: 9999;
            display: none;
            animation: slideInRight 0.5s ease;
            font-weight: 600;
        `;
        document.body.appendChild(notification);
        
        // Agregar animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    notification.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Actualizando datos...';
    notification.style.display = 'block';
    
    // Ocultar después de 2 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.style.animation = 'slideInRight 0.5s ease';
        }, 500);
    }, 2000);
}

async function initializeApp() {
    // Inicializar Supabase
    const initialized = await supabaseService.init();
    
    if (!initialized) {
        alert('Error al conectar con la base de datos. Verifique la configuración.');
        return;
    }
    
    // Cargar menú desde Supabase
    await loadMenuFromSupabase();
    
    // Cargar mesas desde Supabase
    await loadMesasFromSupabase();
    
    // Cargar pedidos activos desde Supabase
    await loadPedidosFromSupabase();
    
    // Configurar Realtime subscriptions
    setupRealtimeSubscriptions();
    
    // Cargar datos del localStorage solo para ventas locales (temporal)
    loadData();
}

async function loadMesasFromSupabase() {
    try {
        const mesas = await supabaseService.getMesas();
        if (mesas && mesas.length > 0) {
            // Convertir formato de Supabase al formato del AppState
            AppState.mesas = mesas.map(mesa => ({
                numero: mesa.numero,
                estado: mesa.estado,
                pedido: [], // Se cargará desde pedidos
                total: 0,
                estadoPedido: null,
                supabaseId: mesa.id
            }));
            console.log('✅ Mesas cargadas desde Supabase:', mesas.length);
        }
    } catch (error) {
        console.error('Error al cargar mesas:', error);
    }
}

async function loadPedidosFromSupabase() {
    try {
        const pedidos = await supabaseService.getPedidosActivos();
        console.log('📊 Pedidos obtenidos de Supabase:', pedidos.length);
        
        // Primero, limpiar todos los pedidos de las mesas
        AppState.mesas.forEach(mesa => {
            mesa.pedido = [];
            mesa.total = 0;
            mesa.estadoPedido = null;
        });
        
        if (pedidos && pedidos.length > 0) {
            // Convertir pedidos a comandas y actualizar mesas
            AppState.comandas = [];
            
            pedidos.forEach(pedido => {
                console.log('🍽️ Procesando pedido:', {
                    id: pedido.id,
                    mesa_id: pedido.mesa_id,
                    estado: pedido.estado,
                    items: pedido.pedido_items?.length || 0
                });
                
                const mesa = AppState.mesas.find(m => m.supabaseId === pedido.mesa_id);
                
                if (!mesa) {
                    console.warn('⚠️ Mesa no encontrada para pedido:', pedido.id, 'mesa_id:', pedido.mesa_id);
                    return;
                }
                
                // Actualizar datos de la mesa
                mesa.pedido = pedido.pedido_items.map(item => ({
                    id: item.menu_item_id,
                    nombre: item.nombre,
                    precio: item.precio_unitario,
                    cantidad: item.cantidad
                }));
                mesa.total = pedido.total;
                mesa.estadoPedido = pedido.estado;
                mesa.estado = 'ocupada';
                
                console.log('✅ Mesa', mesa.numero, 'actualizada - Total:', mesa.total, 'Items:', mesa.pedido.length);
                
                // Crear comanda para cocina
                AppState.comandas.push({
                    id: pedido.id,
                    mesa: mesa.numero,
                    items: pedido.pedido_items.map(item => ({
                        id: item.menu_item_id,
                        nombre: item.nombre,
                        precio: item.precio_unitario,
                        cantidad: item.cantidad
                    })),
                    total: pedido.total,
                    hora: new Date(pedido.created_at).toLocaleTimeString(),
                    estado: pedido.estado
                });
            });
            
            console.log('✅ Total comandas activas:', AppState.comandas.length);
            console.log('📋 Mesas ocupadas:', AppState.mesas.filter(m => m.estado === 'ocupada').length);
        } else {
            AppState.comandas = [];
            console.log('📦 No hay pedidos activos');
        }
    } catch (error) {
        console.error('❌ Error al cargar pedidos:', error);
    }
}

function setupRealtimeSubscriptions() {
    // Suscribirse a cambios en pedidos
    supabaseService.subscribeToPedidos(async (payload) => {
        console.log('📡 Cambio en pedidos detectado:', payload.eventType, payload);
        
        // Recargar mesas primero para asegurar sincronización
        await loadMesasFromSupabase();
        await loadPedidosFromSupabase();
        
        // Actualizar vista según rol
        if (AppState.currentRole === 'cocina') {
            console.log('🍳 Actualizando vista de cocina');
            renderComandas();
        } else if (AppState.currentRole === 'caja') {
            console.log('💰 Actualizando vista de caja');
            renderMesasCaja();
            if (AppState.selectedMesa) {
                renderDetalleCuenta();
            }
        } else if (AppState.currentRole === 'mozo') {
            console.log('👨‍🍳 Actualizando vista de mozo');
            renderMesasMozo();
        }
    });
    
    // Suscribirse a cambios en mesas
    supabaseService.subscribeToMesas(async (payload) => {
        console.log('📡 Cambio en mesas detectado:', payload.eventType);
        await loadMesasFromSupabase();
        await loadPedidosFromSupabase();
        
        // Actualizar vistas
        if (AppState.currentRole === 'mozo') {
            renderMesasMozo();
        } else if (AppState.currentRole === 'caja') {
            renderMesasCaja();
            if (AppState.selectedMesa) {
                renderDetalleCuenta();
            }
        }
    });
}

async function loadMenuFromSupabase() {
    try {
        const menu = await supabaseService.getMenu();
        if (menu && menu.length > 0) {
            AppState.menu = menu;
            console.log('✅ Menú cargado desde Supabase:', menu.length, 'categorías');
        } else {
            console.log('⚠️ No se encontraron items en el menú');
            AppState.menu = [];
        }
    } catch (error) {
        console.error('Error al cargar menú:', error);
        AppState.menu = [];
    }
}

function setupEventListeners() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Mozo - Enviar Pedido
    const btnEnviarPedido = document.getElementById('btnEnviarPedido');
    if (btnEnviarPedido) {
        btnEnviarPedido.addEventListener('click', enviarPedidoACocina);
    }

    // Caja - Finalizar Venta
    const btnFinalizarVenta = document.getElementById('btnFinalizarVenta');
    if (btnFinalizarVenta) {
        btnFinalizarVenta.addEventListener('click', finalizarVenta);
    }

    // Admin - Formulario de Producto
    const formProducto = document.getElementById('formProducto');
    if (formProducto) {
        formProducto.addEventListener('submit', guardarProducto);
    }

    // Admin - Cambio de categoría
    const productoCategoria = document.getElementById('productoCategoria');
    if (productoCategoria) {
        productoCategoria.addEventListener('change', function() {
            const nuevaCategoriaDiv = document.getElementById('nuevaCategoriaDiv');
            if (this.value === 'nueva') {
                nuevaCategoriaDiv.style.display = 'block';
            } else {
                nuevaCategoriaDiv.style.display = 'none';
            }
        });
    }

    // Admin - Formulario de Usuario
    const formUsuario = document.getElementById('formUsuario');
    if (formUsuario) {
        formUsuario.addEventListener('submit', guardarUsuario);
    }
}

// ============================================
// SISTEMA DE AUTENTICACIÓN
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Buscar usuario en Supabase
    const user = await supabaseService.login(username, password);
    
    if (user) {
        AppState.currentUser = user.username;
        AppState.currentRole = user.role;
        
        // Ocultar pantalla de login
        document.getElementById('loginScreen').classList.remove('active');
        
        // Mostrar pantalla según el rol
        switch (user.role) {
            case 'mozo':
                showMozoScreen();
                break;
            case 'cocina':
                showCocinaScreen();
                break;
            case 'caja':
                showCajaScreen();
                break;
        }
    } else {
        alert('Usuario o contraseña incorrectos');
    }
}

function logout() {
    AppState.currentUser = null;
    AppState.currentRole = null;
    AppState.selectedMesa = null;
    AppState.pedidoActual = [];
    
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar login
    document.getElementById('loginScreen').classList.add('active');
    
    // Limpiar formulario
    document.getElementById('loginForm').reset();
}

// ============================================
// PANTALLA DEL MOZO
// ============================================

function showMozoScreen() {
    document.getElementById('mozoScreen').classList.add('active');
    
    // En móvil, mostrar primero solo las mesas
    if (window.innerWidth <= 768) {
        document.getElementById('panelMesas').style.display = 'block';
        document.getElementById('panelPedido').style.display = 'none';
    }
    
    renderMesasMozo();
    renderMenu();
    renderPedidoActual();
}

function renderMesasMozo() {
    const mesasGrid = document.getElementById('mesasGrid');
    if (!mesasGrid) return;
    
    mesasGrid.innerHTML = '';
    
    AppState.mesas.forEach(mesa => {
        const mesaDiv = document.createElement('div');
        mesaDiv.className = `mesa-item ${mesa.estado}`;
        
        if (AppState.selectedMesa === mesa.numero) {
            mesaDiv.classList.add('seleccionada');
        }
        
        mesaDiv.innerHTML = `
            <i class="fas fa-chair"></i>
            <div class="mesa-numero">Mesa ${mesa.numero}</div>
            <div class="mesa-estado">${mesa.estado === 'libre' ? 'Libre' : 'Ocupada'}</div>
        `;
        
        mesaDiv.addEventListener('click', () => seleccionarMesa(mesa.numero));
        mesasGrid.appendChild(mesaDiv);
    });
}

function seleccionarMesa(numeroMesa) {
    AppState.selectedMesa = numeroMesa;
    
    // Cargar el pedido actual de la mesa
    const mesa = AppState.mesas.find(m => m.numero === numeroMesa);
    
    // Si la mesa tiene pedido existente, NO lo cargamos en el pedido actual
    // El pedido actual será solo para NUEVOS items que se agreguen
    AppState.pedidoActual = [];
    
    renderMesasMozo();
    renderPedidoExistente();
    renderPedidoActual();
    
    const mesaSeleccionada = document.getElementById('mesaSeleccionada');
    if (mesaSeleccionada) {
        if (mesa && mesa.pedido && mesa.pedido.length > 0) {
            mesaSeleccionada.textContent = `Mesa ${numeroMesa} (Pedido Existente: $${mesa.total})`;
        } else {
            mesaSeleccionada.textContent = `Mesa ${numeroMesa}`;
        }
    }
    
    const btnEnviarPedido = document.getElementById('btnEnviarPedido');
    if (btnEnviarPedido) {
        btnEnviarPedido.disabled = false;
        // Cambiar texto del botón según si hay pedido existente
        if (mesa && mesa.pedido && mesa.pedido.length > 0) {
            btnEnviarPedido.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar al Pedido';
        } else {
            btnEnviarPedido.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar a Cocina';
        }
    }
    
    // Mostrar el panel de pedidos en móvil
    if (window.innerWidth <= 768) {
        const panelPedido = document.getElementById('panelPedido');
        const panelMesas = document.getElementById('panelMesas');
        
        if (panelPedido) panelPedido.style.display = 'block';
        if (panelMesas) panelMesas.style.display = 'none';
        window.scrollTo(0, 0);
    }
}

function renderMenu() {
    const menuItems = document.getElementById('menuItems');
    if (!menuItems) return;
    
    menuItems.innerHTML = '';
    
    if (AppState.menu.length === 0) {
        menuItems.innerHTML = '<p class="text-center text-muted mt-3">No hay productos en el menú</p>';
        return;
    }
    
    AppState.menu.forEach(categoria => {
        const categoriaDiv = document.createElement('div');
        categoriaDiv.className = 'menu-categoria';
        
        let itemsHTML = '';
        categoria.items.forEach(item => {
            itemsHTML += `
                <div class="menu-item" onclick="agregarItemAPedido('${item.id}')">
                    <div class="menu-item-info">
                        <h6>${item.nombre}</h6>
                    </div>
                    <div class="menu-item-precio">$${item.precio}</div>
                </div>
            `;
        });
        
        categoriaDiv.innerHTML = `
            <h6>${categoria.categoria}</h6>
            ${itemsHTML}
        `;
        
        menuItems.appendChild(categoriaDiv);
    });
}

function agregarItemAPedido(itemId) {
    if (!AppState.selectedMesa) {
        alert('Por favor, seleccione una mesa primero');
        return;
    }
    
    // Buscar el item en el menú
    let itemEncontrado = null;
    for (const categoria of AppState.menu) {
        const found = categoria.items.find(item => item.id === itemId);
        if (found) {
            itemEncontrado = found;
            break;
        }
    }
    
    if (!itemEncontrado) return;
    
    // Verificar si ya está en el pedido
    const itemExistente = AppState.pedidoActual.find(p => p.id === itemId);
    
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        AppState.pedidoActual.push({
            id: itemEncontrado.id,
            nombre: itemEncontrado.nombre,
            precio: itemEncontrado.precio,
            cantidad: 1
        });
    }
    
    renderPedidoActual();
}

function renderPedidoActual() {
    const pedidoActualDiv = document.getElementById('pedidoActual');
    const totalPedidoSpan = document.getElementById('totalPedido');
    const separadorPedido = document.getElementById('separadorPedido');
    
    if (!pedidoActualDiv || !totalPedidoSpan) return;
    
    // Calcular total de nuevos items
    let totalNuevos = 0;
    if (AppState.pedidoActual.length > 0) {
        totalNuevos = AppState.pedidoActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    }
    
    // Calcular total del pedido existente
    let totalExistente = 0;
    if (AppState.selectedMesa) {
        const mesa = AppState.mesas.find(m => m.numero === AppState.selectedMesa);
        if (mesa && mesa.pedido && mesa.pedido.length > 0) {
            totalExistente = mesa.total;
        }
    }
    
    // Mostrar u ocultar separador
    if (separadorPedido) {
        separadorPedido.style.display = (totalExistente > 0 && AppState.pedidoActual.length > 0) ? 'block' : 'none';
    }
    
    if (AppState.pedidoActual.length === 0) {
        pedidoActualDiv.innerHTML = '<p class="text-muted text-center mt-2">Agregue items del menú</p>';
        totalPedidoSpan.textContent = totalExistente;
        return;
    }
    
    let html = '';
    
    AppState.pedidoActual.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        
        html += `
            <div class="pedido-item">
                <div class="pedido-item-info">
                    <strong>${item.nombre}</strong>
                </div>
                <div class="pedido-item-cantidad">
                    <button class="btn-cantidad" onclick="cambiarCantidad(${item.id}, -1)">-</button>
                    <span class="cantidad-valor">${item.cantidad}</span>
                    <button class="btn-cantidad" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                </div>
                <div class="pedido-item-precio">$${subtotal}</div>
            </div>
        `;
    });
    
    pedidoActualDiv.innerHTML = html;
    totalPedidoSpan.textContent = totalExistente + totalNuevos;
}

function renderPedidoExistente() {
    const pedidoExistenteDiv = document.getElementById('pedidoExistente');
    
    if (!pedidoExistenteDiv) return;
    
    if (!AppState.selectedMesa) {
        pedidoExistenteDiv.innerHTML = '';
        return;
    }
    
    const mesa = AppState.mesas.find(m => m.numero === AppState.selectedMesa);
    
    if (!mesa || !mesa.pedido || mesa.pedido.length === 0) {
        pedidoExistenteDiv.innerHTML = '';
        return;
    }
    
    let html = '<div class="mb-2"><strong class="text-success"><i class="fas fa-check-circle"></i> Pedido Existente:</strong></div>';
    
    mesa.pedido.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        
        html += `
            <div class="pedido-item pedido-existente">
                <div class="pedido-item-info">
                    <strong>${item.nombre}</strong>
                </div>
                <div class="pedido-item-cantidad">
                    <span class="cantidad-valor">${item.cantidad}x</span>
                </div>
                <div class="pedido-item-precio">$${subtotal}</div>
            </div>
        `;
    });
    
    html += `<div class="text-end mt-2"><strong>Subtotal: $${mesa.total}</strong></div>`;
    
    pedidoExistenteDiv.innerHTML = html;
}

function cambiarCantidad(itemId, cambio) {
    const item = AppState.pedidoActual.find(p => p.id === itemId);
    
    if (!item) return;
    
    item.cantidad += cambio;
    
    if (item.cantidad <= 0) {
        AppState.pedidoActual = AppState.pedidoActual.filter(p => p.id !== itemId);
    }
    
    renderPedidoActual();
}

async function enviarPedidoACocina() {
    if (!AppState.selectedMesa || AppState.pedidoActual.length === 0) {
        alert('No hay items nuevos para enviar');
        return;
    }
    
    const mesa = AppState.mesas.find(m => m.numero === AppState.selectedMesa);
    
    try {
        // Verificar si la mesa ya tiene un pedido activo en Supabase
        let pedido = await supabaseService.getPedidoActivoByMesa(mesa.supabaseId);
        
        if (pedido) {
            // Agregar nuevos items al pedido existente
            for (const item of AppState.pedidoActual) {
                await supabaseService.addItemToPedido(pedido.id, item);
            }
            console.log('✅ Items agregados al pedido existente de Mesa', mesa.numero);
            alert('Items agregados al pedido existente');
        } else {
            // Crear nuevo pedido
            pedido = await supabaseService.createPedido(mesa.supabaseId, AppState.currentUser?.id);
            
            if (!pedido) {
                alert('Error al crear el pedido');
                return;
            }
            
            // Agregar items al pedido
            for (const item of AppState.pedidoActual) {
                await supabaseService.addItemToPedido(pedido.id, item);
            }
            
            console.log('✅ Nuevo pedido creado para Mesa', mesa.numero);
            alert('Pedido enviado a cocina correctamente');
        }
        
        // Actualizar estado de la mesa en Supabase
        await supabaseService.updateMesa(mesa.supabaseId, { estado: 'ocupada' });
        
        // Recargar datos desde Supabase
        await loadPedidosFromSupabase();
        await loadMesasFromSupabase();
        
        // Limpiar pedido actual
        AppState.pedidoActual = [];
        AppState.selectedMesa = null;
        
        // Actualizar vista
        renderMesasMozo();
        renderPedidoExistente();
        renderPedidoActual();
        
        const mesaSeleccionada = document.getElementById('mesaSeleccionada');
        if (mesaSeleccionada) {
            mesaSeleccionada.textContent = 'Seleccione una mesa';
        }
        
        const btnEnviarPedido = document.getElementById('btnEnviarPedido');
        if (btnEnviarPedido) {
            btnEnviarPedido.disabled = true;
            btnEnviarPedido.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar a Cocina';
        }
        
        // Volver al panel de mesas en móvil
        if (window.innerWidth <= 768) {
            const panelMesas = document.getElementById('panelMesas');
            const panelPedido = document.getElementById('panelPedido');
            
            if (panelMesas) panelMesas.style.display = 'block';
            if (panelPedido) panelPedido.style.display = 'none';
            window.scrollTo(0, 0);
        }
        
    } catch (error) {
        console.error('Error al enviar pedido:', error);
        alert('Error al enviar el pedido. Intente nuevamente.');
    }
}

// ============================================
// PANTALLA DE COCINA
// ============================================

function showCocinaScreen() {
    document.getElementById('cocinaScreen').classList.add('active');
    renderComandas();
    
    // Auto-actualizar cada 5 segundos
    setInterval(() => {
        if (AppState.currentRole === 'cocina') {
            renderComandas();
        }
    }, 5000);
}

function renderComandas() {
    const comandasLista = document.getElementById('comandasLista');
    
    // Filtrar comandas pendientes y en preparación
    const comandasActivas = AppState.comandas.filter(c => c.estado !== 'listo');
    
    if (comandasActivas.length === 0) {
        comandasLista.innerHTML = `
            <div class="col-12">
                <div class="cuenta-vacia">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay comandas pendientes</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Ordenar: pendientes primero, luego en preparación
    comandasActivas.sort((a, b) => {
        const estadoOrden = { 'pendiente': 0, 'preparando': 1 };
        return estadoOrden[a.estado] - estadoOrden[b.estado];
    });
    
    comandasLista.innerHTML = '';
    
    comandasActivas.forEach(comanda => {
        const comandaDiv = document.createElement('div');
        comandaDiv.className = 'col-md-6 col-lg-4';
        
        let itemsHTML = '';
        comanda.items.forEach(item => {
            itemsHTML += `
                <div class="comanda-item">
                    <div>
                        <span class="comanda-item-cantidad">${item.cantidad}</span>
                        ${item.nombre}
                    </div>
                </div>
            `;
        });
        
        const estadoClass = comanda.estado === 'preparando' ? 'preparando' : '';
        const btnText = comanda.estado === 'pendiente' ? 'Comenzar Preparación' : 'Marcar como Listo';
        const btnClass = comanda.estado === 'pendiente' ? 'btn-warning' : 'btn-success';
        const badgeNew = comanda.hora.includes('(Actualizado)') || comanda.isNew ? '<span class="badge bg-danger ms-2">NUEVO</span>' : '';
        
        comandaDiv.innerHTML = `
            <div class="comanda-card comanda-estado ${estadoClass}">
                <div class="comanda-header">
                    <div class="comanda-mesa">
                        <i class="fas fa-utensils"></i> Mesa ${comanda.mesa} ${badgeNew}
                    </div>
                    <div class="comanda-hora">${comanda.hora}</div>
                </div>
                <div class="comanda-items">
                    ${itemsHTML}
                </div>
                <div>
                    <span class="estado-badge estado-${comanda.estado}">
                        ${comanda.estado.toUpperCase()}
                    </span>
                </div>
                <button class="btn ${btnClass} w-100 mt-3" onclick="cambiarEstadoComanda('${comanda.id}')">
                    <i class="fas fa-check"></i> ${btnText}
                </button>
            </div>
        `;
        
        comandasLista.appendChild(comandaDiv);
    });
}

async function cambiarEstadoComanda(comandaId) {
    console.log('🔄 Intentando cambiar estado de comanda:', comandaId);
    
    const comanda = AppState.comandas.find(c => c.id === comandaId);
    
    if (!comanda) {
        console.error('❌ Comanda no encontrada:', comandaId);
        console.log('📋 Comandas disponibles:', AppState.comandas.map(c => ({ id: c.id, mesa: c.mesa })));
        alert('Error: Comanda no encontrada');
        return;
    }
    
    console.log('📦 Comanda encontrada:', { id: comanda.id, mesa: comanda.mesa, estadoActual: comanda.estado });
    
    try {
        let nuevoEstado;
        
        if (comanda.estado === 'pendiente') {
            nuevoEstado = 'preparando';
        } else if (comanda.estado === 'preparando') {
            nuevoEstado = 'listo';
        } else {
            console.warn('⚠️ Estado no reconocido:', comanda.estado);
            return;
        }
        
        console.log('➡️ Cambiando estado a:', nuevoEstado);
        
        // Actualizar estado en Supabase
        const resultado = await supabaseService.updatePedidoEstado(comandaId, nuevoEstado);
        
        if (!resultado) {
            console.error('❌ Error al actualizar estado en Supabase');
            alert('Error al actualizar el estado del pedido');
            return;
        }
        
        console.log('✅ Estado actualizado exitosamente a:', nuevoEstado);
        
        // Recargar datos
        await loadPedidosFromSupabase();
        renderComandas();
        
    } catch (error) {
        console.error('❌ Error al cambiar estado de comanda:', error);
        alert('Error al actualizar el estado');
    }
}

// ============================================
// PANTALLA DE CAJA
// ============================================

function showCajaScreen() {
    document.getElementById('cajaScreen').classList.add('active');
    
    // Asegurarse de que la vista de caja esté visible
    const vistaCaja = document.getElementById('vistaCaja');
    const vistaAdmin = document.getElementById('vistaAdmin');
    
    if (vistaCaja) vistaCaja.style.display = 'block';
    if (vistaAdmin) vistaAdmin.style.display = 'none';
    
    renderMesasCaja();
    renderDetalleCuenta();
    
    // Auto-actualizar cada 5 segundos
    setInterval(() => {
        if (AppState.currentRole === 'caja') {
            const vistaActual = document.getElementById('vistaCaja');
            if (vistaActual && vistaActual.style.display !== 'none') {
                renderMesasCaja();
            }
        }
    }, 5000);
}

function renderMesasCaja() {
    const mesasCaja = document.getElementById('mesasCaja');
    if (!mesasCaja) return;
    
    console.log('📊 Renderizando mesas en caja. Total mesas:', AppState.mesas.length);
    console.log('📋 Mesas con pedidos:', AppState.mesas.filter(m => m.pedido && m.pedido.length > 0).map(m => ({
        numero: m.numero,
        total: m.total,
        items: m.pedido.length,
        estado: m.estado
    })));
    
    mesasCaja.innerHTML = '';
    
    AppState.mesas.forEach(mesa => {
        const mesaDiv = document.createElement('div');
        let estadoClass = mesa.estado;
        
        if (AppState.selectedMesa === mesa.numero) {
            estadoClass += ' seleccionada';
        }
        
        mesaDiv.className = `mesa-item ${estadoClass}`;
        
        let estadoTexto = 'Libre';
        let estadoBadge = '';
        
        if (mesa.estado === 'ocupada') {
            estadoTexto = `$${mesa.total}`;
            if (mesa.estadoPedido) {
                estadoBadge = `<span class="badge badge-${mesa.estadoPedido === 'listo' ? 'success' : 'warning'}">${mesa.estadoPedido}</span>`;
            }
        }
        
        mesaDiv.innerHTML = `
            <i class="fas fa-chair"></i>
            <div class="mesa-numero">Mesa ${mesa.numero}</div>
            <div class="mesa-estado">${estadoTexto}</div>
            ${estadoBadge}
        `;
        
        if (mesa.estado === 'ocupada') {
            mesaDiv.addEventListener('click', () => seleccionarMesaCaja(mesa.numero));
        }
        
        mesasCaja.appendChild(mesaDiv);
    });
}

function seleccionarMesaCaja(numeroMesa) {
    AppState.selectedMesa = numeroMesa;
    renderMesasCaja();
    renderDetalleCuenta();
}

function renderDetalleCuenta() {
    const detalleCuenta = document.getElementById('detalleCuenta');
    const totalCuenta = document.getElementById('totalCuenta');
    const btnFinalizar = document.getElementById('btnFinalizarVenta');
    
    if (!AppState.selectedMesa) {
        detalleCuenta.innerHTML = `
            <div class="cuenta-vacia">
                <i class="fas fa-hand-pointer"></i>
                <p>Seleccione una mesa para ver el detalle</p>
            </div>
        `;
        totalCuenta.innerHTML = '';
        btnFinalizar.disabled = true;
        return;
    }
    
    const mesa = AppState.mesas.find(m => m.numero === AppState.selectedMesa);
    
    console.log('🔍 Renderizando detalle de mesa', AppState.selectedMesa, ':', {
        encontrada: !!mesa,
        pedidoLength: mesa?.pedido?.length || 0,
        total: mesa?.total || 0,
        estado: mesa?.estado
    });
    
    if (!mesa || !mesa.pedido || mesa.pedido.length === 0) {
        detalleCuenta.innerHTML = `
            <div class="cuenta-vacia">
                <i class="fas fa-receipt"></i>
                <p>Esta mesa no tiene pedidos</p>
            </div>
        `;
        totalCuenta.innerHTML = '';
        btnFinalizar.disabled = true;
        return;
    }
    
    let html = '<h6>Items del Pedido:</h6>';
    
    mesa.pedido.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        html += `
            <div class="cuenta-item">
                <div>
                    <strong>${item.cantidad}x</strong> ${item.nombre}
                </div>
                <div>$${subtotal}</div>
            </div>
        `;
    });
    
    detalleCuenta.innerHTML = html;
    totalCuenta.innerHTML = `<h4>Total: $${mesa.total}</h4>`;
    btnFinalizar.disabled = false;
}

async function finalizarVenta() {
    if (!AppState.selectedMesa) {
        alert('Seleccione una mesa');
        return;
    }
    
    const mesa = AppState.mesas.find(m => m.numero === AppState.selectedMesa);
    
    if (!mesa || mesa.pedido.length === 0) {
        alert('Esta mesa no tiene pedidos');
        return;
    }
    
    if (confirm(`¿Confirmar el pago de $${mesa.total} de la Mesa ${mesa.numero}?`)) {
        try {
            // Buscar pedido activo
            const pedido = await supabaseService.getPedidoActivoByMesa(mesa.supabaseId);
            
            if (!pedido) {
                alert('No se encontró el pedido activo');
                return;
            }
            
            // Finalizar venta en Supabase
            await supabaseService.finalizarVenta(pedido.id, mesa.numero, AppState.currentUser?.id);
            
            // Actualizar estado de mesa a libre
            await supabaseService.updateMesa(mesa.supabaseId, { estado: 'libre' });
            
            // Registrar venta local para analytics del día
            const venta = {
                fecha: new Date().toISOString(),
                mesa: mesa.numero,
                items: [...mesa.pedido],
                total: mesa.total
            };
            
            AppState.ventasHoy.push(venta);
            AppState.ventas.push(venta);
            saveData();
            
            // Recargar datos
            await loadPedidosFromSupabase();
            await loadMesasFromSupabase();
            
            // Limpiar selección
            AppState.selectedMesa = null;
            
            // Actualizar vista
            renderMesasCaja();
            renderDetalleCuenta();
            
            alert('Venta finalizada correctamente');
            
        } catch (error) {
            console.error('Error al finalizar venta:', error);
            alert('Error al finalizar la venta. Intente nuevamente.');
        }
    }
}

// ============================================
// PERSISTENCIA DE DATOS
// ============================================

function saveData() {
    localStorage.setItem('restoapp_mesas', JSON.stringify(AppState.mesas));
    localStorage.setItem('restoapp_comandas', JSON.stringify(AppState.comandas));
    // El menú ya no se guarda en localStorage, se carga desde Supabase
    localStorage.setItem('restoapp_ventas', JSON.stringify(AppState.ventas));
    localStorage.setItem('restoapp_ventasHoy', JSON.stringify(AppState.ventasHoy));
    localStorage.setItem('restoapp_fechaApertura', AppState.fechaApertura);
}

function loadData() {
    const mesasData = localStorage.getItem('restoapp_mesas');
    const comandasData = localStorage.getItem('restoapp_comandas');
    // El menú ya no se carga desde localStorage, se obtiene de Supabase
    const ventasData = localStorage.getItem('restoapp_ventas');
    const ventasHoyData = localStorage.getItem('restoapp_ventasHoy');
    const fechaAperturaData = localStorage.getItem('restoapp_fechaApertura');
    
    if (mesasData) {
        AppState.mesas = JSON.parse(mesasData);
    }
    
    if (comandasData) {
        AppState.comandas = JSON.parse(comandasData);
    }
    
    if (ventasData) {
        AppState.ventas = JSON.parse(ventasData);
    }
    
    if (ventasHoyData) {
        AppState.ventasHoy = JSON.parse(ventasHoyData);
    }
    
    if (fechaAperturaData) {
        AppState.fechaApertura = fechaAperturaData;
    }
    
    // Verificar si cambió el día
    verificarCambioDia();
}

// Función para disparar eventos de actualización
function dispatchPedidoEvent() {
    // Disparar evento personalizado en la misma ventana
    const event = new CustomEvent('pedido-actualizado', {
        detail: {
            timestamp: new Date().toISOString(),
            role: AppState.currentRole
        }
    });
    window.dispatchEvent(event);
    
    // Para sincronización entre pestañas, usamos localStorage
    // Al guardar con saveData(), el evento 'storage' se dispara automáticamente en otras pestañas
}

// Verificar si cambió el día y resetear ventas si es necesario
function verificarCambioDia() {
    const hoy = new Date().toLocaleDateString();
    
    if (!AppState.fechaApertura) {
        // Primera vez
        AppState.fechaApertura = hoy;
        saveData();
    } else if (AppState.fechaApertura !== hoy) {
        // Cambió el día - resetear ventas del día
        AppState.ventasHoy = [];
        AppState.fechaApertura = hoy;
        saveData();
    }
}

// Hacer funciones globales para onclick
window.seleccionarMesa = seleccionarMesa;
window.agregarItemAPedido = agregarItemAPedido;
window.cambiarCantidad = cambiarCantidad;
window.cambiarEstadoComanda = cambiarEstadoComanda;
window.seleccionarMesaCaja = seleccionarMesaCaja;
window.logout = logout;
window.volverAMesas = volverAMesas;
window.resetearDatos = resetearDatos;
window.toggleVistaAdmin = toggleVistaAdmin;
window.toggleVistaAnalytics = toggleVistaAnalytics;
window.toggleVistaUsuarios = toggleVistaUsuarios;
window.cerrarCaja = cerrarCaja;
window.editarProducto = editarProducto;
window.eliminarProducto = eliminarProducto;
window.cancelarEdicion = cancelarEdicion;
window.guardarUsuario = guardarUsuario;
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.cancelarEdicionUsuario = cancelarEdicionUsuario;

function volverAMesas() {
    // NO guardar pedido actual si solo son items nuevos sin enviar
    // El mozo debe enviar o descartar
    
    // Limpiar selección
    AppState.pedidoActual = [];
    AppState.selectedMesa = null;
    
    if (window.innerWidth <= 768) {
        const panelMesas = document.getElementById('panelMesas');
        const panelPedido = document.getElementById('panelPedido');
        
        if (panelMesas) panelMesas.style.display = 'block';
        if (panelPedido) panelPedido.style.display = 'none';
        window.scrollTo(0, 0);
    }
    
    // Actualizar vista de mesas
    renderMesasMozo();
}

// Función para resetear todos los datos (útil para desarrollo/testing)
function resetearDatos() {
    if (confirm('¿Está seguro que desea resetear todas las mesas, pedidos y productos? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('restoapp_mesas');
        localStorage.removeItem('restoapp_comandas');
        localStorage.removeItem('restoapp_menu');
        AppState.mesas = [];
        AppState.comandas = [];
        // No resetear el menú, solo limpiarlo del localStorage para que vuelva al default
        alert('Datos reseteados correctamente');
        location.reload();
    }
}

// ============================================
// GESTIÓN DE PRODUCTOS (ADMINISTRADOR)
// ============================================

function toggleVistaAdmin() {
    const vistaCaja = document.getElementById('vistaCaja');
    const vistaAdmin = document.getElementById('vistaAdmin');
    const vistaAnalytics = document.getElementById('vistaAnalytics');
    const vistaUsuarios = document.getElementById('vistaUsuarios');
    const btnToggleText = document.getElementById('btnToggleText');
    const btnAnalyticsText = document.getElementById('btnAnalyticsText');
    const btnUsuariosText = document.getElementById('btnUsuariosText');
    
    if (vistaAdmin.style.display === 'none') {
        vistaCaja.style.display = 'none';
        vistaAdmin.style.display = 'block';
        vistaAnalytics.style.display = 'none';
        vistaUsuarios.style.display = 'none';
        btnToggleText.textContent = 'Caja';
        btnAnalyticsText.textContent = 'Analytics';
        btnUsuariosText.textContent = 'Usuarios';
        renderProductosAdmin();
    } else {
        vistaCaja.style.display = 'block';
        vistaAdmin.style.display = 'none';
        vistaAnalytics.style.display = 'none';
        vistaUsuarios.style.display = 'none';
        btnToggleText.textContent = 'Productos';
        btnAnalyticsText.textContent = 'Analytics';
        btnUsuariosText.textContent = 'Usuarios';
        renderMesasCaja();
        renderDetalleCuenta();
    }
}

function toggleVistaAnalytics() {
    const vistaCaja = document.getElementById('vistaCaja');
    const vistaAdmin = document.getElementById('vistaAdmin');
    const vistaAnalytics = document.getElementById('vistaAnalytics');
    const vistaUsuarios = document.getElementById('vistaUsuarios');
    const btnToggleText = document.getElementById('btnToggleText');
    const btnAnalyticsText = document.getElementById('btnAnalyticsText');
    const btnUsuariosText = document.getElementById('btnUsuariosText');
    
    if (vistaAnalytics.style.display === 'none') {
        vistaCaja.style.display = 'none';
        vistaAdmin.style.display = 'none';
        vistaAnalytics.style.display = 'block';
        vistaUsuarios.style.display = 'none';
        btnToggleText.textContent = 'Productos';
        btnAnalyticsText.textContent = 'Caja';
        btnUsuariosText.textContent = 'Usuarios';
        renderAnalytics();
    } else {
        vistaCaja.style.display = 'block';
        vistaAdmin.style.display = 'none';
        vistaAnalytics.style.display = 'none';
        vistaUsuarios.style.display = 'none';
        btnToggleText.textContent = 'Productos';
        btnAnalyticsText.textContent = 'Analytics';
        btnUsuariosText.textContent = 'Usuarios';
        renderMesasCaja();
        renderDetalleCuenta();
    }
}

function renderProductosAdmin() {
    const listaProductos = document.getElementById('listaProductosAdmin');
    if (!listaProductos) {
        console.error('Elemento listaProductosAdmin no encontrado');
        return;
    }
    
    console.log('Renderizando productos admin. Total categorías:', AppState.menu.length);
    console.log('Menu completo:', AppState.menu);
    
    let html = '';
    
    if (AppState.menu.length === 0) {
        html = '<p class="text-center text-muted mt-3">No hay categorías en el menú. Agregue productos para comenzar.</p>';
    } else {
        AppState.menu.forEach((categoria, catIndex) => {
            html += `
                <div class="categoria-admin mb-4">
                    <div class="categoria-header">
                        <h5>${categoria.categoria}</h5>
                        <span class="badge bg-secondary">${categoria.items.length} productos</span>
                    </div>
                    <div class="productos-lista">
            `;
            
            if (categoria.items.length === 0) {
                html += '<p class="text-muted text-center py-3">No hay productos en esta categoría</p>';
            } else {
                categoria.items.forEach((item, itemIndex) => {
                    html += `
                        <div class="producto-admin-item">
                            <div class="producto-info">
                                <strong>${item.nombre}</strong>
                                <span class="producto-precio">$${item.precio}</span>
                            </div>
                            <div class="producto-acciones">
                                <button class="btn btn-sm btn-warning" onclick="editarProducto('${item.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="eliminarProducto('${item.id}')">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
            
            html += `
                    </div>
                </div>
            `;
        });
    }
    
    listaProductos.innerHTML = html;
    console.log('HTML generado, longitud:', html.length);
}

async function guardarProducto(e) {
    e.preventDefault();
    
    const editando = document.getElementById('editandoProducto').value === 'true';
    const productoId = document.getElementById('productoId').value;
    let categoria = document.getElementById('productoCategoria').value;
    const nombre = document.getElementById('productoNombre').value.trim();
    const precio = parseFloat(document.getElementById('productoPrecio').value);
    
    console.log('Guardando producto:', { categoria, nombre, precio, editando });
    
    // Validar categoría
    if (!categoria || categoria === '') {
        alert('Por favor seleccione una categoría');
        return;
    }
    
    // Si es nueva categoría
    if (categoria === 'nueva') {
        const nuevaCategoria = document.getElementById('nuevaCategoria').value.trim();
        if (!nuevaCategoria) {
            alert('Por favor ingrese el nombre de la nueva categoría');
            return;
        }
        categoria = nuevaCategoria;
    }
    
    if (!nombre || precio <= 0 || isNaN(precio)) {
        alert('Por favor complete todos los campos correctamente');
        return;
    }
    
    try {
        if (editando) {
            // Editar producto existente en Supabase
            const updates = {
                nombre: nombre,
                categoria: categoria,
                precio: precio
            };
            
            const resultado = await supabaseService.updateMenuItem(productoId, updates);
            
            if (resultado) {
                alert('Producto actualizado correctamente');
            } else {
                alert('Error al actualizar el producto');
                return;
            }
        } else {
            // Crear nuevo producto en Supabase
            const nuevoItem = {
                nombre: nombre,
                categoria: categoria,
                precio: precio,
                disponible: true
            };
            
            const resultado = await supabaseService.addMenuItem(nuevoItem);
            
            if (resultado) {
                alert('Producto agregado correctamente');
            } else {
                alert('Error al agregar el producto');
                return;
            }
        }
        
        // Recargar menú desde Supabase
        await loadMenuFromSupabase();
        
        // Limpiar formulario
        cancelarEdicion();
        
        // Actualizar lista
        renderProductosAdmin();
        
        // Actualizar el menú en la vista de mozo si está activa
        if (AppState.currentRole === 'mozo') {
            renderMenu();
        }
        
        console.log('Producto guardado. Total categorías:', AppState.menu.length);
        
    } catch (error) {
        console.error('Error al guardar producto:', error);
        alert('Error al guardar el producto. Intente nuevamente.');
    }
}

function editarProducto(id) {
    let productoEncontrado = null;
    let categoriaEncontrada = null;
    
    for (let cat of AppState.menu) {
        const item = cat.items.find(i => i.id === id);
        if (item) {
            productoEncontrado = item;
            categoriaEncontrada = cat.categoria;
            break;
        }
    }
    
    if (!productoEncontrado) return;
    
    // Llenar el formulario (id es UUID ahora)
    document.getElementById('productoId').value = productoEncontrado.id;
    document.getElementById('editandoProducto').value = 'true';
    document.getElementById('productoCategoria').value = categoriaEncontrada;
    document.getElementById('productoNombre').value = productoEncontrado.nombre;
    document.getElementById('productoPrecio').value = productoEncontrado.precio;
    
    // Cambiar textos
    document.getElementById('formTitulo').textContent = 'Editar Producto';
    document.getElementById('btnGuardarText').textContent = 'Actualizar Producto';
    document.getElementById('btnCancelarEdicion').style.display = 'block';
    
    // Scroll al formulario
    document.getElementById('formProducto').scrollIntoView({ behavior: 'smooth' });
}

async function eliminarProducto(id) {
    let productoNombre = '';
    
    // Buscar el producto para obtener su nombre
    for (let cat of AppState.menu) {
        const item = cat.items.find(i => i.id === id);
        if (item) {
            productoNombre = item.nombre;
            break;
        }
    }
    
    if (!confirm(`¿Está seguro que desea eliminar "${productoNombre}"?`)) {
        return;
    }
    
    try {
        // Eliminar de Supabase
        const resultado = await supabaseService.deleteMenuItem(id);
        
        if (resultado) {
            alert('Producto eliminado correctamente');
            
            // Recargar menú desde Supabase
            await loadMenuFromSupabase();
            
            // Actualizar lista
            renderProductosAdmin();
            
            // Actualizar el menú en la vista de mozo si está activa
            if (AppState.currentRole === 'mozo') {
                renderMenu();
            }
        } else {
            alert('Error al eliminar el producto');
        }
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        alert('Error al eliminar el producto. Intente nuevamente.');
    }
}

function cancelarEdicion() {
    document.getElementById('formProducto').reset();
    document.getElementById('productoId').value = '';
    document.getElementById('editandoProducto').value = 'false';
    document.getElementById('formTitulo').textContent = 'Agregar Producto';
    document.getElementById('btnGuardarText').textContent = 'Guardar Producto';
    document.getElementById('btnCancelarEdicion').style.display = 'none';
    document.getElementById('nuevaCategoriaDiv').style.display = 'none';
}

// La función obtenerNuevoIdProducto ya no es necesaria
// Supabase genera UUIDs automáticamente

// ============================================
// ANALYTICS
// ============================================

function renderAnalytics() {
    // Actualizar fecha
    const fechaActual = document.getElementById('fechaActual');
    const hoy = new Date();
    fechaActual.textContent = `Fecha: ${hoy.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}`;
    
    // Calcular estadísticas
    const totalVentas = AppState.ventasHoy.reduce((sum, venta) => sum + venta.total, 0);
    const numOrdenes = AppState.ventasHoy.length;
    const ticketPromedio = numOrdenes > 0 ? totalVentas / numOrdenes : 0;
    const itemsVendidos = AppState.ventasHoy.reduce((sum, venta) => {
        return sum + venta.items.reduce((itemSum, item) => itemSum + item.cantidad, 0);
    }, 0);
    
    // Actualizar tarjetas de estadísticas
    document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(0)}`;
    document.getElementById('numOrdenes').textContent = numOrdenes;
    document.getElementById('ticketPromedio').textContent = `$${ticketPromedio.toFixed(0)}`;
    document.getElementById('itemsVendidos').textContent = itemsVendidos;
    
    // Renderizar tabla de ventas
    const tablaVentasHoy = document.getElementById('tablaVentasHoy');
    
    if (AppState.ventasHoy.length === 0) {
        tablaVentasHoy.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No hay ventas registradas hoy</td>
            </tr>
        `;
    } else {
        let html = '';
        
        AppState.ventasHoy.forEach(venta => {
            const fecha = new Date(venta.fecha);
            const hora = fecha.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const itemsStr = venta.items.map(item => 
                `${item.nombre} (x${item.cantidad})`
            ).join(', ');
            
            html += `
                <tr>
                    <td>${hora}</td>
                    <td>Mesa ${venta.mesa}</td>
                    <td>${itemsStr}</td>
                    <td><strong>$${venta.total}</strong></td>
                </tr>
            `;
        });
        
        tablaVentasHoy.innerHTML = html;
    }
}

async function cerrarCaja() {
    try {
        // Obtener estadísticas del día desde Supabase
        const estadisticas = await supabaseService.getEstadisticasHoy();
        
        if (!estadisticas || estadisticas.num_ventas === 0) {
            alert('No hay ventas para cerrar');
            return;
        }
        
        const mensaje = `¿Confirmar cierre de caja del día?\n\n` +
                        `Total ventas: ${estadisticas.num_ventas}\n` +
                        `Total recaudado: $${estadisticas.total_ventas}\n` +
                        `Items vendidos: ${estadisticas.total_items}\n` +
                        `Ticket promedio: $${estadisticas.ticket_promedio}\n\n` +
                        `Esto archivará las ventas del día y comenzará un nuevo período.`;
        
        if (confirm(mensaje)) {
            console.log('💰 Iniciando cierre de caja...');
            
            // Registrar cierre en Supabase
            const cierre = await supabaseService.cerrarCaja(AppState.currentUser?.id);
            
            if (!cierre) {
                throw new Error('No se pudo registrar el cierre de caja');
            }
            
            console.log('✅ Cierre registrado:', cierre);
            
            // Resetear ventas locales del día
            AppState.ventasHoy = [];
            AppState.fechaApertura = new Date().toLocaleDateString();
            
            saveData();
            
            alert(`Caja cerrada correctamente.\n\nTotal del día: $${estadisticas.total_ventas}\nVentas: ${estadisticas.num_ventas}`);
            
            // Recargar datos y actualizar vista
            await loadPedidosFromSupabase();
            await loadMesasFromSupabase();
            renderMesasCaja();
            renderDetalleCuenta();
            renderAnalytics();
        }
    } catch (error) {
        console.error('❌ Error al cerrar caja:', error);
        alert('Error al cerrar la caja. Por favor, intente nuevamente.');
    }
}

// ============================================
// GESTIÓN DE USUARIOS
// ============================================

function toggleVistaUsuarios() {
    const vistaCaja = document.getElementById('vistaCaja');
    const vistaAdmin = document.getElementById('vistaAdmin');
    const vistaAnalytics = document.getElementById('vistaAnalytics');
    const vistaUsuarios = document.getElementById('vistaUsuarios');
    const btnToggleText = document.getElementById('btnToggleText');
    const btnAnalyticsText = document.getElementById('btnAnalyticsText');
    const btnUsuariosText = document.getElementById('btnUsuariosText');
    
    if (vistaUsuarios.style.display === 'none') {
        vistaCaja.style.display = 'none';
        vistaAdmin.style.display = 'none';
        vistaAnalytics.style.display = 'none';
        vistaUsuarios.style.display = 'block';
        btnToggleText.textContent = 'Productos';
        btnAnalyticsText.textContent = 'Analytics';
        btnUsuariosText.textContent = 'Caja';
        renderUsuarios();
    } else {
        vistaCaja.style.display = 'block';
        vistaAdmin.style.display = 'none';
        vistaAnalytics.style.display = 'none';
        vistaUsuarios.style.display = 'none';
        btnToggleText.textContent = 'Productos';
        btnAnalyticsText.textContent = 'Analytics';
        btnUsuariosText.textContent = 'Usuarios';
        renderMesasCaja();
        renderDetalleCuenta();
    }
}

async function renderUsuarios() {
    const listaUsuarios = document.getElementById('listaUsuarios');
    if (!listaUsuarios) {
        console.error('Elemento listaUsuarios no encontrado');
        return;
    }
    
    try {
        const usuarios = await supabaseService.getUsuarios();
        
        console.log('Usuarios cargados:', usuarios.length);
        
        if (usuarios.length === 0) {
            listaUsuarios.innerHTML = '<p class="text-center text-muted mt-3">No hay usuarios registrados.</p>';
            return;
        }
        
        let html = '<div class="table-responsive"><table class="table table-hover">';
        html += '<thead><tr><th>Usuario</th><th>Rol</th><th>Fecha Creación</th><th>Acciones</th></tr></thead>';
        html += '<tbody>';
        
        usuarios.forEach(usuario => {
            const rolBadge = {
                'mozo': 'bg-primary',
                'cocina': 'bg-warning',
                'caja': 'bg-success'
            }[usuario.role] || 'bg-secondary';
            
            const rolTexto = {
                'mozo': 'Mozo',
                'cocina': 'Cocina',
                'caja': 'Caja/Admin'
            }[usuario.role] || usuario.role;
            
            const fechaCreacion = new Date(usuario.created_at).toLocaleDateString('es-ES');
            
            html += `
                <tr>
                    <td><strong>${usuario.username}</strong></td>
                    <td><span class="badge ${rolBadge}">${rolTexto}</span></td>
                    <td>${fechaCreacion}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1" onclick="editarUsuario('${usuario.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${usuario.id}', '${usuario.username}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        listaUsuarios.innerHTML = html;
        
    } catch (error) {
        console.error('Error al renderizar usuarios:', error);
        listaUsuarios.innerHTML = '<p class="text-danger">Error al cargar usuarios</p>';
    }
}

async function guardarUsuario(e) {
    e.preventDefault();
    
    const editando = document.getElementById('editandoUsuario').value === 'true';
    const usuarioId = document.getElementById('usuarioId').value;
    const username = document.getElementById('usuarioUsername').value.trim();
    const password = document.getElementById('usuarioPassword').value;
    const role = document.getElementById('usuarioRole').value;
    
    console.log('💾 Guardando usuario:', { username, role, editando });
    
    // Validaciones
    if (!username || !password || !role) {
        alert('Por favor complete todos los campos');
        return;
    }
    
    if (username.length < 3) {
        alert('El nombre de usuario debe tener al menos 3 caracteres');
        return;
    }
    
    if (password.length < 4) {
        alert('La contraseña debe tener al menos 4 caracteres');
        return;
    }
    
    // Validar que el username no tenga espacios ni caracteres especiales
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        alert('El nombre de usuario solo puede contener letras, números y guiones bajos');
        return;
    }
    
    try {
        // Verificar que el username no exista
        console.log('🔍 Verificando si el username existe...');
        const usernameExists = await supabaseService.checkUsernameExists(
            username, 
            editando ? usuarioId : null
        );
        
        if (usernameExists) {
            alert('Este nombre de usuario ya existe. Por favor elija otro.');
            return;
        }
        
        if (editando) {
            console.log('✏️ Actualizando usuario existente...');
            // Editar usuario existente
            const updates = {
                username: username,
                password_hash: password, // En producción usar bcrypt
                role: role
            };
            
            const resultado = await supabaseService.updateUsuario(usuarioId, updates);
            
            if (resultado) {
                console.log('✅ Usuario actualizado:', resultado);
                alert('Usuario actualizado correctamente');
            } else {
                console.error('❌ No se recibió respuesta al actualizar');
                alert('Error al actualizar el usuario. Verifique los permisos en Supabase.');
                return;
            }
        } else {
            console.log('➕ Creando nuevo usuario...');
            // Crear nuevo usuario
            const nuevoUsuario = {
                username: username,
                password_hash: password, // En producción usar bcrypt
                role: role
            };
            
            console.log('📤 Datos a enviar:', nuevoUsuario);
            const resultado = await supabaseService.addUsuario(nuevoUsuario);
            
            if (resultado) {
                console.log('✅ Usuario creado:', resultado);
                alert('Usuario creado correctamente');
            } else {
                console.error('❌ No se recibió respuesta al crear usuario');
                alert('Error al crear el usuario.\n\nPosibles causas:\n1. Políticas RLS muy restrictivas en Supabase\n2. Permisos insuficientes\n\nEjecuta el archivo fix-rls-usuarios.sql en Supabase.');
                return;
            }
        }
        
        // Limpiar formulario
        cancelarEdicionUsuario();
        
        // Actualizar lista
        renderUsuarios();
        
    } catch (error) {
        console.error('❌ Error al guardar usuario:', error);
        if (error.message) {
            console.error('Mensaje de error:', error.message);
        }
        if (error.code) {
            console.error('Código de error:', error.code);
        }
        alert(`Error al guardar el usuario.\n\nDetalles: ${error.message || 'Error desconocido'}\n\nRevisa la consola para más información.`);
    }
}

async function editarUsuario(id) {
    try {
        const usuarios = await supabaseService.getUsuarios();
        const usuario = usuarios.find(u => u.id === id);
        
        if (!usuario) {
            alert('Usuario no encontrado');
            return;
        }
        
        // Llenar el formulario
        document.getElementById('usuarioId').value = usuario.id;
        document.getElementById('editandoUsuario').value = 'true';
        document.getElementById('usuarioUsername').value = usuario.username;
        document.getElementById('usuarioPassword').value = usuario.password_hash;
        document.getElementById('usuarioRole').value = usuario.role;
        
        // Cambiar textos
        document.getElementById('formUsuarioTitulo').textContent = 'Editar Usuario';
        document.getElementById('btnGuardarUsuarioText').textContent = 'Actualizar Usuario';
        document.getElementById('btnCancelarUsuario').style.display = 'block';
        
        // Scroll al formulario
        document.getElementById('formUsuario').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error al editar usuario:', error);
        alert('Error al cargar los datos del usuario');
    }
}

async function eliminarUsuario(id, username) {
    if (!confirm(`¿Está seguro que desea eliminar el usuario "${username}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const resultado = await supabaseService.deleteUsuario(id);
        
        if (resultado) {
            alert('Usuario eliminado correctamente');
            renderUsuarios();
        } else {
            alert('Error al eliminar el usuario');
        }
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        alert('Error al eliminar el usuario. Intente nuevamente.');
    }
}

function cancelarEdicionUsuario() {
    document.getElementById('formUsuario').reset();
    document.getElementById('usuarioId').value = '';
    document.getElementById('editandoUsuario').value = 'false';
    document.getElementById('formUsuarioTitulo').textContent = 'Agregar Usuario';
    document.getElementById('btnGuardarUsuarioText').textContent = 'Guardar Usuario';
    document.getElementById('btnCancelarUsuario').style.display = 'none';
}
