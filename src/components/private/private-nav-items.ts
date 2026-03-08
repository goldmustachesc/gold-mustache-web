import type { UserRole } from "@/types/profile";

export interface NavItemDef {
  href: string;
  label: string;
  iconName: string;
}

function barberNavItems(locale: string): NavItemDef[] {
  return [
    { href: `/${locale}/barbeiro`, label: "Início", iconName: "Scissors" },
    {
      href: `/${locale}/dashboard`,
      label: "Minha Agenda",
      iconName: "Calendar",
    },
    {
      href: `/${locale}/barbeiro/meu-link`,
      label: "Meu Link",
      iconName: "Link2",
    },
    {
      href: `/${locale}/barbeiro/clientes`,
      label: "Clientes",
      iconName: "Users",
    },
    {
      href: `/${locale}/barbeiro/agendar`,
      label: "Agendar para Cliente",
      iconName: "UserPlus",
    },
    {
      href: `/${locale}/barbeiro/horarios`,
      label: "Meus Horários",
      iconName: "Clock",
    },
    {
      href: `/${locale}/barbeiro/ausencias`,
      label: "Ausências",
      iconName: "CalendarOff",
    },
    {
      href: `/${locale}/barbeiro/cancelados`,
      label: "Cancelados",
      iconName: "XCircle",
    },
    {
      href: `/${locale}/barbeiro/faturamento`,
      label: "Faturamento",
      iconName: "DollarSign",
    },
    {
      href: `/${locale}/barbeiro/feedbacks`,
      label: "Minhas Avaliações",
      iconName: "Star",
    },
    { href: `/${locale}/profile`, label: "Meu Perfil", iconName: "User" },
  ];
}

function clientNavItems(locale: string): NavItemDef[] {
  return [
    { href: `/${locale}/dashboard`, label: "Início", iconName: "Home" },
    { href: `/${locale}/loyalty`, label: "Fidelidade", iconName: "Gift" },
    { href: `/${locale}/profile`, label: "Meu Perfil", iconName: "User" },
  ];
}

export function getNavItems(role: UserRole, locale: string): NavItemDef[] {
  if (role === "BARBER" || role === "ADMIN") {
    return barberNavItems(locale);
  }
  return clientNavItems(locale);
}

export function getAdminNavItems(locale: string): NavItemDef[] {
  return [
    {
      href: `/${locale}/admin/barbearia/configuracoes`,
      label: "Dados da Barbearia",
      iconName: "Building2",
    },
    {
      href: `/${locale}/admin/barbearia/horarios`,
      label: "Horários da Barbearia",
      iconName: "Clock",
    },
    {
      href: `/${locale}/admin/barbearia/servicos`,
      label: "Serviços",
      iconName: "Scissors",
    },
    {
      href: `/${locale}/admin/barbeiros`,
      label: "Gerenciar Barbeiros",
      iconName: "Users",
    },
    {
      href: `/${locale}/admin/faturamento`,
      label: "Faturamento Geral",
      iconName: "DollarSign",
    },
    {
      href: `/${locale}/admin/feedbacks`,
      label: "Avaliações",
      iconName: "Star",
    },
    {
      href: `/${locale}/admin/loyalty`,
      label: "Fidelidade",
      iconName: "Gift",
    },
  ];
}
