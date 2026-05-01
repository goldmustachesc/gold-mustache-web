"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BookingProgressSummary } from "./BookingProgressSummary";
import {
  BotMessage,
  UserMessage,
  TypingIndicator,
  ChatContainer,
} from "./chat";
import { ChatBarberSelector } from "./chat/ChatBarberSelector";
import { ChatServiceSelector } from "./chat/ChatServiceSelector";
import { ChatDatePicker } from "./chat/ChatDatePicker";
import { ChatTimeSlotSelector } from "./chat/ChatTimeSlotSelector";
import { ChatGuestInfoForm } from "./chat/ChatGuestInfoForm";
import { ChatProfileUpdateForm } from "./chat/ChatProfileUpdateForm";
import { BookingConfirmation } from "./BookingConfirmation";
import { BookingLivePreview } from "./BookingLivePreview";
import { SignupIncentiveBanner } from "./SignupIncentiveBanner";
import { useProfileMe } from "@/hooks/useProfileMe";
import {
  useBarbers,
  useServices,
  useSlots,
  useDateAvailability,
  useCreateAppointment,
  useCreateGuestAppointment,
} from "@/hooks/useBooking";
import { useBrazilToday } from "@/hooks/useBrazilToday";
import { useUser } from "@/hooks/useAuth";
import { calculateEndTime } from "@/lib/booking/time";
import type {
  ServiceData,
  TimeSlot,
  AppointmentWithDetails,
  BarberData,
} from "@/types/booking";
import { formatDateToString } from "@/utils/time-slots";
import {
  formatDateDdMmYyyyInSaoPaulo,
  formatIsoDateYyyyMmDdInSaoPaulo,
  parseIsoDateYyyyMmDdAsSaoPauloDate,
} from "@/utils/datetime";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  PencilLine,
  RotateCcw,
} from "lucide-react";

type BookingStep =
  | "greeting"
  | "barber"
  | "service"
  | "date"
  | "time"
  | "profile-update"
  | "info"
  | "review"
  | "confirming"
  | "confirmation";

// Message types for storing in state (data only, no JSX)
type MessageData =
  | { type: "bot"; text: string; step?: BookingStep }
  | { type: "bot-jsx"; content: ReactNode; step?: BookingStep }
  | { type: "user"; text: string }
  | { type: "user-jsx"; content: ReactNode }
  | { type: "selector"; selector: BookingStep };

interface Message {
  id: string;
  data: MessageData;
}

