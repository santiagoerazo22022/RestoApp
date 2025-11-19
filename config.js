// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================

// IMPORTANTE: Reemplaza estos valores con los de tu proyecto de Supabase
// Los puedes obtener en: https://app.supabase.com/project/_/settings/api

const SUPABASE_CONFIG = {
    url: 'https://dhyscixiwfpduonmapxn.supabase.co', // TU URL AQUÍ
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeXNjaXhpd2ZwZHVvbm1hcHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5ODIyMDcsImV4cCI6MjA3ODU1ODIwN30.5vrnNlZK55-qrq7zwEJRCF52zHzp29Te1bN6YKjjmwc' // TU KEY AQUÍ
};

// Configuración de la aplicación
const APP_CONFIG = {
    // Usuarios por defecto (se crearán en la BD si no existen)
    defaultUsers: [
        { username: 'mozo', password: '1234', role: 'mozo' },
        { username: 'cocina', password: '1234', role: 'cocina' },
        { username: 'caja', password: '1234', role: 'caja' }
    ],
    
    // Número de mesas del restaurante
    numMesas: 12,
    
    // Intervalo de actualización automática (en milisegundos)
    refreshInterval: 5000
};
