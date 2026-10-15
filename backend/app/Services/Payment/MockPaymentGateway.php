<?php

namespace App\Services\Payment;

use App\Contracts\PaymentGateway;

class MockPaymentGateway implements PaymentGateway
{
    public function charge(array $payload): array
    {
        $amount = (float) ($payload['amount'] ?? 0);

        return [
            'success' => true,
            'provider' => 'mock',
            'reference' => 'mock_' . ($payload['bill_id'] ?? 'bill') . '_' . time(),
            'amount' => $amount,
            'currency' => $payload['currency'] ?? 'INR',
            'status' => 'captured',
        ];
    }
}