interface ChatBookingPageProps {
  onViewAppointments?: () => void;
  preSelectedBarberId?: string;
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function ChatBookingPage({
  onViewAppointments,
  preSelectedBarberId,
}: ChatBookingPageProps) {
  const { data: user } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfileMe();
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";
  const isGuest = !user;

  // Check if logged-in user has complete profile (name and phone required for booking)
  const hasCompleteProfile =
    !user ||
    (profile?.fullName &&
      profile.fullName.trim().length >= 2 &&
      profile?.phone &&
      profile.phone.replace(/\D/g, "").length >= 10);

  // Determine if we should wait for profile to load before proceeding
  const profileReady = !user || !profileLoading;

  const [step, setStep] = useState<BookingStep>("greeting");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<BarberData | null>(null);
  const [preSelectedBarberHandled, setPreSelectedBarberHandled] =
    useState(false);
  const [selectedService, setSelectedService] = useState<ServiceData | null>(
    null,
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<AppointmentWithDetails | null>(null);
  const [guestInfo, setGuestInfo] = useState<{
    clientName: string;
    clientPhone: string;
  } | null>(null);
  const [showSelector, setShowSelector] = useState<BookingStep | null>(null);

  const today = useBrazilToday();

  const { data: barbers = [], isLoading: barbersLoading } = useBarbers();
  const { data: services = [], isLoading: servicesLoading } = useServices(
    selectedBarber?.id,
  );
  const dateStr = selectedDate ? formatDateToString(selectedDate) : null;
  const { data: bookingAvailability = null, isLoading: slotsLoading } =
    useSlots(dateStr, selectedBarber?.id ?? null, selectedService?.id ?? null);

  // Date availability range for disabling dates without any slots
  const { calendarFromIso, calendarToIso } = useMemo(() => {
    if (!selectedBarber) {
      return { calendarFromIso: null, calendarToIso: null };
    }
    const fromIso = formatIsoDateYyyyMmDdInSaoPaulo(today);
    const toDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 30,
    );
    return {
      calendarFromIso: fromIso,
      calendarToIso: formatIsoDateYyyyMmDdInSaoPaulo(toDate),
    };
  }, [selectedBarber, today]);

  const {
    data: dateAvailabilityData,
    isLoading: dateAvailabilityLoading,
    isFetching: dateAvailabilityFetching,
  } = useDateAvailability(
    calendarFromIso,
    calendarToIso,
    selectedBarber?.id ?? null,
    selectedService?.id ?? null,
  );

  const calendarReady =
    !!dateAvailabilityData &&
    !dateAvailabilityLoading &&
    !dateAvailabilityFetching;

  const disabledDates = useMemo(
    () =>
      (dateAvailabilityData?.unavailableDates ?? []).map((iso) =>
        parseIsoDateYyyyMmDdAsSaoPauloDate(iso),
      ),
    [dateAvailabilityData],
  );

  const createAppointment = useCreateAppointment();
  const createGuestAppointment = useCreateGuestAppointment();

  const messageIdRef = useRef(0);
  const processedStepsRef = useRef<Set<BookingStep>>(new Set());

  const addMessage = useCallback((data: MessageData) => {
    setMessages((prev) => [
      ...prev,
      { id: `msg-${++messageIdRef.current}`, data },
    ]);
  }, []);

  const showTypingThenMessage = useCallback(
    (data: MessageData, delay = 250) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage(data);
      }, delay);
    },
    [addMessage],
  );

  const getPreviousStep = useCallback((current: BookingStep) => {
    switch (current) {
      case "service":
        return "barber";
      case "date":
        return "service";
      case "time":
        return "date";
      case "info":
        return "time";
      case "profile-update":
        return "time";
      default:
        return null;
    }
  }, []);

  const pruneMessagesForBackNavigation = useCallback(
    (targetStep: BookingStep) => {
      setMessages((prev) => {
        const findLastPromptIndex = () => {
          for (let i = prev.length - 1; i >= 0; i--) {
            const data = prev[i]?.data;
            if (data?.type === "bot" && data.step && data.step === targetStep) {
              return i;
            }
            if (
              data?.type === "bot-jsx" &&
              data.step &&
              data.step === targetStep
            ) {
              return i;
            }
          }
          return -1;
        };

        const lastPromptIndex = findLastPromptIndex();
        if (lastPromptIndex !== -1) return prev.slice(0, lastPromptIndex);

        for (let i = prev.length - 1; i >= 0; i--) {
          const data = prev[i]?.data;
          if (data?.type === "user" || data?.type === "user-jsx") {
            return prev.slice(0, i);
          }
        }

        return prev;
      });
    },
    [],
  );

  const clearProcessedStepsFrom = useCallback((targetStep: BookingStep) => {
    const flowSteps: BookingStep[] = [
      "barber",
      "service",
      "date",
      "time",
      "profile-update",
      "info",
      "review",
    ];
    const startIndex = flowSteps.indexOf(targetStep);
    if (startIndex === -1) return;
    for (const s of flowSteps.slice(startIndex)) {
      processedStepsRef.current.delete(s);
    }
  }, []);

  const navigateToStep = useCallback(
    (targetStep: BookingStep) => {
      setShowSelector(null);
      pruneMessagesForBackNavigation(targetStep);

      switch (targetStep) {
        case "barber":
          setSelectedBarber(null);
          setSelectedService(null);
          setSelectedDate(null);
          setSelectedSlot(null);
          break;
        case "service":
          setSelectedService(null);
          setSelectedDate(null);
          setSelectedSlot(null);
          break;
        case "date":
          setSelectedDate(null);
          setSelectedSlot(null);
          break;
        case "time":
          setSelectedSlot(null);
          break;
        case "info":
          break;
        case "profile-update":
          break;
        default:
          break;
      }

      clearProcessedStepsFrom(targetStep);
      setStep(targetStep);
      setTimeout(() => setShowSelector(targetStep), 150);
    },
    [clearProcessedStepsFrom, pruneMessagesForBackNavigation],
  );

  const handleBack = useCallback(
    (fromStep: BookingStep) => {
      const targetStep = getPreviousStep(fromStep);
      if (!targetStep) return;
      navigateToStep(targetStep);
    },
    [getPreviousStep, navigateToStep],
  );

  // Handlers
  const handleBarberSelect = useCallback(
    (barber: BarberData) => {
      setShowSelector(null);
      setSelectedBarber(barber);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      addMessage({ type: "user", text: barber.name });
      setTimeout(() => setStep("service"), 50);
    },
    [addMessage],
  );

  const handleServiceSelect = useCallback(
    (service: ServiceData) => {
      setShowSelector(null);
      setSelectedService(service);
      setSelectedDate(null);
      setSelectedSlot(null);
      addMessage({
        type: "user",
        text: `${service.name} • R$ ${service.price.toFixed(2).replace(".", ",")}`,
      });
      setTimeout(() => setStep("date"), 50);
    },
    [addMessage],
  );

  const handleDateSelect = useCallback(
    (date: Date) => {
      setShowSelector(null);
      setSelectedDate(date);
      setSelectedSlot(null);
      addMessage({
        type: "user",
        text: formatDateDdMmYyyyInSaoPaulo(date),
      });
      setTimeout(() => setStep("time"), 50);
    },
    [addMessage],
  );

  const handleChooseAnotherDate = useCallback(() => {
    setShowSelector(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    // Remove "time" from processed steps so the message shows again
    processedStepsRef.current.delete("time");
    // Also remove "date" so the prompt shows again
    processedStepsRef.current.delete("date");
    setStep("date");
    setTimeout(() => setShowSelector("date"), 150);
  }, []);

  const handleSlotSelect = useCallback(
    (slot: TimeSlot) => {
      setShowSelector(null);
      setSelectedSlot(slot);
      addMessage({ type: "user", text: slot.time });

      if (isGuest) {
        setTimeout(() => setStep(guestInfo ? "review" : "info"), 50);
      } else if (!profileReady || !hasCompleteProfile) {
        setTimeout(() => setStep("profile-update"), 50);
      } else {
        setTimeout(() => setStep("review"), 50);
      }
    },
    [addMessage, guestInfo, isGuest, hasCompleteProfile, profileReady],
  );

  const handleGuestSubmit = useCallback(
    (guestData: { clientName: string; clientPhone: string }) => {
      if (!selectedBarber || !selectedService || !selectedDate || !selectedSlot)
        return;

      setShowSelector(null);
      setGuestInfo(guestData);
      addMessage({
        type: "user",
        text: `${guestData.clientName} • ${formatPhoneDisplay(guestData.clientPhone)}`,
      });

      // Go to review step instead of confirming immediately
      setTimeout(() => setStep("review"), 50);
    },
    [selectedBarber, selectedService, selectedDate, selectedSlot, addMessage],
  );

  const handleProfileUpdateSuccess = useCallback(() => {
    setShowSelector(null);
    addMessage({
      type: "user",
      text: "Perfil atualizado ✓",
    });
    // Go to review step after profile is complete
    setTimeout(() => setStep("review"), 50);
  }, [addMessage]);

  // Handle booking confirmation (called from review step)
  const handleConfirmBooking = useCallback(async () => {
    if (!selectedBarber || !selectedService || !selectedDate || !selectedSlot)
      return;

    setShowSelector(null);
    setStep("confirming");
    addMessage({ type: "bot", text: "⏳ Confirmando seu agendamento..." });

    try {
      if (isGuest && guestInfo) {
        // Guest booking
        const result = await createGuestAppointment.mutateAsync({
          serviceId: selectedService.id,
          barberId: selectedBarber.id,
          date: formatDateToString(selectedDate),
          startTime: selectedSlot.time,
          clientName: guestInfo.clientName,
          clientPhone: guestInfo.clientPhone,
        });

        setConfirmedAppointment(result.appointment);
      } else {
        // Logged in user booking
        const appointment = await createAppointment.mutateAsync({
          serviceId: selectedService.id,
          barberId: selectedBarber.id,
          date: formatDateToString(selectedDate),
          startTime: selectedSlot.time,
        });

        setConfirmedAppointment(appointment);
      }

      setStep("confirmation");
      toast.success("Agendamento realizado com sucesso!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao agendar";
      toast.error(errorMessage);

      // Handle specific slot errors with appropriate messages
      const isSlotPastError = errorMessage.includes("passou");
      const isSlotOccupiedError =
        errorMessage.includes("ocupado") || errorMessage.includes("reservado");

      if (isSlotPastError) {
        addMessage({
          type: "bot",
          text: "⏰ Este horário já passou. Por favor, escolha outro horário.",
        });
        setSelectedSlot(null);
        processedStepsRef.current.delete("time");
        setStep("time");
        setTimeout(() => setShowSelector("time"), 150);
      } else if (isSlotOccupiedError) {
        addMessage({
          type: "bot",
          text: "😔 Este horário já foi ocupado. Por favor, escolha outro horário.",
        });
        setSelectedSlot(null);
        processedStepsRef.current.delete("time");
        setStep("time");
        setTimeout(() => setShowSelector("time"), 150);
      } else {
        addMessage({ type: "bot", text: `❌ ${errorMessage}` });
        // Go back to review so user can try again
        setStep("review");
      }
    }
  }, [
    selectedBarber,
    selectedService,
    selectedDate,
    selectedSlot,
    isGuest,
    guestInfo,
    createAppointment,
    createGuestAppointment,
    addMessage,
  ]);

  const handleBackFromReview = useCallback(() => {
    setShowSelector(null);
    processedStepsRef.current.delete("review");
    if (isGuest) {
      navigateToStep(guestInfo ? "info" : "time");
    } else {
      navigateToStep("time");
    }
  }, [guestInfo, isGuest, navigateToStep]);

  const handleEditBarber = useCallback(() => {
    navigateToStep("barber");
  }, [navigateToStep]);

  const handleEditService = useCallback(() => {
    navigateToStep("service");
  }, [navigateToStep]);

  const handleEditDate = useCallback(() => {
    navigateToStep("date");
  }, [navigateToStep]);

  const handleEditTime = useCallback(() => {
    navigateToStep("time");
  }, [navigateToStep]);

  const handleEditCustomerData = useCallback(() => {
    navigateToStep(isGuest ? "info" : "profile-update");
  }, [isGuest, navigateToStep]);

  const handleViewGuestAppointments = useCallback(() => {
    // Token is already saved in localStorage, just redirect
    router.push(`/${locale}/meus-agendamentos`);
  }, [router, locale]);

  const handleNewBooking = useCallback(() => {
    setStep("greeting");
    setMessages([]);
    setSelectedBarber(null);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setConfirmedAppointment(null);
    setGuestInfo(null);
    setShowSelector(null);
    messageIdRef.current = 0;
    processedStepsRef.current = new Set();
  }, []);

  // Handle pre-selected barber
  useEffect(() => {
    if (
      preSelectedBarberId &&
      !preSelectedBarberHandled &&
      barbers.length > 0 &&
      step === "barber"
    ) {
      const preSelectedBarber = barbers.find(
        (b) => b.id === preSelectedBarberId,
      );
      if (preSelectedBarber) {
        setPreSelectedBarberHandled(true);
        setSelectedBarber(preSelectedBarber);
        // Add message showing the pre-selected barber
        addMessage({
          type: "bot-jsx",
          content: (
            <span>
              Você está agendando com <strong>{preSelectedBarber.name}</strong>{" "}
              ✂️
            </span>
          ),
        });
        setTimeout(() => setStep("service"), 50);
      }
    }
  }, [
    preSelectedBarberId,
    preSelectedBarberHandled,
    barbers,
    step,
    addMessage,
  ]);

  // Step flow effects
  useEffect(() => {
    if (step === "greeting" && !processedStepsRef.current.has("greeting")) {
      processedStepsRef.current.add("greeting");
      const greetingMessage = preSelectedBarberId ? (
        <span>Olá! 👋 Vamos agendar seu horário de forma rápida e fácil.</span>
      ) : (
        <span>
          Olá! 👋 Eu sou o assistente da <strong>Gold Mustache</strong>. Vou te
          ajudar a agendar seu horário de forma rápida e fácil.
        </span>
      );
      showTypingThenMessage({
        type: "bot-jsx",
        content: greetingMessage,
      });
      setTimeout(() => setStep("barber"), 400);
    }
  }, [step, showTypingThenMessage, preSelectedBarberId]);

  useEffect(() => {
    if (step === "barber" && !processedStepsRef.current.has("barber")) {
      processedStepsRef.current.add("barber");
      // If we have a pre-selected barber, don't show the barber selector
      // The pre-selection effect will handle the flow
      if (preSelectedBarberId) {
        return;
      }
      setTimeout(() => {
        showTypingThenMessage({
          type: "bot",
          text: "Qual barbeiro você prefere? ✂️",
          step: "barber",
        });
        setTimeout(() => setShowSelector("barber"), 200);
      }, 150);
    }
  }, [step, showTypingThenMessage, preSelectedBarberId]);

  useEffect(() => {
    if (
      step === "service" &&
      selectedBarber &&
      !processedStepsRef.current.has("service")
    ) {
      processedStepsRef.current.add("service");
      setTimeout(() => {
        showTypingThenMessage({
          type: "bot-jsx",
          content: (
            <span>
              Ótima escolha! 🎯 Qual serviço você deseja com{" "}
              <strong>{selectedBarber.name}</strong>?
            </span>
          ),
          step: "service",
        });
        setTimeout(() => setShowSelector("service"), 200);
      }, 150);
    }
  }, [step, selectedBarber, showTypingThenMessage]);

  useEffect(() => {
    if (
      step === "date" &&
      selectedService &&
      !processedStepsRef.current.has("date")
    ) {
      processedStepsRef.current.add("date");
      setTimeout(() => {
        showTypingThenMessage({
          type: "bot",
          text: "Perfeito! 📅 Qual dia é melhor para você?",
          step: "date",
        });
        setTimeout(() => setShowSelector("date"), 200);
      }, 150);
    }
  }, [step, selectedService, showTypingThenMessage]);

  useEffect(() => {
    if (
      step === "time" &&
      selectedDate &&
      !processedStepsRef.current.has("time")
    ) {
      processedStepsRef.current.add("time");
      setTimeout(() => {
        showTypingThenMessage({
          type: "bot",
          text: "🕐 Que horário funciona melhor?",
          step: "time",
        });
        setTimeout(() => setShowSelector("time"), 200);
      }, 150);
    }
  }, [step, selectedDate, showTypingThenMessage]);

  useEffect(() => {
    if (
      step === "info" &&
      selectedSlot &&
      !processedStepsRef.current.has("info")
    ) {
      processedStepsRef.current.add("info");
      setTimeout(() => {
        showTypingThenMessage({
          type: "bot",
          text: "Quase lá! 📝 Para finalizar, preciso de alguns dados para confirmar seu agendamento.",
          step: "info",
        });
        setTimeout(() => setShowSelector("info"), 200);
      }, 150);
    }
  }, [step, selectedSlot, showTypingThenMessage]);

  // Profile update step (for logged-in users without complete profile)
  useEffect(() => {
    if (
      step === "profile-update" &&
      selectedSlot &&
      !processedStepsRef.current.has("profile-update")
    ) {
      processedStepsRef.current.add("profile-update");
      setTimeout(() => {
        showTypingThenMessage({
          type: "bot",
          text: "📱 Para concluir o agendamento, precisamos completar seu cadastro.",
          step: "profile-update",
        });
        setTimeout(() => setShowSelector("profile-update"), 200);
      }, 150);
    }
  }, [step, selectedSlot, showTypingThenMessage]);

  // Review step effect
  useEffect(() => {
    if (step === "review" && !processedStepsRef.current.has("review")) {
      processedStepsRef.current.add("review");
      setTimeout(() => {
        showTypingThenMessage({
          type: "bot",
          text: "📋 Confira os detalhes do seu agendamento antes de confirmar:",
          step: "review",
        });
        setTimeout(() => setShowSelector("review"), 200);
      }, 150);
    }
  }, [step, showTypingThenMessage]);

  // Confirmation screen
  if (step === "confirmation" && confirmedAppointment) {
    return (
      <div className="space-y-6">
        <BookingConfirmation
          appointment={confirmedAppointment}
          onClose={handleNewBooking}
          onViewAppointments={
            isGuest ? handleViewGuestAppointments : onViewAppointments
          }
        />
        {isGuest && <SignupIncentiveBanner locale={locale} />}
      </div>
    );
  }

  // Render selector based on current showSelector state
  const renderSelector = () => {
    if (!showSelector) return null;

    switch (showSelector) {
      case "barber":
        return (
          <div className="self-start w-full max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ChatBarberSelector
              barbers={barbers}
              onSelect={handleBarberSelect}
              isLoading={barbersLoading}
            />
          </div>
        );
      case "service":
        return (
          <div className="self-start w-full max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleBack("service")}
              className="mb-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <ChatServiceSelector
              services={services}
              onSelect={handleServiceSelect}
              isLoading={servicesLoading}
            />
          </div>
        );
      case "date":
        return (
          <div className="self-start w-full max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleBack("date")}
              className="mb-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            {calendarReady ? (
              <ChatDatePicker
                onSelect={handleDateSelect}
                disabledDates={disabledDates}
              />
            ) : (
              <output
                className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300/50 bg-zinc-100/80 p-10 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800/80"
                aria-live="polite"
                aria-label="Carregando datas disponíveis"
              >
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Carregando datas disponíveis…
                </span>
              </output>
            )}
          </div>
        );
      case "time":
        return (
          <div className="self-start w-full max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleBack("time")}
              className="mb-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <ChatTimeSlotSelector
              availability={bookingAvailability}
              onSelect={handleSlotSelect}
              onChooseAnotherDate={handleChooseAnotherDate}
              isLoading={slotsLoading}
            />
          </div>
        );
      case "info":
        return (
          <div className="self-start w-full max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleBack("info")}
              className="mb-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <ChatGuestInfoForm
              key={`${guestInfo?.clientName ?? ""}|${guestInfo?.clientPhone ?? ""}`}
              onSubmit={handleGuestSubmit}
              isLoading={false}
              currentName={guestInfo?.clientName}
              currentPhone={guestInfo?.clientPhone}
            />
          </div>
        );
      case "profile-update":
        return (
          <div className="self-start w-full max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleBack("profile-update")}
              className="mb-2 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <ChatProfileUpdateForm
              currentName={profile?.fullName}
              currentPhone={profile?.phone}
              onSuccess={handleProfileUpdateSuccess}
              isLoading={profileLoading}
              allowAutoProceedWhenComplete={!hasCompleteProfile}
            />
          </div>
        );
      case "review": {
        if (
          !selectedBarber ||
          !selectedService ||
          !selectedDate ||
          !selectedSlot
        )
          return null;

        return (
          <div className="self-start w-full max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-300 lg:hidden">
            <div className="space-y-4 rounded-xl border border-zinc-300/50 bg-zinc-100/80 p-4 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800/80">
              <BookingProgressSummary
                title="Revisar agendamento"
                items={reviewProgressItems}
              />

              {isGuest && guestInfo && (
                <div className="rounded-xl bg-background/60 px-3 py-2.5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Cliente
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {guestInfo.clientName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatPhoneDisplay(guestInfo.clientPhone)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-2"
                      onClick={handleEditCustomerData}
                    >
                      <PencilLine className="h-4 w-4" />
                      Editar dados
                    </Button>
                  </div>
                </div>
              )}

              {!isGuest && (
                <div className="rounded-xl bg-background/60 px-3 py-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Cadastro
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        Seu cadastro está pronto para confirmar.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-2"
                      onClick={handleEditCustomerData}
                    >
                      <PencilLine className="h-4 w-4" />
                      Editar dados
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-300/50 dark:border-zinc-700/50">
                <Button
                  onClick={handleConfirmBooking}
                  disabled={
                    createAppointment.isPending ||
                    createGuestAppointment.isPending
                  }
                  className="w-full shadow-md"
                >
                  {createAppointment.isPending ||
                  createGuestAppointment.isPending
                    ? "Confirmando..."
                    : "Confirmar agendamento"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBackFromReview}
                  disabled={
                    createAppointment.isPending ||
                    createGuestAppointment.isPending
                  }
                  className="w-full border-zinc-300 hover:bg-zinc-200/50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Voltar e editar
                </Button>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const selectedTimeRange =
    selectedSlot && selectedService
      ? `${selectedSlot.time} - ${calculateEndTime(
          selectedSlot.time,
          selectedService.duration,
        )}`
      : null;

  const progressItems = [
    {
      id: "barber",
      label: "Barbeiro",
      value: selectedBarber?.name ?? null,
      placeholder: "Escolha o barbeiro",
      onEdit: selectedBarber ? handleEditBarber : undefined,
      editLabel: "Editar barbeiro",
    },
    {
      id: "service",
      label: "Serviço",
      value: selectedService?.name ?? null,
      placeholder: "Escolha o serviço",
      onEdit: selectedService ? handleEditService : undefined,
      editLabel: "Editar serviço",
    },
    {
      id: "date",
      label: "Data",
      value: selectedDate ? formatDateDdMmYyyyInSaoPaulo(selectedDate) : null,
      placeholder: "Escolha a data",
      onEdit: selectedDate ? handleEditDate : undefined,
      editLabel: "Editar data",
    },
    {
      id: "time",
      label: "Horário",
      value: selectedTimeRange,
      placeholder: "Escolha o horário",
      onEdit: selectedSlot ? handleEditTime : undefined,
      editLabel: "Editar horário",
    },
  ];

  const reviewProgressItems = progressItems.map((item) => ({
    ...item,
    onEdit: undefined,
    editLabel: undefined,
  }));

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-1 border-b border-zinc-300/50 dark:border-zinc-800/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Novo Agendamento
          </h2>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewBooking}
            className="text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Recomeçar
          </Button>
        )}
      </div>

      {/* Chat + live preview */}
      <div className="mt-3 flex flex-1 gap-4 overflow-hidden lg:gap-6">
        <div className="flex flex-1 flex-col min-h-0 lg:flex-[1.2]">
          {step !== "greeting" && step !== "confirming" && (
            <div className="rounded-2xl border border-zinc-300/50 dark:border-zinc-700/50 bg-background/95 backdrop-blur-sm p-3 shadow-sm shrink-0 mb-3 lg:hidden">
              <BookingProgressSummary
                items={progressItems}
                variant="horizontal-sticky"
              />
            </div>
          )}
          <ChatContainer className="flex-1 min-h-0">
            {messages.map((msg) => {
              const { data } = msg;

              if (data.type === "bot") {
                return (
                  <BotMessage key={msg.id} animate>
                    {data.text}
                  </BotMessage>
                );
              }

              if (data.type === "bot-jsx") {
                return (
                  <BotMessage key={msg.id} animate>
                    {data.content}
                  </BotMessage>
                );
              }

              if (data.type === "user") {
                return (
                  <UserMessage key={msg.id} animate>
                    {data.text}
                  </UserMessage>
                );
              }

              if (data.type === "user-jsx") {
                return (
                  <UserMessage key={msg.id} animate>
                    {data.content}
                  </UserMessage>
                );
              }

              return null;
            })}

            {isTyping && <TypingIndicator />}

            {renderSelector()}
          </ChatContainer>
        </div>

        <aside
          className="hidden lg:flex lg:flex-[1] lg:flex-col lg:self-start lg:h-[calc(100dvh-184px)] lg:max-h-[460px]"
          aria-label="Prévia do agendamento"
        >
          <BookingLivePreview
            barber={selectedBarber}
            service={selectedService}
            date={selectedDate}
            slot={selectedSlot}
            guestInfo={guestInfo}
            isGuest={isGuest}
            step={step}
            onConfirm={handleConfirmBooking}
            onBackFromReview={handleBackFromReview}
            onEditCustomerData={handleEditCustomerData}
            isConfirming={
              createAppointment.isPending || createGuestAppointment.isPending
            }
          />
        </aside>
      </div>
    </div>
  );
}
