// =====================================================
// logic.js — Cálculos y utilidades (no dibuja nada)
// =====================================================

// ============================
// FECHAS Y HORAS
// ============================
function dateToStr(d) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD en hora local
}

function todayStr() {
  return dateToStr(new Date());
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return dateToStr(d);
}

function nowHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToHHMM(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function formatTimeTo12Hour(time24) {
  if (!time24) return "";
  let [hour, minute] = String(time24).split(":");
  hour = parseInt(hour, 10);
  if (isNaN(hour)) return time24;
  const ampm = hour >= 12 ? "pm" : "am";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

function formatDateMMDDYYYY(dateStr) {
  if (!dateStr) return "";
  const [yyyy, mm, dd] = String(dateStr).split("-");
  return `${mm}-${dd}-${yyyy}`;
}

function appointmentDateTime(app) {
  return new Date(`${app.date}T${app.time || "00:00"}`);
}

function byTime(a, b) {
  return toMinutes(a.time) - toMinutes(b.time);
}

function byDateTimeDesc(a, b) {
  const da = `${a.date || ""}T${a.time || ""}`;
  const dbb = `${b.date || ""}T${b.time || ""}`;
  return dbb.localeCompare(da);
}

// ============================
// TEXTO Y NÚMEROS
// ============================
function formatMoney(value) {
  return "$" + (Number(value) || 0).toFixed(2);
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Evita que un nombre con < > " rompa las tablas
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// ============================
// BÚSQUEDAS
// ============================
function findClient(id) {
  if (!id) return null;
  return clients.find(c => String(c.id) === String(id)) || null;
}

function findService(id) {
  if (!id) return null;
  return services.find(s => String(s.id) === String(id)) || null;
}

function findAppointment(id) {
  return appointments.find(a => String(a.id) === String(id)) || null;
}

function clientName(id, fallback = "—") {
  const client = findClient(id);
  return client ? client.name : fallback;
}

function serviceName(id) {
  const service = findService(id);
  return service ? service.name : "—";
}

function getServiceDuration(serviceId) {
  const service = findService(serviceId);
  return service ? toNumber(service.duration, 30) : 30;
}

// Precio guardado en la cita/corte, o el del servicio si no tiene
function getItemPrice(item) {
  if (!item) return 0;
  const saved = toNumber(item.price, NaN);
  if (Number.isFinite(saved)) return saved;
  const service = findService(item.serviceId);
  return service ? toNumber(service.price) : 0;
}

// ============================
// INGRESOS
// ============================
function inRange(dateStr, fromDate, toDate) {
  if (!dateStr) return false;
  return (!fromDate || dateStr >= fromDate) && (!toDate || dateStr <= toDate);
}

function generateIncomeReport(fromDate, toDate) {
  const citas = appointments.filter(a => a.status === "completada" && inRange(a.date, fromDate, toDate));
  const walkins = walkinCuts.filter(w => inRange(w.date, fromDate, toDate));

  const citasTotal = citas.reduce((sum, a) => sum + getItemPrice(a), 0);
  const walkinTotal = walkins.reduce((sum, w) => sum + getItemPrice(w), 0);

  return {
    citasCount: citas.length,
    citasTotal,
    walkinCount: walkins.length,
    walkinTotal,
    totalGeneral: citasTotal + walkinTotal
  };
}

function calculateTodayIncome() {
  const today = todayStr();
  return generateIncomeReport(today, today);
}

// Ingresos estimados: citas de hoy no canceladas + cortes rápidos de hoy
function calculateEstimatedIncomeToday() {
  const today = todayStr();
  const citas = appointments.filter(a => a.date === today && a.status !== "cancelada");
  const walkins = walkinCuts.filter(w => w.date === today);
  return citas.reduce((s, a) => s + getItemPrice(a), 0) +
         walkins.reduce((s, w) => s + getItemPrice(w), 0);
}

// ============================
// ESTADÍSTICAS
// ============================
function countBy(list, keyFn) {
  const counts = {};
  list.forEach(item => {
    const key = keyFn(item);
    if (key) counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function getSoldItems() {
  return [
    ...appointments.filter(a => a.status !== "cancelada"),
    ...walkinCuts
  ];
}

function getTopServices(lastDays = null) {
  const from = lastDays ? addDays(todayStr(), -lastDays) : null;
  const items = getSoldItems().filter(i => !from || (i.date && i.date >= from));
  return countBy(items, i => {
    const s = findService(i.serviceId);
    return s ? s.name : null;
  });
}

function getTopClients() {
  return countBy(getSoldItems(), i => {
    const c = findClient(i.clientId);
    return c ? c.name : null;
  });
}

function getNewClientsToday() {
  const today = todayStr();
  return clients.filter(c => c.createdDate === today);
}

// ============================
// ALERTAS
// ============================
function getCancelledAppointmentsToday() {
  const today = todayStr();
  return appointments.filter(a => a.date === today && a.status === "cancelada").sort(byTime);
}

function getLateAppointmentsToday() {
  const now = new Date();
  const today = todayStr();
  return appointments
    .filter(a => a.date === today && a.status === "programada" && appointmentDateTime(a) <= now)
    .sort(byTime);
}

function getUpcomingAppointments(withinMinutes = 60) {
  const now = new Date();
  const today = todayStr();
  return appointments
    .filter(a => a.date === today && a.status === "programada")
    .filter(a => {
      const diff = (appointmentDateTime(a) - now) / 60000;
      return diff > 0 && diff <= withinMinutes;
    })
    .sort(byTime);
}

// Citas de días anteriores que se quedaron como "programada"
function getPastOpenAppointments() {
  const today = todayStr();
  return appointments.filter(a => a.status === "programada" && a.date < today);
}

// ============================
// AGENDA: HUECOS DISPONIBLES
// ============================
// Devuelve null si no hay horario configurado
function getFreeSlots(dateStr, excludeId = null) {
  if (!workHours.startTime || !workHours.endTime) return null;

  const start = toMinutes(workHours.startTime);
  const end = toMinutes(workHours.endTime);

  const busy = appointments
    .filter(a => a.date === dateStr && a.status !== "cancelada" && String(a.id) !== String(excludeId))
    .map(a => {
      const s = toMinutes(a.time);
      return { start: s, end: s + getServiceDuration(a.serviceId) };
    })
    .sort((a, b) => a.start - b.start);

  const slots = [];
  let cursor = start;

  busy.forEach(b => {
    if (b.start > cursor) {
      slots.push({ start: cursor, end: Math.min(b.start, end) });
    }
    cursor = Math.max(cursor, b.end);
  });

  if (cursor < end) slots.push({ start: cursor, end });

  return slots
    .filter(s => s.end > s.start)
    .map(s => ({ ...s, minutes: s.end - s.start }));
}

// Busca otra cita que se cruce con el horario indicado
function findOverlappingAppointment(dateStr, timeStr, serviceId, excludeId = null) {
  const start = toMinutes(timeStr);
  const end = start + getServiceDuration(serviceId);

  return appointments.find(a => {
    if (a.date !== dateStr || a.status === "cancelada") return false;
    if (String(a.id) === String(excludeId)) return false;
    const aStart = toMinutes(a.time);
    const aEnd = aStart + getServiceDuration(a.serviceId);
    return start < aEnd && aStart < end;
  }) || null;
}

// ============================
// WHATSAPP
// ============================
function buildWhatsAppUrl(phone, message) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) digits = "1" + digits; // números de EE. UU. sin código
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function reminderMessage(app) {
  const name = clientName(app.clientId, "");
  const hora = formatTimeTo12Hour(app.time);
  const cuando = app.date === todayStr()
    ? `hoy a las ${hora}`
    : `el ${formatDateMMDDYYYY(app.date)} a las ${hora}`;
  return `Hola ${name}, te recordamos tu cita ${cuando}. ¡Te esperamos!`;
}

// ============================
// IMÁGENES
// Reduce la foto antes de guardarla (máx. ~900 KB)
// ============================
function compressImage(file, maxSize = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

        let q = quality;
        let data = canvas.toDataURL("image/jpeg", q);
        while (data.length > 900000 && q > 0.3) {
          q -= 0.1;
          data = canvas.toDataURL("image/jpeg", q);
        }

        if (data.length > 1000000) {
          reject(new Error("La foto es demasiado grande."));
          return;
        }
        resolve(data);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
