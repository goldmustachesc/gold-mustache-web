"use client";

import {
  useState,
  useEffect,
  useDeferredValue,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useUser } from "@/hooks/useAuth";
import { useBarberProfile } from "@/hooks/useBarberProfile";
import {
  useServices,
  useBarberSlots,
  useCreateAppointmentByBarber,
} from "@/hooks/useBooking";
import { useBarberClients, type ClientData } from "@/hooks/useBarberClients";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { UserPlus } from "lucide-react";
import { getBrazilDateString } from "@/utils/time-slots";
import {
  isValidDateParam,
  isValidTimeParam,
  isValidPhone,
  isValidClientName,
  sanitizePhoneInput,
  computeCompletedSteps,
  canSubmitForm,
  buildDateOptions,
} from "@/utils/scheduling";

const DATE_OPTIONS_COUNT = 30;
const MIN_PHONE_SEARCH_LENGTH = 6;

export function useBarberSchedulingForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  const prefilledDate = searchParams.get("date");
  const prefilledTime = searchParams.get("time");
  const initialDate = isValidDateParam(prefilledDate)
    ? prefilledDate
    : getBrazilDateString();
  const initialTime = isValidTimeParam(prefilledTime) ? prefilledTime : "";

  const { data: user, isLoading: userLoading } = useUser();
  const { data: barberProfile, isLoading: barberLoading } = useBarberProfile();

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const hasMounted = useRef(false);

  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const selectedClientRef = useRef(selectedClient);
  selectedClientRef.current = selectedClient;
  const [showSuggestions, setShowSuggestions] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const deferredPhone = useDeferredValue(clientPhone);

  const { data: services, isLoading: servicesLoading } = useServices(
    barberProfile?.id,
  );
  const { data: slots, isLoading: slotsLoading } = useBarberSlots(
    selectedDate,
    barberProfile?.id || null,
    selectedServiceId || null,
  );

  const shouldSearch =
    deferredPhone.length >= MIN_PHONE_SEARCH_LENGTH && !selectedClient;
  const { data: clientsResponse, isLoading: clientsLoading } = useBarberClients(
    shouldSearch ? deferredPhone : undefined,
  );
  const clientSuggestions = clientsResponse?.data ?? [];

  const createAppointment = useCreateAppointmentByBarber();

  usePrivateHeader({
    title: "Agendar para Cliente",
    icon: UserPlus,
    backHref: `/${locale}/barbeiro`,
  });

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, userLoading, router, locale]);

  useEffect(() => {
    if (!barberLoading && user && !barberProfile) {
      toast.error("Acesso restrito a barbeiros");
      router.push(`/${locale}/dashboard`);
    }
  }, [barberProfile, barberLoading, user, router, locale]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on date/service change
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setSelectedTime("");
  }, [selectedDate, selectedServiceId]);

  useEffect(() => {
    if (clientSuggestions.length > 0 && !selectedClient) {
      setShowSuggestions(true);
    }
  }, [clientSuggestions, selectedClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        phoneInputRef.current &&
        !phoneInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onPhoneChange = useCallback((raw: string) => {
    const sanitized = sanitizePhoneInput(raw);
    setClientPhone(sanitized);
    if (selectedClientRef.current) {
      setSelectedClient(null);
      setClientName("");
    }
  }, []);

  const onSelectClient = useCallback((client: ClientData) => {
    setSelectedClient(client);
    setClientName(client.fullName);
    setClientPhone(client.phone);
    setShowSuggestions(false);
  }, []);

  const onClearSelection = useCallback(() => {
    setSelectedClient(null);
    setClientName("");
    setClientPhone("");
    setShowSuggestions(false);
    phoneInputRef.current?.focus();
  }, []);

  const onPhoneFocus = useCallback(() => {
    if (clientSuggestions.length > 0 && !selectedClient) {
      setShowSuggestions(true);
    }
  }, [clientSuggestions.length, selectedClient]);

  const formState = {
    clientName,
    clientPhone,
    selectedServiceId,
    selectedDate,
    selectedTime,
  };

  const selectedService =
    services?.find((s) => s.id === selectedServiceId) ?? null;
  const availableSlots = slots?.filter((s) => s.available) ?? [];
  const dateOptions = useMemo(() => buildDateOptions(DATE_OPTIONS_COUNT), []);

  const onSubmit = useCallback(async () => {
    if (!selectedServiceId || !selectedDate || !selectedTime) {
      toast.error("Selecione serviço, data e horário");
      return;
    }

    if (!isValidClientName(clientName)) {
      toast.error("Nome do cliente deve ter pelo menos 2 caracteres");
      return;
    }

    if (!isValidPhone(clientPhone)) {
      toast.error("Telefone deve ter 10 ou 11 dígitos");
      return;
    }

    try {
      await createAppointment.mutateAsync({
        serviceId: selectedServiceId,
        date: selectedDate,
        startTime: selectedTime,
        clientName: clientName.trim(),
        clientPhone,
      });

      toast.success("Agendamento criado com sucesso!");

      setSelectedServiceId("");
      setSelectedTime("");
      setClientName("");
      setClientPhone("");
      setSelectedClient(null);

      setTimeout(() => {
        router.push(`/${locale}/barbeiro`);
      }, 1500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar agendamento",
      );
    }
  }, [
    selectedServiceId,
    selectedDate,
    selectedTime,
    clientName,
    clientPhone,
    createAppointment,
    router,
    locale,
  ]);

  return {
    formState,
    auth: {
      user: user ?? null,
      barberProfile: barberProfile ?? null,
    },
    loading: {
      isInitializing: userLoading || barberLoading,
      services: servicesLoading,
      slots: slotsLoading,
      clients: clientsLoading,
    },
    clientSearch: {
      selectedClient,
      showSuggestions,
      suggestions: clientSuggestions,
      phoneInputRef,
      suggestionsRef,
    },
    computed: {
      services: services ?? [],
      selectedService,
      availableSlots,
      dateOptions,
      canSubmit: canSubmitForm(formState, createAppointment.isPending),
      completedSteps: computeCompletedSteps(formState),
      isPending: createAppointment.isPending,
    },
    handlers: {
      onNameChange: setClientName,
      onPhoneChange,
      onServiceChange: setSelectedServiceId,
      onDateChange: setSelectedDate,
      onTimeChange: setSelectedTime,
      onSelectClient,
      onClearSelection,
      onPhoneFocus,
      onSubmit,
    },
    locale,
  };
}
