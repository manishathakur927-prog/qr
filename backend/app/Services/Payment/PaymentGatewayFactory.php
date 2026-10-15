<?php

namespace App\Services\Payment;

use App\Contracts\PaymentGateway;
use InvalidArgumentException;

class PaymentGatewayFactory
{
    /**
     * @var array<string, class-string<PaymentGateway>>
     */
    protected array $providers = [
        'cash' => MockPaymentGateway::class,
        'mock' => MockPaymentGateway::class,
        'razorpay' => RazorpayPaymentGateway::class,
        'stripe' => StripePaymentGateway::class,
        'cashfree' => CashfreePaymentGateway::class,
    ];

    public function make(string $provider): PaymentGateway
    {
        $normalized = strtolower(trim($provider ?: 'mock'));

        if (! isset($this->providers[$normalized])) {
            throw new InvalidArgumentException("Unsupported payment provider: {$provider}");
        }

        return app($this->providers[$normalized]);
    }
}
