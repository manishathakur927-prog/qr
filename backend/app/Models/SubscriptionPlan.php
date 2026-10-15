<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubscriptionPlan extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'price_monthly',
        'price_annual',
        'max_tables',
        'features',
    ];

    protected $casts = [
        'features' => 'array',
        'price_monthly' => 'decimal:2',
        'price_annual' => 'decimal:2',
    ];

    public function restaurants(): HasMany
    {
        return $this->hasMany(Restaurant::class, 'subscription_plan_id');
    }
}
