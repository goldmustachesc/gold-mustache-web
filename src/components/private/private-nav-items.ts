import type { UserRole } from "@/types/profile";

export interface NavFeatureFlags {
  loyaltyProgram?: boolean;
}

export interface NavItemDef {
  href: string;
  label: string;
  iconName: string;
}

interface ResolvePrimaryNavRoleOptions {
  role: UserRole;
  locale: string;
  pathname: string;
  hasBarberProfile: boolean;
}

function barberNavItems(locale: string): NavItemDef[] {
  return [
    { href: `/${locale}/dashboard`, label: "Início", iconName: "Scissors" },
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

function adminNavItems(locale: string): NavItemDef[] {
  return [
    { href: `/${locale}/dashboard`, label: "Início", iconName: "Home" },
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

export function getNavItems(
  role: UserRole,
  locale: string,
  flags?: NavFeatureFlags,
): NavItemDef[] {
  if (role === "ADMIN") {
    return adminNavItems(locale);
  }
  if (role === "BARBER") {
    return barberNavItems(locale);
  }

  const items = clientNavItems(locale);

  if (flags?.loyaltyProgram === false) {
    return items.filter((item) => !item.href.includes("/loyalty"));
  }

  return items;
}

export function resolvePrimaryNavRole({
  role,
  locale,
  pathname,
  hasBarberProfile,
}: ResolvePrimaryNavRoleOptions): UserRole {
  if (!hasBarberProfile) {
    return role;
  }

  const dashboardPath = `/${locale}/dashboard`;
  const barberBasePath = `/${locale}/barbeiro`;

  if (
    pathname === dashboardPath ||
    pathname === barberBasePath ||
    pathname.startsWith(`${barberBasePath}/`)
  ) {
    return "BARBER";
  }

  return role;
}

export function getAdminNavItems(locale: string): NavItemDef[] {
  return [
    {
      href: `/${locale}/admin/barbearia/configuracoes`,
      label: "Dados da Barbearia",
      iconName: "Building2",
    },
    {
      href: `/${locale}/admin/barbearia/feature-flags`,
      label: "Feature flags",
      iconName: "ToggleLeft",
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
