const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

export async function fetchGroupInvoices(groupId, token) {
  const res = await fetch(`${API_URL}/groups/${groupId}/invoices`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Error obteniendo facturas");
  const data = await res.json();
  return data.invoices;
}

export async function uploadInvoiceXml(groupId, file, expenseId, token) {
  const formData = new FormData();
  formData.append("invoiceXml", file);
  if (expenseId) formData.append("expenseId", expenseId);

  const res = await fetch(`${API_URL}/groups/${groupId}/invoices/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error subiendo factura");
  }

  return res.json();
}

export async function verifyInvoice(invoiceId, token) {
  const res = await fetch(`${API_URL}/invoices/${invoiceId}/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Error verificando factura");
  return res.json();
}
