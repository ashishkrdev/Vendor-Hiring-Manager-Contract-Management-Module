import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/redux/features/Auth/authSlice";
import vendorReducer from "@/redux/features/Vendor/vendorSlice";
import hiringReducer from "@/redux/features/Hiring/hiringSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    vendor: vendorReducer,
    hiring: hiringReducer,
  },
});

export default store;
