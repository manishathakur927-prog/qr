<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TableSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'table_id',
        'status',
        'opened_by',
        'guest_pin_hash',
        'opened_at',
        'closed_at',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(DiningTable::class, 'table_id');
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function guestSessions()
    {
        return $this->hasMany(GuestSession::class);
    }
}
