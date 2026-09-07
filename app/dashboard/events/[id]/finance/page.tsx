import FinanceClient from "./finance-client";

export default async function FinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FinanceClient eventId={id} />;
}
