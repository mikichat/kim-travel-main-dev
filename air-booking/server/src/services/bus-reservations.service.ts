import { getIntranetDb } from '../db/intranet';

export interface BusReservationRow {
  id: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export async function getAllBusReservations(): Promise<BusReservationRow[]> {
  const db = await getIntranetDb();
  return db.all<BusReservationRow[]>(
    'SELECT * FROM bus_reservations ORDER BY updated_at DESC'
  );
}

export async function getBusReservationById(id: string): Promise<BusReservationRow | undefined> {
  const db = await getIntranetDb();
  return db.get<BusReservationRow>('SELECT * FROM bus_reservations WHERE id = ?', [id]);
}

export async function createBusReservation(data: string): Promise<BusReservationRow> {
  const db = await getIntranetDb();
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO bus_reservations (id, data, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`,
    [id, data]
  );
  const item = await getBusReservationById(id);
  if (!item) throw new Error('Failed to retrieve created bus reservation');
  return item;
}

export async function updateBusReservation(id: string, data: string): Promise<BusReservationRow | undefined> {
  const db = await getIntranetDb();
  await db.run(
    `UPDATE bus_reservations SET data = ?, updated_at = datetime('now') WHERE id = ?`,
    [data, id]
  );
  return getBusReservationById(id);
}

export async function deleteBusReservation(id: string): Promise<boolean> {
  const db = await getIntranetDb();
  const result = await db.run('DELETE FROM bus_reservations WHERE id = ?', [id]);
  return (result.changes ?? 0) > 0;
}
