<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\GuestOrderController;
use App\Http\Controllers\Api\GuestSessionController;
use App\Http\Controllers\Api\KitchenOrderController;
use App\Http\Controllers\Api\MembershipController;
use App\Http\Controllers\Api\MenuItemController;
use App\Http\Controllers\Api\RestaurantController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\TableController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/guest/join-session', [GuestSessionController::class, 'join']);
    Route::get('/guest/orders', [GuestOrderController::class, 'index']);
    Route::post('/guest/orders', [GuestOrderController::class, 'store']);
    Route::patch('/guest/orders/{order}', [GuestOrderController::class, 'update']);
    Route::delete('/guest/orders/{order}', [GuestOrderController::class, 'destroy']);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/user', [AuthController::class, 'user']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    Route::post('/payments/verify', [BillController::class, 'verifyPayment']);
    Route::get('/subscription-plans', [\App\Http\Controllers\Api\SubscriptionPlanController::class, 'index']);
    Route::post('/subscription-plans', [\App\Http\Controllers\Api\SubscriptionPlanController::class, 'store']);
    Route::patch('/subscription-plans/{subscription_plan}', [\App\Http\Controllers\Api\SubscriptionPlanController::class, 'update']);
    Route::delete('/subscription-plans/{subscription_plan}', [\App\Http\Controllers\Api\SubscriptionPlanController::class, 'destroy']);
    Route::get('/restaurants', [RestaurantController::class, 'index']);
    Route::post('/restaurants', [RestaurantController::class, 'store']);
    Route::post('/restaurants/{restaurant}/impersonate', [RestaurantController::class, 'impersonate']);
    Route::patch('/restaurants/{restaurant}', [RestaurantController::class, 'update']);
    Route::patch('/restaurants/{restaurant}/subscription', [\App\Http\Controllers\Api\SubscriptionPlanController::class, 'assignToRestaurant']);
    Route::delete('/restaurants/{restaurant}', [RestaurantController::class, 'destroy']);
    Route::post('/restaurants/{restaurant}/branches', [BranchController::class, 'store']);
    Route::get('/restaurants/{restaurant}/roles', [RoleController::class, 'index']);
    Route::post('/restaurants/{restaurant}/roles', [RoleController::class, 'store']);
    Route::get('/restaurants/{restaurant}/memberships', [MembershipController::class, 'index']);
    Route::post('/restaurants/{restaurant}/memberships', [MembershipController::class, 'store']);
    Route::get('/restaurants/{restaurant}/branches/{branch}/categories', [CategoryController::class, 'index']);
    Route::post('/restaurants/{restaurant}/branches/{branch}/categories', [CategoryController::class, 'store']);
    Route::get('/restaurants/{restaurant}/branches/{branch}/items', [MenuItemController::class, 'index']);
    Route::post('/restaurants/{restaurant}/branches/{branch}/items', [MenuItemController::class, 'store']);
    Route::get('/restaurants/{restaurant}/branches/{branch}/tables', [TableController::class, 'index']);
    Route::post('/restaurants/{restaurant}/branches/{branch}/tables', [TableController::class, 'store']);
    Route::post('/restaurants/{restaurant}/branches/{branch}/tables/{table}/sessions', [TableController::class, 'storeSession']);
    Route::post('/restaurants/{restaurant}/branches/{branch}/tables/{table}/qr-token', [TableController::class, 'generateQrToken']);
    Route::delete('/restaurants/{restaurant}/branches/{branch}/tables/{table}/qr-token', [TableController::class, 'revokeQrToken']);
    Route::get('/restaurants/{restaurant}/branches/{branch}/orders', [KitchenOrderController::class, 'index']);
    Route::patch('/restaurants/{restaurant}/branches/{branch}/orders/{order}/status', [KitchenOrderController::class, 'updateStatus']);
    Route::post('/restaurants/{restaurant}/branches/{branch}/orders/{order}/bill', [BillController::class, 'store']);
    Route::get('/restaurants/{restaurant}/branches/{branch}/bills', [BillController::class, 'index']);
    Route::patch('/restaurants/{restaurant}/branches/{branch}/bills/{bill}/pay', [BillController::class, 'pay']);
});
