package com.example.webbanhang.common;

public record ApiResponse<T>(boolean success, String status, String message, T data) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "success", "OK", data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, "success", message, data);
    }

    public static ApiResponse<Void> error(String message) {
        return new ApiResponse<>(false, "error", message, null);
    }
}
