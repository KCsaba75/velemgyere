/**
 * Lokalis datum "YYYY-MM-DD" stringge formazasa -- NEM `d.toISOString().split('T')[0]`,
 * ami UTC-re konvertal egy lokalis ejfeli Date-et: Europe/Budapest-en (UTC+1/+2) ez
 * mindig egy nappal korabbi/kesobbi stringet adna vissza. Lasd kanban 70afbb5a.
 */
export function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}
