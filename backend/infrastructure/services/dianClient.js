const axios = require("axios");

class DianClient {
  constructor() {
    this.baseURL = process.env.DIAN_API_BASE_URL || "https://api.dian.gov.co";
    this.apiKey = process.env.DIAN_API_KEY || "";
  }

  /**
   * Verifica un CUFE en el servicio de DIAN (o gateway)
   * @param {string} cufe
   * @returns {Promise<{isValid: boolean, message: string}>}
   */
  async verifyCUFE(cufe) {
    try {
      // TODO: reemplazar por el endpoint real
      const resp = await axios.get(`${this.baseURL}/invoices/verify`, {
        params: { cufe },
        headers: {
          Authorization: this.apiKey ? `Bearer ${this.apiKey}` : undefined,
        },
        timeout: 5000,
      });

      // Estructura de ejemplo
      if (resp.data && resp.data.valid === true) {
        return { isValid: true, message: "Factura válida en DIAN" };
      }

      return {
        isValid: false,
        message:
          (resp.data && resp.data.message) ||
          "CUFE no encontrado o factura inválida",
      };
    } catch (err) {
      console.error("Error verificando CUFE:", err.message);
      return {
        isValid: false,
        message: "Error al consultar la DIAN / servicio externo",
      };
    }
  }
}

module.exports = new DianClient();
