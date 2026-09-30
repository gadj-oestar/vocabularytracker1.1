// Transforme une date comme "2026-09-12" en "12/09/2026" (format français du cahier des charges).
export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('fr-FR')
}
