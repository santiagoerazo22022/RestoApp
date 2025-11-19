// ============================================
// SERVICIO DE SUPABASE PARA RESTOAPP
// ============================================

class SupabaseService {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.subscriptions = [];
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    async init() {
        try {
            // Crear cliente de Supabase
            this.supabase = supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey
            );
            
            console.log('✅ Supabase inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar Supabase:', error);
            return false;
        }
    }

    // ============================================
    // AUTENTICACIÓN
    // ============================================
    
    async login(username, password) {
        try {
            // Buscar usuario en la BD
            const { data, error } = await this.supabase
                .from('usuarios')
                .select('*')
                .eq('username', username)
                .eq('password_hash', password) // En producción usar bcrypt
                .single();
            
            if (error || !data) {
                console.error('Error en login:', error);
                return null;
            }
            
            this.currentUser = data;
            return data;
            
        } catch (error) {
            console.error('Error en login:', error);
            return null;
        }
    }

    logout() {
        this.currentUser = null;
        this.unsubscribeAll();
    }

    // ============================================
    // GESTIÓN DE USUARIOS
    // ============================================
    
    async getUsuarios() {
        try {
            const { data, error } = await this.supabase
                .from('usuarios')
                .select('*')
                .order('username', { ascending: true });
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            return [];
        }
    }

    async addUsuario(usuario) {
        try {
            console.log('📤 Intentando insertar usuario en Supabase:', usuario);
            
            const { data, error } = await this.supabase
                .from('usuarios')
                .insert([usuario])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Error de Supabase al insertar:', error);
                console.error('Código:', error.code);
                console.error('Mensaje:', error.message);
                console.error('Detalles:', error.details);
                console.error('Hint:', error.hint);
                throw error;
            }
            
            console.log('✅ Usuario insertado exitosamente:', data);
            return data;
            
        } catch (error) {
            console.error('❌ Error al agregar usuario:', error);
            throw error; // Re-lanzar el error para que se maneje en el frontend
        }
    }

    async updateUsuario(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('usuarios')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            return null;
        }
    }

    async deleteUsuario(id) {
        try {
            const { error } = await this.supabase
                .from('usuarios')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
            
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            return false;
        }
    }

    async checkUsernameExists(username, excludeId = null) {
        try {
            let query = this.supabase
                .from('usuarios')
                .select('id')
                .eq('username', username);
            
            if (excludeId) {
                query = query.neq('id', excludeId);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            return data && data.length > 0;
            
        } catch (error) {
            console.error('Error al verificar username:', error);
            return false;
        }
    }

    // ============================================
    // MESAS
    // ============================================
    
    async getMesas() {
        try {
            const { data, error } = await this.supabase
                .from('mesas')
                .select('*')
                .order('numero', { ascending: true });
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al obtener mesas:', error);
            return [];
        }
    }

    async updateMesa(mesaId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('mesas')
                .update(updates)
                .eq('id', mesaId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al actualizar mesa:', error);
            return null;
        }
    }

    async getMesaByNumero(numero) {
        try {
            const { data, error } = await this.supabase
                .from('mesas')
                .select('*')
                .eq('numero', numero)
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al obtener mesa:', error);
            return null;
        }
    }

    // ============================================
    // MENÚ
    // ============================================
    
    async getMenu() {
        try {
            const { data, error } = await this.supabase
                .from('menu_items')
                .select('*')
                .eq('disponible', true)
                .order('categoria', { ascending: true })
                .order('nombre', { ascending: true });
            
            if (error) throw error;
            
            // Agrupar por categoría
            const menuAgrupado = {};
            data.forEach(item => {
                if (!menuAgrupado[item.categoria]) {
                    menuAgrupado[item.categoria] = [];
                }
                menuAgrupado[item.categoria].push(item);
            });
            
            // Convertir a formato del app
            const menu = Object.keys(menuAgrupado).map(categoria => ({
                categoria: categoria,
                items: menuAgrupado[categoria]
            }));
            
            return menu;
            
        } catch (error) {
            console.error('Error al obtener menú:', error);
            return [];
        }
    }

    async addMenuItem(item) {
        try {
            const { data, error } = await this.supabase
                .from('menu_items')
                .insert([item])
                .select()
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al agregar item al menú:', error);
            return null;
        }
    }

    async updateMenuItem(id, updates) {
        try {
            const { data, error } = await this.supabase
                .from('menu_items')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al actualizar item del menú:', error);
            return null;
        }
    }

    async deleteMenuItem(id) {
        try {
            const { error } = await this.supabase
                .from('menu_items')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
            
        } catch (error) {
            console.error('Error al eliminar item del menú:', error);
            return false;
        }
    }

    // ============================================
    // PEDIDOS
    // ============================================
    
    async createPedido(mesaId, usuarioMozoId = null) {
        try {
            const { data, error } = await this.supabase
                .from('pedidos')
                .insert([{
                    mesa_id: mesaId,
                    usuario_mozo_id: usuarioMozoId,
                    estado: 'pendiente',
                    total: 0
                }])
                .select()
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al crear pedido:', error);
            return null;
        }
    }

    async getPedidoActivoByMesa(mesaId) {
        try {
            const { data, error } = await this.supabase
                .from('pedidos')
                .select(`
                    *,
                    pedido_items (
                        id,
                        nombre,
                        cantidad,
                        precio_unitario,
                        subtotal,
                        menu_item_id
                    )
                `)
                .eq('mesa_id', mesaId)
                .neq('estado', 'finalizado')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error) {
                // No hay pedido activo
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('Error al obtener pedido activo:', error);
            return null;
        }
    }

    async addItemToPedido(pedidoId, item) {
        try {
            const { data, error } = await this.supabase
                .from('pedido_items')
                .insert([{
                    pedido_id: pedidoId,
                    menu_item_id: item.menu_item_id || item.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio,
                    subtotal: item.cantidad * item.precio
                }])
                .select()
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al agregar item a pedido:', error);
            return null;
        }
    }

    async updatePedidoEstado(pedidoId, nuevoEstado) {
        try {
            const { data, error } = await this.supabase
                .from('pedidos')
                .update({ estado: nuevoEstado })
                .eq('id', pedidoId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al actualizar estado del pedido:', error);
            return null;
        }
    }

    async getPedidosActivos() {
        try {
            const { data, error } = await this.supabase
                .from('pedidos')
                .select(`
                    *,
                    mesas!inner (numero),
                    pedido_items (
                        id,
                        nombre,
                        cantidad,
                        precio_unitario,
                        subtotal
                    )
                `)
                .neq('estado', 'finalizado')
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al obtener pedidos activos:', error);
            return [];
        }
    }

    // ============================================
    // VENTAS
    // ============================================
    
    async finalizarVenta(pedidoId, mesaNumero, usuarioCajaId = null) {
        try {
            // Obtener datos del pedido
            const { data: pedido, error: pedidoError } = await this.supabase
                .from('pedidos')
                .select(`
                    *,
                    pedido_items (*)
                `)
                .eq('id', pedidoId)
                .single();
            
            if (pedidoError) throw pedidoError;
            
            // Registrar venta
            const { data: venta, error: ventaError } = await this.supabase
                .from('ventas')
                .insert([{
                    pedido_id: pedidoId,
                    mesa_numero: mesaNumero,
                    total: pedido.total,
                    num_items: pedido.pedido_items.reduce((sum, item) => sum + item.cantidad, 0),
                    usuario_caja_id: usuarioCajaId,
                    items_json: pedido.pedido_items
                }])
                .select()
                .single();
            
            if (ventaError) throw ventaError;
            
            // Actualizar pedido como finalizado
            await this.updatePedidoEstado(pedidoId, 'finalizado');
            
            // Actualizar mesa a libre
            const { data: mesa } = await this.supabase
                .from('mesas')
                .select('id')
                .eq('numero', mesaNumero)
                .single();
            
            if (mesa) {
                await this.updateMesa(mesa.id, { estado: 'libre' });
            }
            
            return venta;
            
        } catch (error) {
            console.error('Error al finalizar venta:', error);
            return null;
        }
    }

    async getVentasHoy() {
        try {
            const { data, error } = await this.supabase
                .from('ventas_hoy') // Vista creada en schema.sql
                .select('*');
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al obtener ventas de hoy:', error);
            return [];
        }
    }

    async getEstadisticasHoy() {
        try {
            const { data, error } = await this.supabase
                .from('estadisticas_dia') // Vista creada en schema.sql
                .select('*')
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return {
                num_ventas: 0,
                total_ventas: 0,
                total_items: 0,
                ticket_promedio: 0
            };
        }
    }

    async cerrarCaja(usuarioId = null) {
        try {
            const estadisticas = await this.getEstadisticasHoy();
            const ventas = await this.getVentasHoy();
            
            const { data, error } = await this.supabase
                .from('cierres_caja')
                .insert([{
                    fecha: new Date().toISOString().split('T')[0],
                    total_ventas: estadisticas.total_ventas,
                    num_ordenes: estadisticas.num_ventas,
                    num_items: estadisticas.total_items,
                    ticket_promedio: estadisticas.ticket_promedio,
                    usuario_id: usuarioId,
                    detalles_json: ventas
                }])
                .select()
                .single();
            
            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('Error al cerrar caja:', error);
            return null;
        }
    }

    // ============================================
    // REALTIME SUBSCRIPTIONS
    // ============================================
    
    subscribeToPedidos(callback) {
        const subscription = this.supabase
            .channel('pedidos-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pedidos'
                },
                (payload) => {
                    console.log('📡 Cambio en pedidos:', payload);
                    callback(payload);
                }
            )
            .subscribe();
        
        this.subscriptions.push(subscription);
        return subscription;
    }

    subscribeToMesas(callback) {
        const subscription = this.supabase
            .channel('mesas-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'mesas'
                },
                (payload) => {
                    console.log('📡 Cambio en mesas:', payload);
                    callback(payload);
                }
            )
            .subscribe();
        
        this.subscriptions.push(subscription);
        return subscription;
    }

    subscribeToVentas(callback) {
        const subscription = this.supabase
            .channel('ventas-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ventas'
                },
                (payload) => {
                    console.log('📡 Nueva venta:', payload);
                    callback(payload);
                }
            )
            .subscribe();
        
        this.subscriptions.push(subscription);
        return subscription;
    }

    unsubscribeAll() {
        this.subscriptions.forEach(sub => {
            this.supabase.removeChannel(sub);
        });
        this.subscriptions = [];
    }

    // ============================================
    // UTILIDADES
    // ============================================
    
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('mesas')
                .select('count');
            
            if (error) throw error;
            console.log('✅ Conexión a Supabase exitosa');
            return true;
            
        } catch (error) {
            console.error('❌ Error de conexión a Supabase:', error);
            return false;
        }
    }
}

// Crear instancia global
const supabaseService = new SupabaseService();
