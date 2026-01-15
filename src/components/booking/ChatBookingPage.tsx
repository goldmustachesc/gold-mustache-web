"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { BookingConfirmation } from "./BookingConfirmation";
import { SignupIncentiveBanner } from "./SignupIncentiveBanner";
import {
  useBarbers,
  useServices,
  useSlots,
  useCreateAppointment,
  useCreateGuestAppointment,
} from "@/hooks/useBooking";
import { useUser } from "@/hooks/useAuth";
import type {
  ServiceData,
  TimeSlot,
  AppointmentWithDetails,
  BarberData,
} from "@/types/booking";
import { formatDateToString } from "@/utils/time-slots";
import { formatDateDdMmYyyyInSaoPaulo } from "@/utils/datetime";
import { ArrowLeft, Calendar, RotateCcw } from "lucide-react";

type BookingStep =
  | "greeting"
  | "barber"
  | "service"
  | "date"
  | "time"
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
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || "pt-BR";
  const isGuest = !user;

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
  const [_guestPhone, setGuestPhone] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState<{
    clientName: string;
    clientPhone: string;
  } | null>(null);
  const [showSelector, setShowSelector] = useState<BookingStep | null>(null);

  const { data: barbers = [], isLoading: barbersLoading } = useBarbers();
  const { data: services = [], isLoading: servicesLoading } = useServices(
    selectedBarber?.id,
  );
  const dateStr = selectedDate ? formatDateToString(selectedDate) : null;
  const { data: slots = [], isLoading: slotsLoading } = useSlots(
    dateStr,
    selectedBarber?.id ?? null,
    selectedService?.id ?? null,
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
    (data: MessageData, delay = 400) => {
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
      "info",
    ];
    const startIndex = flowSteps.indexOf(targetStep);
    if (startIndex === -1) return;
    for (const s of flowSteps.slice(startIndex)) {
      processedStepsRef.current.delete(s);
    }
  }, []);

  const handleBack = useCallback(
    (fromStep: BookingStep) => {
      const targetStep = getPreviousStep(fromStep);
      if (!targetStep) return;

      setShowSelector(null);

      // Remove messages related to the attempt so the transcript doesn't become inconsistent
      pruneMessagesForBackNavigation(targetStep);

      // Reset dependent selections
      switch (fromStep) {
        case "service":
          setSelectedBarber(null);
          setSelectedService(null);
          setSelectedDate(null);
          setSelectedSlot(null);
          break;
        case "date":
          setSelectedService(null);
          setSelectedDate(null);
          setSelectedSlot(null);
          break;
        case "time":
          setSelectedDate(null);
          setSelectedSlot(null);
          break;
        case "info":
          setSelectedSlot(null);
          break;
        default:
          break;
      }

      clearProcessedStepsFrom(targetStep);
      setStep(targetStep);
      setTimeout(() => setShowSelector(targetStep), 300);
    },
    [clearProcessedStepsFrom, getPreviousStep, pruneMessagesForBackNavigation],
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
      setTimeout(() => setStep("service"), 100);
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
      setTimeout(() => setStep("date"), 100);
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
      setTimeout(() => setStep("time"), 100);
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
    setTimeout(() => setShowSelector("date"), 300);
  }, []);

  const handleSlotSelect = useCallback(
    (slot: TimeSlot) => {
      setShowSelector(null);
      setSelectedSlot(slot);
      addMessage({ type: "user", text: slot.time });

      if (isGuest) {
        setTimeout(() => setStep("info"), 100);
      } else {
        // Logged in user - go to review step first
        setTimeout(() => setStep("review"), 100);
      }
    },
    [addMessage, isGuest],
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
      setTimeout(() => setStep("review"), 100);
    },
    [selectedBarber, selectedService, selectedDate, selectedSlot, addMessage],
  );

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
        setGuestPhone(guestInfo.clientPhone);
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
        setTimeout(() => setShowSelector("time"), 300);
      } else if (isSlotOccupiedError) {
        addMessage({
          type: "bot",
          text: "😔 Este horário já foi ocupado. Por favor, escolha outro horário.",
        });
        setSelectedSlot(null);
        processedStepsRef.current.delete("time");
        setStep("time");
        setTimeout(() => setShowSelector("time"), 300);
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
      setStep("info");
      setTimeout(() => setShowSelector("info"), 300);
    } else {
      setStep("time");
      setTimeout(() => setShowSelector("time"), 300);
    }
  }, [isGuest]);

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
    setGuestPhone(null);
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
        // Skip to service selection
        setTimeout(() => setStep("service"), 100);
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
      setTimeout(() => setStep("barber"), 800);
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
        setTimeout(() => setShowSelector("barber"), 500);
      }, 300);
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
        setTimeout(() => setShowSelector("service"), 500);
      }, 300);
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
        setTimeout(() => setShowSelector("date"), 500);
      }, 300);
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
        setTimeout(() => setShowSelector("time"), 500);
      }, 300);
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
        setTimeout(() => setShowSelector("info"), 500);
      }, 300);
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
        setTimeout(() => setShowSelector("review"), 500);
      }, 300);
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
            <ChatDatePicker onSelect={handleDateSelect} />
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
              slots={slots}
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
              onSubmit={handleGuestSubmit}
              isLoading={false}
              submitLabel="Revisar Agendamento"
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

        // Calculate end time
        const [hours, minutes] = selectedSlot.time.split(":").map(Number);
        const endMinutes = hours * 60 + minutes + selectedService.duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

        return (
          <div className="self-start w-full max-w-[95%] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-zinc-100/80 border border-zinc-300/50 dark:bg-zinc-800/80 dark:border-zinc-700/50 rounded-xl p-4 space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    👤 Barbeiro:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedBarber.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ✂️ Serviço:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedService.name} • R${" "}
                    {selectedService.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    📅 Data:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatDateDdMmYyyyInSaoPaulo(selectedDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    🕐 Horário:
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedSlot.time} - {endTime}
                  </span>
                </div>
                {guestInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      📱 Cliente:
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {guestInfo.clientName} •{" "}
                      {formatPhoneDisplay(guestInfo.clientPhone)}
                    </span>
                  </div>
                )}
              </div>
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
                    : "✅ Confirmar Agendamento"}
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
                  Voltar e Editar
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-1 border-b border-zinc-300/50 dark:border-zinc-800/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
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

      {/* Chat area */}
      <ChatContainer className="flex-1 mt-3">
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
  );
}
