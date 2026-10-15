<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'is_super_admin'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public function memberships()
    {
        return $this->hasMany(Membership::class);
    }

    public function hasRestaurantPermission(Restaurant $restaurant, string $permissionSlug): bool
    {
        if ($this->isSuperAdmin() || $this->id === $restaurant->owner_id) {
            return true;
        }

        $roleBasedMatch = $this->memberships()
            ->where('restaurant_id', $restaurant->id)
            ->whereHas('role', function ($query) {
                $query->whereIn('slug', ['manager', 'branch-admin'])
                    ->orWhereIn('name', ['Manager', 'Branch Admin']);
            })
            ->exists();

        if ($roleBasedMatch) {
            return true;
        }

        return $this->memberships()
            ->where('restaurant_id', $restaurant->id)
            ->whereHas('role.permissions', function ($query) use ($permissionSlug) {
                $query->where('slug', $permissionSlug);
            })
            ->exists();
    }

    public function isSuperAdmin(): bool
    {
        return (bool) $this->is_super_admin;
    }

    public function canManageRestaurantOrders(Restaurant $restaurant): bool
    {
        if ($this->isSuperAdmin() || $this->id === $restaurant->owner_id) {
            return true;
        }

        return $this->memberships()
            ->where('restaurant_id', $restaurant->id)
            ->where('status', 'active')
            ->exists();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_super_admin' => 'boolean',
        ];
    }
}
