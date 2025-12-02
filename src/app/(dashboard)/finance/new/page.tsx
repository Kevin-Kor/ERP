import { TransactionForm } from "@/components/forms/transaction-form";

export default function NewTransactionPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">새 거래 추가</h1>
                <p className="text-muted-foreground mt-1">
                    새로운 수익 또는 비용 거래를 등록합니다.
                </p>
            </div>

            <TransactionForm mode="create" />
        </div>
    );
}
