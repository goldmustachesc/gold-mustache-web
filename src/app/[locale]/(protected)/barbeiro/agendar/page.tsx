"use client";

import { Loader2, Info, UserPlus } from "lucide-react";
import { useBarberSchedulingForm } from "@/hooks/useBarberSchedulingForm";
import {
  ClientSearchSection,
  ServiceSection,
  DateSection,
  TimeSlotsSection,
  ProgressSidebar,
  BookingSummary,
  SubmitButton,
} from "@/components/barber-scheduling";
import { usePrivateHeader } from "@/components/private/PrivateHeaderContext";
import { isValidClientName, isValidPhone } from "@/utils/scheduling";
import { useLocale } from "next-intl";

export default function BarberAgendarPage() {
  const { formState, auth, loading, clientSearch, computed, handlers } =
    useBarberSchedulingForm();
  const locale = useLocale();

  usePrivateHeader({
    title: "Novo Agendamento",
    icon: UserPlus,
    backHref: `/${locale}/barbeiro`,
  });

  if (loading.isInitializing || !auth.user || !auth.barberProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressSteps = [
    {
      label: "Nome do cliente",
      completed: isValidClientName(formState.clientName),
    },
    {
      label: "Telefone válido",
      completed: isValidPhone(formState.clientPhone),
    },
    { label: "Serviço selecionado", completed: !!formState.selectedServiceId },
    { label: "Data selecionada", completed: !!formState.selectedDate },
    {
      label: "Horário selecionado",
      completed: !!formState.selectedTime && !computed.selectedTimeError,
    },
  ];

  return (
    <div>
      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-7xl">
        <div className="hidden lg:block mb-8">
          <h2 className="text-2xl font-bold">Novo Agendamento para Cliente</h2>
          <p className="text-muted-foreground mt-1">
            Crie um agendamento para um cliente presencial ou por telefone
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlers.onSubmit();
              }}
              className="space-y-6"
            >
              <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
                <ClientSearchSection
                  phone={formState.clientPhone}
                  name={formState.clientName}
                  selectedClient={clientSearch.selectedClient}
                  suggestions={clientSearch.suggestions}
                  showSuggestions={clientSearch.showSuggestions}
                  loading={loading.clients}
                  phoneInputRef={clientSearch.phoneInputRef}
                  suggestionsRef={clientSearch.suggestionsRef}
                  onPhoneChange={handlers.onPhoneChange}
                  onNameChange={handlers.onNameChange}
                  onSelectClient={handlers.onSelectClient}
                  onClearSelection={handlers.onClearSelection}
                  onPhoneFocus={handlers.onPhoneFocus}
                />

                <ServiceSection
                  services={computed.services}
                  selectedServiceId={formState.selectedServiceId}
                  loading={loading.services}
                  onSelect={handlers.onServiceChange}
                />
              </div>

              <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
                <DateSection
                  dates={computed.dateOptions}
                  selectedDate={formState.selectedDate}
                  onSelect={handlers.onDateChange}
                />

                <TimeSlotsSection
                  availability={computed.bookingAvailability}
                  selectedTime={formState.selectedTime}
                  loading={loading.slots}
                  serviceSelected={!!formState.selectedServiceId}
                  serviceDuration={computed.selectedService?.duration ?? null}
                  onSelect={handlers.onTimeChange}
                  selectedTimeError={computed.selectedTimeError}
                  selectedTimeFeedback={computed.selectedTimeFeedback}
                />
              </div>

              <div className="lg:hidden">
                <SubmitButton
                  disabled={!computed.canSubmit}
                  loading={computed.isPending}
                  onClick={handlers.onSubmit}
                  type="submit"
                />
              </div>
            </form>
          </div>

          <div className="hidden lg:block lg:col-span-4 space-y-6">
            <ProgressSidebar
              steps={progressSteps}
              completedSteps={computed.completedSteps}
            />

            {computed.selectedService &&
              formState.selectedTime &&
              !computed.selectedTimeError && (
                <BookingSummary
                  service={computed.selectedService}
                  date={formState.selectedDate}
                  time={formState.selectedTime}
                  clientName={formState.clientName}
                  clientPhone={formState.clientPhone}
                />
              )}

            <div className="sticky top-24">
              <SubmitButton
                disabled={!computed.canSubmit}
                loading={computed.isPending}
                onClick={handlers.onSubmit}
              />

              <div className="mt-4 bg-card/30 rounded-xl p-4 border border-border">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    O agendamento será criado diretamente na sua agenda. O
                    cliente receberá confirmação por telefone se cadastrado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
