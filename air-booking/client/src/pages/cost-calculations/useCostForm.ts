// useCostForm — CostCalculations.tsx 에서 추출된 폼 상태 및 핸들러

import { useState } from 'react';
import { useToast } from '../../components/common/Toast';

export interface CreateForm {
  name: string;
  destination: string;
  departure_date: string;
  arrival_date: string;
  nights: string;
  days: string;
  adults: string;
  children: string;
  infants: string;
  tc: string;
  domestic_vehicle_type: string;
  domestic_vehicle_total: string;
  margin_amount_1: string;
  margin_amount_2: string;
  notes_1: string;
  notes_2: string;
}

export const EMPTY_FORM: CreateForm = {
  name: '', destination: '', departure_date: '', arrival_date: '',
  nights: '', days: '', adults: '0', children: '0', infants: '0', tc: '0',
  domestic_vehicle_type: '', domestic_vehicle_total: '0',
  margin_amount_1: '0', margin_amount_2: '0', notes_1: '', notes_2: '',
};

interface UseCostFormOptions {
  onSuccess: () => void;
}

export function useCostForm({ onSuccess }: UseCostFormOptions) {
  const { toast } = useToast();
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const updateForm = (field: keyof CreateForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  const handleCreate = async (): Promise<boolean> => {
    if (!form.name) {
      toast.error('행사명을 입력해주세요.');
      return false;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/cost-calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          destination: form.destination || undefined,
          departure_date: form.departure_date || undefined,
          arrival_date: form.arrival_date || undefined,
          nights: form.nights ? Number(form.nights) : undefined,
          days: form.days ? Number(form.days) : undefined,
          adults: Number(form.adults) || 0,
          children: Number(form.children) || 0,
          infants: Number(form.infants) || 0,
          tc: Number(form.tc) || 0,
          domestic_vehicle_type: form.domestic_vehicle_type || undefined,
          domestic_vehicle_total: Number(form.domestic_vehicle_total) || 0,
          margin_amount_1: Number(form.margin_amount_1) || 0,
          margin_amount_2: Number(form.margin_amount_2) || 0,
          notes_1: form.notes_1 || undefined,
          notes_2: form.notes_2 || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('원가 계산서가 등록되었습니다.');
        resetForm();
        onSuccess();
        return true;
      } else {
        toast.error(data.error || '등록에 실패했습니다.');
        return false;
      }
    } catch {
      toast.error('원가 계산서 등록에 실패했습니다.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { form, saving, updateForm, resetForm, handleCreate };
}
