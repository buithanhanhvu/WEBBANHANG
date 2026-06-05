package com.example.webbanhang.controller;

import com.example.webbanhang.common.ApiResponse;
import com.example.webbanhang.exception.BadRequestException;
import com.example.webbanhang.security.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final CurrentUserService currentUserService;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public UploadController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @PostMapping
    public ApiResponse<Map<String, String>> upload(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {

        currentUserService.requireUser(request);

        if (file.isEmpty()) throw new BadRequestException("File is empty");

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("Only image files are allowed");
        }

        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String ext = original.contains(".") ? original.substring(original.lastIndexOf(".")) : ".jpg";
        String filename = UUID.randomUUID() + ext;

        try {
            // Lưu vào thư mục static/uploads để Spring Boot tự serve
            Path staticUploads = Paths.get("src/main/resources/static/" + uploadDir);
            if (!Files.exists(staticUploads)) Files.createDirectories(staticUploads);

            // Cũng lưu vào target để serve ngay không cần restart
            Path targetUploads = Paths.get("target/classes/static/" + uploadDir);
            if (!Files.exists(targetUploads)) Files.createDirectories(targetUploads);

            byte[] bytes = file.getBytes();
            Files.write(staticUploads.resolve(filename), bytes);
            Files.write(targetUploads.resolve(filename), bytes);

        } catch (IOException ex) {
            throw new BadRequestException("Failed to save file: " + ex.getMessage());
        }

        String url = "/" + uploadDir + "/" + filename;
        return ApiResponse.ok("Uploaded", Map.of("url", url));
    }
}
