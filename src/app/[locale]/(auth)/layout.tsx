import { Toaster } from "sonner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        theme="dark"
        closeButton
        toastOptions={{
          className:
            "!bg-zinc-900/95 !backdrop-blur-xl !border !border-zinc-700/50 !shadow-2xl !shadow-black/20 !rounded-xl",
          descriptionClassName: "!text-zinc-400",
          style: {
            padding: "16px",
          },
          classNames: {
            success:
              "!border-emerald-500/30 !text-emerald-50 [&>svg]:!text-emerald-400",
            error: "!border-red-500/30 !text-red-50 [&>svg]:!text-red-400",
            warning:
              "!border-amber-500/30 !text-amber-50 [&>svg]:!text-amber-400",
            info: "!border-blue-500/30 !text-blue-50 [&>svg]:!text-blue-400",
          },
        }}
      />
    </>
  );
}
