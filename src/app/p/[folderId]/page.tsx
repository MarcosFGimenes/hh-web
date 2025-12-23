"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { TimeSequenceInput } from '@/components/TimeSequenceInput';
import { Toast } from '@/components/Toast';
import type { Employee } from '@/types/employee';
import type { ServiceOrder } from '@/types/os';
import type { Service } from '@/types/service';
import {
  computeDayTotalMinutes,
  computeServiceMinutes as computeServiceMinutesLib,
  validateEmployeeServicesSum,
  type TimeSequence,
} from '@/lib/time/service';

type FolderSummary = {
  id: string;
  name: string;
};

type PageProps = {
  params: { folderId: string };
};

type DaySignature = {
  url: string | null;
  name: string | null;
  signedAt: number | null;
};

type SpeechRecognitionAlternativeLike = { transcript?: string };
type SpeechRecognitionResultLike = SpeechRecognitionAlternativeLike[];
type SpeechRecognitionEventLike = { results: SpeechRecognitionResultLike[] };
type SpeechRecognitionErrorEventLike = { error: string };

type VoiceTarget = { type: 'new' | 'existing'; employeeId: string; serviceId?: string };

export const dynamic = 'force-dynamic';

type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function PublicFolderAccessPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const folderId = params.folderId;
  const [folder, setFolder] = useState<FolderSummary | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showServicesFor, setShowServicesFor] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [services, setServices] = useState<Record<string, Service[]>>({});
  const [serviceForms, setServiceForms] = useState<
    Record<
      string,
      {
        osId: string;
        description: string;
        t1In: string;
        t1Out: string;
        t2In: string;
        t2Out: string;
      }
    >
  >({});
  const [serviceFormErrors, setServiceFormErrors] = useState<Record<string, string[]>>({});
  const [serviceErrors, setServiceErrors] = useState<Record<string, Record<string, string[]>>>({});
  const defaultServiceForm = { osId: '', description: '', t1In: '', t1Out: '', t2In: '', t2Out: '' };
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechChecked, setSpeechChecked] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<string | null>(null);
  const [voiceMessageTarget, setVoiceMessageTarget] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [signature, setSignature] = useState<DaySignature>({ url: null, name: null, signedAt: null });
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [replaceSignature, setReplaceSignature] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [hasSignatureDrawing, setHasSignatureDrawing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (addEmployeeOpen) {
      setNewEmployeeName('');
    }
  }, [addEmployeeOpen]);

  const getRecognitionConstructor = () => {
    if (typeof window === 'undefined') return null;
    const Recognition =
      (window as typeof window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      window.webkitSpeechRecognition;
    return Recognition || null;
  };

  const linkKey = useMemo(() => searchParams.get('k') || '', [searchParams]);

  useEffect(() => {
    const Recognition = getRecognitionConstructor();
    setSpeechSupported(Boolean(Recognition));
    setSpeechChecked(true);

    return () => {
      recognitionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const voiceUnavailable = speechChecked && !speechSupported;

  const fetchJSON = async (path: string) => {
    const response = await fetch(path, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) {
      const message = data?.error || 'Falha ao validar o link.';
      throw new Error(message);
    }
    return data;
  };

  const loadEmployees = async (targetDate: string) => {
    const data = await fetchJSON(
      `/api/p/folders/${folderId}/days/${targetDate}/employees?k=${encodeURIComponent(linkKey)}`
    );
    setEmployees(data.employees);
  };

  const loadSignature = async (targetDate: string) => {
    setSignatureLoading(true);
    try {
      const data = await fetchJSON(
        `/api/p/folders/${folderId}/days/${targetDate}?k=${encodeURIComponent(linkKey)}`
      );
      setSignature({
        url: data.signatureUrl || null,
        name: data.signatureName || null,
        signedAt: data.signedAt || null,
      });
      setSignatureName(data.signatureName || '');
      setReplaceSignature(false);
      clearSignatureCanvas();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar assinatura.';
      setError(message);
      setSignature({ url: null, name: null, signedAt: null });
    } finally {
      setSignatureLoading(false);
    }
  };

  useEffect(() => {
    const validate = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!linkKey) {
          throw new Error('Link inválido ou expirado. Verifique se o parâmetro ?k= está presente no URL.');
        }

        const summary = await fetchJSON(`/api/p/folders/${folderId}/summary?k=${encodeURIComponent(linkKey)}`);
        setFolder(summary.folder);

        const osData = await fetchJSON(`/api/p/folders/${folderId}/os?k=${encodeURIComponent(linkKey)}`);
        setOrders(osData.orders);

        await loadEmployees(date);
        await loadAllServices(date, osData.orders.length > 0);
        await loadSignature(date);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Link inválido ou expirado.';
        setError(message);
        setFolder(null);
        setOrders([]);
        setEmployees([]);
        setServices({});
      } finally {
        setLoading(false);
      }
    };

    validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, linkKey]);

  const hasOrders = orders.length > 0;
  const hasEmployees = employees.length > 0;

  const handleChangeDate = async (nextDate: string) => {
    setDate(nextDate);
    setServiceFormErrors({});
    setServiceForms({});
    setServiceErrors({});
    try {
      await loadEmployees(nextDate);
      await loadAllServices(nextDate, hasOrders);
      await loadSignature(nextDate);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar funcionários.';
      setError(message);
      setEmployees([]);
      setServices({});
    }
  };

  const startDrawingSignature = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    event.currentTarget.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawSignature = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignatureDrawing(true);
  };

  const endDrawingSignature = (event?: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event?.preventDefault();
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    prepareSignatureCanvas();
  };

  const handleCreateEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newEmployeeName.trim()) return;
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newEmployeeName }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao adicionar funcionário.');
      setEmployees((prev) => [data.employee, ...prev]);
      setAddEmployeeOpen(false);
      setNewEmployeeName('');
      setSuccess('Salvo com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar funcionário.';
      setError(message);
    }
  };

  const handleUpdateMinutes = async (employeeId: string, totalMinutes: number) => {
    setSavingEmployeeId(employeeId);
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees/${employeeId}?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ totalMinutes }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar horário.');
      setEmployees((prev) => prev.map((emp) => (emp.id === employeeId ? data.employee : emp)));
      setSuccess('Salvo com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar horário.';
      setError(message);
    } finally {
      setSavingEmployeeId(null);
    }
  };

  const loadAllServices = async (targetDate: string, hasOs: boolean) => {
    if (!hasOs) {
      setServices({});
      return;
    }
    try {
      const allServices: Record<string, Service[]> = {};
      const errors: Record<string, Record<string, string[]>> = {};
      await Promise.all(
        employees.map(async (employee) => {
          const data = await fetchJSON(
            `/api/p/folders/${folderId}/days/${targetDate}/employees/${employee.id}/services?k=${encodeURIComponent(
              linkKey
            )}`
          );
          allServices[employee.id] = data.services;
          errors[employee.id] = {};
        })
      );
      setServices(allServices);
      setServiceErrors(errors);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar serviços.';
      setError(message);
      setServices({});
      setServiceErrors({});
    }
  };

  const updateServiceForm = (employeeId: string, field: keyof (typeof serviceForms)[string], value: string) => {
    setServiceForms((prev) => {
      const existing = prev[employeeId] || defaultServiceForm;
      return {
        ...prev,
        [employeeId]: {
          ...defaultServiceForm,
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const minutesToTimeWithinDay = (totalMinutes: number) => {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0 || totalMinutes >= 24 * 60) return null;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const resolveEmployeeDayTotal = (employee: Employee | undefined) => {
    if (!employee || employee.totalMinutes === null) {
      return { minutes: null, errors: ['Defina o horário total do funcionário antes de lançar serviços.'] };
    }

    if (employee.totalMinutes <= 0) {
      return { minutes: null, errors: ['Defina o horário total do funcionário antes de lançar serviços.'] };
    }

    const endTime = minutesToTimeWithinDay(employee.totalMinutes);
    if (endTime) {
      const result = computeDayTotalMinutes('00:00', endTime);
      if (!result.errors.length && result.minutes !== null) {
        return { minutes: result.minutes, errors: [] };
      }
      return { minutes: employee.totalMinutes, errors: result.errors };
    }

    return { minutes: employee.totalMinutes, errors: [] };
  };

  const voiceKey = (target: VoiceTarget) =>
    target.type === 'new' ? `new-${target.employeeId}` : `existing-${target.serviceId || ''}`;

  const appendTranscript = (current: string, transcript: string) =>
    [current?.trim(), transcript.trim()].filter(Boolean).join(current.trim() ? ' ' : '').trim();

  const prepareSignatureCanvas = () => {
    if (typeof window === 'undefined') return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
    setHasSignatureDrawing(false);
  };

  useEffect(() => {
    prepareSignatureCanvas();
    const handleResize = () => prepareSignatureCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startVoiceRecording = (target: VoiceTarget) => {
    const targetKey = voiceKey(target);
    const Recognition = getRecognitionConstructor();

    if (!Recognition) {
      setVoiceMessageTarget(targetKey);
      setSpeechSupported(false);
      setSpeechChecked(true);
      setSpeechError('Seu navegador não suporta reconhecimento de voz. Digite a descrição normalmente.');
      return;
    }

    if (recordingTarget && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setVoiceMessageTarget(targetKey);
    setSpeechError(null);
    const recognition = new Recognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setRecordingTarget(targetKey);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!transcript) return;

      if (target.type === 'new') {
        setServiceForms((prev) => {
          const current = prev[target.employeeId]?.description || '';
          return {
            ...prev,
            [target.employeeId]: {
              ...(prev[target.employeeId] || defaultServiceForm),
              description: appendTranscript(current, transcript),
            },
          };
        });
      } else if (target.serviceId) {
        setServices((prev) => ({
          ...prev,
          [target.employeeId]: (prev[target.employeeId] || []).map((item) =>
            item.id === target.serviceId ? { ...item, description: appendTranscript(item.description, transcript) } : item
          ),
        }));
      }
    };
    recognition.onerror = (event) => {
      let message = 'Erro ao capturar áudio.';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        message = 'Permissão para usar o microfone foi negada.';
      } else if (event.error === 'no-speech') {
        message = 'Nenhuma fala detectada. Tente novamente.';
      } else if (event.error === 'audio-capture') {
        message = 'Microfone não disponível ou acesso bloqueado.';
      }
      setSpeechError(message);
    };
    recognition.onend = () => {
      setRecordingTarget((current) => (current === targetKey ? null : current));
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      setSpeechError('Não foi possível iniciar a gravação. Verifique as permissões do navegador.');
      setRecordingTarget(null);
    }
  };

  const computeServiceMinutes = (t1In: string, t1Out: string, t2In: string, t2Out: string) => {
    const { minutes, errors } = computeServiceMinutesLib({
      t1In,
      t1Out,
      t2In,
      t2Out,
    });
    return errors.length ? null : minutes;
  };

  const currentServiceTotal = (employeeId: string) =>
    (services[employeeId] || []).reduce((acc, service) => acc + (service.totalMinutes || 0), 0);

  const handleNewServiceTimesChange = (employeeId: string, times: TimeSequence, errors: string[]) => {
    setServiceForms((prev) => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] || defaultServiceForm), ...times },
    }));
    setServiceFormErrors((prev) => ({ ...prev, [employeeId]: errors }));
  };

  const handleExistingServiceTimesChange = (
    employeeId: string,
    serviceId: string,
    times: TimeSequence,
    errors: string[]
  ) => {
    setServices((prev) => ({
      ...prev,
      [employeeId]: (prev[employeeId] || []).map((item) => (item.id === serviceId ? { ...item, ...times } : item)),
    }));
    setServiceErrors((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [serviceId]: errors,
      },
    }));
  };

  const handleCreateService = async (employeeId: string) => {
    const form = serviceForms[employeeId] || {
      osId: '',
      description: '',
      t1In: '',
      t1Out: '',
      t2In: '',
      t2Out: '',
    };

    if ((serviceFormErrors[employeeId] || []).length) {
      setError('Corrija os horários antes de salvar o serviço.');
      return;
    }

    const employee = employees.find((emp) => emp.id === employeeId);
    const { minutes: employeeDayTotal, errors: employeeDayTotalErrors } = resolveEmployeeDayTotal(employee);

    if (!employeeDayTotal || employeeDayTotal <= 0) {
      setError('Defina o horário total do funcionário antes de lançar serviços.');
      return;
    }

    if (employeeDayTotalErrors.length) {
      setError(employeeDayTotalErrors.join(' '));
      return;
    }

    const { minutes: total, errors, normalizedTimes } = computeServiceMinutesLib(form);
    if (errors.length || total === null) {
      setError(errors.join(' ') || 'Horários inválidos para o serviço.');
      return;
    }

    const validation = validateEmployeeServicesSum(
      [...(services[employeeId] || []).map((item) => item.totalMinutes || 0), total],
      employeeDayTotal
    );
    if (!validation.ok) {
      setError(validation.error || 'Soma dos serviços excede o horário total do funcionário.');
      return;
    }

    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees/${employeeId}/services?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, ...normalizedTimes }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar serviço.');
      setServices((prev) => ({
        ...prev,
        [employeeId]: [data.service, ...(prev[employeeId] || [])],
      }));
      setServiceForms((prev) => ({
        ...prev,
        [employeeId]: { osId: '', description: '', t1In: '', t1Out: '', t2In: '', t2Out: '' },
      }));
      setSuccess('Salvo com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar serviço.';
      setError(message);
    }
  };

  const handleUpdateService = async (employeeId: string, service: Service) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    const { minutes: employeeDayTotal, errors: employeeDayTotalErrors } = resolveEmployeeDayTotal(employee);

    if (!employeeDayTotal || employeeDayTotal <= 0) {
      setError('Defina o horário total do funcionário antes de atualizar serviços.');
      return;
    }

    if (employeeDayTotalErrors.length) {
      setError(employeeDayTotalErrors.join(' '));
      return;
    }

    if (serviceErrors[employeeId]?.[service.id]?.length) {
      setError('Corrija os horários antes de salvar o serviço.');
      return;
    }

    const { minutes: total, errors, normalizedTimes } = computeServiceMinutesLib(service);
    if (errors.length || total === null) {
      setError(errors.join(' ') || 'Horários inválidos para o serviço.');
      return;
    }

    const totalsWithUpdate = (services[employeeId] || []).map((item) =>
      item.id === service.id ? total : item.totalMinutes || 0
    );

    const validation = validateEmployeeServicesSum(totalsWithUpdate, employeeDayTotal);
    if (!validation.ok) {
      setError(validation.error || 'Soma dos serviços excede o horário total do funcionário.');
      return;
    }

    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees/${employeeId}/services/${service.id}?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...service, ...normalizedTimes, totalMinutes: total }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao atualizar serviço.');
      setServices((prev) => ({
        ...prev,
        [employeeId]: (prev[employeeId] || []).map((item) => (item.id === service.id ? data.service : item)),
      }));
      setSuccess('Salvo com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar serviço.';
      setError(message);
    }
  };

  const handleDeleteService = async (employeeId: string, serviceId: string) => {
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/employees/${employeeId}/services/${serviceId}?k=${encodeURIComponent(linkKey)}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao excluir serviço.');
      setServices((prev) => ({
        ...prev,
        [employeeId]: (prev[employeeId] || []).filter((item) => item.id !== serviceId),
      }));
      setSuccess('Serviço excluído.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir serviço.';
      setError(message);
    }
  };

  const handleSaveSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) {
      setError('Canvas de assinatura não disponível.');
      return;
    }

    if (!hasSignatureDrawing) {
      setError('Desenhe a assinatura antes de salvar.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    setSavingSignature(true);
    try {
      const response = await fetch(
        `/api/p/folders/${folderId}/days/${date}/signature?k=${encodeURIComponent(linkKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, name: signatureName.trim() }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar assinatura.');

      setSignature({
        url: data.signatureUrl || null,
        name: data.signatureName || null,
        signedAt: data.signedAt || null,
      });
      setReplaceSignature(false);
      setHasSignatureDrawing(false);
      clearSignatureCanvas();
      setSuccess('Assinatura salva com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar assinatura.';
      setError(message);
    } finally {
      setSavingSignature(false);
    }
  };

  return (
    <main className="public-main">
      <div className="container public-container">
        {error ? (
          <Card title="Link inválido ou expirado">
            <p className="footer-note">{error}</p>
          </Card>
        ) : null}

        {!error ? (
          <>
            <div className="public-hero">
              <div>
                <p className="chip">Link privado</p>
                <h1 className="public-title">{folder ? folder.name : 'Validando link...'}</h1>
                <p className="footer-note">
                  Preencha os lançamentos do dia. Use &quot;Adicionar Funcionário&quot; e registre as O.S. dentro de cada card.
                </p>
              </div>
              <div className="public-actions">
                <label className="ui-field" style={{ minWidth: '220px' }}>
                  <span className="ui-field-label">Data</span>
                  <input
                    className="ui-input"
                    type="date"
                    value={date}
                    onChange={(event) => handleChangeDate(event.target.value)}
                    required
                  />
                </label>
                <Button type="button" onClick={() => setAddEmployeeOpen(true)}>
                  Adicionar Funcionário
                </Button>
                <Link href="/">
                  <Button variant="outline" type="button">
                    Voltar
                  </Button>
                </Link>
              </div>
            </div>

            <Card title="Ordens de Serviço disponíveis" subtitle={loading ? 'Carregando...' : `Total: ${orders.length}`}>
              {hasOrders ? (
                <div className="public-chip-list">
                  {orders.map((order) => (
                    <div key={order.id} className="public-chip-card">
                      <div className="public-chip-row">
                        <span className="pill pill-strong">{order.osCode}</span>
                        <span className="pill pill-soft">{order.tag}</span>
                      </div>
                      <div className="footer-note">{order.machineName}</div>
                      <div className="footer-note" style={{ lineHeight: 1.5 }}>
                        {order.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="footer-note">
                  {loading ? 'Carregando...' : 'Nenhuma O.S. cadastrada para esta pasta.'}
                </p>
              )}
            </Card>

            <Card title="Funcionários do dia" subtitle={`Data: ${date.split('-').reverse().join('/')}`}>
              {hasEmployees ? (
                <div className="public-employee-grid">
                  {employees.map((employee) => {
                    const newVoiceKey = voiceKey({ type: 'new', employeeId: employee.id });
                    const isRecordingNew = recordingTarget === newVoiceKey;
                    const isBusyRecording = Boolean(recordingTarget && !isRecordingNew);

                    return (
                      <div key={employee.id} className="public-employee-card">
                        <div className="public-employee-head">
                          <div className="pill pill-strong">{employee.name}</div>
                          <div className="public-chip-row">
                            <span className="pill pill-soft">
                              Total:{' '}
                              {employee.totalMinutes ? formatMinutes(employee.totalMinutes) : 'definir'}
                            </span>
                            <span className="pill pill-soft">
                              Serviços: {formatMinutes(currentServiceTotal(employee.id))}
                            </span>
                            <button
                              type="button"
                              className="pill pill-action"
                              onClick={() => setShowServicesFor((prev) => (prev === employee.id ? null : employee.id))}
                            >
                              + Serviço
                            </button>
                          </div>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          label="Horário total (minutos)"
                          value={employee.totalMinutes ?? ''}
                          onChange={(event) =>
                            setEmployees((prev) =>
                              prev.map((item) =>
                                item.id === employee.id
                                  ? { ...item, totalMinutes: Number(event.target.value) || 0 }
                                  : item
                              )
                            )
                          }
                        />
                        <div className="public-chip-row">
                          <Button
                            type="button"
                            onClick={() => handleUpdateMinutes(employee.id, employee.totalMinutes || 0)}
                            disabled={savingEmployeeId === employee.id}
                          >
                            {savingEmployeeId === employee.id ? 'Salvando...' : 'Salvar horário'}
                          </Button>
                        </div>

                        <div className={`stack ${showServicesFor && showServicesFor !== employee.id ? 'public-hidden' : ''}`}>
                          <div className="card public-service-card">
                            <h4 className="public-card-title">Novo serviço</h4>
                            <div className="grid">
                              <label className="ui-field">
                                <span className="ui-field-label">O.S</span>
                                <select
                                  className="ui-input"
                                  value={serviceForms[employee.id]?.osId || ''}
                                  onChange={(event) => updateServiceForm(employee.id, 'osId', event.target.value)}
                                >
                                  <option value="">Selecione</option>
                                  {orders.map((order) => (
                                    <option key={order.id} value={order.id}>
                                      {order.osCode} — {order.tag}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="ui-field">
                                <div className="voice-input-row">
                                  <span className="ui-field-label">Descrição</span>
                                  <div className="voice-input-actions">
                                    <button
                                      type="button"
                                      className={`mic-button ${isRecordingNew ? 'is-recording' : ''}`}
                                      disabled={voiceUnavailable || isBusyRecording}
                                      onClick={() => startVoiceRecording({ type: 'new', employeeId: employee.id })}
                                    >
                                      {isRecordingNew ? 'Gravando...' : 'Gravar descrição'}
                                    </button>
                                  </div>
                                </div>
                                <textarea
                                  className="ui-input"
                                  rows={2}
                                  value={serviceForms[employee.id]?.description || ''}
                                  onChange={(event) => updateServiceForm(employee.id, 'description', event.target.value)}
                                />
                                {voiceUnavailable ? (
                                  <div className="voice-warning">
                                    Seu navegador não suporta reconhecimento de voz. Continue digitando.
                                  </div>
                                ) : null}
                                {speechError && voiceMessageTarget === newVoiceKey ? (
                                  <div className="voice-error">{speechError}</div>
                                ) : null}
                              </div>
                            </div>
                            <TimeSequenceInput
                              value={serviceForms[employee.id] || defaultServiceForm}
                              onChange={(times, errors) => handleNewServiceTimesChange(employee.id, times, errors)}
                            />
                            <div className="footer-note">
                              Total estimado:{' '}
                              {computeServiceMinutes(
                                serviceForms[employee.id]?.t1In || '',
                                serviceForms[employee.id]?.t1Out || '',
                                serviceForms[employee.id]?.t2In || '',
                                serviceForms[employee.id]?.t2Out || ''
                              ) !== null
                                ? formatMinutes(
                                    computeServiceMinutes(
                                      serviceForms[employee.id]?.t1In || '',
                                      serviceForms[employee.id]?.t1Out || '',
                                      serviceForms[employee.id]?.t2In || '',
                                      serviceForms[employee.id]?.t2Out || ''
                                    ) || 0
                                  )
                                : '—'}
                            </div>
                            {serviceFormErrors[employee.id]?.length ? (
                              <div className="footer-note" style={{ color: '#b91c1c' }}>
                                {serviceFormErrors[employee.id].join(' ')}
                              </div>
                            ) : null}
                            <Button type="button" onClick={() => handleCreateService(employee.id)}>
                              Salvar serviço
                            </Button>
                          </div>

                          <div className="stack">
                            {(services[employee.id] || []).map((service) => {
                              const existingVoiceKey = voiceKey({
                                type: 'existing',
                                employeeId: employee.id,
                                serviceId: service.id,
                              });
                              const isRecordingExisting = recordingTarget === existingVoiceKey;
                              const isBusyExisting = Boolean(recordingTarget && !isRecordingExisting);

                              return (
                                <div key={service.id} className="card public-service-card">
                                  {(() => {
                                    const { minutes } = computeServiceMinutesLib({
                                      t1In: service.t1In,
                                      t1Out: service.t1Out,
                                      t2In: service.t2In,
                                      t2Out: service.t2Out,
                                    });
                                    return (
                                      <div className="public-service-head">
                                        <div className="public-chip-row">
                                          <span className="pill pill-strong">Serviço</span>
                                          <span className="pill pill-soft">
                                            Total: {formatMinutes(minutes ?? service.totalMinutes)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  <div className="grid">
                                    <label className="ui-field">
                                      <span className="ui-field-label">O.S</span>
                                      <select
                                        className="ui-input"
                                        value={service.osId}
                                        onChange={(event) =>
                                          setServices((prev) => ({
                                            ...prev,
                                            [employee.id]: (prev[employee.id] || []).map((item) =>
                                              item.id === service.id ? { ...item, osId: event.target.value } : item
                                            ),
                                          }))
                                        }
                                      >
                                        <option value="">Selecione</option>
                                        {orders.map((order) => (
                                          <option key={order.id} value={order.id}>
                                            {order.osCode} — {order.tag}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <div className="ui-field">
                                      <div className="voice-input-row">
                                        <span className="ui-field-label">Descrição</span>
                                        <div className="voice-input-actions">
                                          <button
                                            type="button"
                                            className={`mic-button ${isRecordingExisting ? 'is-recording' : ''}`}
                                            disabled={voiceUnavailable || isBusyExisting}
                                            onClick={() =>
                                              startVoiceRecording({
                                                type: 'existing',
                                                employeeId: employee.id,
                                                serviceId: service.id,
                                              })
                                            }
                                          >
                                            {isRecordingExisting ? 'Gravando...' : 'Gravar descrição'}
                                          </button>
                                        </div>
                                      </div>
                                      <textarea
                                        className="ui-input"
                                        rows={2}
                                        value={service.description}
                                        onChange={(event) =>
                                          setServices((prev) => ({
                                            ...prev,
                                            [employee.id]: (prev[employee.id] || []).map((item) =>
                                              item.id === service.id ? { ...item, description: event.target.value } : item
                                            ),
                                          }))
                                        }
                                      />
                                      {voiceUnavailable ? (
                                        <div className="voice-warning">
                                          Seu navegador não suporta reconhecimento de voz. Continue digitando.
                                        </div>
                                      ) : null}
                                      {speechError && voiceMessageTarget === existingVoiceKey ? (
                                        <div className="voice-error">{speechError}</div>
                                      ) : null}
                                    </div>
                                    <TimeSequenceInput
                                      value={{
                                        t1In: service.t1In,
                                        t1Out: service.t1Out,
                                        t2In: service.t2In,
                                        t2Out: service.t2Out,
                                      }}
                                      onChange={(times, errors) => handleExistingServiceTimesChange(employee.id, service.id, times, errors)}
                                    />
                                  </div>
                                  {serviceErrors[employee.id]?.[service.id]?.length ? (
                                    <div className="footer-note" style={{ color: '#b91c1c' }}>
                                      {serviceErrors[employee.id][service.id].join(' ')}
                                    </div>
                                  ) : null}
                                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <Button type="button" onClick={() => handleUpdateService(employee.id, service)}>
                                      Atualizar
                                    </Button>
                                    <Button type="button" variant="danger" onClick={() => handleDeleteService(employee.id, service.id)}>
                                      Excluir
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="footer-note">{loading ? 'Carregando...' : 'Nenhum funcionário lançado para esta data.'}</p>
              )}
            </Card>

            <Card title="Assinatura do dia" subtitle={`Data: ${date.split('-').reverse().join('/')}`}>
              {signatureLoading ? (
                <p className="footer-note">Carregando assinatura...</p>
              ) : signature.url && !replaceSignature ? (
                <div className="stack">
                  <div className="signature-preview">
                    <img src={signature.url} alt="Assinatura do dia" />
                  </div>
                  <div className="footer-note">
                    Assinado {signature.name ? `por ${signature.name} ` : ''}em{' '}
                    {signature.signedAt ? new Date(signature.signedAt).toLocaleString('pt-BR') : '—'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button type="button" onClick={() => setConfirmReplaceOpen(true)}>
                      Substituir assinatura
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="stack">
                  <p className="footer-note">
                    Desenhe a assinatura com o mouse ou toque. Você pode informar o nome do responsável (opcional).
                  </p>
                  <Input
                    label="Nome (opcional)"
                    value={signatureName}
                    onChange={(event) => setSignatureName(event.target.value)}
                  />
                  <div className="signature-pad">
                    <canvas
                      ref={signatureCanvasRef}
                      className="signature-canvas"
                      onPointerDown={startDrawingSignature}
                      onPointerMove={drawSignature}
                      onPointerUp={endDrawingSignature}
                      onPointerLeave={endDrawingSignature}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button type="button" variant="outline" onClick={clearSignatureCanvas} disabled={savingSignature}>
                      Limpar
                    </Button>
                    {replaceSignature && signature.url ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setReplaceSignature(false);
                          setHasSignatureDrawing(false);
                          clearSignatureCanvas();
                        }}
                        disabled={savingSignature}
                      >
                        Cancelar substituição
                      </Button>
                    ) : null}
                    <Button type="button" onClick={handleSaveSignature} disabled={savingSignature}>
                      {savingSignature ? 'Salvando...' : 'Salvar assinatura'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </>
        ) : null}

        {error ? <Toast type="error" message={error} /> : null}
        {success ? <Toast type="success" message={success} /> : null}
      </div>

      <Modal title="Adicionar Funcionário" open={addEmployeeOpen} onClose={() => setAddEmployeeOpen(false)}>
        <form className="stack" onSubmit={handleCreateEmployee}>
          <Input
            label="Nome"
            value={newEmployeeName}
            onChange={(event) => setNewEmployeeName(event.target.value)}
            required
          />
          <Button type="submit" disabled={!newEmployeeName.trim()}>
            Adicionar
          </Button>
        </form>
      </Modal>

      <Modal title="Substituir assinatura" open={confirmReplaceOpen} onClose={() => setConfirmReplaceOpen(false)}>
        <div className="stack">
          <p className="footer-note">
            Já existe uma assinatura salva para esta data. Deseja substituí-la? A imagem atual será mantida no histórico do
            armazenamento, mas o dia passará a exibir somente a nova assinatura.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button type="button" variant="outline" onClick={() => setConfirmReplaceOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirmReplaceOpen(false);
                setReplaceSignature(true);
                setHasSignatureDrawing(false);
                prepareSignatureCanvas();
              }}
            >
              Substituir
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
