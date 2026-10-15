<?php

namespace App\Services\Payment;

use App\Contracts\PaymentGateway;
use Razorpay\Api\Api;

class RazorpayPaymentGateway implements PaymentGateway
{
    public function charge(array $payload): array
    {
        $amount = (float) ($payload['amount'] ?? 0);

        $keyId = config('services.razorpay.key_id');
        $keySecret = config('services.razorpay.key_secret');

        if (empty($keyId) || empty($keySecret)) {
            return [
                'success' => true,
                'provider' => 'mock',
                'reference' => 'mock_' . ($payload['bill_id'] ?? 'bill') . '_' . time(),
                'amount' => $amount,
                'currency' => $payload['currency'] ?? 'INR',
                'status' => 'captured',
            ];
        }

        try {
            $api = new Api($keyId, $keySecret);
            $order = $api->order->create([
                'receipt' => 'bill_' . ($payload['bill_id'] ?? 'bill'),
                'amount' => (int) round($amount * 100),
                'currency' => $payload['currency'] ?? 'INR',
            ]);

            return [
                'success' => true,
                'provider' => 'razorpay',
                'reference' => $order['id'] ?? 'rzp_' . time(),
                'amount' => $amount,
                'currency' => $payload['currency'] ?? 'INR',
                'status' => 'created',
            ];
        } catch (\Exception $exception) {
            return [
                'success' => false,
                'provider' => 'razorpay',
                'reference' => 'rzp_failed_' . time(),
                'amount' => $amount,
                'currency' => $payload['currency'] ?? 'INR',
                'status' => 'failed',
                'message' => $exception->getMessage(),
            ];
        }
    }
}
