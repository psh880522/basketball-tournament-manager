import GlobalHeader from "@/components/nav/GlobalHeader";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GlobalHeader minimal />
      {children}
    </>
  );
}
