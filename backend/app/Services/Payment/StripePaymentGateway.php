<?php

namespace App\Services\Payment;

use App\Contracts\PaymentGateway;

class StripePaymentGateway implements PaymentGateway
{
    public function charge(array $payload): array
    {
        return [
            'success' => true,
            'provider' => 'stripe',
            'reference' => 'pi_' . ($payload['bill_id'] ?? 'bill') . '_' . time(),
            'amount' => (float) ($payload['amount'] ?? 0),
            'currency' => $payload['currency'] ?? 'INR',
            'status' => 'captured',
        ];
    }
}
