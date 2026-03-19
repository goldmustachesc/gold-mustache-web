import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { RewardForm } from "../RewardForm";

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    children: ReactNode;
  }) => (
    <div>
      <select
        aria-label="Tipo *"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
      >
        <option value="FREE_SERVICE">Serviço Grátis</option>
        <option value="DISCOUNT">Desconto</option>
        <option value="PRODUCT">Produto</option>
      </select>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { value: string; children: ReactNode }) => (
    <>{children}</>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <>{placeholder}</>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label="Ativo"
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      disabled={disabled}
    />
  ),
}));

describe("RewardForm", () => {
  it("renderiza dados iniciais e mostra campo de desconto quando o tipo muda", async () => {
    const user = userEvent.setup();

    render(
      <RewardForm
        initialData={{
          name: "Corte gratis",
          description: "Vale um corte",
          pointsCost: 250,
          type: "FREE_SERVICE",
          active: true,
        }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Nome da Recompensa *")).toHaveValue(
      "Corte gratis",
    );
    expect(screen.getByLabelText("Descrição")).toHaveValue("Vale um corte");
    expect(screen.getByLabelText("Custo em Pontos *")).toHaveValue(250);
    expect(
      screen.queryByLabelText("Valor do Desconto *"),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Tipo *"), "DISCOUNT");

    expect(screen.getByLabelText("Valor do Desconto *")).toBeInTheDocument();
  });

  it("bloqueia submit invalido e limpa erro quando o usuario corrige o campo", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<RewardForm onSubmit={onSubmit} />);

    await user.clear(screen.getByLabelText("Nome da Recompensa *"));
    await user.click(screen.getByRole("button", { name: "Criar Recompensa" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Nome é obrigatório")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nome da Recompensa *"), "Voucher");

    await waitFor(() => {
      expect(screen.queryByText("Nome é obrigatório")).not.toBeInTheDocument();
    });
  });

  it("submete os dados preenchidos, altera estado ativo e reseta o formulario", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<RewardForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Nome da Recompensa *"), "Pomada");
    await user.type(screen.getByLabelText("Descrição"), "Produto premium");
    fireEvent.change(screen.getByLabelText("Custo em Pontos *"), {
      target: { value: "500" },
    });
    await user.selectOptions(screen.getByLabelText("Tipo *"), "DISCOUNT");
    fireEvent.change(screen.getByLabelText("Valor do Desconto *"), {
      target: { value: "15" },
    });
    await user.type(
      screen.getByLabelText("URL da Imagem"),
      "https://goldmustache.com/reward.png",
    );
    fireEvent.change(screen.getByLabelText("Estoque"), {
      target: { value: "10" },
    });
    await user.click(screen.getByLabelText("Ativo"));
    const form = screen
      .getByRole("button", { name: "Criar Recompensa" })
      .closest("form");

    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Pomada",
        description: "Produto premium",
        pointsCost: 500,
        type: "DISCOUNT",
        value: 15,
        imageUrl: "https://goldmustache.com/reward.png",
        stock: 10,
        active: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Nome da Recompensa *")).toHaveValue("");
      expect(screen.getByLabelText("Descrição")).toHaveValue("");
      expect(screen.getByLabelText("Custo em Pontos *")).toHaveValue(100);
      expect(screen.getByLabelText("Tipo *")).toHaveValue("FREE_SERVICE");
      expect(screen.getByLabelText("Ativo")).toBeChecked();
    });
  });

  it("restaura os valores padrao ao clicar em cancelar", async () => {
    const user = userEvent.setup();

    render(
      <RewardForm
        initialData={{
          name: "Reward antiga",
          description: "Descricao antiga",
          pointsCost: 999,
          type: "PRODUCT",
          imageUrl: "https://goldmustache.com/old.png",
          stock: 4,
          active: false,
        }}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Nome da Recompensa *")).toHaveValue("");
    expect(screen.getByLabelText("Descrição")).toHaveValue("");
    expect(screen.getByLabelText("Custo em Pontos *")).toHaveValue(100);
    expect(screen.getByLabelText("Tipo *")).toHaveValue("FREE_SERVICE");
    expect(screen.getByLabelText("URL da Imagem")).toHaveValue("");
    expect(screen.getByLabelText("Estoque")).toHaveValue(null);
    expect(screen.getByLabelText("Ativo")).toBeChecked();
  });
});
