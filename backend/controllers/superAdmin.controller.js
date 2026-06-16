// Legacy compatibility layer.
// The active super-admin API lives in controllers/restaurant.controller.js
// and uses SUPER_ADMIN_EMAILS instead of a database role named "superadmin".
export {
  impersonateRestaurantForSuperAdmin as impersonateRestaurant,
  listRestaurantsForSuperAdmin as listRestaurants,
} from "./restaurant.controller.js";
