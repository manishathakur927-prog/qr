<?php

namespace App\Services\Payment;

use App\Contracts\PaymentGateway;

class CashfreePaymentGateway implements PaymentGateway
{
    public function charge(array $payload): array
    {
        return [
            'success' => true,
            'provider' => 'cashfree',
            'reference' => 'cf_' . ($payload['bill_id'] ?? 'bill') . '_' . time(),
            'amount' => (float) ($payload['amount'] ?? 0),
            'currency' => $payload['currency'] ?? 'INR',
            'status' => 'captured',
        ];
    }
}
