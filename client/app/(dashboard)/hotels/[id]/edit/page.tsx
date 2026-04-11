'use client';

import HotelFormPage from '@/pages/HotelFormPage';
import { useParams } from 'next/navigation';

export default function HotelEditRoute() {
  const params = useParams();
  const id = params.id as string;

  return <HotelFormPage id={id} />;
}
