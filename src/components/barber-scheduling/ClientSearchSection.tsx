import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, User, UserCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/utils/scheduling";
import type { ClientData } from "@/hooks/useBarberClients";

interface ClientSearchSectionProps {
  phone: string;
  name: string;
  selectedClient: ClientData | null;
  suggestions: ClientData[];
  showSuggestions: boolean;
  loading: boolean;
  phoneInputRef: RefObject<HTMLInputElement | null>;
  suggestionsRef: RefObject<HTMLDivElement | null>;
  onPhoneChange: (raw: string) => void;
  onNameChange: (name: string) => void;
  onSelectClient: (client: ClientData) => void;
  onClearSelection: () => void;
  onPhoneFocus: () => void;
}

export function ClientSearchSection({
  phone,
  name,
  selectedClient,
  suggestions,
  showSuggestions,
  loading,
  phoneInputRef,
  suggestionsRef,
  onPhoneChange,
  onNameChange,
  onSelectClient,
  onClearSelection,
  onPhoneFocus,
}: ClientSearchSectionProps) {
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPhoneChange(e.target.value.replace(/\D/g, "").slice(0, 11));
  };

  return (
    <div
      className={cn(
        "bg-muted/50 rounded-2xl p-6 border",
        selectedClient ? "border-emerald-500/30" : "border-border",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              selectedClient ? "bg-emerald-500/10" : "bg-primary/10",
            )}
          >
            {selectedClient ? (
              <UserCheck className="h-5 w-5 text-emerald-500" />
            ) : (
              <User className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">Dados do Cliente</h2>
            <p className="text-xs text-muted-foreground">
              {selectedClient
                ? "Cliente selecionado"
                : "Digite o telefone para buscar"}
            </p>
          </div>
        </div>
        {selectedClient && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {selectedClient && (
        <div className="mb-4 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              Cliente cadastrado
            </span>
            {selectedClient.type === "registered" && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Conta ativa
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedClient.appointmentCount} agendamento
            {selectedClient.appointmentCount !== 1 ? "s" : ""} anterior
            {selectedClient.appointmentCount !== 1 ? "es" : ""}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clientPhone" className="text-foreground">
            Telefone
          </Label>
          <div className="relative">
            {loading ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
            <Input
              ref={phoneInputRef}
              id="clientPhone"
              placeholder="(00) 00000-0000"
              value={formatPhoneDisplay(phone)}
              onChange={handlePhoneInput}
              onFocus={onPhoneFocus}
              className={cn(
                "pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground h-11",
                selectedClient
                  ? "border-emerald-500/50 focus:border-emerald-500"
                  : "focus:border-primary",
              )}
              maxLength={16}
              required
              readOnly={!!selectedClient}
            />

            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
              >
                <div className="p-2 text-xs text-muted-foreground border-b border-border">
                  <Search className="h-3 w-3 inline mr-1" />
                  {suggestions.length} cliente
                  {suggestions.length !== 1 ? "s" : ""} encontrado
                  {suggestions.length !== 1 ? "s" : ""}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {suggestions.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => onSelectClient(client)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-left"
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium",
                          client.type === "registered"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-primary/20 text-primary",
                        )}
                      >
                        {client.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium truncate">
                          {client.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhoneDisplay(client.phone)}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {client.appointmentCount} agend.
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedClient
              ? "Cliente selecionado automaticamente"
              : "Digite o telefone para buscar ou criar novo cliente"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientName" className="text-foreground">
            Nome do Cliente
          </Label>
          <Input
            id="clientName"
            placeholder="Nome completo"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            readOnly={!!selectedClient}
            className={cn(
              "bg-background border-border text-foreground placeholder:text-muted-foreground h-11",
              selectedClient
                ? "border-emerald-500/50 bg-background/50 cursor-not-allowed"
                : "focus:border-primary",
            )}
          />
        </div>
      </div>
    </div>
  );
}
