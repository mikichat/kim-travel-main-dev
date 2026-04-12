import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateFlightScheduleRequest {
  groupId?: string;
  groupName?: string;
  airline?: string;
  flightNumber?: string;
  departureDate?: string;
  departureAirport?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalAirport?: string;
  arrivalTime?: string;
  passengers?: number;
  pnr?: string;
  source?: string;
}

export interface UpdateFlightScheduleRequest {
  groupId?: string;
  groupName?: string;
  airline?: string;
  flightNumber?: string;
  departureDate?: string;
  departureAirport?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalAirport?: string;
  arrivalTime?: string;
  passengers?: number;
  pnr?: string;
  source?: string;
}

export async function getAllFlightSchedules(
  page?: number,
  limit?: number
): Promise<{ schedules: any[]; total: number }> {
  const total = await prisma.flightSchedule.count();

  if (page === undefined || limit === undefined) {
    const schedules = await prisma.flightSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { schedules, total };
  }

  const skip = (page - 1) * limit;
  const schedules = await prisma.flightSchedule.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return { schedules, total };
}

export async function getFlightScheduleById(id: string): Promise<any | null> {
  return prisma.flightSchedule.findUnique({
    where: { id },
  });
}

export async function getFlightScheduleByPnr(pnr: string): Promise<any | null> {
  return prisma.flightSchedule.findFirst({
    where: { pnr },
  });
}

export async function createFlightSchedule(data: CreateFlightScheduleRequest): Promise<any> {
  if (!data.flightNumber && !data.pnr) {
    throw new Error('Flight number or PNR is required');
  }

  const schedule = await prisma.flightSchedule.create({
    data: {
      id: uuidv4(),
      groupId: data.groupId,
      groupName: data.groupName,
      airline: data.airline,
      flightNumber: data.flightNumber,
      departureDate: data.departureDate,
      departureAirport: data.departureAirport,
      departureTime: data.departureTime,
      arrivalDate: data.arrivalDate,
      arrivalAirport: data.arrivalAirport,
      arrivalTime: data.arrivalTime,
      passengers: data.passengers || 0,
      pnr: data.pnr,
      source: data.source,
    },
  });

  return schedule;
}

export async function updateFlightSchedule(id: string, data: UpdateFlightScheduleRequest): Promise<any> {
  const existing = await prisma.flightSchedule.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Flight schedule not found');
  }

  const schedule = await prisma.flightSchedule.update({
    where: { id },
    data: {
      groupId: data.groupId ?? existing.groupId,
      groupName: data.groupName ?? existing.groupName,
      airline: data.airline ?? existing.airline,
      flightNumber: data.flightNumber ?? existing.flightNumber,
      departureDate: data.departureDate ?? existing.departureDate,
      departureAirport: data.departureAirport ?? existing.departureAirport,
      departureTime: data.departureTime ?? existing.departureTime,
      arrivalDate: data.arrivalDate ?? existing.arrivalDate,
      arrivalAirport: data.arrivalAirport ?? existing.arrivalAirport,
      arrivalTime: data.arrivalTime ?? existing.arrivalTime,
      passengers: data.passengers ?? existing.passengers,
      pnr: data.pnr ?? existing.pnr,
      source: data.source ?? existing.source,
    },
  });

  return schedule;
}

export async function deleteFlightSchedule(id: string): Promise<void> {
  const existing = await prisma.flightSchedule.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Flight schedule not found');
  }

  await prisma.flightSchedule.delete({ where: { id } });
}