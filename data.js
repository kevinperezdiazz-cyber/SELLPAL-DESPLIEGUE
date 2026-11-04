/**
 * SELLPAL - Mock localStorage desactivado.
 * Los datos viven en PostgreSQL a través de ApiService (Spring Boot).
 */
window.SELLPAL_DB = {
  get() {
    return {
      cargos: [], empleados: [], clientes: [], categorias: [],
      productos: [], pedidos: [], pagos: [], entregas: [], auditLogs: []
    };
  },
  save() { /* no-op: no se persiste en el navegador */ }
};
