import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

interface SubmitButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  type?: "button" | "submit";
  className?: string;
}

export function SubmitButton({
  disabled,
  loading,
  onClick,
  type = "button",
  className,
}: SubmitButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      className={
        className ??
        "w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-foreground font-semibold text-lg rounded-xl"
      }
      size="lg"
      disabled={disabled}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Criando agendamento...
        </>
      ) : (
        <>
          <Check className="h-5 w-5 mr-2" />
          Confirmar Agendamento
        </>
      )}
    </Button>
  );
}
